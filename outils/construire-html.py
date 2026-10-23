"""Construit dist/materiel-embarque.html (outil) et dist/materiel-embarque-demo.html (démonstration) : fichiers uniques et autonome (styles, scripts, images,
lecteur Excel SheetJS et modèle de parc intégrés). Usage : python3 outils/construire-html.py"""
import base64, re, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
M = RACINE / 'module'
SCRIPTS = ['vendor/xlsx-0.18.5.full.min.js', 'data.js', 'store.js', 'mail.js', 'arbres.js', 'parc-import.js', 'app.js']
MIME = {'.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}

def data_uri(f):
    return 'data:' + MIME[f.suffix] + ';base64,' + base64.b64encode(f.read_bytes()).decode()

def js(code):  # un script intégré ne doit pas contenir de balise fermante
    return code.replace('</script', '<\\/script')

ressources = {str(f.relative_to(M)).replace('\\', '/'): data_uri(f)
              for f in sorted(M.glob('img/**/*.*')) if f.suffix in MIME}
ressources['modele-parc-vehicules.xlsx'] = data_uri(M / 'modele-parc-vehicules.xlsx')
assets = 'window.MaterielEmbarque = window.MaterielEmbarque || {};\nMaterielEmbarque.assets = {\n' + \
    ',\n'.join('  %r: %r' % (k, v) for k, v in ressources.items()) + '\n};'

DEMO = r"""
// Démonstration : espace de stockage séparé + signalements fictifs créés au premier lancement
(function () {
  const ME = window.MaterielEmbarque, CLE = 'materielembarque.demo';
  document.getElementById('demo-reset').onclick = function () { try { localStorage.removeItem(CLE); } catch (e) {} location.reload(); };
  const app = ME.mount(document.getElementById('app'), { version: 'v0.3 · démo', cleStockage: CLE });
  const st = app.store;
  if (st.incidents().length) return;
  st.setReglages({ declarant: 'Démo' });
  const il = j => new Date(Date.now() - j * 864e5 - (j ? 3 * 36e5 : 0)).toISOString();
  const diag = (arbre, reps) => { const d = ME.diag.start(arbre); reps.forEach(i => ME.diag.answer(d, i)); return ME.diag.resume(d); };
  const cree = (o, suite) => {
    const t = il(o.j + 0.1); // signalé un peu après le constat, à des dates étalées
    const inc = st.add(Object.assign({ declarant: o.qui || 'Démo', constateLe: il(o.j), creeLe: t }, o.f));
    inc.journal[0].at = t;
    (suite || []).forEach(x => st.update(inc.id, x[0], x[1]));
    if (o.mail) st.markMail(inc.id, 'Outlook');
  };
  // BOM 214 (CITI'ID) : chaise gauche sans lecture, câble décodeur / NBAB en cause
  cree({ j: 1, mail: 1, qui: 'K. Martin (chef d\'équipe)', f: { vehiculeId: 'v1', equipId: 'ant_ar', cote: 'Gauche', gravite: 3,
    symptomes: 'Chaise gauche : aucune puce lue depuis la prise de poste, voyant rouge fixe sur la BBV gauche. Chaise droite normale.', diagnostic: diag('lecteur', [0, 0, 1, 0]) } });
  // BOM 214 : BBV droite, un bouton HS
  cree({ j: 4, mail: 1, qui: 'S. Bernard (ripeur)', f: { vehiculeId: 'v1', equipId: 'bbv', cote: 'Droite', gravite: 2,
    symptomes: 'Le bouton du bas de la boîte droite ne répond plus ; les voyants s\'allument.', diagnostic: diag('bbv', [0]) } },
    [[{ statut: 'en_cours' }, 'Statut : Ouvert → En cours · BBV commandée chez Simpliciti']]);
  // BOM 587 (CITI'ID) : tablette qui ne charge pas
  cree({ j: 3, mail: 1, qui: 'A. Petit (conducteur)', f: { vehiculeId: 'v2', equipId: 'tablette', gravite: 2,
    symptomes: 'La tablette s\'éteint en tournée, l\'icône de charge n\'apparaît pas sur le support.', diagnostic: diag('tablette', [0, 1]) } },
    [[{ statut: 'en_cours' }, 'Statut : Ouvert → En cours · Support de charge à remplacer']]);
  // BOM 120 (bicomp CITI'ID) : NBAB qui redémarre en boucle -> critique
  cree({ j: 0, mail: 1, qui: 'K. Martin (chef d\'équipe)', f: { vehiculeId: 'v3', equipId: 'nbab', gravite: 4,
    symptomes: 'Le NBAB redémarre en boucle ; aucune identification possible. Véhicule bloqué au dépôt pour la tournée bicomp.', diagnostic: diag('nbab', [0, 0, 1]) } });
  // BOM 310 (CITIPAP) : K3 sans communication
  cree({ j: 6, mail: 1, qui: 'L. Moreau (exploitation)', f: { vehiculeId: 'v5', equipId: 'k3', gravite: 3,
    symptomes: 'Plus de remontée de position dans GeoRed depuis lundi. Voyant GPS vert clignotant, voyant communication rouge fixe.', diagnostic: diag('k3', [4, 0]) } });
  // BEN 032 (CITIPAP) : résolu
  cree({ j: 12, mail: 1, qui: 'A. Petit (conducteur)', f: { vehiculeId: 'v6', equipId: 'ant_cab', gravite: 2,
    symptomes: 'Voyant GPS du K3 orange clignotant en permanence.', diagnostic: diag('antenne_cab', [1]) } },
    [[{ statut: 'en_cours' }, 'Statut : Ouvert → En cours'], [{ statut: 'resolu' }, 'Statut : En cours → Résolu · Antenne redressée et câble resserré, FIX retrouvé']]);
  // GRU 455 (CITIPAV) : support de tablette, résolu
  cree({ j: 20, qui: 'L. Moreau (exploitation)', f: { vehiculeId: 'v7', equipId: 'support', gravite: 1,
    symptomes: 'La tablette bouge sur son support dans les virages.', diagnostic: diag('support', [1]) } },
    [[{ statut: 'resolu' }, 'Statut : Ouvert → Résolu · Support resserré par l\'atelier']]);
  app.refresh();
})();
"""

def construire(demo):
    html = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Matériel embarqué{' (démo)' if demo else ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap">
<style>
{(M / 'materiel-embarque.css').read_text(encoding='utf-8')}
body {{ margin: 0; background: #F5F7FA; }}
#app {{ min-height: 100vh; }}
.demo-bandeau {{ display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; justify-content: center; padding: 8px 16px; background: #DB722E; color: #fff;
  font: 600 13.5px 'Red Hat Display', 'Segoe UI', system-ui, sans-serif; }}
.demo-bandeau button {{ font: inherit; font-size: 12.5px; border: 1px solid rgba(255,255,255,.8); background: transparent; color: #fff; border-radius: 6px; padding: 3px 10px; cursor: pointer; }}
</style>
</head>
<body>
""" + ('<div class="demo-bandeau">Version de démonstration : véhicules et signalements fictifs, données séparées de l\'outil réel.'
       ' <button type="button" id="demo-reset">Réinitialiser la démo</button></div>\n' if demo else '') + f"""<div id="app"></div>
<script>
{js(assets)}
</script>
""" + ''.join('<script>\n' + js((M / s).read_text(encoding='utf-8')) + '\n</script>\n' for s in SCRIPTS) + \
    ('<script>' + js(DEMO) + '</script>\n' if demo else "<script>MaterielEmbarque.mount(document.getElementById('app'), { version: 'v0.3' });</script>\n") + """</body>
</html>
"""
    sortie = RACINE / 'dist' / ('materiel-embarque-demo.html' if demo else 'materiel-embarque.html')
    sortie.write_text(html, encoding='utf-8')
    print(sortie.name, round(sortie.stat().st_size / 1024), 'Ko,', len(ressources), 'ressources intégrées')

construire(False)
construire(True)
