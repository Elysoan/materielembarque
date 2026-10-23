/* Interface du module. Point d'entrée : MaterielEmbarque.mount(element, options) */
(function (root) {
  const ME = root.MaterielEmbarque;
  const D = ME.defaults;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sevLabel = n => (D.gravites.find(g => g.niveau === n) || {}).label || '';
  const statutLabel = id => (D.statuts.find(s => s.id === id) || {}).label || id;
  const fmt = ME.mail.fmt;
  const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function sevBadge(n) {
    return n ? '<span class="me-badge me-sev' + n + '">' + n + ' · ' + sevLabel(n) + '</span>' : '<span class="me-badge me-sev0">RAS</span>';
  }

  /* ---------- Schéma SVG d'une BOM avec points cliquables ---------- */
  function truckSvg(store, v) {
    const spots = v.equipements.map(id => store.equipement(id)).filter(Boolean).map(e => {
      const sev = store.graviteMax(v.id, e.id);
      const label = e.label + (sev ? ' - défaut gravité ' + sev : ' - RAS');
      return '<g class="me-spot me-s' + sev + '" tabindex="0" role="button" data-action="equip" data-id="' + e.id + '" aria-label="' + esc(label) + '">' +
        '<title>' + esc(label) + '</title>' +
        '<circle class="me-pulse" cx="' + e.x + '" cy="' + e.y + '" r="17"/>' +
        '<circle class="me-dot" cx="' + e.x + '" cy="' + e.y + '" r="17"/>' +
        '<text x="' + e.x + '" y="' + (e.y + 4) + '" text-anchor="middle">' + e.code + '</text>' +
        (sev ? '<circle class="me-sevdot" cx="' + (e.x + 14) + '" cy="' + (e.y - 14) + '" r="9"/><text class="me-sevnum" x="' + (e.x + 14) + '" y="' + (e.y - 10.5) + '" text-anchor="middle">' + sev + '</text>' : '') +
        '</g>';
    }).join('');
    return '<svg class="me-truck" viewBox="0 0 900 360" role="group" aria-label="Schéma du véhicule ' + esc(v.immat) + '">' +
      '<rect class="t-ground" x="0" y="338" width="900" height="3"/>' +
      '<path class="t-body" d="M70 96 Q70 84 82 84 H548 Q560 84 560 96 V262 H70Z"/>' +
      '<path class="t-body" d="M30 175 L130 150 V262 H30Z"/>' +
      '<rect class="t-chassis" x="30" y="262" width="810" height="20" rx="4"/>' +
      '<path class="t-cab" d="M585 262 V122 Q585 108 600 106 L700 98 Q716 97 726 108 L800 178 Q812 190 828 192 Q842 194 842 208 V262Z"/>' +
      '<path class="t-glass" d="M706 120 L778 182 H706Z"/>' +
      '<rect class="t-bumper" x="836" y="236" width="14" height="26" rx="4"/>' +
      [[330, 305], [470, 305], [750, 305]].map(w => '<g class="t-wheel"><circle cx="' + w[0] + '" cy="' + w[1] + '" r="40"/><circle class="hub" cx="' + w[0] + '" cy="' + w[1] + '" r="16"/></g>').join('') +
      spots + '</svg>';
  }

  function mount(el, opts) {
    opts = opts || {};
    const store = ME.createStore(opts);
    const state = { tab: 'parc', vehicleId: store.vehicules[0] && store.vehicules[0].id, q: '', agence: '', fStatut: 'ouvert', fSev: '', fQ: '' };

    el.classList.add('me-root');
    el.innerHTML =
      '<header class="me-head"><h2>Matériel embarqué</h2>' +
      '<nav class="me-tabs" role="tablist">' +
      ['parc:Parc', 'histo:Historique', 'regl:Réglages'].map(t => { const p = t.split(':'); return '<button role="tab" data-action="tab" data-id="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
      '</nav></header><main class="me-view"></main><dialog class="me-dialog"></dialog>';
    const view = el.querySelector('.me-view');
    const dlg = el.querySelector('dialog');

    /* ---------- Vues ---------- */
    function renderParc() {
      const agences = Array.from(new Set(store.vehicules.map(v => v.agence))).sort();
      const q = state.q.toLowerCase();
      const list = store.vehicules.filter(v => (!state.agence || v.agence === state.agence) &&
        (!q || (v.immat + ' ' + v.parc + ' ' + v.modele).toLowerCase().indexOf(q) >= 0));
      const v = store.vehicule(state.vehicleId);

      const cards = list.map(x => {
        const n = store.ouverts(x.id).length, sev = store.graviteMax(x.id);
        return '<button class="me-card' + (x.id === state.vehicleId ? ' is-sel' : '') + '" data-action="vehicle" data-id="' + x.id + '">' +
          '<strong>' + esc(x.parc) + '</strong><span>' + esc(x.immat) + ' · ' + esc(x.agence) + '</span>' +
          (n ? '<span class="me-badge me-sev' + sev + '">' + n + ' défaut' + (n > 1 ? 's' : '') + ' · max ' + sev + '</span>' : '<span class="me-badge me-sev0">RAS</span>') + '</button>';
      }).join('') || '<p class="me-empty">Aucun véhicule.</p>';

      let detail = '<p class="me-empty">Sélectionnez un véhicule.</p>';
      if (v) {
        const rows = v.equipements.map(id => store.equipement(id)).filter(Boolean).map(e => {
          const ops = store.ouverts(v.id, e.id);
          return '<tr><td>' + esc(e.label) + '</td><td>' + sevBadge(store.graviteMax(v.id, e.id)) + '</td>' +
            '<td><button class="me-btn" data-action="equip" data-id="' + e.id + '">' + (ops.length ? 'Voir / ajouter' : 'Signaler') + '</button></td></tr>';
        }).join('');
        detail = '<div class="me-vhead"><h3>' + esc(v.parc) + ' <small>' + esc(v.immat) + '</small></h3><p>' + esc(v.modele) + ' · ' + esc(v.agence) + '</p></div>' +
          '<p class="me-hint">Cliquez sur un équipement du schéma pour signaler un défaut.</p>' +
          truckSvg(store, v) +
          '<table class="me-table"><thead><tr><th>Équipement</th><th>État</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
      }

      view.innerHTML = '<div class="me-parc"><aside><div class="me-filters">' +
        '<input type="search" placeholder="Immat., n° de parc…" value="' + esc(state.q) + '" data-input="q">' +
        '<select data-input="agence"><option value="">Toutes agences</option>' + agences.map(a => '<option' + (a === state.agence ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></div>' +
        '<div class="me-cards">' + cards + '</div></aside><section>' + detail + '</section></div>';
    }

    function renderHisto() {
      const q = state.fQ.toLowerCase();
      const list = store.incidents().filter(i => {
        const v = store.vehicule(i.vehiculeId) || {}, e = store.equipement(i.equipId) || {};
        return (state.fStatut === '' || (state.fStatut === 'ouvert' ? i.statut !== 'resolu' : i.statut === state.fStatut)) &&
          (!state.fSev || i.gravite === +state.fSev) &&
          (!q || (i.id + ' ' + v.immat + ' ' + v.parc + ' ' + e.label + ' ' + i.symptomes).toLowerCase().indexOf(q) >= 0);
      });
      const rows = list.map(i => {
        const v = store.vehicule(i.vehiculeId) || {}, e = store.equipement(i.equipId) || {};
        return '<tr class="me-click" tabindex="0" data-action="incident" data-id="' + i.id + '"><td>' + i.id + '</td><td>' + fmt(i.creeLe) + '</td><td>' + esc(v.parc) + '<br><small>' + esc(v.immat) + '</small></td>' +
          '<td>' + esc(e.label) + '</td><td>' + sevBadge(i.gravite) + '</td><td>' + statutLabel(i.statut) + '</td><td>' + (i.mailLe ? 'Oui' : '-') + '</td></tr>';
      }).join('');
      const opt = (arr, cur, all) => '<option value="">' + all + '</option>' + arr.map(a => '<option value="' + a[0] + '"' + (String(a[0]) === String(cur) ? ' selected' : '') + '>' + a[1] + '</option>').join('');
      view.innerHTML = '<div class="me-filters me-row">' +
        '<input type="search" placeholder="Rechercher…" value="' + esc(state.fQ) + '" data-input="fQ">' +
        '<select data-input="fStatut">' + opt([['ouvert', 'Non résolus'], ['resolu', 'Résolus']], state.fStatut, 'Tous statuts') + '</select>' +
        '<select data-input="fSev">' + opt(D.gravites.map(g => [g.niveau, g.niveau + ' · ' + g.label]), state.fSev, 'Toutes gravités') + '</select>' +
        '<span class="me-spacer"></span><button class="me-btn" data-action="csv">Export CSV</button></div>' +
        '<table class="me-table"><thead><tr><th>Réf.</th><th>Date</th><th>Véhicule</th><th>Équipement</th><th>Gravité</th><th>Statut</th><th>Mail</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7" class="me-empty">Aucun signalement.</td></tr>') + '</tbody></table>';
    }

    function renderRegl() {
      const r = store.reglages();
      const f = (k, label, ph) => '<label>' + label + '<input name="' + k + '" value="' + esc(r[k]) + '" placeholder="' + esc(ph || '') + '"></label>';
      view.innerHTML = '<form class="me-form" data-form="regl"><h3>Réglages du mail</h3>' +
        f('destinataire', 'Destinataire(s) par défaut', 'atelier@exemple.fr ; maintenance@exemple.fr') + f('copie', 'Copie (Cc)') +
        f('declarant', 'Votre nom (signature)') + f('prefixeObjet', 'Préfixe de l\'objet') +
        '<div class="me-actions"><button class="me-btn me-primary">Enregistrer</button></div>' +
        '<h3>Données</h3><div class="me-actions"><button type="button" class="me-btn" data-action="json-out">Sauvegarder (JSON)</button>' +
        '<label class="me-btn">Restaurer (JSON)<input type="file" accept=".json" data-input="json-in" hidden></label></div>' +
        '<p class="me-hint">Les données sont stockées dans ce navigateur. Pour un usage partagé, branchez un stockage serveur (voir README).</p></form>';
    }

    function render() {
      el.querySelectorAll('.me-tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.id === state.tab));
      ({ parc: renderParc, histo: renderHisto, regl: renderRegl })[state.tab]();
    }

    /* ---------- Dialogues ---------- */
    function openDlg(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); }
    const closeBtn = '<button type="button" class="me-x" data-action="close" aria-label="Fermer">×</button>';

    function declareDialog(equipId) {
      const v = store.vehicule(state.vehicleId), e = store.equipement(equipId);
      const ops = store.ouverts(v.id, equipId);
      const existing = ops.length ? '<div class="me-warn"><strong>' + ops.length + ' défaut(s) déjà ouvert(s) sur cet équipement :</strong><ul>' +
        ops.map(i => '<li><a href="#" data-action="incident" data-id="' + i.id + '">' + i.id + '</a> · ' + sevBadge(i.gravite) + ' ' + esc(i.symptomes.slice(0, 80)) + '</li>').join('') + '</ul></div>' : '';
      openDlg(closeBtn + '<form class="me-form" data-form="declare" data-equip="' + equipId + '"><h3>' + esc(e.label) + '</h3>' +
        '<p class="me-sub">' + esc(v.parc) + ' · ' + esc(v.immat) + '</p>' + existing +
        '<fieldset><legend>Niveau de gravité</legend>' + D.gravites.map(g =>
          '<label class="me-sevopt me-sev' + g.niveau + '"><input type="radio" name="gravite" value="' + g.niveau + '" required' + (g.niveau === 2 ? ' checked' : '') + '>' +
          '<span><strong>' + g.niveau + ' · ' + g.label + '</strong><small>' + g.aide + '</small></span></label>').join('') + '</fieldset>' +
        '<label>Description des symptômes<textarea name="symptomes" rows="4" required placeholder="Que constate-t-on ? Depuis quand ? Intermittent ou permanent ? Voyant, message d\'erreur…"></textarea></label>' +
        '<div class="me-row"><label>Constaté le<input type="datetime-local" name="constateLe" value="' + localNow() + '" required></label>' +
        '<label>Signalé par<input name="declarant" value="' + esc(store.reglages().declarant) + '" required></label></div>' +
        '<div class="me-actions"><button type="button" class="me-btn" data-action="close">Annuler</button><button class="me-btn me-primary">Enregistrer et préparer le mail</button></div></form>');
    }

    function incidentDialog(id) {
      const i = store.incident(id), v = store.vehicule(i.vehiculeId) || {}, e = store.equipement(i.equipId) || {};
      openDlg(closeBtn + '<form class="me-form" data-form="update" data-id="' + id + '"><h3>' + id + ' <small>' + sevBadge(i.gravite) + '</small></h3>' +
        '<p class="me-sub">' + esc(e.label) + ' · ' + esc(v.parc) + ' · ' + esc(v.immat) + '</p>' +
        '<p class="me-pre">' + esc(i.symptomes) + '</p>' +
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
      openDlg(closeBtn + '<form class="me-form" data-form="mail"><h3>Mail prêt à envoyer</h3>' +
        (fresh ? '<p class="me-ok">Signalement ' + id + ' enregistré dans l\'historique.</p>' : '') +
        (m.to ? '' : '<p class="me-warn">Aucun destinataire par défaut : renseignez-le ici ou dans Réglages.</p>') +
        '<label>À<input name="to" value="' + esc(m.to) + '"></label><label>Cc<input name="cc" value="' + esc(m.cc) + '"></label>' +
        '<label>Objet<input name="subject" value="' + esc(m.subject) + '"></label>' +
        '<label>Message<textarea name="body" rows="14">' + esc(m.body) + '</textarea></label>' +
        '<p class="me-hint" data-note></p>' +
        '<div class="me-actions"><button type="button" class="me-btn me-primary" data-action="outlook">Ouvrir dans Outlook</button>' +
        '<button type="button" class="me-btn" data-action="eml">Télécharger le brouillon (.eml)</button>' +
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
      equip: t => declareDialog(t.dataset.id),
      incident: t => incidentDialog(t.dataset.id),
      close: () => dlg.close(),
      csv: () => download('historique-materiel-embarque.csv', store.exportCSV(), 'text/csv;charset=utf-8'),
      'json-out': () => download('materiel-embarque-sauvegarde.json', store.exportJSON(), 'application/json'),
      mail: t => mailDialog(t.dataset.id, false),
      outlook: () => {
        const m = readMail(), r = ME.mail.mailto(m);
        store.markMail(currentMail.id, 'Outlook');
        const a = document.createElement('a'); a.href = r.url; a.click();
        note(r.truncated ? 'Message trop long pour un lien Outlook : il a été tronqué. Utilisez le .eml pour le texte complet.' : 'Outlook doit s\'ouvrir avec le message. Sinon, utilisez le .eml.');
      },
      eml: () => {
        const m = readMail();
        store.markMail(currentMail.id, '.eml');
        download(currentMail.id + '.eml', ME.mail.eml(m), 'message/rfc822');
        note('Ouvrez le fichier téléchargé : Outlook l\'ouvre en brouillon, prêt à envoyer.');
      },
      copy: () => {
        const m = readMail();
        const text = 'À : ' + m.to + '\nCc : ' + m.cc + '\nObjet : ' + m.subject + '\n\n' + m.body;
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => note('Copié.'), () => note('Copie impossible : sélectionnez le texte manuellement.'));
      }
    };

    el.addEventListener('click', ev => {
      const t = ev.target.closest('[data-action]');
      if (!t || !el.contains(t)) return;
      ev.preventDefault();
      if (actions[t.dataset.action]) actions[t.dataset.action](t);
    });
    el.addEventListener('keydown', ev => {
      const t = ev.target.closest && ev.target.closest('.me-spot, .me-click');
      if (t && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); actions[t.dataset.action](t); }
    });
    el.addEventListener('input', ev => {
      const k = ev.target.dataset && ev.target.dataset.input;
      if (!k || k === 'json-in') return;
      state[k] = ev.target.value;
      const pos = ev.target.selectionStart;
      render();
      if (ev.target.type === 'search') { const n = el.querySelector('[data-input="' + k + '"]'); n.focus(); n.setSelectionRange(pos, pos); }
    });
    el.addEventListener('change', ev => {
      if (ev.target.dataset.input !== 'json-in' || !ev.target.files[0]) return;
      const rd = new FileReader();
      rd.onload = () => { try { store.importJSON(rd.result); alert('Sauvegarde restaurée.'); render(); } catch (e) { alert('Fichier invalide.'); } };
      rd.readAsText(ev.target.files[0]);
    });
    el.addEventListener('submit', ev => {
      const f = ev.target, kind = f.dataset.form;
      ev.preventDefault();
      if (kind === 'regl') {
        store.setReglages({ destinataire: f.destinataire.value.trim(), copie: f.copie.value.trim(), declarant: f.declarant.value.trim(), prefixeObjet: f.prefixeObjet.value.trim() });
        render();
      } else if (kind === 'declare') {
        store.setReglages({ declarant: f.declarant.value.trim() });
        const inc = store.add({
          vehiculeId: state.vehicleId, equipId: f.dataset.equip, gravite: +f.gravite.value,
          symptomes: f.symptomes.value.trim(), constateLe: new Date(f.constateLe.value).toISOString(), declarant: f.declarant.value.trim()
        });
        render();
        mailDialog(inc.id, true);
      } else if (kind === 'update') {
        const id = f.dataset.id, i = store.incident(id), parts = [];
        const statut = f.statut.value, gravite = +f.gravite.value;
        if (statut !== i.statut) parts.push('Statut : ' + statutLabel(i.statut) + ' → ' + statutLabel(statut));
        if (gravite !== i.gravite) parts.push('Gravité : ' + i.gravite + ' → ' + gravite);
        if (f.commentaire.value.trim()) parts.push(f.commentaire.value.trim());
        store.update(id, { statut, gravite }, parts.join(' · '));
        dlg.close(); render();
      }
    });

    render();
    return { refresh: render, store };
  }

  ME.mount = mount;
})(window);
