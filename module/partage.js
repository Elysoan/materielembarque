/* Partage des données entre utilisateurs.
   - ME.sharepoint(cfg) : adaptateur liste SharePoint (API REST, même origine : page hébergée sur le site SharePoint,
     composant SPFx ou outil global servi par SharePoint).
   - ME.partage(store, distant, rappels) : synchronisation. Le navigateur garde une copie locale (démarrage immédiat,
     saisie possible hors ligne) ; chaque signalement, chaque véhicule et l'en-tête du parc sont un élément de la liste,
     ce qui évite d'écraser le travail d'un collègue qui modifie un autre élément au même moment.
   Un autre serveur peut remplacer SharePoint : il suffit d'un objet { nom, lister(), ecrire(cle, valeur), supprimer(cle) }. */
(function (root) {
  const ME = root.MaterielEmbarque;

  /* ---------- Adaptateur SharePoint ---------- */
  function sharepoint(cfg) {
    const site = String(cfg.site).replace(/\/+$/, ''), liste = cfg.liste || 'MaterielEmbarque';
    const doFetch = cfg.fetch || root.fetch.bind(root);
    const L = site + "/_api/web/lists/getbytitle('" + encodeURIComponent(liste.replace(/'/g, "''")) + "')";
    const NOMETA = 'application/json;odata=nometadata', VERBOSE = 'application/json;odata=verbose';
    const ids = {}; // clé -> Id de l'élément SharePoint
    let jeton = null, expire = 0;

    function req(url, o) {
      return doFetch(url, Object.assign({ credentials: 'include' }, o)).then(r => {
        if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
        return r.text().then(t => (t ? JSON.parse(t) : null));
      });
    }
    // Jeton anti-rejeu (X-RequestDigest) exigé par SharePoint pour toute écriture ; valable ~30 min
    function digest() {
      if (jeton && Date.now() < expire) return Promise.resolve(jeton);
      return req(site + '/_api/contextinfo', { method: 'POST', headers: { Accept: NOMETA } }).then(j => {
        jeton = j.FormDigestValue; expire = Date.now() + ((j.FormDigestTimeoutSeconds || 1800) - 120) * 1000;
        return jeton;
      });
    }
    const entetes = (type, extra) => digest().then(d => Object.assign({ Accept: type, 'Content-Type': type, 'X-RequestDigest': d }, extra || {}));

    return {
      nom: 'SharePoint', site, liste, id: site + '|' + liste,
      lien: site + '/Lists/' + encodeURIComponent(liste),
      lister() {
        const out = [];
        const page = url => req(url, { headers: { Accept: NOMETA } }).then(j => {
          (j.value || []).forEach(it => {
            ids[it.Title] = it.Id;
            try { out.push({ cle: it.Title, valeur: JSON.parse(it.Donnees) }); } catch (e) { /* élément illisible : ignoré */ }
          });
          return j['odata.nextLink'] ? page(j['odata.nextLink']) : out;
        });
        return page(L + '/items?$select=Id,Title,Donnees&$top=5000');
      },
      ecrire(cle, valeur) {
        const body = JSON.stringify({ Title: cle, Donnees: JSON.stringify(valeur) });
        if (ids[cle]) {
          return entetes(NOMETA, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' })
            .then(h => req(L + '/items(' + ids[cle] + ')', { method: 'POST', headers: h, body }))
            .catch(e => { if (e.status !== 404) throw e; delete ids[cle]; return this.ecrire(cle, valeur); }); // supprimé entre-temps : recréé
        }
        return entetes(NOMETA).then(h => req(L + '/items', { method: 'POST', headers: h, body })).then(j => { ids[cle] = j.Id; });
      },
      supprimer(cle) {
        if (!ids[cle]) return Promise.resolve();
        return entetes(NOMETA, { 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' })
          .then(h => req(L + '/items(' + ids[cle] + ')', { method: 'POST', headers: h }))
          .then(() => { delete ids[cle]; }, e => { if (e.status !== 404) throw e; delete ids[cle]; });
      },
      /** Crée la liste et sa colonne « Donnees » (droits de gestion du site nécessaires). */
      creerListe() {
        return entetes(VERBOSE).then(h => req(site + '/_api/web/lists', { method: 'POST', headers: h,
          body: JSON.stringify({ __metadata: { type: 'SP.List' }, BaseTemplate: 100, Title: liste,
            Description: 'Données du module Matériel embarqué (un élément par signalement et par véhicule). Ne pas modifier à la main.' }) }))
          .then(() => entetes(VERBOSE)).then(h => req(L + '/fields/createfieldasxml', { method: 'POST', headers: h,
            body: JSON.stringify({ parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' },
              SchemaXml: '<Field Type="Note" DisplayName="Donnees" Name="Donnees" StaticName="Donnees" RichText="FALSE" NumLines="6" UnlimitedLengthInDocumentLibrary="TRUE" />' } }) }));
      }
    };
  }

  /** 'auto' : actif seulement si la page est servie par SharePoint (site déduit de l'adresse). */
  sharepoint.depuis = function (cfg) {
    if (!cfg) return null;
    if (cfg === 'auto') cfg = {};
    if (!cfg.site) {
      const ctx = root._spPageContextInfo;
      if (ctx && ctx.webAbsoluteUrl) cfg = Object.assign({ site: ctx.webAbsoluteUrl }, cfg);
      else if (/\.sharepoint\.com$/i.test(location.hostname)) {
        const m = location.pathname.match(/^\/(sites|teams)\/[^/]+/i);
        cfg = Object.assign({ site: location.origin + (m ? m[0] : '') }, cfg);
      } else return null;
    }
    return sharepoint(cfg);
  };

  /* ---------- Synchronisation ---------- */
  function partage(store, distant, rappels) {
    rappels = rappels || {};
    const CLE = 'materielembarque.sync.' + (distant.id || distant.nom);
    const lireBase = () => { try { return JSON.parse(root.localStorage.getItem(CLE) || 'null'); } catch (e) { return null; } };
    const ecrireBase = () => { try { root.localStorage.setItem(CLE, JSON.stringify(base)); } catch (e) { /* quota */ } };
    let base = lireBase(); // état du serveur au dernier échange : { clé: JSON }
    const etat = { nom: distant.nom, distant, phase: 'connexion', attente: 0, erreur: '', listeAbsente: false, derniere: null };
    let envoi = null, encore = false, minuterie = null, pret = false;

    const J = x => JSON.stringify(x);
    const signaler = () => rappels.onEtat && rappels.onEtat(etat);
    const ecarts = () => {
      const loc = store.records(), b = base || {};
      return Object.keys(loc).filter(k => b[k] !== J(loc[k])).concat(Object.keys(b).filter(k => !(k in loc)));
    };
    function echec(e) {
      etat.phase = 'horsligne'; etat.listeAbsente = e && e.status === 404;
      etat.erreur = !e || !e.status ? 'Serveur injoignable' : e.status === 404 ? 'Liste « ' + (distant.liste || '') + ' » introuvable'
        : e.status === 401 || e.status === 403 ? 'Accès refusé (droits sur la liste)' : 'Erreur ' + e.status;
      etat.attente = ecarts().length; signaler();
    }

    /** Récupère le serveur et fusionne avec les modifications locales non encore envoyées. */
    function tirer() {
      if (envoi) return envoi.then(tirer);
      return distant.lister().then(liste => {
        const dist = {}; liste.forEach(r => { dist[r.cle] = r.valeur; });
        const loc = store.records(), b = base || {}, res = {}, collisions = [];
        const cles = new Set(Object.keys(dist).concat(Object.keys(loc), Object.keys(b)));
        cles.forEach(k => {
          const d = k in dist, l = k in loc, connu = k in b, modifie = l ? b[k] !== J(loc[k]) : connu;
          if (connu) {
            if (!modifie) { if (d) res[k] = dist[k]; }                         // rien en attente : le serveur fait foi
            else if (l) { if (d) res[k] = loc[k]; }                            // modifié ici : la version locale part au serveur (supprimé ailleurs : on suit)
            else if (d && J(dist[k]) !== b[k]) res[k] = dist[k];               // supprimé ici mais modifié ailleurs : on garde
          } else if (l && d) {                                                 // créé des deux côtés
            res[k] = dist[k];
            if (k.indexOf('inc:') === 0 && J(dist[k]) !== J(loc[k])) collisions.push(loc[k]); // même référence pour deux signalements
          } else if (l) res[k] = loc[k];                                       // créé ici, pas encore envoyé
          else if (d) res[k] = dist[k];                                        // créé ailleurs
        });
        collisions.forEach(i => { const c = Object.assign({}, i, { id: i.id + '~' }); res['inc:' + c.id] = c; });
        const avant = J(store.records());
        base = {}; Object.keys(dist).forEach(k => { base[k] = J(dist[k]); }); ecrireBase();
        store.chargerRecords(res);
        collisions.forEach(i => store.renumeroter(i.id + '~'));
        etat.listeAbsente = false; etat.derniere = new Date().toISOString(); pret = true;
        if (J(store.records()) !== avant && rappels.onDistant) rappels.onDistant();
        return pousser();
      }, echec);
    }

    /** Envoie les écarts entre la copie locale et le dernier état connu du serveur. */
    function pousser() {
      if (!pret) return Promise.resolve();
      if (envoi) { encore = true; return envoi; }
      const loc = store.records(), b = base || (base = {});
      const ecr = Object.keys(loc).filter(k => b[k] !== J(loc[k])), sup = Object.keys(b).filter(k => !(k in loc));
      etat.attente = ecr.length + sup.length;
      if (!etat.attente) { etat.phase = 'ok'; etat.erreur = ''; signaler(); return Promise.resolve(); }
      etat.phase = 'envoi'; signaler();
      const taches = ecr.map(k => () => { const j = J(loc[k]); return distant.ecrire(k, loc[k]).then(() => { b[k] = j; }); })
        .concat(sup.map(k => () => distant.supprimer(k).then(() => { delete b[k]; })));
      envoi = taches.reduce((p, t) => p.then(() => { const r = t(); return r.then(() => { ecrireBase(); etat.attente--; }); }), Promise.resolve())
        .then(() => { envoi = null; if (encore) { encore = false; return pousser(); } etat.phase = 'ok'; etat.erreur = ''; etat.attente = 0; signaler(); },
          e => { envoi = null; encore = false; echec(e); });
      return envoi;
    }

    store.onPersist = () => { // après chaque modification : envoi groupé
      clearTimeout(minuterie);
      if (pret) { etat.attente = ecarts().length; signaler(); }
      minuterie = setTimeout(() => (pret ? pousser() : tirer()), 400);
    };
    const synchroniser = () => tirer();
    const periodique = setInterval(() => { if (!envoi && document.visibilityState !== 'hidden') tirer(); }, (rappels.periode || 60) * 1000);
    const auRetour = () => { if (document.visibilityState === 'visible') tirer(); };
    document.addEventListener('visibilitychange', auRetour);

    signaler(); tirer();
    return {
      etat, synchroniser,
      creerListe: () => (distant.creerListe ? distant.creerListe() : Promise.reject(new Error('non disponible'))).then(tirer),
      arreter() { clearInterval(periodique); document.removeEventListener('visibilitychange', auRetour); store.onPersist = null; }
    };
  }

  ME.sharepoint = sharepoint;
  ME.partage = partage;
})(window);
