# Matériel embarqué

Module de gestion du matériel embarqué des véhicules (BOM) : parc, schéma cliquable, niveau de gravité,
historique, préparation du mail pour Outlook. Sans dépendance, sans build.

## Essayer
Ouvrir `index.html` dans un navigateur (double-clic suffit).

## Fonctionnement
1. **Parc** : choisir un véhicule, cliquer sur un équipement du schéma (pastille verte = RAS, orange/rouge = défaut, numéro = gravité max).
2. Choisir la **gravité** (1 mineure → 4 critique/immobilisant) et décrire les **symptômes**.
3. Le signalement est enregistré dans l'**historique**, et un **mail prérempli** s'affiche (éditable) :
   - *Ouvrir dans Outlook* : lien `mailto:` (texte tronqué si trop long, limite des liens Outlook) ;
   - *Télécharger le brouillon (.eml)* : s'ouvre dans Outlook en brouillon (`X-Unsent: 1`), texte complet ;
   - *Copier*.
4. **Historique** : filtres, changement de statut/gravité, journal, export CSV (Excel FR).
5. **Réglages** : destinataire/copie par défaut, signature, sauvegarde/restauration JSON.

## Intégration dans l'outil global
```html
<link rel="stylesheet" href="module/materiel-embarque.css">
<script src="module/data.js"></script><script src="module/store.js"></script>
<script src="module/mail.js"></script><script src="module/schemas.js"></script><script src="module/app.js"></script>
<script>
  MaterielEmbarque.mount(document.getElementById('zone'), {
    vehicules: [...],        // optionnel : parc réel (même structure que module/data.js)
    types: [...],            // optionnel : types de véhicules (schéma + équipements + position des points)
    reglages: { destinataire: 'atelier@...' },
    storage: { load() {...}, save(obj) {...} }   // optionnel : remplace localStorage (API, SharePoint...)
  });
</script>
```
Données par défaut (types, équipements, gravités, parc de démo) : `module/data.js`.

## Types de véhicules
Bennette (3,5 t), BOM mono-compartiment, BOM bi-compartiment, BOM bras latéral, camion grue. Chaque type a son schéma
(`module/schemas.js`) et sa liste d'équipements (ex. caméra de bras / joystick pour le BL, limiteur de charge / radiocommande /
calage stabilisateurs pour la grue). Un véhicule référence son `type` ; `equipements: [...]` (optionnel) limite aux équipements
réellement montés. Ajouter un type = un schéma dans `schemas.js` + une entrée dans `types` de `data.js`.

## Limites du MVP
- Stockage local au navigateur par défaut (non partagé entre postes) → brancher `storage` pour un usage multi-utilisateurs.
- Schémas simplifiés (pas à l'échelle) ; équipements et positions à valider avec vos réalités terrain.
- Pas de pièce jointe/photo dans le mail (impossible via `mailto:`) ; possible dans le `.eml` en évolution.
- L'application ne peut pas savoir si le mail a été réellement envoyé : l'historique indique « mail préparé ».
