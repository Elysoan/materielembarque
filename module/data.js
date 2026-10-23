/* Configuration métier du module : solutions, types de véhicules (pictos Paprec), équipements,
   gravités, parc de démonstration. Tout ce qui est "donnée" est ici pour être remplacé par l'outil global. */
(function (root) {
  const ME = (root.MaterielEmbarque = root.MaterielEmbarque || {});

  const COTES = ['Gauche', 'Droite'];

  ME.defaults = {
    solutions: [
      { id: 'citipap',    label: 'CITIPAP' },
      { id: 'citiid',     label: "CITI'ID" },
      { id: 'citimission', label: "CITI'Mission" },
      { id: 'citipav',    label: 'CITIPAV' }
    ],

    // Type de véhicule = picto (module/img/pictos/<picto>.svg). `zones` : vue de profil, cabine à droite
    // => zones cliquables Cabine / Arrière superposées au picto.
    types: [
      { id: 'bom_12t',  label: 'BOM 12 T',  picto: 'bom-12t',  zones: true },
      { id: 'bom_16t',  label: 'BOM 16 T',  picto: 'bom-16t',  zones: true },
      { id: 'bom_19t',  label: 'BOM 19 T',  picto: 'bom-19t',  zones: true },
      { id: 'bom_26t',  label: 'BOM 26 T',  picto: 'bom-26t',  zones: true },
      { id: 'bom_32t',  label: 'BOM 32 T',  picto: 'bom-32t',  zones: true },
      { id: 'bom_75t',  label: 'BOM 7,5 T', picto: 'bom-7-5t-avec-porte-arriere', zones: true },
      { id: 'bennette', label: 'Bennette 3,5 T', picto: 'bennette-3-5t', zones: true },
      { id: 'bom_bicomp_5050', label: 'BOM bicomp 50/50', picto: 'bom-bicomp-50-50' },
      { id: 'bom_bicomp_7030', label: 'BOM bicomp 70/30', picto: 'bom-bicomp-70-30' },
      { id: 'bom_bl',   label: 'BOM préhension latérale', picto: 'bom-prehension-laterale' },
      { id: 'grue_19t', label: 'BOM grue 19 T', picto: 'bom-grue-19t', zones: true },
      { id: 'grue_26t', label: 'BOM grue 26 T', picto: 'bom-grue-26t', zones: true },
      { id: 'grue_32t', label: 'BOM grue 32 T', picto: 'bom-grue-32t', zones: true }
    ],

    // Vues détaillées (image + dimensions pour positionner les points en pixels de l'image).
    vues: {
      cabine:  { label: 'Cabine',  img: 'img/vues/cabine.jpg',  w: 1343, h: 820 },
      arriere: { label: 'Arrière', img: 'img/vues/arriere.jpg', w: 782,  h: 878 }
    },

    // Équipements pris en compte (guide Simpliciti CITI'ID).
    //  vue      : cabine | arriere
    //  solutions: absent = toutes les solutions
    //  pos      : [x, y] en pixels de la vue, ou { Gauche: [x, y], Droite: [x, y] } si parCote
    //  hors     : pas visible sur l'image => affiché dans la zone « Non visible sur l'image »
    //  parCote  : un point (et une ligne) par chaise ; cotes/coteObligatoire pilotent le champ « Chaise »
    //  arbre    : arbre de diagnostic (arbres.js) ; picto : icône (module/img/pictos)
    equipements: [
      { id: 'tablette', code: 'TA', label: 'Tablette',                    vue: 'cabine', pos: [670, 205], arbre: 'tablette', picto: 'ordinateur-de-bord' },
      { id: 'support', code: 'SC',  label: 'Support de charge (tablette)', vue: 'cabine', pos: [665, 352], arbre: 'support' },
      { id: 'k3', code: 'K3',       label: 'Calculateur K3',               vue: 'cabine', hors: true, arbre: 'k3', picto: 'solution-embarquee-gps' },
      { id: 'ant_cab', code: 'AN',  label: 'Antenne (cabine)',             vue: 'cabine', hors: true, arbre: 'antenne_cab' },

      { id: 'ant_ar', code: 'AN',   label: 'Antenne (dent antenne)', vue: 'arriere', solutions: ['citiid'], parCote: true, cotes: COTES, coteObligatoire: true,
        pos: { Gauche: [165, 563], Droite: [250, 588] }, arbre: 'lecteur', picto: 'antenne-basse-frequence' },
      { id: 'decodeur', code: 'DE', label: 'Décodeur',               vue: 'arriere', solutions: ['citiid'], parCote: true, cotes: COTES, coteObligatoire: true,
        pos: { Gauche: [205, 658], Droite: [300, 678] }, arbre: 'lecteur', picto: 'lecteur-rfid' },
      { id: 'bbv', code: 'BB',      label: 'Boîte à boutons (BBV)',  vue: 'arriere', solutions: ['citiid'], parCote: true, cotes: COTES, coteObligatoire: true,
        pos: { Gauche: [88, 352], Droite: [333, 385] }, arbre: 'bbv', picto: 'boite-a-boutons' },
      { id: 'nbab', code: 'NB',     label: 'NBAB (boîtier arrière)', vue: 'arriere', solutions: ['citiid'], pos: [525, 530], arbre: 'nbab' },
      { id: 'cable', code: 'CA',    label: 'Câble',                  vue: 'arriere', solutions: ['citiid'], hors: true, cotes: COTES, coteObligatoire: false, arbre: 'cable' }
    ],

    gravites: [
      { niveau: 1, label: 'Mineure',  aide: 'Gêne sans impact sur la collecte' },
      { niveau: 2, label: 'Modérée',  aide: 'Fonction dégradée, collecte possible' },
      { niveau: 3, label: 'Majeure',  aide: "Fonction hors service (ex. chaise sans lecture de puces), collecte avec contournement" },
      { niveau: 4, label: 'Critique', aide: 'Véhicule immobilisé ou non conforme sécurité : intervention immédiate' }
    ],

    statuts: [
      { id: 'ouvert',   label: 'Ouvert' },
      { id: 'en_cours', label: 'En cours' },
      { id: 'resolu',   label: 'Résolu' }
    ],

    // Parc de démonstration (remplaçable via mount(el, { vehicules: [...] })).
    // `equipements` (optionnel) : sous-ensemble des équipements réellement montés sur ce véhicule.
    vehicules: [
      { id: 'v1', type: 'bom_26t',  solution: 'citiid',     immat: 'GH-214-AB', parc: 'BOM 214', agence: 'Lyon Est',     modele: 'Renault D Wide 26T' },
      { id: 'v2', type: 'bom_19t',  solution: 'citiid',     immat: 'GJ-587-KL', parc: 'BOM 587', agence: 'Lyon Est',     modele: 'Mercedes Econic 19T' },
      { id: 'v3', type: 'bom_bicomp_5050', solution: 'citiid', immat: 'GM-120-CD', parc: 'BOM 120', agence: 'Lyon Est',  modele: 'Scania P280 26T bi-comp' },
      { id: 'v4', type: 'bom_bl',   solution: 'citimission', immat: 'GK-901-MN', parc: 'BL 901', agence: 'Villeurbanne', modele: 'Renault D Wide 26T + bras' },
      { id: 'v5', type: 'bom_26t',  solution: 'citipap',    immat: 'GP-310-EF', parc: 'BOM 310', agence: 'Villeurbanne', modele: 'Volvo FE 26T',
        equipements: ['tablette', 'support', 'k3'] },
      { id: 'v6', type: 'bennette', solution: 'citipap',    immat: 'FZ-032-RT', parc: 'BEN 032', agence: 'Villeurbanne', modele: 'Iveco Daily 3,5T' },
      { id: 'v7', type: 'grue_26t', solution: 'citipav',    immat: 'GN-455-ZX', parc: 'GRU 455', agence: 'Lyon Est',     modele: 'Mercedes Arocs + grue' }
    ],

    reglages: {
      destinataire: '',
      copie: '',
      declarant: '',
      prefixeObjet: '[Matériel embarqué]'
    }
  };
})(window);
