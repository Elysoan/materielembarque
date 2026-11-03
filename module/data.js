/* Configuration métier du module : solutions, types de véhicules (pictos Paprec), équipements,
   gravités, parc de démonstration. Tout ce qui est "donnée" est ici pour être remplacé par l'outil global. */
(function (root) {
  const ME = (root.MaterielEmbarque = root.MaterielEmbarque || {});

  const COTES = ['Gauche', 'Droite'];
  const EMBARQUE = ['citipap', 'citiid', 'citimission', 'citipav']; // solutions embarquées (cabine équipée)

  ME.defaults = {
    solutions: [
      { id: 'citipap',    label: 'CITIPAP' },
      { id: 'citiid',     label: "CITI'ID" },
      { id: 'citimission', label: "CITI'Mission" },
      { id: 'citipav',    label: 'CITIPAV' },
      // Solution complémentaire : smartphone lecteur de puces, ajoutable à un véhicule en plus de sa solution principale
      { id: 'kitpieton',  label: 'Kit piéton', complement: true }
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
      // `arriere: 'bicomp'` : vue arrière à 3 chaises (gauche, droite, bicomp tout à droite)
      { id: 'bom_bicomp_5050', label: 'BOM bicomp 50/50', picto: 'bom-bicomp-50-50', arriere: 'bicomp' },
      { id: 'bom_bicomp_7030', label: 'BOM bicomp 70/30', picto: 'bom-bicomp-70-30', arriere: 'bicomp' },
      { id: 'bom_bl',   label: 'BOM préhension latérale', picto: 'bom-prehension-laterale' },
      { id: 'grue_19t', label: 'BOM grue 19 T', picto: 'bom-grue-19t', zones: true },
      { id: 'grue_26t', label: 'BOM grue 26 T', picto: 'bom-grue-26t', zones: true },
      { id: 'grue_32t', label: 'BOM grue 32 T', picto: 'bom-grue-32t', zones: true }
    ],

    // Vues détaillées (image + dimensions pour positionner les points en pixels de l'image).
    vues: {
      cabine:  { label: 'Cabine',  img: 'img/vues/cabine.jpg',  w: 1343, h: 820 },
      // `chaises` : chaises du lève-conteneur. Variante choisie par le type de véhicule (type.arriere).
      arriere: { label: 'Arrière', img: 'img/vues/arriere.jpg', w: 782,  h: 878, chaises: COTES,
        variantes: { bicomp: { img: 'img/vues/arriere-bicomp.svg', w: 900, h: 640, chaises: ['Gauche', 'Droite', 'Bicomp'] } } },
      pieton:  { label: 'Kit piéton' } // pas d'image : équipements listés
    },

    // Équipements pris en compte (guide Simpliciti CITI'ID).
    //  vue      : cabine | arriere
    //  solutions: absent = toutes les solutions
    //  pos      : [x, y] en pixels de la vue, ou { Gauche: [x, y], Droite: [x, y] } si parCote
    //  hors     : pas visible sur l'image => affiché dans la zone « Non visible sur l'image »
    //  parCote  : un point (et une ligne) par chaise ; cotes/coteObligatoire pilotent le champ « Chaise »
    //  chaise   : les côtés suivent les chaises de la vue (2, ou 3 sur une bi-comp) ; cotesPlus : côtés ajoutés (« 4 roues »)
    //  posVariantes : positions sur l'image d'une variante de vue (ex. bicomp)
    //  arbre    : arbre de diagnostic (arbres.js) ; picto : icône (module/img/pictos)
    equipements: [
      { id: 'tablette', code: 'TA', label: 'Tablette',                    vue: 'cabine', solutions: EMBARQUE, pos: [670, 205], arbre: 'tablette', picto: 'ordinateur-de-bord' },
      { id: 'support', code: 'SC',  label: 'Support de charge (tablette)', vue: 'cabine', solutions: EMBARQUE, pos: [665, 352], arbre: 'support' },
      { id: 'k3', code: 'K3',       label: 'Calculateur K3',               vue: 'cabine', solutions: EMBARQUE, hors: true, arbre: 'k3', picto: 'solution-embarquee-gps' },
      { id: 'ant_cab', code: 'AN',  label: 'Antenne (cabine)',             vue: 'cabine', solutions: EMBARQUE, hors: true, arbre: 'antenne_cab' },

      { id: 'ant_ar', code: 'AN',   label: 'Antenne (dent antenne)', vue: 'arriere', solutions: ['citiid'], parCote: true, chaise: true, coteObligatoire: true,
        pos: { Gauche: [165, 563], Droite: [250, 588] }, posVariantes: { bicomp: { Gauche: [215, 415], Droite: [405, 415], Bicomp: [695, 415] } },
        arbre: 'lecteur', picto: 'antenne-basse-frequence' },
      { id: 'decodeur', code: 'DE', label: 'Décodeur',               vue: 'arriere', solutions: ['citiid'], parCote: true, chaise: true, coteObligatoire: true,
        pos: { Gauche: [205, 658], Droite: [300, 678] }, posVariantes: { bicomp: { Gauche: [150, 385], Droite: [340, 385], Bicomp: [630, 385] } },
        arbre: 'lecteur', picto: 'lecteur-rfid' },
      { id: 'bbv', code: 'BB',      label: 'Boîte à boutons (BBV)',  vue: 'arriere', solutions: ['citiid'], parCote: true, chaise: true, coteObligatoire: true,
        pos: { Gauche: [88, 352], Droite: [333, 385] }, posVariantes: { bicomp: { Gauche: [85, 275], Droite: [545, 275], Bicomp: [820, 275] } },
        arbre: 'bbv', picto: 'boite-a-boutons' },
      { id: 'nbab', code: 'NB',     label: 'NBAB (boîtier arrière)', vue: 'arriere', solutions: ['citiid'], pos: [525, 530], posVariantes: { bicomp: [550, 471] }, arbre: 'nbab' },
      { id: 'cable', code: 'CA',    label: 'Câble',                  vue: 'arriere', solutions: ['citiid'], hors: true, chaise: true, coteObligatoire: false, arbre: 'cable' },
      // Capteurs et stops du lève-conteneur (guide §4.3 et §6) : fournis par le carrossier, hors charge Simpliciti,
      // mais indispensables à l'identification. Pas de point sur l'image (emplacement variable selon la benne).
      { id: 'capt_bac', code: 'CB', label: 'Capteur de présence bac', vue: 'arriere', solutions: ['citiid'], parCote: true, hors: true,
        chaise: true, cotesPlus: ['4 roues'], coteObligatoire: true, arbre: 'capteur_bac', horsSimpliciti: true },
      { id: 'capt_ph', code: 'PH',  label: 'Capteur de point haut',   vue: 'arriere', solutions: ['citiid'], parCote: true, hors: true,
        chaise: true, coteObligatoire: true, arbre: 'capteur_ph', horsSimpliciti: true },
      { id: 'stop_lc', code: 'ST',  label: 'Stops bac (lève-conteneur)', vue: 'arriere', solutions: ['citiid'], hors: true,
        chaise: true, cotesPlus: ['4 roues'], coteObligatoire: false, arbre: 'stopbac' },

      // Kit piéton : un seul équipement (smartphone lecteur de puces), présent dès que le véhicule a la solution
      { id: 'kp_kit', code: 'KP', label: 'Kit piéton', vue: 'pieton', solutions: ['kitpieton'], arbre: 'kitpieton', picto: 'lecteur-rfid' }
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
      { id: 'v1', type: 'bom_26t',  solution: 'citiid',     immat: 'GH214AB', agence: 'Lyon Est',     modele: 'Renault D Wide 26T' },
      { id: 'v2', type: 'bom_19t',  solution: 'citiid',     immat: 'GJ587KL', agence: 'Lyon Est',     modele: 'Mercedes Econic 19T' },
      { id: 'v3', type: 'bom_bicomp_5050', solution: 'citiid', immat: 'GM120CD', agence: 'Lyon Est',  modele: 'Scania P280 26T bi-comp' },
      { id: 'v4', type: 'bom_bl',   solution: 'citimission', immat: 'GK901MN', agence: 'Villeurbanne', modele: 'Renault D Wide 26T + bras' },
      { id: 'v5', type: 'bom_26t',  solution: 'citipap',    immat: 'GP310EF', agence: 'Villeurbanne', modele: 'Volvo FE 26T',
        complements: ['kitpieton'], equipements: ['tablette', 'support', 'k3', 'kp_kit'] },
      { id: 'v6', type: 'bennette', solution: 'citipap',    immat: 'FZ032RT', agence: 'Villeurbanne', modele: 'Iveco Daily 3,5T' },
      { id: 'v7', type: 'grue_26t', solution: 'citipav',    immat: 'GN455ZX', agence: 'Lyon Est',     modele: 'Mercedes Arocs + grue' }
    ],

    // Relance Simpliciti : un défaut non résolu est « à relancer » quand le dernier mail (signalement ou relance)
    // date de plus de N jours. Seuils par gravité, à caler sur le contrat de service Simpliciti.
    relance: { 1: 10, 2: 5, 3: 2, 4: 1 },
    // Panne récurrente : même équipement (et même chaise) du même véhicule signalé au moins `seuil` fois sur `jours` jours
    recidive: { jours: 90, seuil: 2 },

    // Mail de signalement : toujours adressé au service clients Simpliciti (ouverture de ticket).
    mail: { destinataire: 'service.clients@simpliciti.fr', copie: 'ri@paprec.com' },

    reglages: {
      copie: '',
      declarant: ''
    }
  };
})(window);
