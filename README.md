# Matériel embarqué

Module de gestion du matériel embarqué des véhicules : parc, vues dynamiques cliquables, diagnostic guidé (arbres de causes),
niveau de gravité, historique, préparation du mail pour Outlook. Sans dépendance, sans build.

## Essayer
- **Fichier unique** : `dist/materiel-embarque.html` (tout est intégré, fonctionne hors ligne). Régénérer après une modification :
  `python3 outils/construire-html.py`.
- **Démonstration** : `dist/materiel-embarque-demo.html` (signalements fictifs, données séparées de l'outil réel, bouton « Réinitialiser la démo »).
- **Version développement** : ouvrir `index.html` (charge les fichiers de `module/`).

## Fonctionnement
0. **Accompagnement** : au premier lancement, l'outil propose une **visite guidée** (bouton « ❓ Visite guidée » dans le bandeau) et affiche
   le guide **« Bien démarrer »** : importer le parc → indiquer son nom → signaler un premier défaut → suivre la résolution.
   Les étapes se cochent seules ; le bouton vert mène à la prochaine action. L'outil réel démarre **vide** (aucun véhicule fictif).
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
   véhicules les plus touchés, délai de résolution par gravité, pannes récurrentes, signalement ouvert le plus ancien), colonne « Délai », filtres, changement de statut / gravité, journal, export CSV (Excel FR). **Réglages** : copie (Cc), signature, sauvegarde JSON. Destinataire fixe : service.clients@simpliciti.fr, ri@paprec.com toujours en copie ; objet préfixé par la solution ([CITI'ID], [CITIPAP]…).

## Suivi Simpliciti : tickets, relances, pannes récurrentes
- **N° de ticket** : à saisir dans le signalement (Historique › clic sur la ligne) dès la réponse de Simpliciti. Il apparaît dans la colonne
  « Suivi Simpliciti », dans la recherche et dans l'export CSV.
- **Relance** : un défaut non résolu passe **« À relancer »** quand le dernier mail (signalement ou relance) dépasse le délai de sa gravité :
  **G4 : 1 j · G3 : 2 j · G2 : 5 j · G1 : 10 j** (`relance` dans `module/data.js`, *à caler sur le contrat de service Simpliciti*).
  Compteur rouge sur l'onglet Historique, indicateur « À relancer », filtre dédié. Bouton **« Relancer Simpliciti »** : mail prêt citant le ticket,
  l'ancienneté et les échanges précédents ; chaque relance est notée au journal.
- **Pannes récurrentes** : même véhicule, même équipement (et même chaise), **2 signalements ou plus sur 90 jours** (`recidive` dans `module/data.js`).
  Badge « ↻ récurrent » sur la fiche du véhicule et dans l'historique, avertissement à la saisie, paragraphe « PANNE RÉCURRENTE » dans le mail
  (références des précédents + demande de remplacement ou d'expertise) et panneau dédié dans les statistiques.

## Partage SharePoint (plusieurs utilisateurs)
Sans configuration, les données restent **dans le navigateur** du poste. Publiée sur un site SharePoint, la page passe automatiquement en mode
**partagé** : chaque signalement, chaque véhicule et l'en-tête du parc deviennent un élément d'une liste du site (`MaterielEmbarque`).
1. Déposer `dist/materiel-embarque.html` sur le site SharePoint de l'équipe, de façon à ce qu'il **s'affiche** (et non qu'il se télécharge) :
   voir le point d'attention ci-dessous.
2. Ouvrir la page : la pastille en haut indique « Partage à configurer ». Réglages › Données › **Créer la liste « MaterielEmbarque »**
   (droits de gestion du site), ou la faire créer par l'administrateur : liste personnalisée avec une colonne **Donnees**
   (plusieurs lignes de texte, texte brut). La colonne Titre contient la clé (`inc:INC-2026-0001`, `veh:p-gh148hb`, `parc`).
3. Les utilisateurs ont besoin du droit **Modification** sur la liste. Pastille « Partagé » = tout est à jour.

Fonctionnement : copie locale pour démarrer instantanément et saisir hors connexion (« Hors ligne · n en attente », envoi au retour du réseau) ;
synchronisation toutes les 60 s et au retour sur l'onglet ; deux postes qui créent un signalement hors ligne avec la même référence :
le second est **renuméroté** (noté au journal). Deux personnes qui modifient *le même* signalement en même temps : la dernière enregistrée l'emporte.
Les réglages personnels (nom, copie, visite guidée) restent propres à chaque poste. « Tout effacer » efface pour toute l'équipe.

**Point d'attention (à valider avec l'informatique)** : SharePoint Online télécharge les fichiers `.html` au lieu de les afficher, et bloque les
scripts sur les sites où le « script personnalisé » est désactivé (réglage par défaut). Trois façons d'héberger la page :
- **Outil global** déjà servi par SharePoint (même site) : appeler `mount(el, { sharepoint: { site, liste } })` ;
- page `.aspx` sur un site où l'administrateur autorise le script personnalisé (le plus rapide si c'est possible) ;
- **composant SPFx** (web part) déployé par l'informatique dans le catalogue d'applications : la solution pérenne, le module s'y monte tel quel.
Le module fonctionne en *même origine* : ouvert depuis un fichier local ou un autre domaine, il reste en mode local (SharePoint refuse les appels
d'un autre domaine).

## Import du parc de véhicules
1. Réglages › Parc de véhicules › **Télécharger le modèle vide** (`module/modele-parc-vehicules.xlsx`).
2. Remplir l'onglet « Parc » : une ligne par véhicule. Les équipements se remplissent **automatiquement selon la solution**
   (Oui / « — » si non applicable) ; remplacer par « Non » un équipement absent. Correspondance solution / équipements : onglet « Listes ».
3. Glisser le fichier dans la zone de dépôt : l'outil affiche un rapport (véhicules prêts, erreurs ligne par ligne, avertissements),
   puis **Remplacer le parc**. Les signalements suivent les véhicules par leur immatriculation d'un import à l'autre.
4. Mise à jour : **Exporter le parc actuel (CSV)**, modifier, réimporter. Excel (.xlsx) ou CSV acceptés ; lecture Excel par SheetJS
   embarqué (`module/vendor/`, Apache 2.0), sans accès internet.

## Ajouter ou modifier un véhicule
Page Parc : **« + Ajouter un véhicule »** (immatriculation, agence, solution, kit piéton, type, équipements cochés selon la solution)
et **« ✎ Modifier »** sur la fiche d'un véhicule (changer la solution, ajouter le kit piéton, décocher un équipement absent, retirer le véhicule).
L'historique est conservé ; un import ultérieur remplace le parc complet.

## Équipements pris en compte
| Zone | Équipements | Solutions |
|---|---|---|
| Cabine | Antenne, calculateur K3, support de charge, tablette | toutes (CITIPAP, CITI'ID, CITI'Mission, CITIPAV) |
| Arrière | Antenne (dent), décodeur, boîte à boutons, NBAB, câble | CITI'ID (antennes / décodeurs / boîtes gérés par **chaise** : gauche / droite, plus **bicomp** tout à droite sur les BOM bi-compartimentées, avec un schéma arrière dédié à 3 chaises) |
| Arrière (lève-conteneur) | Capteurs de présence bac (gauche, droite, 4 roues), capteurs de point haut (gauche, droite), stops bac | CITI'ID. **Hors charge Simpliciti** (carrossier / atelier) : le destinataire du mail devient modifiable |
| Kit piéton | Le kit (un seul équipement). Pannes types : absence du listing des contrats ou tournées, problème de charge, ne lit pas les puces | Kit piéton : solution seule ou **complément** d'une autre solution |

## Arbres de causes
`module/arbres.js` : bbv, lecteur (antenne / décodeur), nbab, tablette, support, k3, antenne cabine, câble, capteur de présence bac (§4.3.1),
capteur de point haut (§4.3.2), stops bac (§6 : bacs non lus jamais stoppés / bacs systématiquement stoppés), kit piéton. Source : *Guide pour Diagnostic et
Maintenance CITI ID Simpliciti V2.2*. Les conclusions marquées « piste hors guide » (`piste: true`) sont des compléments à valider.
Un arbre = des nœuds (question + options) ; une option mène à un autre nœud, un autre arbre, ou une conclusion (cause, action, gravité).

## Données et intégration dans l'outil global
```html
<link rel="stylesheet" href="module/materiel-embarque.css">
<script src="module/data.js"></script><script src="module/store.js"></script><script src="module/mail.js"></script>
<script src="module/arbres.js"></script><script src="module/parc-import.js"></script><script src="module/partage.js"></script><script src="module/app.js"></script>
<script>
  MaterielEmbarque.mount(document.getElementById('zone'), {
    vehicules: [...],        // optionnel : parc réel (même structure que module/data.js)
    destinataire: 'service.clients@simpliciti.fr', // optionnel : valeur par défaut (module/data.js)
    storage: { load() {...}, save(obj) {...} },  // optionnel : remplace la copie locale (localStorage)
    sharepoint: 'auto',      // ou { site: 'https://paprec.sharepoint.com/sites/xxx', liste: 'MaterielEmbarque' } : partage via une liste
    partage: { nom, lister(), ecrire(cle, valeur), supprimer(cle) } // ou tout autre serveur (API de l'outil global), mêmes règles de synchro
  });
</script>
```
- `module/data.js` : solutions, types de véhicules (= pictos Paprec dans `module/img/pictos/`), vues, équipements, gravités, parc de démo.
- Position d'un point sur une image : `pos: [x, y]` en pixels de l'image. **Maj + clic sur l'image** affiche les coordonnées à saisir.
- Un véhicule peut limiter ses équipements : `equipements: ['tablette', 'k3']`.
- Pictos : `module/img/pictos/*.svg` (bibliothèque PICTOS 2024). Images des vues : `module/img/vues/` (extraites du guide Simpliciti).

## Limites du MVP
- Stockage local au navigateur par défaut ; partage via SharePoint selon l'hébergement validé avec l'informatique (voir « Partage SharePoint »).
- Délais de relance et seuil de récidive : valeurs par défaut à confirmer (contrat Simpliciti, usage terrain).
- Capteurs et stops bac : affichés en pastilles (emplacement variable selon la benne).
- Vue arrière = rendu d'une BOM mono 2 chaises (guide Simpliciti), utilisé pour tous les véhicules ; équipements arrière définis pour CITI'ID uniquement.
- Position des points : cabine et arrière à valider / caler sur vos véhicules (K3, antenne et câble ne sont pas visibles : affichés en pastilles).
- L'application ne peut pas savoir si le mail a été réellement envoyé : l'historique indique « mail préparé ».
