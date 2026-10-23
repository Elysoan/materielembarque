"""Construit dist/materiel-embarque.html : un fichier unique et autonome (styles, scripts, images,
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

html = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Matériel embarqué</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap">
<style>
{(M / 'materiel-embarque.css').read_text(encoding='utf-8')}
body {{ margin: 0; background: #F5F7FA; }}
#app {{ min-height: 100vh; }}
</style>
</head>
<body>
<div id="app"></div>
<script>
{js(assets)}
</script>
""" + ''.join('<script>\n' + js((M / s).read_text(encoding='utf-8')) + '\n</script>\n' for s in SCRIPTS) + """<script>MaterielEmbarque.mount(document.getElementById('app'), { version: 'v0.3' });</script>
</body>
</html>
"""
sortie = RACINE / 'dist' / 'materiel-embarque.html'
sortie.write_text(html, encoding='utf-8')
print(sortie, round(sortie.stat().st_size / 1024), 'Ko,', len(ressources), 'ressources intégrées')
