/* Import du parc de véhicules depuis le modèle Excel (onglet « Parc ») ou un CSV.
   Lecture Excel : SheetJS, chargé à la demande (seulement au premier import).
   analyse(lignes, store) -> { vehicules, erreurs, avertissements, ignorees } sans rien modifier :
   l'application montre le rapport, puis l'utilisateur valide le remplacement du parc. */
(function (root) {
  const ME = (root.MaterielEmbarque = root.MaterielEmbarque || {});
  // SheetJS 0.18.5 (Apache 2.0) : copie embarquée (hors ligne, derrière un proxy), puis cdnjs en secours.
  const SHEETJS = [((document.currentScript && document.currentScript.src.replace(/[^/]*$/, '')) || 'module/') + 'vendor/xlsx-0.18.5.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];

  // Comparaison tolérante : minuscules, sans accents ni ponctuation (« CITI'ID » = « citi id » = « CITIID »)
  const cle = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const texte = s => String(s == null ? '' : s).trim();

  // En-têtes reconnus (ordre des colonnes libre)
  const CHAMPS = [
    { champ: 'parc',        test: k => k === 'ndeparc' || k === 'numerodeparc' || k === 'nparc' || k === 'parc' },
    { champ: 'immat',       test: k => k.indexOf('immat') === 0 },
    { champ: 'agence',      test: k => k === 'agence' },
    { champ: 'solution',    test: k => k === 'solution' },
    { champ: 'type',        test: k => k.indexOf('type') === 0 },
    { champ: 'modele',      test: k => k.indexOf('marque') >= 0 || k.indexOf('modele') >= 0 },
    { champ: 'commentaire', test: k => k.indexOf('commentaire') === 0 }
  ];
  const EQUIP = { tablette: 'tablette', supportdecharge: 'support', calculateurk3: 'k3', k3: 'k3', antennecabine: 'ant_cab',
    antennearrieredent: 'ant_ar', antennearriere: 'ant_ar', decodeur: 'decodeur', boiteaboutonsbbv: 'bbv', boiteaboutons: 'bbv', bbv: 'bbv', nbab: 'nbab' };

  function chargerSheetJS() {
    if (root.XLSX) return Promise.resolve(root.XLSX);
    const essai = i => new Promise((ok, ko) => {
      if (i >= SHEETJS.length) return ko(new Error('Lecture Excel indisponible. Enregistrez le fichier en CSV (séparateur point-virgule) puis réessayez.'));
      const s = document.createElement('script');
      s.src = SHEETJS[i]; s.onload = () => ok(root.XLSX);
      s.onerror = () => { s.remove(); essai(i + 1).then(ok, ko); };
      document.head.appendChild(s);
    });
    return essai(0);
  }

  /** CSV (séparateur ; ou , détecté, guillemets gérés) -> tableau de lignes. */
  function lireCSV(txt) {
    txt = txt.replace(/^﻿/, '');
    const premiere = txt.split(/\r?\n/, 1)[0];
    const sep = (premiere.match(/;/g) || []).length >= (premiere.match(/,/g) || []).length ? ';' : ',';
    const lignes = []; let ligne = [], champ = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) { if (c === '"') { if (txt[i + 1] === '"') { champ += '"'; i++; } else q = false; } else champ += c; }
      else if (c === '"') q = true;
      else if (c === sep) { ligne.push(champ); champ = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''; }
      else champ += c;
    }
    if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne); }
    return lignes;
  }

  /** Fichier (File) -> tableau de lignes de l'onglet « Parc » (ou du premier onglet). */
  function lireFichier(file) {
    if (/\.csv$/i.test(file.name)) return file.text().then(lireCSV);
    return Promise.all([chargerSheetJS(), file.arrayBuffer()]).then(([XLSX, buf]) => {
      const wb = XLSX.read(buf, { type: 'array' });
      const nom = wb.SheetNames.find(n => cle(n) === 'parc') || wb.SheetNames[0];
      return XLSX.utils.sheet_to_json(wb.Sheets[nom], { header: 1, defval: '', raw: false });
    });
  }

  function immatNormalisee(s) {
    let v = texte(s).toUpperCase().replace(/[\s_.]+/g, '-');
    if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(v)) v = v.slice(0, 2) + '-' + v.slice(2, 5) + '-' + v.slice(5);
    return v;
  }

  function analyse(lignes, store) {
    const erreurs = [], avertissements = [], vehicules = [];
    let ignorees = 0;
    // Ligne d'en-tête : la première qui contient « Immatriculation » et « Solution »
    const h = lignes.findIndex(l => l.some(c => cle(c).indexOf('immat') === 0) && l.some(c => cle(c) === 'solution'));
    if (h < 0) return { vehicules, erreurs: [{ ligne: 0, texte: 'En-têtes introuvables : utilisez le modèle (colonnes « N° de parc », « Immatriculation », « Solution »…).' }], avertissements, ignorees };

    const col = {}, colEquip = {};
    lignes[h].forEach((c, i) => {
      const k = cle(c);
      const f = CHAMPS.find(x => x.test(k));
      if (f && col[f.champ] == null) col[f.champ] = i;
      else if (EQUIP[k]) colEquip[EQUIP[k]] = i;
    });
    ['parc', 'immat', 'agence', 'solution', 'type'].forEach(c => { if (col[c] == null) erreurs.push({ ligne: h + 1, texte: 'Colonne obligatoire absente : ' + c + '.' }); });
    if (erreurs.length) return { vehicules, erreurs, avertissements, ignorees };

    const solutions = {}; store.solutions.forEach(s => { solutions[cle(s.label)] = s.id; solutions[cle(s.id)] = s.id; });
    const types = {}; store.types.forEach(t => { types[cle(t.label)] = t.id; types[cle(t.id)] = t.id; types[cle(t.picto)] = t.id; });
    const vus = { parc: {}, immat: {}, id: {} };

    for (let r = h + 1; r < lignes.length; r++) {
      const l = lignes[r], n = r + 1, val = c => texte(l[col[c]]);
      if (!l.some(c => texte(c))) continue;
      if (cle(val('commentaire')).indexOf('exemple') === 0) { ignorees++; continue; }

      const manque = ['parc', 'immat', 'agence', 'solution', 'type'].filter(c => !val(c));
      if (manque.length) { erreurs.push({ ligne: n, texte: 'Champ(s) manquant(s) : ' + manque.join(', ') + '.' }); continue; }
      const solution = solutions[cle(val('solution'))], type = types[cle(val('type'))];
      if (!solution) { erreurs.push({ ligne: n, texte: 'Solution inconnue « ' + val('solution') + ' ».' }); continue; }
      if (!type) { erreurs.push({ ligne: n, texte: 'Type de véhicule inconnu « ' + val('type') + ' ».' }); continue; }
      const parc = val('parc'), immat = immatNormalisee(val('immat'));
      if (vus.parc[cle(parc)]) { erreurs.push({ ligne: n, texte: 'N° de parc « ' + parc + ' » en double (déjà ligne ' + vus.parc[cle(parc)] + ').' }); continue; }
      if (vus.immat[cle(immat)]) { erreurs.push({ ligne: n, texte: 'Immatriculation « ' + immat + ' » en double (déjà ligne ' + vus.immat[cle(immat)] + ').' }); continue; }
      vus.parc[cle(parc)] = n; vus.immat[cle(immat)] = n;
      if (!/^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(immat)) avertissements.push({ ligne: n, texte: 'Immatriculation « ' + immat + ' » hors format AA-123-AA (conservée telle quelle).' });

      // Identifiant stable : dérivé du n° de parc, pour que l'historique suive le véhicule d'un import à l'autre
      let id = 'p-' + cle(parc); while (vus.id[id]) id += 'x'; vus.id[id] = 1;
      const v = { id, type, solution, immat, parc, agence: val('agence'), modele: val('modele') };
      const absents = Object.keys(colEquip).filter(e => cle(l[colEquip[e]]) === 'non');
      if (absents.length) {
        v.equipements = store.equipsOf({ solution }).map(e => e.id).filter(e => absents.indexOf(e) < 0);
        const horsSolution = absents.filter(e => !store.equipsOf({ solution }).some(x => x.id === e));
        if (horsSolution.length) avertissements.push({ ligne: n, texte: '« Non » ignoré pour ' + horsSolution.map(e => (store.equipement(e) || { label: e }).label).join(', ') + ' : équipement non prévu pour ' + val('solution') + '.' });
      }
      if (val('commentaire')) v.commentaire = val('commentaire');
      vehicules.push(v);
    }
    if (!vehicules.length && !erreurs.length) erreurs.push({ ligne: 0, texte: 'Aucun véhicule trouvé dans le fichier (la ligne d\'exemple est ignorée).' });
    return { vehicules, erreurs, avertissements, ignorees };
  }

  /** Parc actuel au format du modèle (CSV ; pour Excel FR), à modifier puis réimporter.
      Équipements : Oui = monté, Non = absent, — = ne s'applique pas à la solution (comme dans le modèle). */
  function exporterCSV(store) {
    const E = [['tablette', 'Tablette'], ['support', 'Support de charge'], ['k3', 'Calculateur K3'], ['ant_cab', 'Antenne cabine'],
      ['ant_ar', 'Antenne arrière (dent)'], ['decodeur', 'Décodeur'], ['bbv', 'Boîte à boutons (BBV)'], ['nbab', 'NBAB']];
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const tete = ['N° de parc', 'Immatriculation', 'Agence', 'Solution', 'Type de véhicule', 'Marque / modèle'].concat(E.map(e => e[1]), ['Commentaire']);
    const lignes = store.vehicules.map(v => {
      const prevus = store.equipsOf({ solution: v.solution }).map(e => e.id), montes = store.equipsOf(v).map(e => e.id);
      return [v.parc, v.immat, v.agence, (store.solution(v.solution) || {}).label, (store.type(v.type) || {}).label, v.modele]
        .concat(E.map(e => prevus.indexOf(e[0]) < 0 ? '—' : montes.indexOf(e[0]) < 0 ? 'Non' : 'Oui'), [v.commentaire]).map(q).join(';');
    });
    return '﻿' + tete.map(q).join(';') + '\r\n' + lignes.join('\r\n');
  }

  ME.parc = { lireFichier, lireCSV, analyse, exporterCSV };
})(window);
