/* Configuration métier du module : types d'équipements, gravités, parc de démonstration.
   Tout ce qui est "donnée" est ici pour être remplacé facilement par l'outil global. */
(function (root) {
  const ME = (root.MaterielEmbarque = root.MaterielEmbarque || {});

  ME.defaults = {
    // Équipements d'une BOM (benne à ordures ménagères). x/y = position du point cliquable
    // dans le schéma SVG (viewBox 0 0 900 360).
    equipements: [
      { id: 'cam_ar',   label: 'Caméra de recul',           code: 'CR', x: 55,  y: 140 },
      { id: 'radar_ar', label: 'Radar / alarme de recul',   code: 'RA', x: 50,  y: 288 },
      { id: 'rfid',     label: 'Lecteur RFID (levée)',      code: 'ID', x: 100, y: 200 },
      { id: 'balance',  label: 'Pesée embarquée',           code: 'PE', x: 100, y: 246 },
      { id: 'cam_lat',  label: 'Caméra latérale',           code: 'CL', x: 400, y: 112 },
      { id: 'gyro',     label: 'Gyrophare',                 code: 'GY', x: 300, y: 72  },
      { id: 'gps',      label: 'Balise GPS / télématique',  code: 'GP', x: 650, y: 96  },
      { id: 'ecran',    label: 'Écran / tablette cabine',   code: 'EC', x: 742, y: 150 },
      { id: 'dvr',      label: 'Enregistreur vidéo (DVR)',  code: 'DV', x: 660, y: 205 }
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
    vehicules: [
      { id: 'v1', immat: 'GH-214-AB', parc: 'BOM 214', agence: 'Lyon Est',   modele: 'Renault D Wide 26T',
        equipements: ['cam_ar', 'radar_ar', 'rfid', 'balance', 'cam_lat', 'gyro', 'gps', 'ecran', 'dvr'] },
      { id: 'v2', immat: 'GJ-587-KL', parc: 'BOM 587', agence: 'Lyon Est',   modele: 'Mercedes Econic 26T',
        equipements: ['cam_ar', 'radar_ar', 'rfid', 'cam_lat', 'gyro', 'gps', 'ecran'] },
      { id: 'v3', immat: 'FZ-032-RT', parc: 'BOM 032', agence: 'Villeurbanne', modele: 'Renault D Wide 19T',
        equipements: ['cam_ar', 'radar_ar', 'gyro', 'gps', 'dvr'] },
      { id: 'v4', immat: 'GK-901-MN', parc: 'BOM 901', agence: 'Villeurbanne', modele: 'Scania P280 26T',
        equipements: ['cam_ar', 'radar_ar', 'rfid', 'balance', 'cam_lat', 'gyro', 'gps', 'ecran', 'dvr'] }
    ],

    reglages: {
      destinataire: '',
      copie: '',
      declarant: '',
      prefixeObjet: '[Matériel embarqué]'
    }
  };
})(window);
