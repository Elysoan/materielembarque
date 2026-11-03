/* Génération du mail : texte, lien mailto: (Outlook) et brouillon .eml (X-Unsent) */
(function (root) {
  const ME = root.MaterielEmbarque;
  const MAILTO_MAX = 1900; // au-delà, Outlook / Windows tronquent ou refusent le lien

  const fmt = iso => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  function diagLines(d) {
    if (!d) return [];
    const out = ['DIAGNOSTIC GUIDÉ (' + d.source + ')'];
    d.chemin.forEach((c, i) => out.push((i + 1) + '. ' + c.q + '  =>  ' + c.r));
    out.push('- Cause probable : ' + d.cause, '- Action recommandée : ' + d.action);
    if (d.contact) out.push('- À transmettre à Simpliciti (ticket) avec ces informations.');
    if (d.piste) out.push('- Piste hors guide constructeur : à valider.');
    if (d.horsSimpliciti) out.push('- Hors charge Simpliciti : intervention de l\'atelier ou du carrossier.');
    out.push('');
    return out;
  }

  // Panne récurrente : argument pour demander un remplacement ou une expertise plutôt qu'une nouvelle réparation
  function recidiveLines(store, inc) {
    const r = store.recidives(inc);
    if (!store.estRecidive(inc)) return [];
    const autres = r.filter(x => x.id !== inc.id);
    return ['PANNE RÉCURRENTE',
      '- ' + r.length + 'e signalement sur cet équipement' + (inc.cote ? ' (' + inc.cote + ')' : '') + ' en ' + ME.defaults.recidive.jours + ' jours.',
      '- Précédents : ' + autres.map(x => x.id + ' du ' + fmt(x.creeLe).slice(0, 10) + (x.diagnostic ? ' (' + x.diagnostic.cause.replace(/\.$/, '') + ')' : '')).join(' ; '),
      '- Merci d\'envisager un remplacement ou une expertise plutôt qu\'une nouvelle réparation.',
      ''];
  }

  const ccDe = store => [store.copieFixe].concat(String(store.reglages().copie || '').split(/[;,]/)).map(x => x.trim()).filter((x, i, a) => x && a.indexOf(x) === i).join('; ');

  /** Mail de relance d'un défaut non résolu : cite le n° de ticket Simpliciti et l'ancienneté. */
  function relance(store, inc) {
    const v = store.vehicule(inc.vehiculeId) || {};
    const sol = store.solution(store.solutionDe(v, inc.equipId)) || {};
    const n = (inc.relances || []).length + 1, jours = Math.max(1, Math.round((Date.now() - Date.parse(inc.creeLe)) / 864e5));
    const subject = ['[' + (sol.label || 'Matériel embarqué') + ']', 'RELANCE' + (n > 1 ? ' ' + n : ''), inc.ticket ? '- Ticket ' + inc.ticket : '',
      '-', store.libelle(inc), '-', v.immat].filter(Boolean).join(' ');
    const envois = [inc.mailLe].concat(inc.relances || []).filter(Boolean);
    const body = [
      'Bonjour,',
      '',
      'Sauf erreur de notre part, le défaut ci-dessous n\'est toujours pas résolu' + (inc.ticket ? ' (ticket ' + inc.ticket + ')' : '') + '.',
      '',
      '- Véhicule : ' + v.immat + ' (' + (v.agence || '') + ')',
      '- Équipement : ' + store.libelle(inc),
      '- Gravité : ' + inc.gravite + ' / 4',
      '- Signalé le ' + fmt(inc.creeLe) + ', il y a ' + jours + ' jour' + (jours > 1 ? 's' : ''),
      '- Échanges précédents : ' + envois.map(d => fmt(d).slice(0, 10)).join(', '),
      '- Notre référence : ' + inc.id,
      '',
      'Symptômes signalés :',
      inc.symptomes,
      ''
    ].concat(recidiveLines(store, inc), [
      'Pouvez-vous nous indiquer la date d\'intervention prévue ?',
      '',
      'Cordialement,',
      store.reglages().declarant || inc.declarant || ''
    ]).join('\n');
    return { to: store.destinataire, cc: ccDe(store), subject, body };
  }

  function build(store, inc) {
    const v = store.vehicule(inc.vehiculeId) || {};
    const t = store.type(v.type) || {};
    const sol = store.solution(store.solutionDe(v, inc.equipId)) || {}; // solution de l'équipement en défaut
    const equipLabel = store.libelle(inc);
    const g = ME.defaults.gravites.find(x => x.niveau === inc.gravite) || {};
    const urgent = inc.gravite >= 4 ? 'URGENT - ' : '';

    // Objet préfixé par la solution du véhicule : Simpliciti oriente le ticket dès sa réception
    const subject = ['[' + (sol.label || 'Matériel embarqué') + ']', '[Gravité ' + inc.gravite + ' - ' + g.label + ']', urgent + equipLabel, '-', v.immat]
      .filter(Boolean).join(' ');

    const body = [
      'Bonjour,',
      '',
      'Un défaut sur du matériel embarqué vient d\'être signalé.',
      '',
      'VÉHICULE',
      '- Immatriculation : ' + v.immat,
      '- Agence : ' + v.agence,
      '- Type : ' + t.label + (v.modele ? ' (' + v.modele + ')' : ''),
      '- Solution : ' + store.solutionsOf(v).map(s => (store.solution(s) || { label: s }).label).join(' + '),
      '',
      'ÉQUIPEMENT EN DÉFAUT',
      '- Équipement : ' + equipLabel,
      '- Gravité : ' + inc.gravite + ' / 4 - ' + g.label + ' (' + g.aide + ')',
      '',
      'SYMPTÔMES',
      inc.symptomes,
      '',
    ].concat(diagLines(inc.diagnostic), recidiveLines(store, inc), [
      'INFORMATIONS',
      '- Constaté le : ' + fmt(inc.constateLe),
      '- Signalé par : ' + (inc.declarant || 'non renseigné'),
      '- Référence : ' + inc.id,
      '',
      'Merci de votre retour sur la prise en charge.',
      '',
      'Cordialement,',
      inc.declarant || ''
    ]).join('\n');

    // Copie : adresse fixe (ri@paprec.com) + copies supplémentaires des Réglages, sans doublon
    return { to: store.destinataire, cc: ccDe(store), subject, body };
  }

  /** Lien mailto: ; renvoie aussi `truncated` si le corps a dû être raccourci. */
  function mailto(m) {
    const make = body => 'mailto:' + encodeURIComponent(m.to).replace(/%40/g, '@').replace(/%2C/g, ',').replace(/%3B/g, ';') +
      '?subject=' + encodeURIComponent(m.subject) +
      (m.cc ? '&cc=' + encodeURIComponent(m.cc).replace(/%40/g, '@') : '') +
      '&body=' + encodeURIComponent(body).replace(/%0A/g, '%0D%0A');
    let body = m.body, url = make(body), truncated = false;
    if (url.length > MAILTO_MAX) {
      truncated = true;
      const note = '\n[...] Texte tronqué : utilisez le brouillon .eml pour le message complet.';
      while (url.length > MAILTO_MAX && body.length > 50) {
        body = body.slice(0, Math.max(50, body.length - 100));
        url = make(body + note);
      }
    }
    return { url, truncated };
  }

  const b64 = str => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const wrap76 = s => s.replace(/(.{76})/g, '$1\r\n');
  // Objet encodé RFC 2047, découpé par caractères (jamais au milieu d'un caractère UTF-8)
  const encSubject = s => Array.from(s).reduce((acc, ch) => {
    const last = acc[acc.length - 1];
    if (last && last.length < 18) last.push(ch); else acc.push([ch]);
    return acc;
  }, []).map(c => '=?UTF-8?B?' + b64(c.join('')) + '?=').join('\r\n ');

  /** Brouillon .eml : "X-Unsent: 1" => Outlook l'ouvre en mode rédaction, prêt à envoyer. */
  function eml(m) {
    const lines = [];
    if (m.to) lines.push('To: ' + m.to);
    if (m.cc) lines.push('Cc: ' + m.cc);
    lines.push('Subject: ' + encSubject(m.subject));
    lines.push('X-Unsent: 1');
    lines.push('MIME-Version: 1.0');
    lines.push('Content-Type: text/plain; charset=utf-8');
    lines.push('Content-Transfer-Encoding: base64');
    return lines.join('\r\n') + '\r\n\r\n' + wrap76(b64(m.body.replace(/\r?\n/g, '\r\n')));
  }

  ME.mail = { build, relance, mailto, eml, fmt };
})(window);
