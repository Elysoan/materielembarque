/* Configuration métier du module : types de véhicules, équipements, gravités, parc de démonstration.
   Tout ce qui est "donnée" est ici pour être remplacé facilement par l'outil global. */
(function (root) {
  const ME = (root.MaterielEmbarque = root.MaterielEmbarque || {});

  // Équipement : x/y = position du point cliquable dans le schéma SVG (viewBox 0 0 900 360).
  const E = (id, label, code, x, y) => ({ id, label, code, x, y });

  ME.defaults = {
    // Un type = un schéma (voir schemas.js) + sa liste d'équipements possibles.
    types: [
      { id: 'bennette', label: 'Bennette (3,5 t)', schema: 'bennette', equipements: [
        E('cam_ar',   'Caméra de recul',          'CR', 60,  175),
        E('radar_ar', 'Radar / alarme de recul',  'RA', 50,  288),
        E('gyro',     'Gyrophare',                'GY', 260, 134),
        E('gps',      'Balise GPS / télématique', 'GP', 520, 126),
        E('ecran',    'Écran / tablette cabine',  'EC', 566, 186),
        E('dvr',      'Enregistreur vidéo (DVR)', 'DV', 510, 225)
      ] },
      { id: 'bom_mono', label: 'BOM mono-compartiment', schema: 'bom_mono', equipements: [
        E('cam_ar',   'Caméra de recul',          'CR', 55,  140),
        E('radar_ar', 'Radar / alarme de recul',  'RA', 50,  288),
        E('rfid',     'Lecteur RFID (levée)',     'ID', 100, 200),
        E('balance',  'Pesée embarquée',          'PE', 100, 246),
        E('cam_lat',  'Caméra latérale',          'CL', 400, 112),
        E('gyro',     'Gyrophare',                'GY', 300, 72),
        E('gps',      'Balise GPS / télématique', 'GP', 650, 96),
        E('ecran',    'Écran / tablette cabine',  'EC', 742, 150),
        E('dvr',      'Enregistreur vidéo (DVR)', 'DV', 660, 205)
      ] },
      { id: 'bom_bicomp', label: 'BOM bi-compartiment', schema: 'bom_bicomp', equipements: [
        E('cam_ar',   'Caméra de recul',                   'CR', 55,  140),
        E('radar_ar', 'Radar / alarme de recul',           'RA', 50,  288),
        E('rfid',     'Lecteur RFID (levée)',              'ID', 100, 200),
        E('balance',  'Pesée embarquée',                   'PE', 100, 246),
        E('niv1',     'Détecteur de remplissage cpt 1',    'N1', 190, 120),
        E('niv2',     'Détecteur de remplissage cpt 2',    'N2', 450, 120),
        E('cloison',  'Commande de cloison / compartiment', 'CC', 315, 215),
        E('cam_lat',  'Caméra latérale',                   'CL', 520, 190),
        E('gyro',     'Gyrophare',                         'GY', 315, 72),
        E('gps',      'Balise GPS / télématique',          'GP', 650, 96),
        E('ecran',    'Écran / tablette cabine',           'EC', 742, 150),
        E('dvr',      'Enregistreur vidéo (DVR)',          'DV', 660, 205)
      ] },
      { id: 'bom_bl', label: 'BOM bras latéral', schema: 'bom_bl', equipements: [
        E('cam_ar',   'Caméra de recul',                    'CR', 55,  140),
        E('radar_ar', 'Radar / alarme de recul',            'RA', 50,  288),
        E('cam_bras', 'Caméra de bras',                     'CB', 499, 92),
        E('capt_bras', 'Capteurs de position du bras',      'CP', 499, 175),
        E('rfid',     'Lecteur RFID (préhenseur)',          'ID', 560, 205),
        E('balance',  'Pesée embarquée (préhenseur)',       'PE', 556, 262),
        E('joystick', 'Joystick de commande du bras',       'JS', 722, 218),
        E('cam_lat',  'Caméra latérale',                    'CL', 300, 130),
        E('gyro',     'Gyrophare',                          'GY', 250, 72),
        E('gps',      'Balise GPS / télématique',           'GP', 650, 96),
        E('ecran',    'Écran / tablette cabine',            'EC', 742, 150),
        E('dvr',      'Enregistreur vidéo (DVR)',           'DV', 650, 222)
      ] },
      { id: 'camion_grue', label: 'Camion grue', schema: 'camion_grue', equipements: [
        E('cam_ar',   'Caméra de recul',                       'CR', 55,  205),
        E('radar_ar', 'Radar / alarme de recul',               'RA', 50,  288),
        E('stab',     'Capteurs de calage des stabilisateurs', 'ST', 110, 272),
        E('lmi',      'Limiteur de charge (LMI)',              'LC', 565, 195),
        E('radio',    'Radiocommande de grue',                 'RC', 400, 212),
        E('cam_grue', 'Caméra de flèche',                      'CF', 330, 46),
        E('gyro',     'Gyrophare',                             'GY', 610, 76),
        E('gps',      'Balise GPS / télématique',              'GP', 685, 84),
        E('ecran',    'Écran / tablette cabine',               'EC', 742, 150),
        E('dvr',      'Enregistreur vidéo (DVR)',              'DV', 660, 215)
      ] }
    ],

    gravites: [
      { niveau: 1, label: 'Mineure',  aide: 'Gêne sans impact sur la collecte' },
      { niveau: 2, label: 'Modérée',  aide: 'Fonction dégradée, collecte possible' },
      { niveau: 3, label: 'Majeure',  aide: 'Fonction hors service, collecte avec contournement' },
      { niveau: 4, label: 'Critique', aide: 'Véhicule immobilisé ou non conforme sécurité : intervention immédiate' }
    ],

    statuts: [
      { id: 'ouvert',   label: 'Ouvert' },
      { id: 'en_cours', label: 'En cours' },
      { id: 'resolu',   label: 'Résolu' }
    ],

    // Parc de démonstration (remplaçable via mount(el, { vehicules: [...] })).
    // `equipements` (optionnel) : sous-ensemble des équipements du type réellement montés sur ce véhicule.
    vehicules: [
      { id: 'v1', type: 'bom_mono',    immat: 'GH-214-AB', parc: 'BOM 214', agence: 'Lyon Est',     modele: 'Renault D Wide 26T' },
      { id: 'v2', type: 'bom_mono',    immat: 'GJ-587-KL', parc: 'BOM 587', agence: 'Lyon Est',     modele: 'Mercedes Econic 26T',
        equipements: ['cam_ar', 'radar_ar', 'rfid', 'cam_lat', 'gyro', 'gps', 'ecran'] },
      { id: 'v3', type: 'bom_bicomp',  immat: 'GM-120-CD', parc: 'BOM 120', agence: 'Lyon Est',     modele: 'Scania P280 26T bi-comp' },
      { id: 'v4', type: 'bom_bl',      immat: 'GK-901-MN', parc: 'BL 901',  agence: 'Villeurbanne', modele: 'Renault D Wide 26T + bras' },
      { id: 'v5', type: 'bom_bl',      immat: 'GP-310-EF', parc: 'BL 310',  agence: 'Villeurbanne', modele: 'Volvo FE 26T + bras',
        equipements: ['cam_ar', 'radar_ar', 'cam_bras', 'capt_bras', 'joystick', 'gyro', 'gps', 'ecran'] },
      { id: 'v6', type: 'bennette',    immat: 'FZ-032-RT', parc: 'BEN 032', agence: 'Villeurbanne', modele: 'Iveco Daily 3,5T' },
      { id: 'v7', type: 'camion_grue', immat: 'GN-455-ZX', parc: 'GRU 455', agence: 'Lyon Est',     modele: 'Mercedes Arocs + grue Hiab' }
    ],

    reglages: {
      destinataire: '',
      copie: '',
      declarant: '',
      prefixeObjet: '[Matériel embarqué]'
    }
  };
})(window);
