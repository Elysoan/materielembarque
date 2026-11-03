/* Arbres de causes (aide au diagnostic). Source : « Guide pour Diagnostic et Maintenance CITI ID » Simpliciti V2.2.
   Structure d'un arbre : { titre, source, rappel, debut, noeuds: { id: { q, options: [...] } } }
   Une option mène soit à un autre nœud (suite), soit à un autre arbre (arbre[, noeud]), soit à une conclusion (fin).
   Une conclusion marquée `piste: true` n'est pas dans le guide : à valider avec Simpliciti / l'atelier. */
(function (root) {
  const ME = (root.MaterielEmbarque = root.MaterielEmbarque || {});

  const NBAB = 'Redémarrer le NBAB (couper le contact 10 s) entre chaque test de branchement.';
  const SIMPLICITI = 'Contacter Simpliciti';

  ME.arbres = {
    bbv: {
      titre: 'Boîte à boutons (BBV)', source: 'Guide Simpliciti §4.2', rappel: NBAB, debut: 'q0',
      noeuds: {
        q0: { q: 'Que voit-on dans la checklist de la tablette (Contrôle boîtiers) ?', options: [
          { r: 'Les 2 BBV apparaissent, mais un bouton ou un voyant ne fonctionne pas',
            fin: { cause: 'BBV endommagée (cause principale d\'un dysfonctionnement partiel).', action: 'Remplacer la ou les BBV défectueuse(s). Vérifier aussi l\'état général des composants et de la connectique.', gravite: 2 } },
          { r: 'Une des 2 BBV n\'apparaît pas', suite: 'q1' },
          { r: 'Aucune des 2 BBV n\'apparaît', suite: 'q2' },
          { r: 'Tout est conforme en checklist mais les levées ne sont pas lues en tournée', arbre: 'lecteur' }
        ] },
        q1: { q: 'La BBV concernée s\'allume-t-elle au démarrage du système ?', options: [
          { r: 'Oui, elle s\'allume',
            fin: { cause: 'BBV alimentée mais non reconnue : probable erreur de paramétrage / d\'adressage (gauche, droite, centre).', action: 'Vérifier le paramétrage de la BBV (procédure d\'adressage, document dédié Simpliciti). Sur une bi-comp : chaise gauche = « gauche », chaise droite = « centre », chaise bicomp = « droite ».', gravite: 2 } },
          { r: 'Non, elle ne s\'allume pas', suite: 'q1b' }
        ] },
        q1b: { q: 'La brancher avec un câble volant neuf (en gardant le Y en sortie du NBAB), puis redémarrer le NBAB. S\'allume-t-elle et apparaît-elle en checklist ?', options: [
          { r: 'Oui', fin: { cause: 'Câble de la BBV défectueux.', action: 'Remplacer le câble en suivant le chemin de câble de celui déjà installé.', gravite: 2 } },
          { r: 'Non', fin: { cause: 'BBV défectueuse ou non configurée.', action: 'Changer la BBV et la configurer (document dédié).', gravite: 2 } }
        ] },
        q2: { q: 'Brancher une BBV neuve avec un câble volant directement sur le port 5 du NBAB, puis redémarrer. S\'allume-t-elle au démarrage ?', options: [
          { r: 'Oui', suite: 'q2b' },
          { r: 'Non', fin: { cause: 'Potentiel problème au niveau du NBAB.', action: SIMPLICITI + ' (ticket avec le détail des tests).', gravite: 3, contact: true } }
        ] },
        q2b: { q: 'Rajouter le Y entre le câble volant et le port 5 du NBAB, puis redémarrer. La BBV neuve s\'allume-t-elle toujours ?', options: [
          { r: 'Oui', arbre: 'bbv', noeud: 'q1' },
          { r: 'Non', fin: { cause: 'Y (répartiteur) défectueux.', action: 'Remplacer le Y.', gravite: 3 } }
        ] }
      }
    },

    lecteur: {
      titre: 'Lecture de puces (antenne / décodeur) - par chaise', source: 'Guide Simpliciti §4.4, §5.3 à 5.5', rappel: NBAB + ' Tester avec un bac 2 roues pucé de chaque côté du lève-conteneur.', debut: 'q0',
      noeuds: {
        q0: { q: 'Que constate-t-on sur la chaise concernée ?', options: [
          { r: 'Le lecteur n\'apparaît pas dans la checklist (ou message « Erreur TAG » au démarrage du NBAB)', suite: 'a0' },
          { r: 'Voyant rouge fixe sur la BBV (pas de communication lecteur / NBAB)', suite: 'a0' },
          { r: 'Le lecteur apparaît en checklist mais aucune puce n\'est lue', suite: 'b0' },
          { r: 'Les puces sont lues de façon irrégulière, ou seulement de très près', suite: 'h0' },
          { r: 'Le lève-conteneur s\'arrête (stop bac) alors que le bac est pucé', suite: 's0' }
        ] },
        a0: { q: 'L\'étiquette du décodeur (Droite / Gauche / Droite bi-comp) correspond-elle bien à la chaise ?', options: [
          { r: 'Oui, bien adressé', suite: 'a1' },
          { r: 'Non, mal adressé', fin: { cause: 'Décodeur mal adressé.', action: 'Remplacer le décodeur par un décodeur bien adressé.', gravite: 3 } }
        ] },
        a1: { q: 'Brancher un décodeur neuf bien adressé, sans le fixer (« volant »), puis redémarrer le NBAB. Le lecteur est-il reconnu en checklist ?', options: [
          { r: 'Oui', fin: { cause: 'Décodeur défectueux.', action: 'Remplacer le décodeur ancien par le nouveau.', gravite: 3 } },
          { r: 'Non', suite: 'a2' }
        ] },
        a2: { q: 'Relier le décodeur volant au NBAB par un câble volant neuf. Le lecteur est-il reconnu en checklist ?', options: [
          { r: 'Oui', fin: { cause: 'Câble décodeur / NBAB défectueux.', action: 'Remplacer le câble par le neuf et rebrancher le décodeur d\'origine.', gravite: 3 } },
          { r: 'Non', fin: { cause: 'Potentiel problème au niveau du NBAB.', action: SIMPLICITI + ' (ticket avec le détail des tests).', gravite: 3, contact: true } }
        ] },
        b0: { q: 'La fréquence de lecture du lecteur est-elle en phase avec celle des puces du parc ?', options: [
          { r: 'Oui', suite: 'b1' },
          { r: 'Non', fin: { cause: 'Lecteur de fréquence inadaptée.', action: 'Remplacer le lecteur par un lecteur de fréquence adaptée.', gravite: 3 } }
        ] },
        b1: { q: 'Brancher une dent antenne neuve « volante » sur le décodeur en place. La puce est-elle lue et remonte-t-elle en checklist ?', options: [
          { r: 'Oui', fin: { cause: 'Dent antenne défectueuse.', action: 'Remplacer la dent par la nouvelle.', gravite: 3 } },
          { r: 'Non', suite: 'b2' }
        ] },
        b2: { q: 'Brancher un décodeur neuf volant (bonne adresse) dans la continuité de la dent volante. La puce est-elle lue ?', options: [
          { r: 'Oui', suite: 'b3' },
          { r: 'Non', fin: { cause: 'Cas non couvert par l\'arbre du guide.', action: SIMPLICITI + ' avec le détail des tests effectués.', gravite: 3, contact: true, piste: true } }
        ] },
        b3: { q: 'Rebrancher la dent antenne d\'origine sur le décodeur neuf volant. La puce est-elle lue ?', options: [
          { r: 'Oui', fin: { cause: 'Décodeur défectueux (dent d\'origine bonne).', action: 'Remplacer le décodeur ancien par le neuf et rebrancher l\'ancienne dent.', gravite: 3 } },
          { r: 'Non', fin: { cause: 'Dent antenne et décodeur défectueux.', action: 'Remplacer la dent et le décodeur par les éléments neufs utilisés pour le test.', gravite: 3 } }
        ] },
        h0: { q: 'Mesurer la hauteur de lecture (en tournée, hors checklist) : placer une puce centrée au-dessus de l\'antenne, la descendre lentement, s\'arrêter dès que la LED verte de la BBV s\'allume. Quelle est la hauteur ?', options: [
          { r: '3 cm ou plus (lecture conforme)',
            fin: { cause: 'Lecteur conforme : cause probable côté terrain (bac particulier, puces HS, mauvaise fréquence, mauvaise accroche du bac).', action: 'Vérifier l\'accroche du bac sur la dent antenne, tester d\'autres bacs pucés, puis refaire 10 levées du côté suspect.', gravite: 1 } },
          { r: 'Moins de 3 cm (lecture trop courte)', suite: 'h1' }
        ] },
        h1: { q: 'L\'alignement des dents antenne par rapport aux puces est-il bon ?', options: [
          { r: 'Oui', suite: 'h2' },
          { r: 'Non', fin: { cause: 'Dent antenne mal alignée avec la puce.', action: 'Ajuster le support antenne pour obtenir un bon alignement antenne / puce.', gravite: 2 } }
        ] },
        h2: { q: 'Câble entre la dent et le décodeur : 3 mètres maximum et sans prolongateur. Est-il conforme ?', options: [
          { r: 'Oui', fin: { cause: 'Dent antenne en défaut (lecture trop courte, câble conforme).', action: 'Remplacer la dent antenne.', gravite: 3 } },
          { r: 'Non', fin: { cause: 'Câble dent / décodeur trop long ou prolongé.', action: 'Remplacer par un câble conforme (3 m maximum, sans prolongateur).', gravite: 2 } }
        ] },
        s0: { q: 'Que montrent les voyants de la BBV lors de l\'arrêt ?', options: [
          { r: 'Rouge clignotant ET vert clignotant', fin: { cause: 'Bac en blacklist : le NBAB demande l\'arrêt du lève-conteneur.', action: 'Désactiver les stops pour les bacs en blacklist, puis recommencer.', gravite: 1 } },
          { r: 'Rouge clignotant seul', fin: { cause: 'Arrêt demandé pour un bac non pucé ou non lu.', action: 'Lancer une tournée sans stop bac sans puce et refaire 10 levées du côté concerné. Si la puce n\'est lue que sur certaines présentations : analyser la fiabilité de lecture et contacter Simpliciti pour ajuster le temps de lecture. Si jamais lue : refaire la checklist des lecteurs.', gravite: 2 } }
        ] }
      }
    },

    nbab: {
      titre: 'NBAB (boîtier arrière)', source: 'Guide Simpliciti §7.2', rappel: NBAB, debut: 'q0',
      noeuds: {
        q0: { q: 'Que constate-t-on sur le NBAB ?', options: [
          { r: 'Il ne démarre pas, ou redémarre en boucle après une courte initialisation', suite: 'n1' },
          { r: 'Il démarre mais la tablette ne dialogue pas avec lui', suite: 'n2' },
          { r: 'Un élément n\'est pas alimenté (voyant de fusible éteint)',
            fin: { cause: 'Alimentation / fusible de la ligne concernée.', action: 'Vérifier le fusible correspondant au voyant éteint (un voyant par fusible).', gravite: 2 } },
          { r: 'Erreur TAG / lecteur non vu', arbre: 'lecteur' },
          { r: 'Une boîte à boutons n\'est pas vue', arbre: 'bbv' }
        ] },
        n1: { q: 'Les voyants en façade du boîtier d\'alimentation BDCI (cabine) sont-ils allumés ?', options: [
          { r: 'Oui', suite: 'n1b' },
          { r: 'Non, éteints', fin: { cause: 'Alimentation du début de ligne absente (BDCI).', action: 'Ouvrir le boîtier BDCI et contrôler les fusibles.', gravite: 3 } }
        ] },
        n1b: { q: 'Débrancher tous les connecteurs de la carte mère du NBAB et ne laisser que le connecteur orange d\'alimentation. Le NBAB démarre-t-il normalement ?', options: [
          { r: 'Oui', fin: { cause: 'Un élément branché provoque un court-circuit.', action: 'Rebrancher les éléments un par un (en débranchant le connecteur orange à chaque fois) jusqu\'à trouver l\'élément fautif, puis le remplacer.', gravite: 3 } },
          { r: 'Non', fin: { cause: 'NBAB défectueux.', action: SIMPLICITI + ' (ticket avec le détail des tests).', gravite: 3, contact: true } }
        ] },
        n2: { q: 'Pendant la phase de démarrage, les deux voyants de communication de la carte clignotent-ils ?', options: [
          { r: 'Oui, les deux', fin: { cause: 'Dialogue carte NBAB correct : le défaut est plutôt côté tablette ou K3.', action: 'Contrôler la tablette (écran « Vérification des connexions », appairage avec le K3) puis le K3.', gravite: 2, piste: true } },
          { r: 'Un seul clignote', fin: { cause: 'Problème de communication entre la tablette et le NBAB.', action: 'Vérifier l\'appairage de la tablette avec le K3 puis le NBAB. Si le défaut persiste : ' + SIMPLICITI + '.', gravite: 3, contact: true } }
        ] }
      }
    },

    tablette: {
      titre: 'Tablette', source: 'Guide Simpliciti §8 (certaines pistes hors guide)', debut: 'q0',
      noeuds: {
        q0: { q: 'Que constate-t-on sur la tablette ?', options: [
          { r: 'Elle ne s\'allume pas', suite: 't1' },
          { r: 'Pas de liaison avec le calculateur K3', suite: 't2' },
          { r: 'Un symbole n\'est pas vert à l\'écran « Vérification des connexions »', suite: 't3' },
          { r: 'Les vérifications au démarrage n\'arrivent pas à 100 %',
            fin: { cause: 'Un ou plusieurs éléments du système ne répondent pas au démarrage.', action: 'Relancer la tablette, relever les symboles en défaut sur l\'écran de vérification et reprendre ce diagnostic.', gravite: 2, piste: true } }
        ] },
        t1: { q: 'L\'icône batterie (voyant en haut à droite) indique-t-elle une charge en cours sur son support ?', options: [
          { r: 'Oui, elle charge', fin: { cause: 'Batterie très déchargée, ou tablette à mise en route manuelle.', action: 'Laisser charger puis la mettre en route manuellement (selon le modèle, elle ne démarre pas automatiquement au contact).', gravite: 2 } },
          { r: 'Non, elle ne charge pas', fin: { cause: 'Tablette mal connectée à son support ou support de charge non alimenté.', action: 'Vérifier la connexion tablette / support puis l\'alimentation du support (câble, fusible). Remplacer le support de charge si besoin.', gravite: 2, piste: true } }
        ] },
        t2: { q: 'Dans la liste des réseaux wifi de la tablette, le réseau du K3 apparaît-il comme connecté ?', options: [
          { r: 'Oui, connecté', fin: { cause: 'Appairage tablette / K3 correct : la liaison est établie.', action: 'Relancer le K3 (couper le contact 10 s) et la tablette, puis reprendre l\'écran « Vérification des connexions » pour traiter un autre symbole en défaut.', gravite: 2, piste: true } },
          { r: 'Apparaît mais non connecté', fin: { cause: 'Tablette non appairée au K3.', action: 'Ré-appairer la tablette avec le K3 (appairage distant).', gravite: 3 } },
          { r: 'N\'apparaît pas', arbre: 'k3' }
        ] },
        t3: { q: 'Quel symbole n\'est pas vert ?', options: [
          { r: 'Connexion Kelina', suite: 't2' },
          { r: 'Position GPS Kelina', arbre: 'antenne_cab' },
          { r: 'Position GPS (tablette)', fin: { cause: 'GPS de la tablette sans fix.', action: 'Patienter à découvert quelques minutes et vérifier la localisation de la tablette.', gravite: 1, piste: true } },
          { r: 'Connexion identification', arbre: 'nbab', noeud: 'n2' },
          { r: 'Connexion Data', fin: { cause: 'Pas de connexion de données (réseau / SIM).', action: 'Vérifier la couverture réseau et la SIM (tablette ou K3 selon la configuration).', gravite: 2, piste: true } }
        ] }
      }
    },

    support: {
      titre: 'Support de charge', source: 'Piste hors guide (le guide ne détaille que la charge de la tablette)', debut: 'q0',
      noeuds: {
        q0: { q: 'Quel est le problème ?', options: [
          { r: 'La tablette ne charge pas', arbre: 'tablette', noeud: 't1' },
          { r: 'La tablette ne tient pas / bouge sur le support',
            fin: { cause: 'Fixation du support ou pinces usées / cassées.', action: 'Resserrer la fixation ou remplacer le support de charge.', gravite: 2, piste: true } }
        ] }
      }
    },

    k3: {
      titre: 'Calculateur K3', source: 'Guide Simpliciti §9', rappel: 'Le K3 ne démarre que contact mis.', debut: 'q0',
      noeuds: {
        q0: { q: 'Que montre le voyant GPS du K3 ?', options: [
          { r: 'Éteint', fin: { cause: 'Pas d\'alimentation, ou plus d\'alimentation après contact.', action: 'Contrôler l\'alimentation du K3 : +APC (pin 1) après contact, VCC (pin 2) permanent 12-24 V, GND (pin 3) masse châssis.', gravite: 3 } },
          { r: 'Orange fixe', fin: { cause: 'Alimentation présente mais plus après contact.', action: 'Contrôler le +APC (pin 1) du faisceau d\'alimentation.', gravite: 3 } },
          { r: 'Rouge fixe (pas de GPS)', arbre: 'antenne_cab' },
          { r: 'Orange clignotant (satellites sans FIX)', arbre: 'antenne_cab' },
          { r: 'Vert clignotant (FIX)', suite: 'k1' }
        ] },
        k1: { q: 'Que montre le voyant de communication du K3 ?', options: [
          { r: 'Rouge fixe (pas de communication)', fin: { cause: 'K3 sans communication avec le serveur.', action: 'Vérifier la couverture réseau, la SIM et l\'antenne. Si le défaut persiste : ' + SIMPLICITI + '.', gravite: 3, contact: true } },
          { r: 'Orange fixe (émission d\'une demande)', fin: { cause: 'Demande émise, acquittement serveur non reçu.', action: 'Patienter ; si cela dure, traiter comme une absence de communication.', gravite: 2 } },
          { r: 'Vert fixe (acquittement serveur valide)', fin: { cause: 'K3 localisé et reçu par le serveur : K3 en bon état.', action: 'Chercher ailleurs : appairage de la tablette ou NBAB.', gravite: 1 } }
        ] }
      }
    },

    antenne_cab: {
      titre: 'Antenne (cabine)', source: 'Guide Simpliciti §9 (voyants du K3)', debut: 'q0',
      noeuds: {
        q0: { q: 'Que montre le voyant GPS du K3 ?', options: [
          { r: 'Rouge fixe (pas de GPS)', fin: { cause: 'Aucun signal GPS : antenne débranchée, câble coupé ou antenne défaillante.', action: 'Contrôler le branchement et le câble de l\'antenne puis son état ; la remplacer si besoin.', gravite: 3 } },
          { r: 'Orange clignotant (satellites sans FIX)', fin: { cause: 'Réception satellite insuffisante.', action: 'Vérifier le dégagement et l\'emplacement de l\'antenne, puis attendre à découvert.', gravite: 2 } },
          { r: 'Vert clignotant (FIX)', arbre: 'k3', noeud: 'k1' }
        ] }
      }
    },

    kitpieton: {
      // Les trois types de panne sont ceux de l'exploitation ; les actions proposées sont à valider avec Simpliciti.
      titre: 'Kit piéton', source: 'Pannes types de l\'exploitation (actions à valider avec Simpliciti)', debut: 'q0',
      noeuds: {
        q0: { q: 'Quelle panne constate-t-on sur le kit piéton ?', options: [
          { r: 'Absence du listing des contrats ou des tournées', fin: { cause: 'Contrats ou tournées non chargés sur le kit (synchronisation ou paramétrage).', action: 'Vérifier la connexion réseau du kit puis relancer l\'application pour resynchroniser. Si le listing reste vide : ' + SIMPLICITI + ' (paramétrage des contrats / tournées).', gravite: 3, contact: true, piste: true } },
          { r: 'Problème de charge', fin: { cause: 'Batterie, chargeur ou câble défaillant.', action: 'Tester avec un autre chargeur et un autre câble. Si le kit ne charge toujours pas, demander son remplacement.', gravite: 2, piste: true } },
          { r: 'Ne lit pas les puces', suite: 'k1' }
        ] },
        k1: { q: 'Présentez un bac test dont la puce est connue pour être bonne. Sa puce est-elle lue ?', options: [
          { r: 'Oui', fin: { cause: 'Puce du bac défectueuse ou absente : le kit fonctionne.', action: 'Signaler le bac pour remplacement de sa puce.', gravite: 1, piste: true } },
          { r: 'Non', fin: { cause: 'Lecture de puces du kit en défaut.', action: 'Redémarrer le kit et réessayer. Si aucune puce n\'est lue : ' + SIMPLICITI + ' pour remplacement du kit.', gravite: 3, contact: true, piste: true } }
        ] }
      }
    },

    capteur_bac: {
      titre: 'Capteur de présence bac', source: 'Guide Simpliciti §4.3.1',
      rappel: 'Checklist : présenter un bac pucé sur les peignes gauche et droite, puis passer le lève-conteneur en mode 4 roues et présenter un bac 4 roues. Chaque accrochage doit allumer sa case en vert.', debut: 'q0',
      noeuds: {
        q0: { q: 'Dans la checklist, que voit-on pour ce capteur ?', options: [
          { r: 'La case ne passe pas au vert à l\'accrochage du bac (ou le capteur n\'apparaît pas)',
            fin: { cause: 'Capteur de présence bac hors service ou débranché.', action: 'Vérifier le branchement du capteur, sinon le faire réparer ou remplacer par l\'atelier / le carrossier.', gravite: 3, horsSimpliciti: true } },
          { r: 'La case est verte en permanence, même sans bac',
            fin: { cause: 'Capteur actif en permanence (bloqué ou déréglé).', action: 'Faire réparer ou remplacer le capteur par l\'atelier / le carrossier.', gravite: 3, horsSimpliciti: true } },
          { r: 'Les cases passent bien au vert, mais les levées ne sont pas lues en tournée', arbre: 'lecteur' }
        ] }
      }
    },

    capteur_ph: {
      titre: 'Capteur de point haut', source: 'Guide Simpliciti §4.3.2',
      rappel: 'Checklist : faire un cycle de levée complet à droite puis à gauche. Chaque cycle doit allumer sa case en vert.', debut: 'q0',
      noeuds: {
        q0: { q: 'Que voit-on dans la checklist ?', options: [
          { r: 'Un seul point haut n\'est pas détecté',
            fin: { cause: 'Panne du capteur de point haut concerné.', action: 'Vérifier son branchement, sinon le faire réparer ou remplacer par l\'atelier / le carrossier.', gravite: 3, horsSimpliciti: true } },
          { r: 'Aucun point haut n\'est détecté', suite: 'q1' },
          { r: 'Les points hauts sont détectés, mais les levées ne sont pas lues en tournée', arbre: 'lecteur' }
        ] },
        q1: { q: 'Ces capteurs ont-ils déjà fonctionné sur ce véhicule ?', options: [
          { r: 'Non, jamais', fin: { cause: 'Option « point haut » probablement non activée sur le véhicule.', action: 'Faire activer l\'option point haut (carrossier), puis refaire la checklist.', gravite: 3, horsSimpliciti: true } },
          { r: 'Oui, ils fonctionnaient', fin: { cause: 'Panne commune aux points hauts (alimentation, faisceau ou prédisposition au NBAB).', action: 'Vérifier le branchement des prédispositions capteurs au NBAB, puis ' + SIMPLICITI + ' avec le détail des tests.', gravite: 3, contact: true, piste: true } }
        ] }
      }
    },

    stopbac: {
      titre: 'Stops bac (lève-conteneur)', source: 'Guide Simpliciti §6',
      rappel: 'Lancer une tournée dédiée avec le paramétrage « stops LC pour bac sans puce » actif. Prévoir un bac 2 roues et un bac 4 roues, pucés et non pucés.', debut: 'q0',
      noeuds: {
        q0: { q: 'Quel est le problème ?', options: [
          { r: 'Les bacs non lus ne sont jamais stoppés', suite: 'n0' },
          { r: 'Le lève-conteneur stoppe à chaque levée, même les bacs pucés', suite: 'p0' },
          { r: 'Un bac pucé est stoppé de temps en temps', arbre: 'lecteur', noeud: 's0' }
        ] },
        n0: { q: 'Présenter un bac SANS puce à gauche, à droite et en 4 roues. Que se passe-t-il ?', options: [
          { r: 'Le bac est stoppé, voyant BBV rouge et pop-up de blocage sur la tablette',
            fin: { cause: 'Tout fonctionne en tournée de test.', action: 'Aucune intervention matérielle. Si le problème revient en exploitation, vérifier le paramétrage stop bac des tournées concernées.', gravite: 1, piste: true } },
          { r: 'La levée n\'est pas stoppée, mais le voyant BBV est rouge et le pop-up apparaît',
            fin: { cause: 'Stops du lève-conteneur non activés côté benne.', action: 'Contacter le bennier (carrossier) pour qu\'il contrôle l\'activation des stops du lève-conteneur.', gravite: 2, horsSimpliciti: true } },
          { r: 'La levée n\'est pas stoppée, voyant BBV pas rouge, pas de pop-up', suite: 'n1' }
        ] },
        n1: { q: 'Sur la tablette, le paramétrage « stop bac non pucé » est-il activé ?', options: [
          { r: 'Oui', fin: { cause: 'Paramétrage actif mais sans effet : problème de paramétrage système.', action: SIMPLICITI + ' pour vérification du paramétrage système et analyse approfondie.', gravite: 2, contact: true } },
          { r: 'Non', fin: { cause: 'Paramétrage « stop bac non pucé » désactivé.', action: 'L\'activer, puis refaire le test.', gravite: 1 } }
        ] },
        p0: { q: 'Présenter un bac AVEC puce à gauche, à droite et en 4 roues. Que se passe-t-il ?', options: [
          { r: 'Le bac est levé et basculé, voyant BBV vert, levée comptabilisée sur la tablette',
            fin: { cause: 'Tout fonctionne en tournée de test.', action: 'Aucune intervention matérielle. Si le problème revient en exploitation, refaire le test sur la tournée concernée.', gravite: 1, piste: true } },
          { r: 'Le bac est stoppé, voyant BBV rouge et pop-up de blocage', arbre: 'lecteur' },
          { r: 'Le bac est stoppé, voyant BBV vert et pas de pop-up', suite: 'p1' }
        ] },
        p1: { q: 'Débrancher le port 1 du NBAB et représenter le bac pucé. Est-il encore stoppé ?', options: [
          { r: 'Non, il n\'est plus stoppé', fin: { cause: 'Commande d\'arrêt émise par le système d\'identification.', action: SIMPLICITI + ' pour analyse approfondie.', gravite: 3, contact: true } },
          { r: 'Oui, encore stoppé', fin: { cause: 'Le problème vient du comportement du lève-conteneur.', action: 'Contacter le bennier (carrossier) pour analyse et correction.', gravite: 3, horsSimpliciti: true } }
        ] }
      }
    },

    cable: {
      titre: 'Câble', source: 'Guide Simpliciti §4', debut: 'q0',
      noeuds: {
        q0: { q: 'Quel élément le câble suspecté relie-t-il ?', options: [
          { r: 'Une boîte à boutons (BBV)', arbre: 'bbv' },
          { r: 'Un décodeur ou une dent antenne', arbre: 'lecteur', noeud: 'a0' },
          { r: 'L\'alimentation du NBAB', arbre: 'nbab', noeud: 'n1b' },
          { r: 'Je ne sais pas', arbre: 'nbab' }
        ] }
      }
    }
  };

  /* Moteur : état = { courant: {arbre, noeud}|null, chemin: [{q, r, de}], fin: {...}|null } */
  ME.diag = {
    start(arbreId) { return { courant: { arbre: arbreId, noeud: ME.arbres[arbreId].debut }, chemin: [], fin: null }; },
    noeud(st) { return st.courant && ME.arbres[st.courant.arbre].noeuds[st.courant.noeud]; },
    arbre(st) { return st.courant && ME.arbres[st.courant.arbre]; },
    answer(st, i) {
      const n = ME.diag.noeud(st), o = n.options[i];
      st.chemin.push({ q: n.q, r: o.r, de: st.courant });
      if (o.fin) { st.fin = Object.assign({ source: ME.diag.arbre(st).source }, o.fin); st.courant = null; }
      else if (o.arbre) st.courant = { arbre: o.arbre, noeud: o.noeud || ME.arbres[o.arbre].debut };
      else st.courant = { arbre: st.courant.arbre, noeud: o.suite };
    },
    back(st) {
      const last = st.chemin.pop();
      if (last) { st.courant = last.de; st.fin = null; }
    },
    /** Résumé stockable dans l'incident. */
    resume(st) {
      return st.fin && {
        chemin: st.chemin.map(c => ({ q: c.q, r: c.r })),
        cause: st.fin.cause, action: st.fin.action, contact: !!st.fin.contact, piste: !!st.fin.piste, horsSimpliciti: !!st.fin.horsSimpliciti, source: st.fin.source
      };
    }
  };
})(window);
