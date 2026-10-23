/* Persistance : localStorage par défaut. Pour brancher l'outil global (API, SharePoint, base...),
   passer un `storage` ({ load(): object|null, save(obj) }) à mount(). */
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

    const persist = () => storage.save(data);
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
      /** Parc courant : le parc importé s'il existe, sinon celui fourni à mount() (ou la démonstration). */
      get vehicules() { return data.parc ? data.parc.vehicules : vehiculesDefaut; },
      parcInfo: () => data.parc ? { fichier: data.parc.fichier, importeLe: data.parc.importeLe, demo: false } : { demo: !opts.vehicules },
      setParc(list, fichier) { data.parc = { vehicules: list, fichier: fichier || '', importeLe: now() }; persist(); },
      vehicule: id => api.vehicules.find(v => v.id === id),
      type: id => types.find(t => t.id === id),
      solution: id => solutions.find(s => s.id === id),
      equipement: id => equipements.find(e => e.id === id),

      /** Équipements montés sur un véhicule : ceux de sa solution, limités à `v.equipements` si renseigné. */
      equipsOf(v) {
        return equipements.filter(e => (!e.solutions || e.solutions.indexOf(v.solution) >= 0) &&
          (!v.equipements || v.equipements.indexOf(e.id) >= 0));
      },
      /** Lignes (équipement + chaise éventuelle) d'une vue : un équipement parCote donne une ligne par chaise. */
      lignes(v, vue) {
        const out = [];
        api.equipsOf(v).filter(e => e.vue === vue).forEach(e => {
          if (e.parCote) e.cotes.forEach(c => out.push({ eq: e, cote: c })); else out.push({ eq: e, cote: null });
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
      graviteVue(v, vue) {
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
      markMail(id, mode) { api.update(id, { mailLe: now() }, 'Mail préparé (' + mode + ')'); },

      reglages: () => data.reglages,
      setReglages(r) { Object.assign(data.reglages, r); persist(); },

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
        const cols = ['id', 'creeLe', 'immat', 'parc', 'solution', 'equipement', 'gravite', 'statut', 'symptomes', 'cause_probable', 'declarant', 'resoluLe', 'mailLe'];
        const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
        const rows = api.incidents().map(i => {
          const v = api.vehicule(i.vehiculeId) || {}, s = api.solution(v.solution) || {};
          return [i.id, i.creeLe, v.immat, v.parc, s.label, api.libelle(i), i.gravite, i.statut, i.symptomes,
            i.diagnostic && i.diagnostic.cause, i.declarant, i.resoluLe, i.mailLe].map(q).join(';');
        });
        return '﻿' + cols.join(';') + '\r\n' + rows.join('\r\n'); // BOM + ';' => ouverture directe dans Excel FR
      }
    };
    return api;
  };
})(window);
