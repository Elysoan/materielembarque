/* Persistance : localStorage par défaut. Pour brancher l'outil global (API, SharePoint, base...),
   passer un `storage` ({ load(): object|null, save(obj) }) à mount(). */
(function (root) {
  const ME = root.MaterielEmbarque;
  const KEY = 'materielembarque.v1';

  function localStorageAdapter() {
    return {
      load() {
        try { return JSON.parse(root.localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
      },
      save(obj) {
        try { root.localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* mode privé / quota */ }
      }
    };
  }

  ME.createStore = function (opts) {
    opts = opts || {};
    const D = ME.defaults;
    const storage = opts.storage || localStorageAdapter();
    const saved = storage.load() || {};
    const data = {
      incidents: saved.incidents || [],
      reglages: Object.assign({}, D.reglages, opts.reglages || {}, saved.reglages || {})
    };
    const vehicules = opts.vehicules || D.vehicules;
    const equipements = opts.equipements || D.equipements;

    const persist = () => storage.save(data);
    const now = () => new Date().toISOString();

    function nextId() {
      const y = new Date().getFullYear();
      const prefix = 'INC-' + y + '-';
      const max = data.incidents
        .filter(i => i.id.indexOf(prefix) === 0)
        .reduce((m, i) => Math.max(m, parseInt(i.id.slice(prefix.length), 10) || 0), 0);
      return prefix + String(max + 1).padStart(4, '0');
    }

    const api = {
      vehicules, equipements,
      vehicule: id => vehicules.find(v => v.id === id),
      equipement: id => equipements.find(e => e.id === id),
      incidents: () => data.incidents.slice().sort((a, b) => b.creeLe.localeCompare(a.creeLe)),
      incident: id => data.incidents.find(i => i.id === id),
      isOpen: i => i.statut !== 'resolu',

      ouverts(vehiculeId, equipId) {
        return data.incidents.filter(i => i.statut !== 'resolu' &&
          (!vehiculeId || i.vehiculeId === vehiculeId) && (!equipId || i.equipId === equipId));
      },
      /** Gravité la plus haute parmi les incidents ouverts (0 = RAS). */
      graviteMax(vehiculeId, equipId) {
        return api.ouverts(vehiculeId, equipId).reduce((m, i) => Math.max(m, i.gravite), 0);
      },

      add(fields) {
        const inc = Object.assign({
          id: nextId(), statut: 'ouvert', creeLe: now(), mailLe: null,
          journal: []
        }, fields);
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
      markMail(id, mode) {
        api.update(id, { mailLe: now() }, 'Mail préparé (' + mode + ')');
      },

      reglages: () => data.reglages,
      setReglages(r) { Object.assign(data.reglages, r); persist(); },

      exportJSON: () => JSON.stringify({ incidents: data.incidents, reglages: data.reglages }, null, 2),
      importJSON(text) {
        const o = JSON.parse(text);
        if (!o || !Array.isArray(o.incidents)) throw new Error('Fichier invalide');
        data.incidents = o.incidents;
        if (o.reglages) Object.assign(data.reglages, o.reglages);
        persist();
      },
      exportCSV() {
        const cols = ['id', 'creeLe', 'immat', 'parc', 'equipement', 'gravite', 'statut', 'symptomes', 'declarant', 'resoluLe', 'mailLe'];
        const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
        const rows = api.incidents().map(i => {
          const v = api.vehicule(i.vehiculeId) || {}, e = api.equipement(i.equipId) || {};
          return [i.id, i.creeLe, v.immat, v.parc, e.label, i.gravite, i.statut, i.symptomes, i.declarant, i.resoluLe, i.mailLe]
            .map(q).join(';');
        });
        return '﻿' + cols.join(';') + '\r\n' + rows.join('\r\n'); // BOM + ';' => ouverture directe dans Excel FR
      }
    };
    return api;
  };
})(window);
