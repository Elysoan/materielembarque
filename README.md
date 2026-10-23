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
<script src="module/mail.js"></script><script src="module/app.js"></script>
<script>
  MaterielEmbarque.mount(document.getElementById('zone'), {
    vehicules: [...],        // optionnel : parc réel (même structure que module/data.js)
    equipements: [...],      // optionnel : types d'équipements + position sur le schéma
    reglages: { destinataire: 'atelier@...' },
    storage: { load() {...}, save(obj) {...} }   // optionnel : remplace localStorage (API, SharePoint...)
  });
</script>
```
Données par défaut (équipements, gravités, parc de démo) : `module/data.js`.

## Limites du MVP
- Stockage local au navigateur par défaut (non partagé entre postes) → brancher `storage` pour un usage multi-utilisateurs.
- Un seul schéma de véhicule (BOM). Autres types (ampliroll, laveuse...) = ajouter un schéma SVG.
- Pas de pièce jointe/photo dans le mail (impossible via `mailto:`) ; possible dans le `.eml` en évolution.
- L'application ne peut pas savoir si le mail a été réellement envoyé : l'historique indique « mail préparé ».
