/* Schémas SVG (vue de côté, véhicule orienté vers la droite, viewBox 0 0 900 360).
   Chaque schéma ne dessine que la carrosserie ; les points cliquables sont ajoutés par app.js. */
(function (root) {
  const ME = (root.MaterielEmbarque = root.MaterielEmbarque || {});

  const chassis = (x1, x2) => '<rect class="t-chassis" x="' + x1 + '" y="262" width="' + (x2 - x1) + '" height="20" rx="4"/>';
  const wheels = (xs, r) => xs.map(x => '<g class="t-wheel"><circle cx="' + x + '" cy="' + (338 - r) + '" r="' + r + '"/><circle class="hub" cx="' + x + '" cy="' + (338 - r) + '" r="' + r * 0.4 + '"/></g>').join('');
  const ground = '<rect class="t-ground" x="0" y="338" width="900" height="3"/>';
  const body = d => '<path class="t-body" d="' + d + '"/>';

  const CAB = '<path class="t-cab" d="M585 262 V122 Q585 108 600 106 L700 98 Q716 97 726 108 L800 178 Q812 190 828 192 Q842 194 842 208 V262Z"/>' +
    '<path class="t-glass" d="M706 120 L778 182 H706Z"/><rect class="t-bumper" x="836" y="236" width="14" height="26" rx="4"/>';
  // Cabine réduite pour la bennette (x0.7)
  const CAB_SMALL = '<g transform="translate(45.5 78.6) scale(0.7)">' + CAB + '</g>';

  const hopper = body('M30 175 L130 150 V262 H30Z');
  const rearBody = body('M70 96 Q70 84 82 84 H548 Q560 84 560 96 V262 H70Z');

  ME.schemas = {
    bennette: () => ground +
      body('M70 170 Q70 160 80 160 H448 V262 H70Z') + body('M40 200 L90 188 V262 H40Z') +
      '<rect class="t-line" x="80" y="160" width="368" height="8" rx="3"/>' +
      chassis(40, 640) + CAB_SMALL + wheels([190, 560], 34),

    bom_mono: () => ground + rearBody + hopper + chassis(30, 840) + CAB + wheels([330, 470, 750], 40),

    bom_bicomp: () => ground +
      '<path class="t-body" d="M70 96 Q70 84 82 84 H315 V262 H70Z"/>' +
      '<path class="t-body t-comp2" d="M315 84 H548 Q560 84 560 96 V262 H315Z"/>' +
      '<line class="t-sep" x1="315" y1="84" x2="315" y2="262"/>' +
      hopper + chassis(30, 840) + CAB + wheels([330, 470, 750], 40),

    bom_bl: () => ground +
      body('M70 96 Q70 84 82 84 H462 Q474 84 474 96 V262 H70Z') +
      '<rect class="t-arm" x="478" y="104" width="42" height="158" rx="6"/>' +
      '<path class="t-arm" d="M498 128 L520 112 L584 214 L560 230Z"/>' +
      '<rect class="t-arm" x="530" y="222" width="52" height="40" rx="8"/>' +
      chassis(30, 840) + CAB + wheels([300, 440, 750], 40),

    camion_grue: () => ground +
      '<rect class="t-body" x="70" y="232" width="475" height="30" rx="3"/>' +
      [80, 200, 320, 440, 535].map(x => '<rect class="t-body" x="' + (x - 3) + '" y="196" width="6" height="36"/>').join('') +
      '<rect class="t-body" x="70" y="196" width="475" height="6"/>' +
      '<rect class="t-arm" x="548" y="150" width="40" height="112" rx="6"/>' +
      '<path class="t-craneline" d="M568 160 L330 70" stroke-width="16"/>' +
      '<path class="t-craneline" d="M330 70 L255 130" stroke-width="12"/>' +
      '<path class="t-craneline" d="M584 238 L440 118" stroke-width="7"/>' +
      '<path class="t-craneline" d="M255 130 V185" stroke-width="2"/><circle class="t-arm" cx="255" cy="192" r="8"/>' +
      '<rect class="t-arm" x="104" y="262" width="12" height="40"/><rect class="t-arm" x="90" y="300" width="40" height="8" rx="3"/>' +
      chassis(30, 840) + CAB + wheels([330, 470, 750], 40)
  };
})(window);
