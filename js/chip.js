/* ═══════════════════════════════════════════════
   ACCELERATOR MODULE: four dies, one per project
   Hover a die to lift it out, click it to open.
   Needs three.js r160 (physical materials, anisotropy, clearcoat).
═══════════════════════════════════════════════ */
(function () {
  'use strict';
  var container = document.getElementById('chip-3d');
  var infoPanel = document.getElementById('chip-info');
  var hint      = document.getElementById('chip-hint');
  if (!container || typeof THREE === 'undefined') return;
  var BASE = window.SITE_BASE || '';

  /* the project name as it is laser-marked on each die, one array entry per line */
  var MARKS = [['ECP5', 'ETHERNET-SOC'], ['ALL', 'PROJECTS'], ['MANHATTAN', 'REASONING'], ['MINI-DSL', 'SCALA']];

  /* die index = (x >= 0 ? 1 : 0) + (z < 0 ? 2 : 0) */
  var zones = [
    { name: 'ECP5-ETHERNET-SOC', tag: 'HARDWARE',
      desc: 'A UDP/TCP echo SoC on the Lattice ECP5, built from Amaranth HDL, LiteX, and bare-metal VexRiscv firmware. The prototype node for a 10-node cloud FPGA cluster.',
      link: 'https://github.com/kwadwoz/ecp5-ethernet-soc', linkLabel: 'github.com/kwadwoz/ecp5-ethernet-soc' },
    { name: 'ALL PROJECTS', tag: 'INDEX',
      desc: 'Every project in one place, with the full write-ups.',
      link: BASE + '/projects/', linkLabel: 'see the projects page' },
    { name: 'MANHATTAN REASONING', tag: 'PLATFORM',
      desc: 'Cloud access to real silicon for people and AI agents. A cluster of ECP5-85F FPGAs behind a Python SDK, with sandboxes for training and benchmarking hardware design agents.',
      link: 'https://manhattanreasoning.com/', linkLabel: 'manhattanreasoning.com' },
    { name: 'MINI-DSL-SCALA', tag: 'COMPILER',
      desc: 'A tiny language that compiles code into circuits. A Scala 3 compiler lowers the AST to synthesizable Verilog, then proves it correct against a reference interpreter on real silicon.',
      link: 'https://github.com/kwadwoz/mini-dsl-scala', linkLabel: 'github.com/kwadwoz/mini-dsl-scala' },
  ];

  /* ---------- renderer: filmic tone mapping, soft shadows ---------- */
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  var MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
  /* big screens get the 4K board texture, phones the 2K one */
  var HI_RES = Math.min(window.innerWidth, screen.width) > 800 && renderer.capabilities.maxTextureSize >= 4096;

  function tex(canvas, isColor) {
    var t = new THREE.CanvasTexture(canvas);
    if (isColor) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = MAX_ANISO;
    return t;
  }
  function centred(t, w, d) { t.repeat.set(1 / w, 1 / d); t.offset.set(0.5, 0.5); return t; }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 0.1, 60);
  camera.position.set(0, 0.5, 6.8);
  camera.lookAt(0, 0, 0);

  /* ---------- studio environment: softboxes the metal can reflect ---------- */
  (function () {
    var env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x1d1f24, side: THREE.BackSide })));
    function panel(x, y, z, w, h, power, tint) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
        color: new THREE.Color(tint || 0xffffff).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    }
    panel(-1.0, 7.2, 8.5, 13, 3.6, 1.3);            /* main softbox, up and behind the camera */
    panel(-1.5, 7.4, 8.3, 3.0, 1.2, 3.4);           /* hot core inside the softbox */
    /* strip lights at the height the board mirrors: their reflections slide over the metal as it sways */
    panel(-5.2, 3.6, 8.6, 1.5, 4.2, 2.6, 0xdce8ff);
    panel(-1.6, 3.8, 8.8, 2.2, 3.6, 2.0);
    panel(2.4, 3.6, 8.8, 0.9, 4.2, 3.0, 0xfff0dc);
    panel(5.8, 3.4, 8.2, 1.6, 4.6, 2.2, 0xfff0dc);
    panel(-8.0, 2.0, 6.0, 1.2, 7, 1.5, 0xdce8ff);   /* cool strip, far left */
    panel(3.0, 9.5, 3.0, 0.5, 5, 5.0);              /* thin overhead tube */
    panel(0, 10, 0, 9, 9, 0.7);                     /* ceiling wash */
    panel(0, -3, 9, 12, 2, 0.4);                    /* low front fill */
    panel(-7, 1, -7, 5, 5, 1.6, 0x00ff41);          /* green kicker, matches the site */
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
  })();

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  var keyLight = new THREE.DirectionalLight(0xfff3e2, 3.6);
  keyLight.position.set(2.6, 5.4, 3.6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(HI_RES ? 4096 : 2048, HI_RES ? 4096 : 2048);
  keyLight.shadow.camera.left = -3.0; keyLight.shadow.camera.right = 3.0;
  keyLight.shadow.camera.top = 3.0;   keyLight.shadow.camera.bottom = -3.0;
  keyLight.shadow.camera.near = 3.5;  keyLight.shadow.camera.far = 10.5;
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.normalBias = 0.002;
  scene.add(keyLight);
  var sheen = new THREE.PointLight(0xffffff, 5, 12);
  sheen.position.set(-1.8, 3.2, 2.6); scene.add(sheen);
  var rimLight = new THREE.PointLight(0x00ff41, 50, 11);
  rimLight.position.set(-3.2, 0.9, -3.0); scene.add(rimLight);
  var fillLight = new THREE.PointLight(0x7a8ea8, 22, 14);
  fillLight.position.set(3.0, 1.2, -2.4); scene.add(fillLight);

  var chipGroup = new THREE.Group(); scene.add(chipGroup);
  var W = 3.4, D = 2.2, TH = 0.06, TOP = TH / 2;

  /* seeded, so the board looks the same on every visit */
  var seed = 7700;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  /* handling haze and fingerprints: a tileable roughness map, so reflections break up instead of looking computer-clean */
  var smudgeCanvas = (function () {
    var c = canvas(512, 512), g = c.getContext('2d'), i, dx, dy;
    g.fillStyle = '#909090'; g.fillRect(0, 0, 512, 512);
    for (i = 0; i < 110; i++) {
      var x = rnd() * 512, y = rnd() * 512, r = 30 + rnd() * 130, v = rnd() < 0.55 ? '255,255,255,' : '0,0,0,', a = 0.02 + rnd() * 0.05;
      for (dx = -512; dx <= 512; dx += 512) for (dy = -512; dy <= 512; dy += 512) {
        var gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        gr.addColorStop(0, 'rgba(' + v + a + ')'); gr.addColorStop(1, 'rgba(' + v + '0)');
        g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r);
      }
    }
    for (i = 0; i < 9000; i++) {
      g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255,' : '0,0,0,') + (rnd() * 0.05) + ')';
      g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    return c;
  })();
  var SMUDGE_MEAN = 0.565;
  function smudge(scale) {
    var t = tex(smudgeCanvas, false);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(scale, scale); t.offset.set(rnd(), rnd());
    return t;
  }

  /* ---------- geometry helpers ---------- */
  function roundedRect(w, d, r) {
    var s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);     s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d);     s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r);         s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  /* a slab lying on y = 0 with bevelled edges; material 0 is the top face, 1 the walls */
  function slab(shape, h, bev) {
    var g = new THREE.ExtrudeGeometry(shape, bev > 0
      ? { depth: h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 3, curveSegments: 8 }
      : { depth: h, bevelEnabled: false, curveSegments: 20 });
    g.rotateX(-Math.PI / 2); g.translate(0, bev, 0);
    return g;
  }

  /* ---------- layout (board units, x right, z toward the viewer) ---------- */
  var PKG = { x: 0.35, z: 0, w: 1.62, d: 1.30 };
  var VW = 0.56, VD = 0.64, VRMS = [[-1.13, -0.40], [-1.13, 0.32]];
  var HOLE_R = 0.055;
  var HOLES = [[-1.58, -0.98], [-0.88, -0.98], [1.30, -0.98], [1.60, -0.98],
               [-1.58, 0.98], [-0.88, 0.98], [1.30, 0.98], [1.60, 0.98]];
  var VIAS = [[-0.62, -0.84], [1.30, -0.66], [-0.62, 0.84], [1.30, 0.66]];
  var IND = 0.095, IC = 0.15, CAP_R = 0.047, CAP_H = 0.085;

  var used = [];
  var pads = [];      /* footprints, for the copper layer */
  var bodies = [];    /* ceramic / epoxy bodies */
  var metals = [];    /* tinned terminals, pins and cans */
  var outlines = [];  /* silkscreen boxes */
  var inductors = [], ics = [], polys = [], leds = [];
  function block(x, z, w, d) { used.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]); }
  function free(x, z, w, d) {
    if (Math.abs(x) + w / 2 > W / 2 - 0.05 || Math.abs(z) + d / 2 > D / 2 - 0.05) return false;
    for (var i = 0; i < used.length; i++) {
      var u = used[i];
      if (x + w / 2 > u[0] - 0.012 && x - w / 2 < u[2] + 0.012 &&
          z + d / 2 > u[1] - 0.012 && z - d / 2 < u[3] + 0.012) return false;
    }
    return true;
  }
  function foot(x, z, w, d, round) { block(x, z, w, d); pads.push({ x: x, z: z, w: w, d: d, round: round }); }
  function body(x, z, w, d, h, col) { foot(x, z, w, d); bodies.push({ x: x, z: z, w: w, d: d, h: h, col: col }); }
  function can(x, z, w, d, h) { foot(x, z, w, d); metals.push({ x: x, z: z, w: w, d: d, h: h, col: 0xb4b7bc }); }
  /* two-terminal chip part: a body between a pair of tinned end caps */
  function passive(x, z, w, d, h, col, endCol) {
    foot(x, z, w, d);
    var horiz = w >= d, L = horiz ? w : d, t = L * 0.24, off = L / 2 - t / 2;
    bodies.push({ x: x, z: z, w: horiz ? w - 2 * t : w * 0.9, d: horiz ? d * 0.9 : d - 2 * t, h: h * 0.92, col: col });
    [-1, 1].forEach(function (s) {
      metals.push({ x: x + (horiz ? s * off : 0), z: z + (horiz ? 0 : s * off),
                    w: horiz ? t : w, d: horiz ? d : t, h: h, col: endCol || 0xa9acb1 });
    });
  }

  block(PKG.x, PKG.z, PKG.w + 0.12, PKG.d + 0.12);
  VRMS.forEach(function (v) { block(v[0], v[1], VW + 0.14, VD + 0.08); });
  HOLES.forEach(function (h) { block(h[0], h[1], 0.26, 0.26); });
  VIAS.forEach(function (h) { block(h[0], h[1], 0.13, 0.13); });

  /* power stages: rows of moulded inductors above and below the package */
  for (var ix = -0.55; ix <= 1.08; ix += 0.125) {
    [-0.93, 0.93].forEach(function (iz) { foot(ix, iz, IND, IND); inductors.push([ix, iz]); });
  }
  /* controller ICs: QFN bodies with a row of pins on each side */
  [[1.44, -0.42], [1.44, -0.14], [1.44, 0.16], [1.44, 0.42]].forEach(function (p) {
    foot(p[0], p[1], IC + 0.03, IC + 0.03);
    ics.push(p);
    outlines.push({ x: p[0], z: p[1], w: 0.205, d: 0.205 });
    for (var k = 0; k < 6; k++) {
      var o = -0.05 + k * 0.02;
      [-1, 1].forEach(function (s) {
        metals.push({ x: p[0] + o, z: p[1] + s * (IC / 2 + 0.004), w: 0.011, d: 0.016, h: 0.008, col: 0xb9bcc2 });
        metals.push({ x: p[0] + s * (IC / 2 + 0.004), z: p[1] + o, w: 0.016, d: 0.011, h: 0.008, col: 0xb9bcc2 });
      });
    }
  });
  /* bulk capacitance: a column of polymer aluminium cans beside the power modules */
  for (var pz = -0.6; pz <= 0.61; pz += 0.15) {
    foot(-1.585, pz, CAP_R * 2 + 0.01, CAP_R * 2 + 0.01, true);
    polys.push([-1.585, pz]);
  }
  /* tantalum capacitors between the power modules and the package */
  for (var tz0 = -0.495; tz0 <= 0.5; tz0 += 0.165) {
    passive(-0.65, tz0, 0.13, 0.075, 0.05, 0xc8861a, 0xb9bcc2);
    bodies.push({ x: -0.65 - 0.026, z: tz0, w: 0.012, d: 0.068, h: 0.0465, col: 0x6e4208 });   /* polarity stripe */
  }
  /* crystal cans */
  [[-1.5, 0.80], [-0.66, 0.66], [1.58, -0.75]].forEach(function (p) { can(p[0], p[1], 0.11, 0.11, 0.022); });
  /* status LEDs */
  [-1.30, -1.22, -1.14].forEach(function (lx) {
    passive(lx, -0.86, 0.022, 0.04, 0.012, 0xe9e7dc);
    leds.push([lx, -0.86]);
  });
  /* passives everywhere else, in ordered banks on a placement grid the way a pick-and-place lays them down */
  var CERAMIC = [0xb99c74, 0xc8b18a, 0x8c7052, 0xa58a66];
  var banks = [];
  function bank(x0, z0, nx, nz, horiz, res) {
    var w = horiz ? 0.036 : 0.019, d = horiz ? 0.019 : 0.036, px = w + 0.016, pz = d + 0.016;
    var tw = (nx - 1) * px + w, td = (nz - 1) * pz + d;
    if (!free(x0, z0, tw + 0.022, td + 0.022)) return 0;
    var col = res ? 0x151517 : CERAMIC[Math.floor(rnd() * CERAMIC.length)];
    for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
      passive(x0 - tw / 2 + w / 2 + i * px, z0 - td / 2 + d / 2 + j * pz, w, d, res ? 0.011 : 0.018, col);
    }
    banks.push({ x: x0 - tw / 2, z: z0 - td / 2, n: nx * nz, res: res });
    return nx * nz;
  }
  for (var tries = 0, placed = 0; tries < 14000 && placed < 680; tries++) {
    var x = Math.round((-1.64 + rnd() * 3.28) / 0.02) * 0.02, z = Math.round((-1.04 + rnd() * 2.08) / 0.02) * 0.02, k = rnd();
    if (k < 0.10) {
      if (free(x, z, 0.08, 0.08)) { body(x, z, 0.06, 0.06, 0.018, 0x151618); placed++; }
    } else {
      placed += bank(x, z, 1 + Math.floor(rnd() * rnd() * 8), 1 + Math.floor(rnd() * rnd() * 4), rnd() < 0.5, k > 0.72);
    }
  }

  /* ---------- board texture: mask, copper, traces, pads, silkscreen (+ height map) ---------- */
  /* everything is drawn in 2048-wide coordinates; the colour layer is scaled up on big screens */
  var CW = 2048, CH = Math.round(CW * D / W), PXU = CW / W, SC = HI_RES ? 2 : 1;
  function cx(x) { return (x + W / 2) * PXU; }
  function cz(z) { return (z + D / 2) * PXU; }
  var bc = canvas(CW * SC, CH * SC), bh = canvas(CW, CH);
  (function () {
    var g = bc.getContext('2d'), b = bh.getContext('2d'), i, k;
    g.scale(SC, SC);
    /* the outer layer is mostly ground pour: copper under mask everywhere, with traces cut out of it by clearance gaps */
    g.fillStyle = '#0b3a23'; g.fillRect(0, 0, CW, CH);
    b.fillStyle = '#808080'; b.fillRect(0, 0, CW, CH);
    /* glass-weave grain and mask mottling */
    for (i = 0; i < 16000; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (rnd() * 0.02) + ')';
      g.fillRect(rnd() * CW, rnd() * CH, 1.5, 1.5);
    }
    /* copper pours under the mask, including the power planes feeding the package */
    function pour(px, py, pw, ph, a) {
      g.fillStyle = 'rgba(86,170,108,' + a + ')'; g.fillRect(px, py, pw, ph);
      g.strokeStyle = '#052414'; g.lineWidth = 2.5; g.strokeRect(px, py, pw, ph);     /* plane split */
      b.strokeStyle = '#585858'; b.lineWidth = 3; b.strokeRect(px, py, pw, ph);
    }
    for (i = 0; i < 18; i++) pour(rnd() * CW, rnd() * CH, 120 + rnd() * 420, 60 + rnd() * 260, 0.06);
    VRMS.forEach(function (v) { pour(cx(v[0]), cz(v[1] - 0.24), (PKG.x - PKG.w / 2 - v[0]) * PXU, 0.48 * PXU, 0.10); });
    pour(cx(-0.62), cz(-1.0), 1.78 * PXU, 0.24 * PXU, 0.09);
    pour(cx(-0.62), cz(0.76), 1.78 * PXU, 0.24 * PXU, 0.09);

    g.lineJoin = b.lineJoin = 'round';
    var runs = [];
    function trace(pts, alpha, via) { runs.push({ pts: pts, alpha: alpha, via: via }); }
    function stroke(c, pts) {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var q = 1; q < pts.length; q++) c.lineTo(pts[q][0], pts[q][1]);
      c.stroke();
    }
    function etch() {
      g.strokeStyle = '#052414'; g.lineWidth = 4.6; b.strokeStyle = '#555555'; b.lineWidth = 4.6;      /* clearance gaps */
      runs.forEach(function (r) { stroke(g, r.pts); stroke(b, r.pts); });
      b.strokeStyle = '#808080'; b.lineWidth = 1.8; g.lineWidth = 1.8;                                  /* the copper left inside them */
      runs.forEach(function (r) { g.strokeStyle = 'rgba(48,140,86,' + (0.45 + r.alpha * 0.6) + ')'; stroke(g, r.pts); stroke(b, r.pts); });
      runs.forEach(function (r) {
        if (!r.via) return;
        var e = r.pts[r.via === 1 ? 0 : r.pts.length - 1];
        g.fillStyle = '#052414'; g.beginPath(); g.arc(e[0], e[1], 5.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(40,126,76,0.9)'; g.beginPath(); g.arc(e[0], e[1], 3.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(3,22,11,0.85)'; g.beginPath(); g.arc(e[0], e[1], 1.4, 0, Math.PI * 2); g.fill();
        b.fillStyle = '#505050'; b.beginPath(); b.arc(e[0], e[1], 2.2, 0, Math.PI * 2); b.fill();
      });
      /* tented stitching vias tying the pour to the planes below */
      for (var v = 0; v < 1100; v++) {
        var vx = Math.round(rnd() * CW / 14) * 14, vy = Math.round(rnd() * CH / 14) * 14;
        g.fillStyle = 'rgba(52,140,88,0.35)'; g.beginPath(); g.arc(vx, vy, 2.7, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(3,22,11,0.6)'; g.beginPath(); g.arc(vx, vy, 1.2, 0, Math.PI * 2); g.fill();
        b.fillStyle = '#606060'; b.beginPath(); b.arc(vx, vy, 1.6, 0, Math.PI * 2); b.fill();
      }
    }
    /* trace buses with 45-degree jogs */
    for (i = 0; i < 70; i++) {
      var n = 3 + Math.floor(rnd() * 9), x0 = rnd() * CW, y0 = rnd() * CH;
      var l1 = 80 + rnd() * 420, dj = (rnd() < 0.5 ? -1 : 1) * (30 + rnd() * 120), l2 = 80 + rnd() * 420;
      var horiz = rnd() < 0.6, alpha = 0.3 + rnd() * 0.3;
      for (k = 0; k < n; k++) {
        var o = k * 7;
        trace(horiz
          ? [[x0, y0 + o], [x0 + l1, y0 + o], [x0 + l1 + Math.abs(dj), y0 + o + dj], [x0 + l1 + Math.abs(dj) + l2, y0 + o + dj]]
          : [[x0 + o, y0], [x0 + o, y0 + l1], [x0 + o + dj, y0 + l1 + Math.abs(dj)], [x0 + o + dj, y0 + l1 + Math.abs(dj) + l2]],
          alpha, k % 2 === 0 ? (rnd() < 0.5 ? 1 : 2) : 0);
      }
    }
    /* escape routing: bundles fanning out from all four sides of the package */
    var kx0 = cx(PKG.x - PKG.w / 2 - 0.14), kx1 = cx(PKG.x + PKG.w / 2 + 0.14);
    var kz0 = cz(PKG.z - PKG.d / 2 - 0.14), kz1 = cz(PKG.z + PKG.d / 2 + 0.14);
    [0, 1, 2, 3].forEach(function (side) {
      var len = side < 2 ? kx1 - kx0 : kz1 - kz0, pos = 16;
      while (pos < len - 16) {
        var n = 5 + Math.floor(rnd() * 10), l1 = 12 + rnd() * 36, j = (rnd() < 0.5 ? -1 : 1) * (10 + rnd() * 46);
        var l2 = 20 + rnd() * 130, alpha = 0.38 + rnd() * 0.3;
        for (k = 0; k < n && pos < len - 16; k++, pos += 6) {
          var loc = [[pos, 0], [pos, l1], [pos + j, l1 + Math.abs(j)], [pos + j, l1 + Math.abs(j) + l2 + (k % 3) * 9]];
          trace(loc.map(function (p) {
            return side === 0 ? [kx0 + p[0], kz0 - p[1]] : side === 1 ? [kx0 + p[0], kz1 + p[1]]
                 : side === 2 ? [kx0 - p[1], kz0 + p[0]] : [kx1 + p[1], kz0 + p[0]];
          }), alpha, 2);
        }
        pos += 12 + rnd() * 28;
      }
    });
    etch();
    /* keep-out outline around the package */
    g.strokeStyle = 'rgba(225,235,228,0.6)'; g.lineWidth = 3;
    g.strokeRect(cx(PKG.x - PKG.w / 2 - 0.09), cz(PKG.z - PKG.d / 2 - 0.09), (PKG.w + 0.18) * PXU, (PKG.d + 0.18) * PXU);
    g.lineWidth = 1.5;
    g.strokeRect(kx0, kz0, kx1 - kx0, kz1 - kz0);
    /* contact shadows: soft occlusion baked around everything that sits on the board */
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.75)'; g.fillStyle = 'rgba(2,14,8,0.85)';
    function occlude(x, z, w, d, blur) {
      g.shadowBlur = blur * SC;
      g.fillRect(cx(x - w / 2), cz(z - d / 2), w * PXU, d * PXU);
    }
    occlude(PKG.x, PKG.z, PKG.w, PKG.d, 26);
    VRMS.forEach(function (v) { occlude(v[0], v[1], VW + 0.06, VD + 0.04, 22); });
    pads.forEach(function (p) { occlude(p.x, p.z, p.w, p.d, p.w > 0.07 ? 12 : 6); });
    g.restore();
    /* mask openings with tinned pads under every part */
    pads.forEach(function (p) {
      var rx = cx(p.x - p.w / 2 - 0.006), rz = cz(p.z - p.d / 2 - 0.006), rw = (p.w + 0.012) * PXU, rd = (p.d + 0.012) * PXU;
      if (p.round) {
        g.fillStyle = '#8d9094'; g.beginPath(); g.arc(cx(p.x), cz(p.z), rw / 2, 0, Math.PI * 2); g.fill();
        return;
      }
      g.fillStyle = '#061d10'; g.fillRect(rx - 1.5, rz - 1.5, rw + 3, rd + 3);
      g.fillStyle = '#8d9094'; g.fillRect(rx, rz, rw, rd);
      b.fillStyle = '#8c8c8c'; b.fillRect(rx, rz, rw, rd);
    });
    /* silkscreen part outlines with pin-1 dots */
    g.strokeStyle = 'rgba(236,238,236,0.8)'; g.lineWidth = 2.2; g.fillStyle = 'rgba(236,238,236,0.85)';
    outlines.forEach(function (p) {
      g.strokeRect(cx(p.x - p.w / 2), cz(p.z - p.d / 2), p.w * PXU, p.d * PXU);
      g.beginPath(); g.arc(cx(p.x - p.w / 2) - 7, cz(p.z - p.d / 2) - 7, 3.5, 0, Math.PI * 2); g.fill();
    });
    g.strokeRect(cx(-0.625), cz(-1.0), 1.77 * PXU, 0.14 * PXU);
    g.strokeRect(cx(-0.625), cz(0.86), 1.77 * PXU, 0.14 * PXU);
    polys.forEach(function (p) {                    /* polarity arcs for the cans */
      g.beginPath(); g.arc(cx(p[0]), cz(p[1]), (CAP_R + 0.012) * PXU, -0.9, 0.9); g.stroke();
    });
    /* exposed gold: annular rings, stitching vias, fiducials */
    HOLES.forEach(function (h) {
      g.fillStyle = '#b8944c';
      g.beginPath(); g.arc(cx(h[0]), cz(h[1]), 0.105 * PXU, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(205,172,98,0.8)';
      for (k = 0; k < 8; k++) {
        var a = k * Math.PI / 4 + Math.PI / 8;
        g.beginPath(); g.arc(cx(h[0] + Math.cos(a) * 0.135), cz(h[1] + Math.sin(a) * 0.135), 4, 0, Math.PI * 2); g.fill();
      }
    });
    [[-1.3, -0.98], [1.0, 1.02], [-1.62, 0.78]].forEach(function (f) {
      g.fillStyle = '#062012'; g.beginPath(); g.arc(cx(f[0]), cz(f[1]), 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c9a65c'; g.beginPath(); g.arc(cx(f[0]), cz(f[1]), 7, 0, Math.PI * 2); g.fill();
    });
    /* silkscreen text */
    g.fillStyle = 'rgba(236,238,236,0.8)'; g.font = 'bold 9px monospace';
    banks.forEach(function (p, n) {
      if (p.n < 3 || !free(p.x + 0.035, p.z - 0.028, 0.075, 0.016)) return;
      g.fillText((p.res ? 'R' : 'C') + (101 + n * 3), cx(p.x), cz(p.z) - 6);
    });
    g.font = 'bold 11px monospace';
    g.fillText('PWR  LNK  ACT', cx(-1.335), cz(-0.905));
    g.font = 'bold 22px monospace';
    g.fillText('ZB-7700-A  REV 2  HAVERFORD', cx(-0.5), cz(1.07));
    g.font = 'bold 12px monospace';
    g.fillText('94V-0  2647  PB-FREE', cx(-0.6), cz(-1.045));
  })();
  var boardTex = centred(tex(bc, true), W, D), boardBump = centred(tex(bh, false), W, D);

  /* FR4 slab with rounded corners and real drilled mounting holes, under a glossy solder mask */
  var boardShape = roundedRect(W, D, 0.06);
  HOLES.forEach(function (h) {
    var p = new THREE.Path(); p.absarc(h[0], -h[1], HOLE_R, 0, Math.PI * 2, true);
    boardShape.holes.push(p);
  });
  var boardGeo = slab(boardShape, TH, 0); boardGeo.translate(0, -TH / 2, 0);
  var board = new THREE.Mesh(boardGeo, [
    new THREE.MeshPhysicalMaterial({ map: boardTex, bumpMap: boardBump, bumpScale: 1.6, roughness: 0.55, metalness: 0.0,
                                     clearcoat: 0.6, clearcoatRoughness: 0.3 / SMUDGE_MEAN, clearcoatRoughnessMap: smudge(0.45), envMapIntensity: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x5b6a3c, roughness: 0.85, metalness: 0.0 })]);
  board.receiveShadow = true; board.castShadow = true;
  chipGroup.add(board);

  /* ---------- small parts: instanced boxes ---------- */
  var tmpO = new THREE.Object3D(), unitBox = new THREE.BoxGeometry(1, 1, 1);
  function instanced(list, mat) {
    var m = new THREE.InstancedMesh(unitBox, mat, list.length), col = new THREE.Color();
    list.forEach(function (p, i) {
      tmpO.position.set(p.x, TOP + p.h / 2, p.z);
      tmpO.rotation.set(0, 0, 0);
      tmpO.scale.set(p.w, p.h, p.d);
      tmpO.updateMatrix();
      m.setMatrixAt(i, tmpO.matrix);
      m.setColorAt(i, col.set(p.col));
    });
    m.castShadow = true; m.receiveShadow = true;
    chipGroup.add(m);
    return m;
  }
  instanced(bodies, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.7 }));
  instanced(metals, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 1.0 }));

  /* same-shape parts placed at a list of [x, z] sites */
  function placed3(geo, mats, sites, y) {
    var m = new THREE.InstancedMesh(geo, mats, sites.length);
    sites.forEach(function (p, i) {
      tmpO.position.set(p[0], y, p[1]); tmpO.rotation.set(0, 0, 0); tmpO.scale.set(1, 1, 1); tmpO.updateMatrix();
      m.setMatrixAt(i, tmpO.matrix);
    });
    m.castShadow = true; m.receiveShadow = true;
    chipGroup.add(m);
    return m;
  }
  function label(size, bg, draw) {
    var c = canvas(size, size), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    for (var i = 0; i < size * 6; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (rnd() * 0.05) + ')';
      g.fillRect(rnd() * size, rnd() * size, 1, 1);
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    draw(g, size);
    return tex(c, true);
  }

  /* moulded inductors with a printed value */
  var indTop = label(128, '#303134', function (g, s) {
    g.fillStyle = 'rgba(214,216,220,0.85)'; g.font = 'bold 44px monospace'; g.fillText('R15', s / 2, s / 2 + 2);
    g.fillRect(14, 14, 10, 10);
  });
  placed3(slab(roundedRect(IND, IND, 0.012), 0.05, 0.008), [
    new THREE.MeshStandardMaterial({ map: centred(indTop, IND, IND), roughness: 0.82, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0x303134, roughness: 0.82, metalness: 0.1 })], inductors, TOP);

  /* QFN controllers with laser marking */
  var icTop = label(160, '#121315', function (g, s) {
    g.fillStyle = 'rgba(175,178,184,0.8)';
    g.font = 'bold 30px monospace'; g.fillText('ZB3711', s / 2, s / 2 - 16);
    g.font = '20px monospace'; g.fillText('PMIC 2647', s / 2, s / 2 + 16); g.fillText('TW A2', s / 2, s / 2 + 42);
    g.beginPath(); g.arc(22, 22, 8, 0, Math.PI * 2); g.fill();
  });
  placed3(slab(roundedRect(IC, IC, 0.006), 0.03, 0.004), [
    new THREE.MeshStandardMaterial({ map: centred(icTop, IC, IC), roughness: 0.5, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.55, metalness: 0.0 })], ics, TOP);

  /* polymer aluminium cans */
  var canTop = (function () {
    var c = canvas(160, 160), g = c.getContext('2d'), i;
    g.fillStyle = '#b4b7bc'; g.fillRect(0, 0, 160, 160);
    for (i = 0; i < 60; i++) {                      /* lathe rings */
      g.strokeStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255,' : '0,0,0,') + (rnd() * 0.10) + ')';
      g.beginPath(); g.arc(80, 80, rnd() * 80, 0, Math.PI * 2); g.stroke();
    }
    g.save(); g.beginPath(); g.arc(80, 80, 80, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#231d4e'; g.fillRect(0, 0, 160, 58);       /* polarity band */
    g.restore();
    g.fillStyle = 'rgba(30,30,36,0.85)'; g.textAlign = 'center';
    g.font = 'bold 34px monospace'; g.fillText('560', 80, 100);
    g.font = 'bold 22px monospace'; g.fillText('2.5V', 80, 128);
    g.fillStyle = 'rgba(230,230,240,0.85)'; g.fillText('FP', 80, 44);
    return tex(c, true);
  })();
  var aluMat = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.3, metalness: 1.0 });
  placed3(new THREE.CylinderGeometry(CAP_R, CAP_R, CAP_H, 40), [aluMat,
    new THREE.MeshStandardMaterial({ map: canTop, roughness: 0.38, metalness: 0.9 }), aluMat], polys, TOP + 0.008 + CAP_H / 2);
  placed3(new THREE.BoxGeometry(CAP_R * 2 + 0.008, 0.008, CAP_R * 2 + 0.008),
    new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.7 }), polys, TOP + 0.004);

  /* status LEDs: lit lenses with a soft halo */
  var haloTex = (function () {
    var c = canvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return tex(c, true);
  })();
  var LED_COL = [0x00ff41, 0x00ff41, 0xffb020];
  var ledLights = leds.map(function (p, i) {
    var mat = new THREE.MeshStandardMaterial({ color: 0x101010, emissive: LED_COL[i], emissiveIntensity: 2.5, roughness: 0.3 });
    var lens = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, 0.02), mat);
    lens.position.set(p[0], TOP + 0.014, p[1]); chipGroup.add(lens);
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: LED_COL[i], blending: THREE.AdditiveBlending,
                                                           depthWrite: false, transparent: true, opacity: 0.8 }));
    halo.position.set(p[0], TOP + 0.03, p[1]); halo.scale.setScalar(0.16); chipGroup.add(halo);
    return { mat: mat, halo: halo.material };
  });

  /* ---------- gold-plated mounting holes and plain vias ---------- */
  var goldMat = new THREE.MeshStandardMaterial({ color: 0xc79a45, roughness: 0.3, metalness: 1.0, side: THREE.DoubleSide });
  HOLES.forEach(function (h) {
    var ring = new THREE.Mesh(new THREE.RingGeometry(HOLE_R, 0.1, 48), goldMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(h[0], TOP + 0.0015, h[1]);
    ring.receiveShadow = true;
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R - 0.001, HOLE_R - 0.001, TH, 40, 1, true), goldMat);
    barrel.position.set(h[0], 0, h[1]);
    chipGroup.add(ring, barrel);
  });
  var viaMat = new THREE.MeshStandardMaterial({ color: 0xa6a9ae, roughness: 0.35, metalness: 1.0, side: THREE.DoubleSide });
  var pitMat = new THREE.MeshBasicMaterial({ color: 0x030303 });
  VIAS.forEach(function (h) {
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.052, 40), viaMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(h[0], TOP + 0.0015, h[1]);
    var pit = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), pitMat);
    pit.rotation.x = -Math.PI / 2; pit.position.set(h[0], TOP + 0.001, h[1]);
    chipGroup.add(ring, pit);
  });

  /* ---------- brushed-metal texture pair (colour + height) ---------- */
  function brushed(wpx, hpx, stops, draw, grain) {
    if (grain === undefined) grain = 1;
    var c = canvas(wpx, hpx), h = canvas(wpx, hpx);
    var g = c.getContext('2d'), b = h.getContext('2d'), i;
    var gr = g.createLinearGradient(0, 0, wpx, hpx);
    gr.addColorStop(0, stops[0]); gr.addColorStop(0.5, stops[1]); gr.addColorStop(1, stops[2]);
    g.fillStyle = gr; g.fillRect(0, 0, wpx, hpx);
    b.fillStyle = '#808080'; b.fillRect(0, 0, wpx, hpx);
    for (i = 0; i < hpx; i++) {                       /* horizontal brush strokes */
      var v = rnd();
      g.fillStyle = v < 0.5 ? 'rgba(255,248,230,' + (v * 0.10 * grain) + ')' : 'rgba(40,25,5,' + ((v - 0.5) * 0.09 * grain) + ')';
      g.fillRect(0, i, wpx, 1);
      b.fillStyle = 'rgba(' + (v < 0.5 ? '255,255,255,' : '0,0,0,') + (rnd() * 0.16 * grain) + ')';
      b.fillRect(0, i, wpx, 1);
    }
    for (i = 0; i < 40 * grain; i++) {                /* a few longer scratches */
      var sy = rnd() * hpx, sx = rnd() * wpx, sl = 30 + rnd() * wpx * 0.5;
      g.fillStyle = 'rgba(255,250,235,' + (0.04 + rnd() * 0.08) + ')'; g.fillRect(sx, sy, sl, 1);
    }
    draw(g, b, wpx, hpx);
    return { map: tex(c, true), bump: tex(h, false) };
  }
  var GOLD = ['#e0b964', '#cfa24c', '#b98a3a'];
  function goldTop(t, w, d, rough, aniso, bump) {
    return new THREE.MeshPhysicalMaterial({ map: centred(t.map, w, d), bumpMap: centred(t.bump, w, d), bumpScale: bump,
      roughness: rough / SMUDGE_MEAN, roughnessMap: smudge(1.3), metalness: 1.0, anisotropy: aniso, anisotropyRotation: Math.PI / 2,
      emissive: 0xffb84a, emissiveIntensity: 0 });
  }
  var goldSide = new THREE.MeshStandardMaterial({ color: 0xc09040, roughness: 0.34, metalness: 1.0 });

  /* ---------- gold-lidded power modules ---------- */
  var blackMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.7, metalness: 0.0 });
  var pinMat = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.35, metalness: 1.0 });
  var lidTex = brushed(512, 584, GOLD, function (g, b) {
    g.strokeStyle = 'rgba(95,70,30,0.5)'; g.lineWidth = 4; g.strokeRect(22, 22, 468, 540);
    b.strokeStyle = '#404040'; b.lineWidth = 6; b.strokeRect(22, 22, 468, 540);
    g.fillStyle = 'rgba(66,46,16,0.82)'; g.font = 'bold 36px monospace';
    g.fillText('ZB-VR13', 52, 96); g.fillText('1922', 52, 140);
    g.font = '22px monospace';
    g.fillText('N8W2125566 Z7', 52, 496); g.fillText('A0P2FT354630', 52, 526);
    g.beginPath(); g.arc(400, 300, 13, 0, Math.PI * 2); g.fill();
    b.fillStyle = '#343434'; b.beginPath(); b.arc(400, 300, 13, 0, Math.PI * 2); b.fill();
  });
  var lidGeo = slab(roundedRect(VW, VD, 0.022), 0.07, 0.009), lidMat = goldTop(lidTex, VW, VD, 0.32, 0.75, 0.6);
  VRMS.forEach(function (v) {
    var base = new THREE.Mesh(new THREE.BoxGeometry(VW + 0.06, 0.03, VD + 0.04), blackMat);
    base.position.set(v[0], TOP + 0.015, v[1]); base.castShadow = true; base.receiveShadow = true; chipGroup.add(base);
    for (var k = 0; k < 8; k++) {
      var zt = v[1] - VD / 2 + 0.05 + k * (VD - 0.1) / 7;
      [-1, 1].forEach(function (sd) {
        var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.04), pinMat);
        tooth.position.set(v[0] + sd * (VW / 2 + 0.045), TOP + 0.01, zt); chipGroup.add(tooth);
      });
    }
    var lid = new THREE.Mesh(lidGeo, [lidMat, goldSide]);
    lid.position.set(v[0], TOP + 0.03, v[1]); lid.castShadow = true; lid.receiveShadow = true;
    chipGroup.add(lid);
  });

  /* ---------- the package: substrate, stiffener frame, four dies ---------- */
  var FW = 1.44, FD = 1.14, FT = 0.085, FH = 0.05, SUB = 0.035, SUB_TOP = TOP + SUB;
  var DW = 0.56, DD = 0.36, DIE_H = 0.032;
  var DIES = [[-0.30, 0.24], [0.30, 0.24], [-0.30, -0.185], [0.30, -0.185]];   /* index order matches zones */

  var PW = HI_RES ? 2048 : 1024, PH = Math.round(PW * PKG.d / PKG.w), PS = PW / 1024, PPU = 1024 / PKG.w;
  function qx(x) { return (x + PKG.w / 2) * PPU; }
  function qz(z) { return (z + PKG.d / 2) * PPU; }
  var pc = canvas(PW, PH);
  (function () {
    var g = pc.getContext('2d'), x, z;
    g.scale(PS, PS);
    g.fillStyle = '#1b2530'; g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (x = 3; x < 1024; x += 6) for (z = 3; z < 1024; z += 6) g.fillRect(x, z, 1.5, 1.5);
    g.fillStyle = '#11151a';
    g.fillRect(qx(-FW / 2 + FT), qz(-FD / 2 + FT), (FW - 2 * FT) * PPU, (FD - 2 * FT) * PPU);
    /* fan-out routing between the die sites and the frame */
    g.strokeStyle = 'rgba(120,145,170,0.2)'; g.lineWidth = 1;
    for (x = -0.6; x <= 0.6; x += 0.012) {
      g.beginPath(); g.moveTo(qx(x), qz(-0.42)); g.lineTo(qx(x * 0.92), qz(0.46)); g.stroke();
    }
    /* gold test pads along the outer rim */
    g.fillStyle = '#b8975a';
    for (x = -0.74; x <= 0.74; x += 0.05) { g.fillRect(qx(x) - 3, qz(0.61), 6, 9); g.fillRect(qx(x) - 3, qz(-0.63), 6, 9); }
    /* underfill fillet and micro-bump landing pads, revealed when a die lifts out */
    DIES.forEach(function (dp) {
      g.save(); g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 10 * PS;
      g.fillStyle = '#090b0d';
      g.fillRect(qx(dp[0] - DW / 2 - 0.014), qz(dp[1] - DD / 2 - 0.014), (DW + 0.028) * PPU, (DD + 0.028) * PPU);
      g.restore();
      g.fillStyle = '#3a3226';
      g.fillRect(qx(dp[0] - DW / 2), qz(dp[1] - DD / 2), DW * PPU, DD * PPU);
      for (var i = 0; i < 18; i++) for (var j = 0; j < 12; j++) {
        var bx = qx(dp[0] - DW / 2 + (i + 0.5) * DW / 18), bz = qz(dp[1] - DD / 2 + (j + 0.5) * DD / 12);
        g.fillStyle = '#b8975a'; g.beginPath(); g.arc(bx, bz, 3.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ecd9a6'; g.beginPath(); g.arc(bx - 0.8, bz - 0.8, 1.2, 0, Math.PI * 2); g.fill();
      }
    });
    /* bridge strips between the dies */
    g.fillStyle = '#b07a3e';
    g.fillRect(qx(-0.03), qz(0.10), 0.06 * PPU, 0.08 * PPU);
    g.fillRect(qx(-0.03), qz(-0.30), 0.06 * PPU, 0.06 * PPU);
    /* marking in the frame notch */
    g.fillStyle = 'rgba(240,240,240,0.9)'; g.font = 'bold 26px monospace'; g.textAlign = 'center';
    g.fillText('ZB-7700', qx(0), qz(-FD / 2 + 0.072));
  })();
  var pkgGroup = new THREE.Group();
  pkgGroup.position.set(PKG.x, 0, PKG.z);
  chipGroup.add(pkgGroup);
  var subEdge = new THREE.MeshStandardMaterial({ color: 0x232a32, roughness: 0.7 });
  var substrate = new THREE.Mesh(new THREE.BoxGeometry(PKG.w, SUB, PKG.d), [subEdge, subEdge,
    new THREE.MeshPhysicalMaterial({ map: tex(pc, true), roughness: 0.55, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.7 }),
    subEdge, subEdge, subEdge]);
  substrate.position.y = TOP + SUB / 2;
  substrate.castShadow = true; substrate.receiveShadow = true;
  pkgGroup.add(substrate);

  /* nickel-plated stiffener: one bevelled ring with the notch at the top */
  var NOTCH = 0.2, DIP = 0.04;
  (function () {
    var o = FD / 2, i = FD / 2 - FT, nb = o - FT - DIP, ib = nb - 0.06, n2 = NOTCH + FT;
    var s = new THREE.Shape();
    s.moveTo(-FW / 2, -o); s.lineTo(FW / 2, -o); s.lineTo(FW / 2, o); s.lineTo(NOTCH, o);
    s.lineTo(NOTCH, nb); s.lineTo(-NOTCH, nb); s.lineTo(-NOTCH, o); s.lineTo(-FW / 2, o); s.lineTo(-FW / 2, -o);
    var h = new THREE.Path();
    h.moveTo(-FW / 2 + FT, -i); h.lineTo(-FW / 2 + FT, i); h.lineTo(-n2, i); h.lineTo(-n2, ib);
    h.lineTo(n2, ib); h.lineTo(n2, i); h.lineTo(FW / 2 - FT, i); h.lineTo(FW / 2 - FT, -i); h.lineTo(-FW / 2 + FT, -i);
    s.holes.push(h);
    var fTex = brushed(512, 512, ['#c4c7cc', '#b4b7bc', '#a6a9ae'], function () {});
    var top = new THREE.MeshPhysicalMaterial({ map: centred(fTex.map, FW, FD), bumpMap: centred(fTex.bump, FW, FD), bumpScale: 0.4,
      roughness: 0.28 / SMUDGE_MEAN, roughnessMap: smudge(0.9), metalness: 1.0, anisotropy: 0.6, anisotropyRotation: Math.PI / 2 });
    var frame = new THREE.Mesh(slab(s, FH, 0.007), [top, new THREE.MeshStandardMaterial({ color: 0xb4b7bc, roughness: 0.28, metalness: 1.0 })]);
    frame.position.y = SUB_TOP; frame.castShadow = true; frame.receiveShadow = true;
    pkgGroup.add(frame);
  })();

  /* rows of tiny decoupling caps inside the frame */
  var tinyPos = [];
  for (var tx = -0.56; tx <= 0.56; tx += 0.024) { tinyPos.push([tx, FD / 2 - FT - 0.03]); }
  for (var tz = -0.32; tz <= 0.42; tz += 0.024) { tinyPos.push([-FW / 2 + FT + 0.03, tz], [FW / 2 - FT - 0.03, tz]); }
  for (tx = -0.52; tx <= 0.52; tx += 0.03) { if (Math.abs(tx) > 0.06) tinyPos.push([tx, 0.03]); }
  var tiny = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.008, 0.007),
    new THREE.MeshStandardMaterial({ color: 0xb4a48a, roughness: 0.45, metalness: 0.6 }), tinyPos.length);
  tinyPos.forEach(function (p, i) {
    tmpO.position.set(p[0], SUB_TOP + 0.004, p[1]); tmpO.rotation.set(0, 0, 0); tmpO.scale.set(1, 1, 1); tmpO.updateMatrix();
    tiny.setMatrixAt(i, tmpO.matrix);
  });
  tiny.castShadow = true;
  pkgGroup.add(tiny);

  /* the dies: thinned silicon with gold backside metallisation. Near-mirror, with the faint arcs the backgrind wheel leaves */
  function dieTexture(idx) {
    return brushed(1024, Math.round(1024 * DD / DW), GOLD, function (g, b, Wc, Hc) {
      var ox = Wc * (rnd() < 0.5 ? -1 : 1) * (1.2 + rnd()), oy = Hc * (1.5 + rnd() * 1.5), i, j;
      var r0 = Math.max(10, Math.abs(ox) - Wc - 40), r1 = Math.sqrt(Math.pow(Math.abs(ox) + Wc, 2) + oy * oy) + 40;
      for (i = 0; i < 1800; i++) {
        var r = r0 + rnd() * (r1 - r0), lt = rnd() < 0.5;
        g.strokeStyle = lt ? 'rgba(255,246,220,' + (rnd() * 0.045) + ')' : 'rgba(60,38,8,' + (rnd() * 0.04) + ')';
        g.lineWidth = 0.5 + rnd() * 0.9;
        g.beginPath(); g.arc(ox, oy, r, 0, Math.PI * 2); g.stroke();
        b.strokeStyle = 'rgba(' + (lt ? '255,255,255,' : '0,0,0,') + (rnd() * 0.05) + ')'; b.lineWidth = g.lineWidth;
        b.beginPath(); b.arc(ox, oy, r, 0, Math.PI * 2); b.stroke();
      }
      /* the metallisation stops short of the sawn edge */
      g.strokeStyle = 'rgba(70,46,14,0.55)'; g.lineWidth = 3; g.strokeRect(9, 9, Wc - 18, Hc - 18);
      b.strokeStyle = '#4a4a4a'; b.lineWidth = 4; b.strokeRect(9, 9, Wc - 18, Hc - 18);
      /* the project name, laser-engraved large: dark annealed metal with a bright lower lip where the cut catches the light */
      var lines = MARKS[idx], size = 150, widest = 0;
      g.font = 'bold ' + size + 'px monospace';
      lines.forEach(function (l) { widest = Math.max(widest, g.measureText(l).width); });
      size = Math.min(150, Math.floor(size * Wc * 0.8 / widest));
      g.font = b.font = 'bold ' + size + 'px monospace';
      g.textAlign = b.textAlign = 'center'; g.textBaseline = b.textBaseline = 'middle';
      lines.forEach(function (l, n) {
        var ty = Hc * 0.46 + (n - (lines.length - 1) / 2) * size * 1.12;
        g.fillStyle = 'rgba(255,242,205,0.5)'; g.fillText(l, Wc / 2, ty + 3);
        g.fillStyle = 'rgba(52,34,8,0.9)';     g.fillText(l, Wc / 2, ty);
        b.fillStyle = '#383838';               b.fillText(l, Wc / 2, ty);
      });
      g.font = 'bold 30px monospace'; g.fillStyle = 'rgba(62,42,12,0.7)';
      g.fillText(zones[idx].tag.split('').join(' '), Wc / 2, 62);
      g.textAlign = b.textAlign = 'left'; g.textBaseline = b.textBaseline = 'alphabetic';
      /* part number, lot code and a data-matrix */
      g.fillStyle = 'rgba(62,42,12,0.62)'; g.font = 'bold 26px monospace';
      g.fillText('ZB7700-D' + idx, 34, Hc - 68);
      g.font = '19px monospace'; g.fillText('TW 2647 A2 K' + (4107 + idx * 311), 34, Hc - 40);
      var mx = Wc - 108, my = Hc - 108, cell = 6;
      for (i = 0; i < 12; i++) for (j = 0; j < 12; j++) {
        if (i === 0 || j === 11 || ((i === 11 || j === 0) && (i + j) % 2 === 0) || rnd() < 0.45) g.fillRect(mx + i * cell, my + j * cell, cell, cell);
      }
      b.fillStyle = '#6a6a6a'; b.fillRect(mx, my, 72, 72);
    }, 0.1);
  }
  var dieBase = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.5, metalness: 0.3 });
  var dieGeo = slab(roundedRect(DW, DD, 0.012), DIE_H, 0.006);
  var bumpGeo = new THREE.SphereGeometry(0.0065, 8, 6);
  var bumpMat = new THREE.MeshStandardMaterial({ color: 0xc4c7cc, roughness: 0.25, metalness: 1.0 });
  var hitMat = new THREE.MeshBasicMaterial({ visible: false });
  var dies = [], pickables = [];
  DIES.forEach(function (dp, i) {
    var top = goldTop(dieTexture(i), DW, DD, 0.22, 0, 0.5);
    var mesh = new THREE.Mesh(dieGeo, [top, goldSide]);
    mesh.userData.idx = i; mesh.castShadow = true; mesh.receiveShadow = true;
    var group = new THREE.Group();
    group.position.set(dp[0], SUB_TOP + 0.008, dp[1]);
    group.add(mesh);
    /* silicon underside and its micro-bumps */
    var under = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.012, DD - 0.012), dieBase);
    under.rotation.x = Math.PI / 2; under.position.y = -0.0005; group.add(under);
    var bumps = new THREE.InstancedMesh(bumpGeo, bumpMat, 18 * 12), n = 0;
    for (var bi = 0; bi < 18; bi++) for (var bj = 0; bj < 12; bj++) {
      tmpO.position.set(-DW / 2 + (bi + 0.5) * DW / 18, -0.004, -DD / 2 + (bj + 0.5) * DD / 12);
      tmpO.rotation.set(0, 0, 0); tmpO.scale.set(1, 1, 1);
      tmpO.updateMatrix(); bumps.setMatrixAt(n++, tmpO.matrix);
    }
    group.add(bumps);
    pkgGroup.add(group);
    /* invisible plate over the die site, so the die stays up while the pointer is over its socket */
    var site = new THREE.Mesh(new THREE.BoxGeometry(DW + 0.03, 0.04, DD + 0.03), hitMat);
    site.position.set(dp[0], SUB_TOP + 0.02, dp[1]); site.userData.idx = i;
    pkgGroup.add(site);
    pickables.push(mesh, site);
    var sx = dp[0] >= 0 ? 1 : -1, sz = dp[1] < 0 ? -1 : 1;
    dies.push({ idx: i, group: group, top: top, home: group.position.clone(), sx: sx, sz: sz,
                out: new THREE.Vector3(sx, 0, sz).normalize(), amt: 0, from: 0, to: 0, t0: 0, glow: 0 });
  });

  var padGlow = new THREE.PointLight(0xffd98a, 0.3, 3.2);
  padGlow.position.set(PKG.x, 0.7, PKG.z); chipGroup.add(padGlow);

  /* ---------- lift out / settle back ---------- */
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var UP = calm ? 0.25 : 0.6, DOWN = calm ? 0.2 : 0.5;
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  var now = 0;
  function lift(d) { d.from = d.amt; d.to = 1; d.t0 = now; }
  function settle(d) { d.from = d.amt; d.to = 0; d.t0 = now; }
  function poseDie(d, t) {
    var p = Math.min(1, (now - d.t0) / (d.to === 1 ? UP : DOWN));
    var a = d.to === 1 ? d.from + (1 - d.from) * easeOut(p) : d.from * (1 - easeInOut(p));
    d.amt = a;
    var bob = Math.sin(t * 1.7 + d.idx) * 0.02 * a;
    d.group.position.set(d.home.x + d.out.x * 0.14 * a, d.home.y + 0.5 * a + bob, d.home.z + d.out.z * 0.14 * a);
    d.group.rotation.set(d.sz * 0.24 * a, 0, -d.sx * 0.24 * a);
    d.glow += ((d.idx === active ? 0.14 : 0) - d.glow) * 0.15;
    d.top.emissiveIntensity = d.glow;
  }

  /* ---------- hovering a die lifts it out, clicking it opens the project ---------- */
  var raycaster = new THREE.Raycaster(), ptr = new THREE.Vector2(-99, -99);
  var active = -1, shown = -1, mouseIn = false;

  function pickAt(clientX, clientY) {
    var rect = container.getBoundingClientRect();
    ptr.x = (clientX - rect.left) / rect.width * 2 - 1;
    ptr.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ptr, camera);
    var hits = raycaster.intersectObjects(pickables, false);
    if (!hits.length) return -1;
    /* the die that is already up wins, so it never drops while the pointer is still on it */
    for (var i = 0; i < hits.length; i++) if (hits[i].object.userData.idx === active) return active;
    return hits[0].object.userData.idx;
  }
  function showZone(idx) {
    if (idx === shown) return;
    shown = idx;
    var z = zones[idx];
    container.classList.add('explored');
    if (hint) hint.classList.add('hidden');
    infoPanel.innerHTML = '<div class="bi-name">' + z.name + '</div><hr class="bi-hr">' +
      '<p class="bi-desc">' + z.desc + '</p>' +
      '<a class="bi-link" href="' + z.link + '">' + z.linkLabel + '</a><br>' +
      '<span class="bi-hint">[ click the die to open ]</span>';
    infoPanel.style.display = 'block';
    requestAnimationFrame(function () { infoPanel.style.opacity = '1'; });
  }
  /* quiet = lift without opening the info panel, used by the idle demo */
  function setActive(idx, quiet) {
    if (idx !== active) {
      if (active >= 0) settle(dies[active]);
      active = idx;
      if (idx >= 0) lift(dies[idx]);
      tags.forEach(function (el, i) { el.classList.toggle('on', i === idx); });
    }
    if (idx >= 0 && !quiet) showZone(idx);              /* the panel keeps the last project, so its link stays reachable */
  }

  /* ---------- an OPEN link that appears on the lifted die; real anchors, so the dies are keyboard reachable too ---------- */
  var lastInput = -3;      /* the idle demo starts two seconds after load */
  var tags = zones.map(function (z, i) {
    var a = document.createElement('a');
    a.className = 'chip-tag'; a.href = z.link; a.textContent = 'OPEN';
    a.setAttribute('aria-label', z.name + ': open project');
    if (z.link.indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener'; }
    a.addEventListener('mouseenter', function () { lastInput = now; setActive(i); });
    a.addEventListener('focus', function () { lastInput = now; setActive(i); });
    container.appendChild(a);
    return a;
  });
  var tagPos = new THREE.Vector3();
  function placeTags() {
    var w = container.clientWidth, h = container.clientHeight;
    dies.forEach(function (d, i) {
      tagPos.set(0, DIE_H + 0.01, DD * 0.33); d.group.localToWorld(tagPos); tagPos.project(camera);
      tags[i].style.transform = 'translate(-50%,-50%) translate(' + ((tagPos.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' +
        ((-tagPos.y * 0.5 + 0.5) * h).toFixed(1) + 'px)';
    });
  }

  renderer.domElement.addEventListener('mousemove', function (e) {
    lastInput = now;
    var s = pickAt(e.clientX, e.clientY);
    setActive(s);
    renderer.domElement.style.cursor = s >= 0 ? 'pointer' : 'crosshair';
  });
  renderer.domElement.addEventListener('click', function (e) {
    lastInput = now;
    var s = pickAt(e.clientX, e.clientY);
    if (s < 0) { setActive(-1); return; }
    /* on touch screens there is no hover: the first tap lifts, the second opens */
    if (s === active && dies[s].amt > 0.5) openZone(s); else setActive(s);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setActive(-1);
  });

  var BASE_TILT = 1.30;
  var tiltX = BASE_TILT, tiltY = 0, curX = BASE_TILT, curY = 0;
  container.addEventListener('mousemove', function (e) {
    var r = container.getBoundingClientRect();
    tiltX = ((e.clientY - r.top) / r.height * 2 - 1) * 0.14 + BASE_TILT;
    tiltY = ((e.clientX - r.left) / r.width * 2 - 1) * 0.26;
  });
  container.addEventListener('mouseenter', function () { mouseIn = true; });
  container.addEventListener('mouseleave', function () {
    mouseIn = false; ptr.set(-99, -99);
    tiltX = BASE_TILT; tiltY = 0; lastInput = now;
    setActive(-1);
  });

  var t = 0, clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    t += 0.016; now += dt;
    if (!mouseIn) {
      tiltY = Math.sin(t * 0.30) * 0.20;
      tiltX = BASE_TILT + Math.sin(t * 0.20) * 0.06;
    }
    curX += (tiltX - curX) * 0.06; curY += (tiltY - curY) * 0.06;
    chipGroup.rotation.x = curX; chipGroup.rotation.y = curY;
    chipGroup.position.y = Math.sin(t * 0.8) * 0.05;
    /* idle demo: with nobody touching it, the dies take turns lifting out to show they come apart */
    if (!calm && !mouseIn && now - lastInput > 5) {
      var beat = (now - lastInput - 5) / 3.2;
      setActive(beat % 1 < 0.6 ? Math.floor(beat) % 4 : -1, true);
    }
    dies.forEach(function (d) { poseDie(d, t); });
    /* PWR steady, LNK breathing, ACT flickering like bus traffic */
    var lnk = 0.75 + Math.sin(t * 1.6) * 0.25, act = calm ? 1 : (Math.sin(t * 23) + Math.sin(t * 7.3) > 0.2 ? 1 : 0.12);
    ledLights[1].mat.emissiveIntensity = 2.5 * lnk; ledLights[1].halo.opacity = 0.8 * lnk;
    ledLights[2].mat.emissiveIntensity = 2.5 * act; ledLights[2].halo.opacity = 0.8 * act;
    padGlow.intensity = 0.3 + Math.sin(t * 2.0) * 0.1;
    rimLight.intensity = 46 + Math.sin(t * 1.2) * 12;
    sheen.position.x = Math.sin(t * 0.5) * 2.4;
    renderer.render(scene, camera);
    placeTags();
  }
  animate();

  /* fill the frame, shrinking on narrow screens so the module never clips */
  function fit() {
    var w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    chipGroup.scale.setScalar(Math.min(1.45, 1.05 * w / h));
  }
  fit();
  new ResizeObserver(fit).observe(container);
})();
