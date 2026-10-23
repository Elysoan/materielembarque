/* Interface du module. Point d'entrée : MaterielEmbarque.mount(element, options) */
(function (root) {
  const ME = root.MaterielEmbarque;
  const D = ME.defaults;
  // Dossier du module (images, pictos), déduit de l'emplacement de ce script ; surchargeable via options.base
  const BASE = (document.currentScript && document.currentScript.src.replace(/[^/]*$/, '')) || 'module/';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sevLabel = n => (D.gravites.find(g => g.niveau === n) || {}).label || '';
  const statutLabel = id => (D.statuts.find(s => s.id === id) || {}).label || id;
  const fmt = ME.mail.fmt;
  const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

  function linkDownload(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return Promise.resolve();
  }

  function sevBadge(n) {
    return n ? '<span class="me-badge me-sev' + n + '">' + n + ' · ' + sevLabel(n) + '</span>' : '<span class="me-badge me-sev0">RAS</span>';
  }

  function mount(el, opts) {
    opts = opts || {};
    const base = opts.base || BASE;
    const store = ME.createStore(opts);
    const state = { tab: 'parc', vehicleId: store.vehicules[0] && store.vehicules[0].id, vue: 'arriere', q: '', agence: '', type: '', solution: '', fStatut: 'ouvert', fSev: '', fQ: '', fPeriode: '90', importRes: null };
    // Ressources : fichier à côté du module, ou intégrée (MaterielEmbarque.assets[chemin] = data URI) dans la version HTML autonome
    const asset = path => (ME.assets && ME.assets[path]) || base + path;
    const picto = name => asset('img/pictos/' + name + '.svg');
    // options.download(nom, texte, type) -> Promise : permet à l'outil hôte de fournir son propre enregistrement
    const download = opts.download || linkDownload;
    const emlOk = opts.eml !== false; // brouillon .eml (désactivable si l'hôte ne peut pas l'enregistrer)
    let toastTimer = null;
    const toast = msg => {
      let t = el.querySelector('.me-toast');
      if (!t) { t = document.createElement('div'); t.className = 'me-toast'; t.setAttribute('role', 'status'); el.appendChild(t); }
      t.textContent = msg; t.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
    };
    const save = (name, text, type, ok) => download(name, text, type).then(() => ok && toast(ok), e => toast(e && e.code === 'declined' ? 'Enregistrement annulé.' : 'Enregistrement impossible ici.'));

    el.classList.add('me-root');
    el.innerHTML =
      '<header class="me-head"><img class="me-logo" src="' + asset('img/logo-paprec.svg') + '" alt="Paprec"><h1 class="me-titre">Matériel embarqué</h1><span class="me-spacer"></span>' +
      '<nav class="me-tabs" role="tablist">' +
      ['parc:Parc', 'histo:Historique', 'regl:Réglages'].map(t => { const p = t.split(':'); return '<button role="tab" data-action="tab" data-id="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
      '</nav>' + (opts.version ? '<span class="me-pill">' + esc(opts.version) + '</span>' : '') + '</header><main class="me-view"></main><dialog class="me-dialog"></dialog>';
    const view = el.querySelector('.me-view');
    const dlg = el.querySelector('dialog');

    /* ---------- Vue détaillée (image + points cliquables) ---------- */
    function vueHtml(v, vue) {
      const cfg = store.vues[vue], lignes = store.lignes(v, vue);
      if (!lignes.length) {
        return '<p class="me-empty">Aucun équipement « ' + cfg.label.toLowerCase() + ' » défini pour la solution ' + esc((store.solution(v.solution) || {}).label) + ' (à compléter dans data.js).</p>';
      }
      const attrs = l => 'data-action="equip" data-id="' + l.eq.id + '"' + (l.cote ? ' data-cote="' + l.cote + '"' : '');
      const name = l => l.eq.label + (l.cote ? ' - ' + l.cote : '');
      const sev = l => store.graviteMax(v.id, l.eq.id, l.cote);

      const spots = lignes.filter(l => !l.eq.hors).map(l => {
        const p = l.cote ? l.eq.pos[l.cote] : l.eq.pos, n = sev(l);
        return '<button class="me-hot me-s' + n + '" style="left:' + (p[0] / cfg.w * 100).toFixed(2) + '%;top:' + (p[1] / cfg.h * 100).toFixed(2) + '%" ' + attrs(l) +
          ' title="' + esc(name(l) + (n ? ' - défaut gravité ' + n : ' - RAS')) + '" aria-label="' + esc(name(l) + (n ? ', défaut gravité ' + n : ', RAS')) + '">' +
          '<span class="me-pulse"></span><b>' + l.eq.code + (l.cote ? '<small>' + l.cote[0] + '</small>' : '') + '</b>' + (n ? '<i>' + n + '</i>' : '') + '</button>';
      }).join('');

      const hors = lignes.filter(l => l.eq.hors);
      const tray = hors.length ? '<div class="me-tray"><span>Non visibles sur l\'image :</span>' + hors.map(l =>
        '<button class="me-chip me-s' + sev(l) + '" ' + attrs(l) + '>' + esc(name(l)) + (sev(l) ? ' · ' + sev(l) : '') + '</button>').join('') + '</div>' : '';

      const rows = lignes.map(l => {
        const n = sev(l), nb = store.ouverts(v.id, l.eq.id, l.cote).length;
        return '<tr><td class="me-ico">' + (l.eq.picto ? '<img src="' + picto(l.eq.picto) + '" alt="">' : '') + '</td><td>' + esc(l.eq.label) + (l.cote ? ' <small>' + l.cote + '</small>' : '') + '</td><td>' + sevBadge(n) + '</td>' +
          '<td><button class="me-btn" ' + attrs(l) + '>' + (nb ? 'Voir / ajouter' : 'Signaler') + '</button></td></tr>';
      }).join('');

      return '<figure class="me-vue" style="aspect-ratio:' + cfg.w + '/' + cfg.h + '"><img src="' + asset(cfg.img) + '" alt="Vue ' + esc(cfg.label.toLowerCase()) + '" draggable="false">' + spots + '</figure>' + tray +
        '<div class="me-scroll"><table class="me-table"><thead><tr><th></th><th>Équipement</th><th>État</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    /* ---------- Vues ---------- */
    function renderParc() {
      const agences = Array.from(new Set(store.vehicules.map(v => v.agence))).sort();
      const sans = x => String(x).toLowerCase().replace(/[\s\-]+/g, ''); // « GH-148 » trouve GH148HB
      const q = sans(state.q);
      const list = store.vehicules.filter(v => (!state.agence || v.agence === state.agence) && (!state.type || v.type === state.type) &&
        (!state.solution || v.solution === state.solution) && (!q || sans(v.immat + ' ' + v.modele + ' ' + v.agence).indexOf(q) >= 0));
      if (!store.vehicule(state.vehicleId) && list.length) state.vehicleId = list[0].id;
      const v = store.vehicule(state.vehicleId);
      if (v && !store.lignes(v, state.vue).length) { // vue sans équipement pour cette solution : bascule sur une vue renseignée
        const alt = Object.keys(store.vues).find(k => store.lignes(v, k).length);
        if (alt) state.vue = alt;
      }
      const sel = (key, arr, all) => '<select data-input="' + key + '"><option value="">' + all + '</option>' + arr.map(a => '<option value="' + a[0] + '"' + (a[0] === state[key] ? ' selected' : '') + '>' + esc(a[1]) + '</option>').join('') + '</select>';

      const cards = list.map(x => {
        const n = store.ouverts(x.id).length, sev = store.graviteMax(x.id);
        return '<button class="me-card' + (x.id === state.vehicleId ? ' is-sel' : '') + '" data-action="vehicle" data-id="' + x.id + '">' +
          '<img class="me-picto-mini" src="' + picto((store.type(x.type) || {}).picto) + '" alt="">' +
          '<strong>' + esc(x.immat) + '</strong><span>' + esc((store.type(x.type) || {}).label) + ' · ' + esc(x.agence) + '</span><span>' + esc((store.solution(x.solution) || {}).label) + '</span>' +
          (n ? '<span class="me-badge me-sev' + sev + '">' + n + ' défaut' + (n > 1 ? 's' : '') + ' · max ' + sev + '</span>' : '<span class="me-badge me-sev0">RAS</span>') + '</button>';
      }).join('') || '<p class="me-empty">Aucun véhicule.</p>';

      let detail = '<p class="me-empty">Sélectionnez un véhicule.</p>';
      if (v) {
        const t = store.type(v.type), vues = Object.keys(store.vues);
        const zoneBtn = (vue, cls) => { const n = store.graviteVue(v, vue); return '<button class="me-zone ' + cls + ' me-s' + n + (state.vue === vue ? ' is-sel' : '') + '" data-action="vue" data-id="' + vue + '"><span>' + store.vues[vue].label + (n ? ' · ' + n : '') + '</span></button>'; };
        detail = '<div class="me-vhead"><h3>' + esc(v.immat) + '</h3><p>' + esc(t.label) + ' · ' + esc((store.solution(v.solution) || {}).label) + ' · ' + esc(v.modele) + ' · ' + esc(v.agence) + '</p></div>' +
          '<figure class="me-picto' + (t.zones ? ' has-zones' : '') + '"><div class="me-picto-box"><img src="' + picto(t.picto) + '" alt="' + esc(t.label) + '">' +
          (t.zones ? zoneBtn('arriere', 'me-zone-ar') + zoneBtn('cabine', 'me-zone-cab') : '') + '</div></figure>' +
          '<div class="me-vuetabs" role="tablist">' + vues.map(k => { const n = store.graviteVue(v, k); return '<button role="tab" class="me-vtab" aria-selected="' + (state.vue === k) + '" data-action="vue" data-id="' + k + '">' + store.vues[k].label + (n ? ' <span class="me-badge me-sev' + n + '">' + n + '</span>' : '') + '</button>'; }).join('') + '</div>' +
          '<p class="me-hint">Cliquez sur un équipement : diagnostic guidé, niveau de gravité, puis mail prêt pour Outlook.</p>' + vueHtml(v, state.vue);
      }

      view.innerHTML = '<div class="me-parc"><aside><h2 class="me-label">Parc <small>· ' + list.length + ' véhicule' + (list.length > 1 ? 's' : '') + '</small></h2>' +
        (store.parcInfo().demo ? '<p class="me-info">Parc de démonstration. <a href="#" data-action="modele">Télécharger le modèle</a> · <a href="#" data-action="goto-import">Importer votre parc</a></p>' : '') +
        '<div class="me-filters">' +
        '<input type="search" placeholder="Immatriculation, modèle…" value="' + esc(state.q) + '" data-input="q">' +
        sel('agence', agences.map(a => [a, a]), 'Toutes agences') + sel('solution', store.solutions.map(s => [s.id, s.label]), 'Toutes solutions') + sel('type', store.types.map(t => [t.id, t.label]), 'Tous types') + '</div>' +
        '<div class="me-cards">' + cards + '</div></aside><section>' + detail + '</section></div>';
    }

    // Durée lisible : « 5 h », « 2,4 j »
    const duree = ms => ms < 36e5 ? '< 1 h' : ms < 864e5 ? Math.round(ms / 36e5) + ' h' : (ms / 864e5).toFixed(ms < 864e6 ? 1 : 0).replace('.', ',') + ' j';
    const delaiRes = i => i.resoluLe ? Date.parse(i.resoluLe) - Date.parse(i.creeLe) : null; // du signalement à la résolution
    const mediane = a => { const t = a.slice().sort((x, y) => x - y), m = t.length >> 1; return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2; };

    // Barres horizontales classées (une seule teinte, valeur écrite à côté, info-bulle au survol)
    function barres(items, unite) {
      if (!items.length) return '<p class="me-empty">Pas encore de données sur cette période.</p>';
      const max = Math.max.apply(null, items.map(x => x.val)) || 1;
      return '<div class="me-barres" role="table">' + items.map(x =>
        '<div class="me-barre" role="row" title="' + esc(x.aide || '') + '"><span class="lib" role="cell">' + x.lib + '</span>' +
        '<span class="piste" role="cell" aria-hidden="true"><i style="width:' + Math.max(2, x.val / max * 100).toFixed(1) + '%"></i></span>' +
        '<span class="val" role="cell">' + (x.txt != null ? x.txt : x.val) + (unite || '') + '</span></div>').join('') + '</div>';
    }

    function statsHtml(all) {
      const jours = +state.fPeriode, depuis = jours ? Date.now() - jours * 864e5 : 0;
      const per = all.filter(i => Date.parse(i.creeLe) >= depuis);
      const nomPeriode = { 30: '30 derniers jours', 90: '90 derniers jours', 365: '12 derniers mois', 0: 'depuis le début' }[jours];

      // Équipements les plus défectueux (toutes chaises confondues)
      const parEq = {};
      per.forEach(i => { const k = i.equipId; (parEq[k] = parEq[k] || { n: 0, o: 0 }).n++; if (i.statut !== 'resolu') parEq[k].o++; });
      const eqs = Object.keys(parEq).sort((x, y) => parEq[y].n - parEq[x].n).slice(0, 6).map(k => {
        const e = store.equipement(k) || { label: k };
        return { lib: esc(e.label), val: parEq[k].n, aide: e.label + ' : ' + parEq[k].n + ' signalement(s), dont ' + parEq[k].o + ' ouvert(s)' };
      });

      // Véhicules les plus touchés : nombre de signalements, puis gravité la plus haute
      const parV = {};
      per.forEach(i => { const x = parV[i.vehiculeId] = parV[i.vehiculeId] || { n: 0, g: 0, o: 0 }; x.n++; x.g = Math.max(x.g, i.gravite); if (i.statut !== 'resolu') x.o++; });
      const vs = Object.keys(parV).sort((x, y) => parV[y].n - parV[x].n || parV[y].g - parV[x].g).slice(0, 5);
      const vehs = vs.map((id, k) => {
        const v = store.vehicule(id) || { immat: '(véhicule retiré)' }, x = parV[id];
        return { lib: esc(v.immat) + ' <small>' + esc((store.type(v.type) || {}).label || '') + '</small>' + (k === 0 && x.n > 1 ? ' <span class="me-tag">le plus problématique</span>' : ''),
          val: x.n, aide: v.immat + ' : ' + x.n + ' signalement(s), ' + x.o + ' ouvert(s), gravité max ' + x.g };
      });

      // Délai de résolution par gravité
      const res = per.filter(i => i.resoluLe), dts = res.map(delaiRes);
      const parG = D.gravites.map(g => {
        const d = res.filter(i => i.gravite === g.niveau).map(delaiRes);
        return d.length ? { lib: sevBadge(g.niveau), val: d.reduce((a, b) => a + b, 0) / d.length / 864e5, txt: duree(d.reduce((a, b) => a + b, 0) / d.length) + ' <small>(' + d.length + ')</small>',
          aide: 'Gravité ' + g.niveau + ' : délai moyen ' + duree(d.reduce((a, b) => a + b, 0) / d.length) + ' sur ' + d.length + ' signalement(s) résolu(s)' } : null;
      }).filter(Boolean);
      const vieux = all.filter(i => i.statut !== 'resolu').sort((a, b) => a.creeLe.localeCompare(b.creeLe))[0];
      const vieuxV = vieux && (store.vehicule(vieux.vehiculeId) || {});

      const sel = '<select data-input="fPeriode" aria-label="Période des statistiques">' + [[30, '30 jours'], [90, '90 jours'], [365, '12 mois'], [0, 'Tout']].map(o =>
        '<option value="' + o[0] + '"' + (+state.fPeriode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
      return '<div class="me-stats-tete"><h3>Statistiques <small>· ' + per.length + ' signalement' + (per.length > 1 ? 's' : '') + ', ' + nomPeriode + '</small></h3>' + sel + '</div>' +
        '<div class="me-stats">' +
        '<section class="me-panel"><h4>Équipements les plus défectueux</h4>' + barres(eqs) + '</section>' +
        '<section class="me-panel"><h4>Véhicules les plus touchés</h4>' + barres(vehs) + '</section>' +
        '<section class="me-panel"><h4>Délai de résolution par gravité</h4>' + barres(parG) +
          (dts.length ? '<p class="me-hint">Moyenne ' + duree(dts.reduce((a, b) => a + b, 0) / dts.length) + ' · médiane ' + duree(mediane(dts)) + ' · du signalement à la résolution</p>' : '') +
          (vieux ? '<p class="me-hint">Ouvert depuis le plus longtemps : <a href="#" data-action="incident" data-id="' + vieux.id + '">' + vieux.id + '</a> (' + esc(vieuxV.immat || '') + ', ' + esc(store.libelle(vieux)) + '), ' + duree(Date.now() - Date.parse(vieux.creeLe)) + '</p>' : '') +
        '</section></div>';
    }

    function renderHisto() {
      const q = state.fQ.toLowerCase();
      const list = store.incidents().filter(i => {
        const v = store.vehicule(i.vehiculeId) || {};
        return (state.fStatut === '' || (state.fStatut === 'ouvert' ? i.statut !== 'resolu' : i.statut === state.fStatut)) &&
          (!state.fSev || i.gravite === +state.fSev) &&
          (!q || (i.id + ' ' + v.immat + ' ' + store.libelle(i) + ' ' + i.symptomes).toLowerCase().indexOf(q) >= 0);
      });
      const rows = list.map(i => {
        const v = store.vehicule(i.vehiculeId) || {};
        const d = i.resoluLe ? 'résolu en ' + duree(delaiRes(i)) : 'ouvert depuis ' + duree(Date.now() - Date.parse(i.creeLe));
        return '<tr class="me-click" tabindex="0" data-action="incident" data-id="' + i.id + '"><td class="me-id">' + i.id + '</td><td class="me-num">' + fmt(i.creeLe) + '</td><td class="me-immat">' + esc(v.immat || '—') + '</td>' +
          '<td>' + esc(store.libelle(i)) + (i.diagnostic ? '<br><small>Cause : ' + esc(i.diagnostic.cause) + '</small>' : '') + '</td><td>' + sevBadge(i.gravite) + '</td><td>' + statutLabel(i.statut) + '</td>' +
          '<td class="me-num' + (!i.resoluLe && Date.now() - Date.parse(i.creeLe) > 7 * 864e5 ? ' me-retard' : '') + '">' + d + '</td><td>' + (i.mailLe ? 'Oui' : '-') + '</td></tr>';
      }).join('');
      const all = store.incidents(), open = all.filter(i => i.statut !== 'resolu');
      const dts = all.filter(i => i.resoluLe).map(delaiRes);
      const kpi = (lib, val, c, sous) => '<div class="me-kpi"' + (c ? ' style="--c:var(' + c + ')"' : '') + '><div class="lib">' + lib + '</div><div class="val">' + val + '</div>' + (sous ? '<div class="sous">' + sous + '</div>' : '') + '</div>';
      const kpis = '<div class="me-kpis">' + kpi('Défauts ouverts', open.length, open.length ? '--me-s2' : '--me-s0') +
        kpi('Majeurs ou critiques', open.filter(i => i.gravite >= 3).length, open.some(i => i.gravite >= 3) ? '--me-s3' : '--me-s0') +
        kpi('Véhicules concernés', new Set(open.map(i => i.vehiculeId)).size + ' / ' + store.vehicules.length) +
        kpi('Délai moyen de résolution', dts.length ? duree(dts.reduce((a, b) => a + b, 0) / dts.length) : '—', '--bleu', dts.length ? 'médiane ' + duree(mediane(dts)) + ' · ' + dts.length + ' résolu' + (dts.length > 1 ? 's' : '') : 'aucun signalement résolu') + '</div>';
      const opt = (arr, cur, all) => '<option value="">' + all + '</option>' + arr.map(a => '<option value="' + a[0] + '"' + (String(a[0]) === String(cur) ? ' selected' : '') + '>' + a[1] + '</option>').join('');
      view.innerHTML = '<div class="me-stack"><div class="me-pad"><h2 class="me-label">Historique des signalements</h2>' + kpis + statsHtml(all) + '</div>' +
        '<div class="me-pad"><h2 class="me-label">Signalements</h2><div class="me-row">' +
        '<input type="search" style="flex:2;min-width:180px" placeholder="Rechercher…" value="' + esc(state.fQ) + '" data-input="fQ">' +
        '<select style="flex:1;min-width:140px" data-input="fStatut">' + opt([['ouvert', 'Non résolus'], ['resolu', 'Résolus']], state.fStatut, 'Tous statuts') + '</select>' +
        '<select style="flex:1;min-width:140px" data-input="fSev">' + opt(D.gravites.map(g => [g.niveau, g.niveau + ' · ' + g.label]), state.fSev, 'Toutes gravités') + '</select>' +
        '<span class="me-spacer"></span><button class="me-btn" data-action="csv">Export CSV</button></div>' +
        '<div class="me-scroll"><table class="me-table"><thead><tr><th>Réf.</th><th>Date</th><th>Véhicule</th><th>Équipement</th><th>Gravité</th><th>Statut</th><th>Délai</th><th>Mail</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="8" class="me-empty">Aucun signalement pour ces filtres.</td></tr>') + '</tbody></table></div></div></div>';
    }

    function importHtml() {
      const info = store.parcInfo(), res = state.importRes, nb = store.vehicules.length;
      let rapport = '';
      if (res && res.chargement) rapport = '<p class="me-info">Lecture de « ' + esc(res.fichier) + ' »…</p>';
      else if (res && res.echec) rapport = '<p class="me-warn">' + esc(res.echec) + '</p>';
      else if (res) {
        const ids = res.vehicules.map(v => v.id);
        const orphelins = store.incidents().filter(i => ids.indexOf(i.vehiculeId) < 0).length;
        const parSol = store.solutions.map(s => [s.label, res.vehicules.filter(v => v.solution === s.id).length]).filter(x => x[1]);
        const liste = (arr, titre) => arr.length ? '<details' + (arr.length <= 8 ? ' open' : '') + '><summary>' + titre + ' (' + arr.length + ')</summary><ul class="me-points">' +
          arr.map(e => '<li>' + (e.ligne ? '<b>Ligne ' + e.ligne + '</b> · ' : '') + esc(e.texte) + '</li>').join('') + '</ul></details>' : '';
        rapport = '<div class="me-rapport"><h3>Analyse de « ' + esc(res.fichier) + ' »</h3><div class="me-puces">' +
          '<div class="me-puce ok"><span class="i">✓</span><div><b>' + res.vehicules.length + ' véhicule' + (res.vehicules.length > 1 ? 's' : '') + ' prêt' + (res.vehicules.length > 1 ? 's' : '') + '</b><span class="d">' + (parSol.map(x => x[0] + ' : ' + x[1]).join(' · ') || '—') + '</span></div></div>' +
          '<div class="me-puce ' + (res.erreurs.length ? 'ko' : 'ok') + '"><span class="i">' + (res.erreurs.length ? '✗' : '✓') + '</span><div><b>' + res.erreurs.length + ' ligne' + (res.erreurs.length > 1 ? 's' : '') + ' en erreur</b><span class="d">' + (res.erreurs.length ? 'non importée' + (res.erreurs.length > 1 ? 's' : '') + ', à corriger dans le fichier' : 'aucune') + '</span></div></div>' +
          '<div class="me-puce ' + (res.avertissements.length ? 'att' : 'ok') + '"><span class="i">' + (res.avertissements.length ? '!' : '✓') + '</span><div><b>' + res.avertissements.length + ' avertissement' + (res.avertissements.length > 1 ? 's' : '') + '</b><span class="d">' + (res.ignorees ? 'ligne d\'exemple ignorée' : 'importés quand même') + '</span></div></div></div>' +
          liste(res.erreurs, 'Erreurs') + liste(res.avertissements, 'Avertissements') +
          (orphelins ? '<p class="me-warn">' + orphelins + ' signalement' + (orphelins > 1 ? 's concernent' : ' concerne') + ' des véhicules absents de ce fichier : ' + (orphelins > 1 ? 'ils restent' : 'il reste') + ' dans l\'historique, sans véhicule associé.</p>' : '') +
          '<div class="me-actions"><button type="button" class="me-btn" data-action="import-annuler">Annuler</button>' +
          '<button type="button" class="me-btn me-vert" data-action="import-appliquer"' + (res.vehicules.length ? '' : ' disabled') + '>Remplacer le parc par ces ' + res.vehicules.length + ' véhicules</button></div></div>';
      }
      return '<div class="me-pad" id="me-import"><h2 class="me-label">Parc de véhicules</h2>' +
        '<p class="me-sub">' + (info.demo ? 'Parc de démonstration (' + nb + ' véhicules) : importez le vôtre avec le modèle Excel.'
          : nb + ' véhicule' + (nb > 1 ? 's' : '') + (info.fichier ? ', importé' + (nb > 1 ? 's' : '') + ' depuis « ' + esc(info.fichier) + ' » le ' + fmt(info.importeLe) : '') + '. Un nouvel import remplace tout le parc ; l\'historique suit les véhicules par leur immatriculation.') + '</p>' +
        '<ol class="me-guide"><li><b>Télécharger le modèle Excel</b> <button type="button" class="me-btn me-vert" data-action="modele">⬇ Modèle de parc (.xlsx)</button></li>' +
        '<li><b>Le remplir</b> : une ligne par véhicule ; les équipements se remplissent selon la solution, mettre « Non » si absent.</li>' +
        '<li><b>Le déposer ci-dessous</b>, vérifier le rapport, puis valider.</li></ol>' +
        '<div class="me-depot" tabindex="0" role="button" data-action="import-choisir"><strong>Glisser le fichier du parc ici</strong> ou cliquer pour le choisir<small>Modèle Excel (.xlsx) ou CSV</small></div>' +
        '<input type="file" accept=".xlsx,.xls,.csv" data-input="parc-in" hidden>' + rapport +
        (store.parcInfo().demo ? '' : '<div class="me-actions" style="justify-content:flex-start"><button type="button" class="me-btn" data-action="parc-out">Exporter le parc actuel (CSV) pour le modifier</button></div>') + '</div>';
    }

    function importer(file) {
      if (!file) return;
      state.importRes = { chargement: true, fichier: file.name }; render();
      ME.parc.lireFichier(file).then(lignes => { state.importRes = Object.assign(ME.parc.analyse(lignes, store), { fichier: file.name }); },
        e => { state.importRes = { fichier: file.name, echec: (e && e.message) || 'Fichier illisible : utilisez le modèle Excel ou un CSV.' }; })
        .then(() => { if (state.tab === 'regl') render(); });
    }

    function renderRegl() {
      const r = store.reglages();
      const f = (k, label, ph) => '<label>' + label + '<input name="' + k + '" value="' + esc(r[k]) + '" placeholder="' + esc(ph || '') + '"></label>';
      view.innerHTML = '<div class="me-stack">' + importHtml() + '<div class="me-pad"><form class="me-form" data-form="regl"><h2 class="me-label">Réglages du mail</h2>' +
        '<p class="me-info">Les signalements sont adressés à <b>' + esc(store.destinataire) + '</b> ; <b>' + esc(store.copieFixe) + '</b> est toujours en copie ; l\'objet commence par la solution du véhicule (ex. [CITI\'ID]).</p>' +
        f('copie', 'Copie supplémentaire (facultatif)', 'atelier@… ; responsable@…') + f('declarant', 'Votre nom (signature)') +
        '<div class="me-actions"><button class="me-btn me-primary">Enregistrer</button></div>' +
        '<h2 class="me-label">Données</h2><div class="me-actions" style="justify-content:flex-start"><button type="button" class="me-btn" data-action="json-out">Sauvegarder (JSON)</button>' +
        '<label class="me-btn">Restaurer (JSON)<input type="file" accept=".json" data-input="json-in" hidden></label></div>' +
        '<p class="me-info">Les données sont stockées dans ce navigateur. Pour un usage partagé, branchez un stockage serveur (voir README).</p></form></div></div>';
    }

    function render() {
      el.querySelectorAll('.me-tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.id === state.tab));
      ({ parc: renderParc, histo: renderHisto, regl: renderRegl })[state.tab]();
    }

    /* ---------- Dialogues ---------- */
    // Parcours du signalement : 1 Diagnostic → 2 Gravité et symptômes → 3 Mail
    function etapes(n) {
      return '<div class="me-etapes" data-etapes>' + ['Diagnostic', 'Gravité et symptômes', 'Mail'].map((t, i) =>
        '<div class="me-etape' + (i + 1 < n ? ' fait' : i + 1 === n ? ' cours' : '') + '"><span class="n">' + (i + 1 < n ? '✓' : i + 1) + '</span>' + t + '</div>').join('') + '</div>';
    }
    function openDlg(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); }
    const closeBtn = '<button type="button" class="me-x" data-action="close" aria-label="Fermer">×</button>';

    // Diagnostic guidé en cours dans le dialogue de signalement
    let diag = { st: null, auto: '' };

    function diagBlock() {
      const st = diag.st;
      if (!st) {
        return '<div class="me-diag-intro"><div><strong>Diagnostic guidé</strong><p class="me-hint">Répondez aux questions pour identifier la cause probable (arbres de causes du guide Simpliciti). Facultatif.</p></div>' +
          '<button type="button" class="me-btn" data-action="diag-start">Démarrer</button></div>';
      }
      const hist = st.chemin.length ? '<ol class="me-diag-hist">' + st.chemin.map(c => '<li>' + esc(c.q) + ' <strong>→ ' + esc(c.r) + '</strong></li>').join('') + '</ol>' : '';
      const back = st.chemin.length ? '<button type="button" class="me-btn" data-action="diag-back">← Étape précédente</button>' : '';
      if (st.fin) {
        const f = st.fin;
        return hist + '<div class="me-diag-fin"><h4>Cause probable</h4><p>' + esc(f.cause) + '</p><h4>Action recommandée</h4><p>' + esc(f.action) + '</p>' +
          '<p>Gravité suggérée : ' + sevBadge(f.gravite) + ' <small>(appliquée ci-dessous, modifiable)</small></p>' +
          (f.contact ? '<p class="me-warn">À escalader à Simpliciti : joindre ce diagnostic au ticket (il sera repris dans le mail).</p>' : '') +
          (f.piste ? '<p class="me-warn">Piste hors guide constructeur : à valider avant d\'intervenir.</p>' : '') +
          '<p class="me-hint">Source : ' + esc(f.source) + '</p><div class="me-actions"><button type="button" class="me-btn" data-action="diag-reset">Recommencer</button>' + back + '</div></div>';
      }
      const a = ME.diag.arbre(st), n = ME.diag.noeud(st);
      return '<div class="me-diag-q"><p class="me-hint">' + esc(a.titre) + ' · ' + esc(a.source) + '</p>' + (a.rappel && !st.chemin.length ? '<p class="me-warn">' + esc(a.rappel) + '</p>' : '') + hist +
        '<p class="me-q">' + esc(n.q) + '</p><div class="me-opts">' + n.options.map((o, i) => '<button type="button" class="me-btn me-opt" data-action="diag-answer" data-i="' + i + '">' + esc(o.r) + '</button>').join('') + '</div>' +
        '<div class="me-actions">' + back + '<button type="button" class="me-btn" data-action="diag-reset">Quitter le diagnostic</button></div></div>';
    }
    function refreshDiag() {
      const host = dlg.querySelector('[data-diag]');
      if (host) host.innerHTML = diagBlock();
      const et = dlg.querySelector('[data-etapes]');
      if (et) et.outerHTML = etapes(diag.st && diag.st.fin ? 2 : 1);
      const st = diag.st, f = dlg.querySelector('[data-form="declare"]');
      if (st && st.fin && f) { // applique la gravité suggérée et pré-remplit le constat
        const r = f.querySelector('input[name=gravite][value="' + st.fin.gravite + '"]'); if (r) r.checked = true;
        if (st.chemin[0] && (!f.symptomes.value.trim() || f.symptomes.value === diag.auto)) { diag.auto = 'Constat : ' + st.chemin[0].r + '.'; f.symptomes.value = diag.auto; }
      }
    }

    function declareDialog(equipId, cote) {
      const v = store.vehicule(state.vehicleId), e = store.equipement(equipId);
      diag = { st: null, auto: '' };
      const ops = store.ouverts(v.id, equipId);
      const existing = ops.length ? '<div class="me-warn"><strong>' + ops.length + ' défaut(s) déjà ouvert(s) sur cet équipement :</strong><ul>' +
        ops.map(i => '<li><a href="#" data-action="incident" data-id="' + i.id + '">' + i.id + '</a> · ' + esc(store.libelle(i)) + ' · ' + sevBadge(i.gravite) + ' ' + esc(i.symptomes.slice(0, 80)) + '</li>').join('') + '</ul></div>' : '';
      const chaise = e.cotes ? '<label>Chaise concernée' + (e.coteObligatoire ? '' : ' (facultatif)') + '<select name="cote"' + (e.coteObligatoire ? ' required' : '') + '>' +
        '<option value="">' + (e.coteObligatoire ? 'Choisir…' : 'Non précisée') + '</option>' + e.cotes.map(c => '<option' + (c === cote ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></label>' : '';
      openDlg(closeBtn + '<form class="me-form" data-form="declare" data-equip="' + equipId + '"><h3>' + (e.picto ? '<img class="me-ico-h" src="' + picto(e.picto) + '" alt="">' : '') + esc(e.label) + '</h3>' +
        '<p class="me-sub">' + esc(v.immat) + '</p>' + (e.arbre ? etapes(1) : '') + existing + chaise +
        (e.arbre ? '<section class="me-diag" data-diag>' + diagBlock() + '</section>' : '') +
        '<fieldset><legend>Niveau de gravité</legend>' + D.gravites.map(g =>
          '<label class="me-sevopt me-sev' + g.niveau + '"><input type="radio" name="gravite" value="' + g.niveau + '" required' + (g.niveau === 2 ? ' checked' : '') + '>' +
          '<span><strong>' + g.niveau + ' · ' + g.label + '</strong><small>' + g.aide + '</small></span></label>').join('') + '</fieldset>' +
        '<label>Description des symptômes<textarea name="symptomes" rows="4" required placeholder="Que constate-t-on ? Depuis quand ? Intermittent ou permanent ? Voyant, message d\'erreur…"></textarea></label>' +
        '<div class="me-row"><label>Constaté le<input type="datetime-local" name="constateLe" value="' + localNow() + '" required></label>' +
        '<label>Signalé par<input name="declarant" value="' + esc(store.reglages().declarant) + '" required></label></div>' +
        '<div class="me-actions"><button type="button" class="me-btn" data-action="close">Annuler</button><button class="me-btn me-vert">Enregistrer et préparer le mail</button></div></form>');
    }

    function incidentDialog(id) {
      const i = store.incident(id), v = store.vehicule(i.vehiculeId) || {}, d = i.diagnostic;
      openDlg(closeBtn + '<form class="me-form" data-form="update" data-id="' + id + '"><h3>' + id + ' <small>' + sevBadge(i.gravite) + '</small></h3>' +
        '<p class="me-sub">' + esc(store.libelle(i)) + ' · ' + esc(v.immat) + '</p>' +
        '<p class="me-pre">' + esc(i.symptomes) + '</p>' +
        (d ? '<details class="me-diag-hist-d"><summary>Diagnostic guidé : ' + esc(d.cause) + '</summary><ol class="me-diag-hist">' + d.chemin.map(c => '<li>' + esc(c.q) + ' <strong>→ ' + esc(c.r) + '</strong></li>').join('') + '</ol><p><strong>Action recommandée :</strong> ' + esc(d.action) + '</p></details>' : '') +
        '<p class="me-sub">Constaté le ' + fmt(i.constateLe) + ' par ' + esc(i.declarant) + '</p>' +
        '<div class="me-row"><label>Statut<select name="statut">' + D.statuts.map(s => '<option value="' + s.id + '"' + (s.id === i.statut ? ' selected' : '') + '>' + s.label + '</option>').join('') + '</select></label>' +
        '<label>Gravité<select name="gravite">' + D.gravites.map(g => '<option value="' + g.niveau + '"' + (g.niveau === i.gravite ? ' selected' : '') + '>' + g.niveau + ' · ' + g.label + '</option>').join('') + '</select></label></div>' +
        '<label>Commentaire (ajouté au journal)<input name="commentaire" placeholder="Intervention prévue, pièce commandée, résolu par…"></label>' +
        '<h4>Journal</h4><ul class="me-log">' + i.journal.slice().reverse().map(j => '<li><time>' + fmt(j.at) + '</time> ' + esc(j.texte) + '</li>').join('') + '</ul>' +
        '<div class="me-actions"><button type="button" class="me-btn" data-action="mail" data-id="' + id + '">Préparer le mail</button><button class="me-btn me-primary">Mettre à jour</button></div></form>');
    }

    let currentMail = null;
    function mailDialog(id, fresh) {
      const i = store.incident(id);
      currentMail = { id, m: ME.mail.build(store, i) };
      const m = currentMail.m;
      openDlg(closeBtn + '<form class="me-form" data-form="mail"><h3>Mail prêt à envoyer</h3>' + (fresh ? etapes(3) : '') +
        (fresh ? '<p class="me-ok">Signalement ' + id + ' enregistré dans l\'historique.</p>' : '') +
        '<label>À<input name="to" value="' + esc(m.to) + '" readonly></label><label>Cc<input name="cc" value="' + esc(m.cc) + '"></label>' +
        '<label>Objet<input name="subject" value="' + esc(m.subject) + '"></label>' +
        '<label>Message<textarea name="body" rows="14">' + esc(m.body) + '</textarea></label>' +
        '<p class="me-hint" data-note>' + (emlOk ? '' : 'Si Outlook ne s\'ouvre pas, copiez le message et collez-le dans un nouveau mail.') + '</p>' +
        '<div class="me-actions"><button type="button" class="me-btn me-vert" data-action="outlook">Ouvrir dans Outlook</button>' +
        (emlOk ? '<button type="button" class="me-btn" data-action="eml">Télécharger le brouillon (.eml)</button>' : '') +
        '<button type="button" class="me-btn" data-action="copy">Copier</button></div></form>');
    }
    const readMail = () => {
      const f = dlg.querySelector('[data-form="mail"]');
      return { to: f.to.value.trim(), cc: f.cc.value.trim(), subject: f.subject.value, body: f.body.value };
    };
    const note = t => { const n = dlg.querySelector('[data-note]'); if (n) n.textContent = t; };

    /* ---------- Événements ---------- */
    const actions = {
      tab: t => { state.tab = t.dataset.id; render(); },
      vehicle: t => { state.vehicleId = t.dataset.id; render(); },
      vue: t => { state.vue = t.dataset.id; render(); },
      equip: t => declareDialog(t.dataset.id, t.dataset.cote),
      incident: t => incidentDialog(t.dataset.id),
      close: () => dlg.close(),
      'diag-start': () => { diag.st = ME.diag.start(store.equipement(dlg.querySelector('[data-form="declare"]').dataset.equip).arbre); refreshDiag(); },
      'diag-answer': t => { ME.diag.answer(diag.st, +t.dataset.i); refreshDiag(); },
      'diag-back': () => { ME.diag.back(diag.st); refreshDiag(); },
      'diag-reset': () => { diag.st = null; refreshDiag(); },
      'goto-import': () => { state.tab = 'regl'; render(); const s = el.querySelector('#me-import'); if (s) s.scrollIntoView({ block: 'start' }); },
      'import-choisir': () => el.querySelector('[data-input="parc-in"]').click(),
      'import-annuler': () => { state.importRes = null; render(); },
      'import-appliquer': () => {
        const res = state.importRes; if (!res || !res.vehicules.length) return;
        store.setParc(res.vehicules, res.fichier);
        state.importRes = null; state.vehicleId = res.vehicules[0].id; state.tab = 'parc'; state.agence = state.type = state.solution = state.q = '';
        render(); toast('Parc importé : ' + res.vehicules.length + ' véhicules.');
      },
      modele: () => {
        // options.modele() -> Promise<Blob> : l'hôte peut fournir le modèle autrement qu'en fichier .xlsx servi
        const url = asset('modele-parc-vehicules.xlsx'), nom = 'modele-parc-vehicules.xlsx';
        (opts.modele ? opts.modele() : fetch(url).then(r => { if (!r.ok) throw 0; return r.blob(); }))
          .then(b => save(nom, b, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Modèle enregistré : remplissez-le puis déposez-le ici.'),
            () => { const a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); });
      },
      'parc-out': () => save('parc-vehicules.csv', ME.parc.exporterCSV(store), 'text/csv;charset=utf-8', 'Parc exporté : modifiez-le puis réimportez-le.'),
      csv: () => save('historique-materiel-embarque.csv', store.exportCSV(), 'text/csv;charset=utf-8', 'Historique exporté.'),
      'json-out': () => save('materiel-embarque-sauvegarde.json', store.exportJSON(), 'application/json', 'Sauvegarde enregistrée.'),
      mail: t => mailDialog(t.dataset.id, false),
      outlook: () => {
        const m = readMail(), r = ME.mail.mailto(m);
        store.markMail(currentMail.id, 'Outlook');
        const a = document.createElement('a'); a.href = r.url; a.click();
        note(r.truncated ? 'Message trop long pour un lien Outlook : il a été tronqué. ' + (emlOk ? 'Utilisez le .eml' : 'Utilisez « Copier »') + ' pour le texte complet.' : 'Outlook doit s\'ouvrir avec le message. Sinon, ' + (emlOk ? 'utilisez le .eml.' : 'utilisez « Copier ».'));
      },
      eml: () => {
        const m = readMail();
        store.markMail(currentMail.id, '.eml');
        save(currentMail.id + '.eml', ME.mail.eml(m), 'message/rfc822').then(() => note('Ouvrez le fichier téléchargé : Outlook l\'ouvre en brouillon, prêt à envoyer.'));
      },
      copy: () => {
        const m = readMail();
        const text = 'À : ' + m.to + '\nCc : ' + m.cc + '\nObjet : ' + m.subject + '\n\n' + m.body;
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => note('Copié : collez-le dans un nouveau mail.'), () => {
          const b = dlg.querySelector('[name=body]'); b.focus(); b.select();
          note('Copie automatique refusée : le message est sélectionné, faites Ctrl+C.');
        });
      }
    };

    el.addEventListener('click', ev => {
      if (ev.shiftKey && ev.target.matches('.me-vue img')) { // aide au calage des points : Maj + clic sur l'image
        const r = ev.target.getBoundingClientRect(), cfg = store.vues[state.vue];
        toast('pos: [' + Math.round((ev.clientX - r.left) / r.width * cfg.w) + ', ' + Math.round((ev.clientY - r.top) / r.height * cfg.h) + ']');
        return;
      }
      const t = ev.target.closest('[data-action]');
      if (!t || !el.contains(t)) return;
      ev.preventDefault();
      if (actions[t.dataset.action]) actions[t.dataset.action](t);
    });
    el.addEventListener('keydown', ev => {
      const t = ev.target.closest && ev.target.closest('.me-click, .me-depot');
      if (t && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); actions[t.dataset.action](t); }
    });
    // Glisser-déposer du fichier de parc
    el.addEventListener('dragover', ev => { const d = ev.target.closest && ev.target.closest('.me-depot'); if (d) { ev.preventDefault(); d.classList.add('survol'); } });
    el.addEventListener('dragleave', ev => { const d = ev.target.closest && ev.target.closest('.me-depot'); if (d) d.classList.remove('survol'); });
    el.addEventListener('drop', ev => { const d = ev.target.closest && ev.target.closest('.me-depot'); if (d) { ev.preventDefault(); importer(ev.dataTransfer.files[0]); } });
    el.addEventListener('input', ev => {
      const k = ev.target.dataset && ev.target.dataset.input;
      if (!k || k === 'json-in' || k === 'parc-in') return;
      state[k] = ev.target.value;
      const pos = ev.target.selectionStart;
      render();
      if (ev.target.type === 'search') { const n = el.querySelector('[data-input="' + k + '"]'); n.focus(); n.setSelectionRange(pos, pos); }
    });
    el.addEventListener('change', ev => {
      if (ev.target.dataset.input === 'parc-in') { importer(ev.target.files[0]); ev.target.value = ''; return; }
      if (ev.target.dataset.input !== 'json-in' || !ev.target.files[0]) return;
      const rd = new FileReader();
      rd.onload = () => { try { store.importJSON(rd.result); render(); toast('Sauvegarde restaurée.'); } catch (e) { toast('Fichier invalide : choisissez une sauvegarde JSON de ce module.'); } };
      rd.readAsText(ev.target.files[0]);
    });
    el.addEventListener('submit', ev => {
      const f = ev.target, kind = f.dataset.form;
      ev.preventDefault();
      if (kind === 'regl') {
        store.setReglages({ copie: f.copie.value.trim(), declarant: f.declarant.value.trim() });
        render(); toast('Réglages enregistrés.');
      } else if (kind === 'declare') {
        store.setReglages({ declarant: f.declarant.value.trim() });
        const inc = store.add({
          vehiculeId: state.vehicleId, equipId: f.dataset.equip, cote: f.cote ? f.cote.value : '', gravite: +f.gravite.value,
          symptomes: f.symptomes.value.trim(), constateLe: new Date(f.constateLe.value).toISOString(), declarant: f.declarant.value.trim(),
          diagnostic: (diag.st && ME.diag.resume(diag.st)) || null
        });
        diag = { st: null, auto: '' };
        render();
        mailDialog(inc.id, true);
      } else if (kind === 'update') {
        const id = f.dataset.id, i = store.incident(id), parts = [];
        const statut = f.statut.value, gravite = +f.gravite.value;
        if (statut !== i.statut) parts.push('Statut : ' + statutLabel(i.statut) + ' → ' + statutLabel(statut));
        if (gravite !== i.gravite) parts.push('Gravité : ' + i.gravite + ' → ' + gravite);
        if (f.commentaire.value.trim()) parts.push(f.commentaire.value.trim());
        store.update(id, { statut, gravite }, parts.join(' · '));
        dlg.close(); render(); toast(id + ' mis à jour.');
      }
    });

    render();
    return { refresh: render, store };
  }

  ME.mount = mount;
})(window);
