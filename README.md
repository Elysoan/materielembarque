# Matériel embarqué

Module de gestion du matériel embarqué des véhicules : parc, vues dynamiques cliquables, diagnostic guidé (arbres de causes),
niveau de gravité, historique, préparation du mail pour Outlook. Sans dépendance, sans build.

## Essayer
- **Fichier unique** : `dist/materiel-embarque.html` (tout est intégré, fonctionne hors ligne). Régénérer après une modification :
  `python3 outils/construire-html.py`.
- **Démonstration** : `dist/materiel-embarque-demo.html` (signalements fictifs, données séparées de l'outil réel, bouton « Réinitialiser la démo »).
- **Version développement** : ouvrir `index.html` (charge les fichiers de `module/`).

## Fonctionnement
1. **Parc** : choisir un véhicule (filtres agence / solution / type). Son **picto** s'affiche en grand avec deux zones cliquables
   (**Cabine** / **Arrière**) ; chaque vue montre l'équipement sur une image avec des points cliquables
   (vert = RAS, jaune à rouge foncé = défaut ouvert, numéro = gravité).
2. Clic sur un équipement : **diagnostic guidé** (facultatif). On répond aux questions de l'arbre de causes jusqu'à une
   *cause probable* + *action recommandée*, avec une gravité suggérée (modifiable) et le constat pré-rempli.
3. Choix de la **gravité** (1 mineure → 4 critique), description des **symptômes**, chaise concernée (gauche / droite) si besoin.
4. Le signalement est enregistré dans l'**historique** et un **mail prérempli** (diagnostic inclus) s'affiche, éditable :
   - *Ouvrir dans Outlook* : lien `mailto:` (texte tronqué si trop long, limite des liens Outlook) ;
   - *Télécharger le brouillon (.eml)* : s'ouvre dans Outlook en brouillon (`X-Unsent: 1`), texte complet (recommandé) ;
   - *Copier*.
5. **Historique** : indicateurs (dont délai moyen de résolution), statistiques sur 30 j / 90 j / 12 mois (équipements les plus défectueux,
   véhicules les plus touchés, délai de résolution par gravité, signalement ouvert le plus ancien), colonne « Délai », filtres, changement de statut / gravité, journal, export CSV (Excel FR). **Réglages** : copie (Cc), signature, sauvegarde JSON. Destinataire fixe : service.clients@simpliciti.fr, ri@paprec.com toujours en copie ; objet préfixé par la solution ([CITI'ID], [CITIPAP]…).

## Import du parc de véhicules
1. Réglages › Parc de véhicules › **Télécharger le modèle vide** (`module/modele-parc-vehicules.xlsx`).
2. Remplir l'onglet « Parc » : une ligne par véhicule. Les équipements se remplissent **automatiquement selon la solution**
   (Oui / « — » si non applicable) ; remplacer par « Non » un équipement absent. Correspondance solution / équipements : onglet « Listes ».
3. Glisser le fichier dans la zone de dépôt : l'outil affiche un rapport (véhicules prêts, erreurs ligne par ligne, avertissements),
   puis **Remplacer le parc**. Les signalements suivent les véhicules par leur n° de parc d'un import à l'autre.
4. Mise à jour : **Exporter le parc actuel (CSV)**, modifier, réimporter. Excel (.xlsx) ou CSV acceptés ; lecture Excel par SheetJS
   embarqué (`module/vendor/`, Apache 2.0), sans accès internet.

## Équipements pris en compte
| Zone | Équipements | Solutions |
|---|---|---|
| Cabine | Antenne, calculateur K3, support de charge, tablette | toutes (CITIPAP, CITI'ID, CITI'Mission, CITIPAV) |
| Arrière | Antenne (dent), décodeur, boîte à boutons, NBAB, câble | CITI'ID (les antennes / décodeurs / boîtes sont gérés par **chaise** gauche / droite) |

## Arbres de causes
`module/arbres.js` : bbv, lecteur (antenne / décodeur), nbab, tablette, support, k3, antenne cabine, câble. Source : *Guide pour Diagnostic et
Maintenance CITI ID Simpliciti V2.2*. Les conclusions marquées « piste hors guide » (`piste: true`) sont des compléments à valider.
Un arbre = des nœuds (question + options) ; une option mène à un autre nœud, un autre arbre, ou une conclusion (cause, action, gravité).

## Données et intégration dans l'outil global
```html
<link rel="stylesheet" href="module/materiel-embarque.css">
<script src="module/data.js"></script><script src="module/store.js"></script><script src="module/mail.js"></script>
<script src="module/arbres.js"></script><script src="module/parc-import.js"></script><script src="module/app.js"></script>
<script>
  MaterielEmbarque.mount(document.getElementById('zone'), {
    vehicules: [...],        // optionnel : parc réel (même structure que module/data.js)
    destinataire: 'service.clients@simpliciti.fr', // optionnel : valeur par défaut (module/data.js)
    storage: { load() {...}, save(obj) {...} }   // optionnel : remplace localStorage (API, SharePoint...)
  });
</script>
```
- `module/data.js` : solutions, types de véhicules (= pictos Paprec dans `module/img/pictos/`), vues, équipements, gravités, parc de démo.
- Position d'un point sur une image : `pos: [x, y]` en pixels de l'image. **Maj + clic sur l'image** affiche les coordonnées à saisir.
- Un véhicule peut limiter ses équipements : `equipements: ['tablette', 'k3']`.
- Pictos : `module/img/pictos/*.svg` (bibliothèque PICTOS 2024). Images des vues : `module/img/vues/` (extraites du guide Simpliciti).

## Limites du MVP
- Stockage local au navigateur par défaut (non partagé entre postes) → brancher `storage` pour un usage multi-utilisateurs.
- Vue arrière = rendu d'une BOM mono 2 chaises (guide Simpliciti), utilisé pour tous les véhicules ; équipements arrière définis pour CITI'ID uniquement.
- Position des points : cabine et arrière à valider / caler sur vos véhicules (K3, antenne et câble ne sont pas visibles : affichés en pastilles).
- L'application ne peut pas savoir si le mail a été réellement envoyé : l'historique indique « mail préparé ».
