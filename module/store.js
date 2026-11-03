/* Persistance : localStorage par défaut (cache local, toujours présent). Pour brancher l'outil global (API, base...),
   passer un `storage` ({ load(): object|null, save(obj) }) à mount(). Le partage entre utilisateurs (SharePoint)
   passe par partage.js, qui synchronise les enregistrements (records / chargerRecords) avec le serveur. */
(function (root) {
  const ME = root.MaterielEmbarque;
  const KEY = 'materielembarque.v2';

  function localStorageAdapter(key) {
    return {
      load() {
        try { return JSON.parse(root.localStorage.getItem(key) || 'null'); } catch (e) { return null; }
      },
      save(obj) {
        try { root.localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* mode privé / quota */ }
      }
    };
  }

  ME.createStore = function (opts) {
    opts = opts || {};
    const D = ME.defaults;
    // options.cleStockage : espace séparé (ex. la démo ne doit pas mélanger ses données avec l'outil réel)
    const storage = opts.storage || localStorageAdapter(opts.cleStockage || KEY);
    const saved = storage.load() || {};
    const data = {
      incidents: saved.incidents || [],
      parc: saved.parc || null, // { vehicules, fichier, importeLe } une fois un parc importé
      reglages: Object.assign({}, D.reglages, opts.reglages || {}, saved.reglages || {})
    };
    const vehiculesDefaut = opts.vehicules || D.vehicules;
    const types = opts.types || D.types;
    const solutions = opts.solutions || D.solutions;
    const equipements = opts.equipements || D.equipements;
    const vues = opts.vues || D.vues;

    const persist = () => { storage.save(data); if (api.onPersist) api.onPersist(); };
    const now = () => new Date().toISOString();

    function nextId() {
      const prefix = 'INC-' + new Date().getFullYear() + '-';
      const max = data.incidents
        .filter(i => i.id.indexOf(prefix) === 0)
        .reduce((m, i) => Math.max(m, parseInt(i.id.slice(prefix.length), 10) || 0), 0);
      return prefix + String(max + 1).padStart(4, '0');
    }

    const api = {
      types, solutions, vues, equipements,
      destinataire: opts.destinataire || D.mail.destinataire,
      copieFixe: opts.copie != null ? opts.copie : D.mail.copie, // toujours en copie, en plus des copies des Réglages
      /** Parc courant : le parc importé s'il existe, sinon celui fourni à mount() (ou la démonstration). */
      get vehicules() { return data.parc ? data.parc.vehicules : vehiculesDefaut; },
      parcInfo: () => data.parc ? { fichier: data.parc.fichier, importeLe: data.parc.importeLe, modifieLe: data.parc.modifieLe, demo: false } : { demo: !opts.vehicules },
      setParc(list, fichier) { data.parc = { vehicules: list, fichier: fichier || '', importeLe: now() }; persist(); },
      vehicule: id => api.vehicules.find(v => v.id === id),
      type: id => types.find(t => t.id === id),
      solution: id => solutions.find(s => s.id === id),
      equipement: id => equipements.find(e => e.id === id),

      /** Solutions d'un véhicule : la principale, puis les complémentaires (ex. kit piéton). */
      solutionsOf: v => [v.solution].concat(v.complements || []).filter((s, i, a) => s && a.indexOf(s) === i),
      /** Équipements prévus pour ces solutions (sans tenir compte des absences). */
      equipsPrevus(v) {
        const sols = api.solutionsOf(v);
        return equipements.filter(e => !e.solutions || e.solutions.some(s => sols.indexOf(s) >= 0));
      },
      /** Équipements montés sur un véhicule : ceux de ses solutions, limités à `v.equipements` si renseigné. */
      equipsOf(v) {
        return api.equipsPrevus(v).filter(e => !v.equipements || v.equipements.indexOf(e.id) >= 0);
      },
      /** Solution à laquelle se rattache un équipement de ce véhicule (préfixe de l'objet du mail). */
      solutionDe(v, equipId) {
        const e = api.equipement(equipId), sols = api.solutionsOf(v);
        return (e && e.solutions && sols.find(s => e.solutions.indexOf(s) >= 0)) || v.solution;
      },
      /** Ajoute ou remplace un véhicule (même id) dans le parc enregistré. */
      saveVehicule(v) {
        const list = api.vehicules.slice(), i = list.findIndex(x => x.id === v.id);
        if (i >= 0) list[i] = v; else list.push(v);
        data.parc = Object.assign({ fichier: '', importeLe: null }, data.parc || {}, { vehicules: list, modifieLe: now() });
        persist();
      },
      removeVehicule(id) {
        data.parc = Object.assign({ fichier: '', importeLe: null }, data.parc || {}, { vehicules: api.vehicules.filter(x => x.id !== id), modifieLe: now() });
        persist();
      },
      /** Configuration d'une vue pour ce véhicule (variante selon le type : ex. arrière bi-comp à 3 chaises). */
      vueDe(v, vue) {
        const cfg = vues[vue] || {}, t = api.type(v && v.type) || {}, k = t[vue];
        return k && cfg.variantes && cfg.variantes[k] ? Object.assign({}, cfg, cfg.variantes[k], { variante: k }) : cfg;
      },
      /** Chaises / côtés possibles d'un équipement sur ce véhicule. */
      cotesDe(v, e) {
        if (!e.chaise) return e.cotes || null;
        return (api.vueDe(v, e.vue).chaises || ['Gauche', 'Droite']).concat(e.cotesPlus || []);
      },
      /** Position [x, y] d'un équipement (et de sa chaise) sur l'image de la vue de ce véhicule. */
      posDe(v, e, cote) {
        const k = api.vueDe(v, e.vue).variante, p = (k && e.posVariantes && e.posVariantes[k]) || (k ? null : e.pos);
        if (!p) return null;
        return cote ? p[cote] || null : p;
      },
      /** Lignes (équipement + chaise éventuelle) d'une vue : un équipement parCote donne une ligne par chaise. */
      lignes(v, vue) {
        const out = [];
        api.equipsOf(v).filter(e => e.vue === vue).forEach(e => {
          if (e.parCote) api.cotesDe(v, e).forEach(c => out.push({ eq: e, cote: c })); else out.push({ eq: e, cote: null });
        });
        return out;
      },
      libelle(inc) {
        const e = api.equipement(inc.equipId) || { label: inc.equipId };
        return e.label + (inc.cote ? ' - ' + inc.cote : '');
      },

      incidents: () => data.incidents.slice().sort((a, b) => b.creeLe.localeCompare(a.creeLe)),
      incident: id => data.incidents.find(i => i.id === id),
      ouverts(vehiculeId, equipId, cote) {
        return data.incidents.filter(i => i.statut !== 'resolu' &&
          (!vehiculeId || i.vehiculeId === vehiculeId) && (!equipId || i.equipId === equipId) && (!cote || i.cote === cote));
      },
      /** Gravité la plus haute parmi les incidents ouverts (0 = RAS). `equipIds` : liste d'équipements. */
      graviteMax(vehiculeId, equipId, cote) {
        return api.ouverts(vehiculeId, equipId, cote).reduce((m, i) => Math.max(m, i.gravite), 0);
      },
      graviteVue(v, vue) { // gravité max des défauts ouverts sur les équipements de cette vue
        const ids = api.equipsOf(v).filter(e => e.vue === vue).map(e => e.id);
        return data.incidents.filter(i => i.statut !== 'resolu' && i.vehiculeId === v.id && ids.indexOf(i.equipId) >= 0)
          .reduce((m, i) => Math.max(m, i.gravite), 0);
      },

      add(fields) {
        const inc = Object.assign({ id: nextId(), statut: 'ouvert', creeLe: now(), mailLe: null, journal: [] }, fields);
        inc.journal.push({ at: inc.creeLe, texte: 'Signalement créé (gravité ' + inc.gravite + ')' });
        data.incidents.push(inc);
        persist();
        return inc;
      },
      update(id, patch, texteJournal) {
        const inc = api.incident(id);
        if (!inc) return null;
        Object.assign(inc, patch);
        if (texteJournal) inc.journal.push({ at: now(), texte: texteJournal });
        if (patch.statut === 'resolu' && !inc.resoluLe) inc.resoluLe = now();
        if (patch.statut && patch.statut !== 'resolu') inc.resoluLe = null;
        persist();
        return inc;
      },
      /** Repart de zéro : signalements et parc importé effacés (les réglages sont conservés). */
      reset() { data.incidents = []; data.parc = null; persist(); },
      markMail(id, mode) { api.update(id, { mailLe: now() }, 'Mail préparé (' + mode + ')'); },
      markRelance(id, mode) {
        const inc = api.incident(id), rel = (inc.relances || []).concat(now());
        api.update(id, { relances: rel }, 'Relance n°' + rel.length + ' préparée (' + mode + ')');
      },

      /** Date du dernier mail envoyé à Simpliciti (signalement ou relance), ou null. */
      dernierMail: inc => (inc.relances && inc.relances.length ? inc.relances[inc.relances.length - 1] : inc.mailLe) || null,
      seuilRelance: inc => (D.relance || {})[inc.gravite] || 5,
      /** Défaut ouvert dont le dernier mail date de plus que le seuil de sa gravité. */
      aRelancer(inc) {
        const d = api.dernierMail(inc);
        return inc.statut !== 'resolu' && !!d && Date.now() - Date.parse(d) > api.seuilRelance(inc) * 864e5;
      },
      /** Signalements du même équipement (et de la même chaise) du même véhicule sur la fenêtre de récidive,
          jusqu'à la date de référence (incluse). `x` : incident ou { vehiculeId, equipId, cote }. */
      recidives(x, refIso) {
        const cfg = D.recidive || { jours: 90, seuil: 2 }, ref = Date.parse(refIso || x.creeLe || now()), debut = ref - cfg.jours * 864e5;
        return data.incidents.filter(i => i.vehiculeId === x.vehiculeId && i.equipId === x.equipId && (!x.cote || !i.cote || i.cote === x.cote) &&
          Date.parse(i.creeLe) >= debut && Date.parse(i.creeLe) <= ref + 1000).sort((a, b) => a.creeLe.localeCompare(b.creeLe));
      },
      estRecidive(x, refIso) { return api.recidives(x, refIso).length >= ((D.recidive || {}).seuil || 2); },

      reglages: () => data.reglages,
      setReglages(r) { Object.assign(data.reglages, r); persist(); },

      /* Enregistrements unitaires pour la synchronisation : un par signalement, un par véhicule, un pour l'en-tête du parc. */
      records() {
        const out = {};
        data.incidents.forEach(i => { out['inc:' + i.id] = i; });
        if (data.parc) {
          out.parc = { fichier: data.parc.fichier || '', importeLe: data.parc.importeLe || null, modifieLe: data.parc.modifieLe || null };
          data.parc.vehicules.forEach((v, n) => { out['veh:' + v.id] = Object.assign({}, v, { ordre: n }); });
        }
        return out;
      },
      /** Remplace signalements et parc par ces enregistrements (sans renvoyer au serveur). */
      chargerRecords(recs) {
        const cles = Object.keys(recs);
        data.incidents = cles.filter(k => k.indexOf('inc:') === 0).map(k => recs[k]);
        const vs = cles.filter(k => k.indexOf('veh:') === 0).map(k => recs[k])
          .sort((a, b) => (a.ordre == null ? 1e9 : a.ordre) - (b.ordre == null ? 1e9 : b.ordre) || String(a.immat).localeCompare(b.immat))
          .map(v => { const c = Object.assign({}, v); delete c.ordre; return c; });
        data.parc = recs.parc || vs.length ? Object.assign({ fichier: '', importeLe: null }, recs.parc || {}, { vehicules: vs }) : null;
        storage.save(data);
      },
      /** Renumérote un signalement (collision de référence entre deux postes). */
      renumeroter(id) {
        const inc = api.incident(id); if (!inc) return null;
        const ancien = inc.id.replace(/~$/, ''); inc.id = 'tmp'; inc.id = nextId();
        inc.journal.push({ at: now(), texte: 'Référence ' + ancien + ' déjà utilisée sur un autre poste : renumérotée ' + inc.id });
        persist();
        return inc.id;
      },

      exportJSON: () => JSON.stringify({ incidents: data.incidents, reglages: data.reglages, parc: data.parc }, null, 2),
      importJSON(text) {
        const o = JSON.parse(text);
        if (!o || !Array.isArray(o.incidents)) throw new Error('Fichier invalide');
        data.incidents = o.incidents;
        if (o.reglages) Object.assign(data.reglages, o.reglages);
        if (o.parc) data.parc = o.parc;
        persist();
      },
      exportCSV() {
        const cols = ['id', 'creeLe', 'immat', 'solution', 'equipement', 'gravite', 'statut', 'symptomes', 'cause_probable', 'declarant', 'resoluLe', 'mailLe', 'ticket', 'relances', 'recidive'];
        const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
        const rows = api.incidents().map(i => {
          const v = api.vehicule(i.vehiculeId) || {}, s = api.solution(v.solution) || {};
          return [i.id, i.creeLe, v.immat, s.label, api.libelle(i), i.gravite, i.statut, i.symptomes,
            i.diagnostic && i.diagnostic.cause, i.declarant, i.resoluLe, i.mailLe, i.ticket, (i.relances || []).length, api.estRecidive(i) ? 'oui' : ''].map(q).join(';');
        });
        return '﻿' + cols.join(';') + '\r\n' + rows.join('\r\n'); // BOM + ';' => ouverture directe dans Excel FR
      }
    };
    return api;
  };
})(window);
