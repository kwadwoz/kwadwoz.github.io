/* ═══════════════════════════════════════════════
   ACCELERATOR MODULE: four dies, one per project
   Hover a die to lift it out, click it to open.
═══════════════════════════════════════════════ */
(function () {
  'use strict';
  var container = document.getElementById('chip-3d');
  var infoPanel = document.getElementById('chip-info');
  var hint      = document.getElementById('chip-hint');
  if (!container || typeof THREE === 'undefined') return;
  var BASE = window.SITE_BASE || '';

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

  /* ---------- renderer: linear workflow, filmic tone mapping, soft shadows ---------- */
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  var MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

  function lin(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
  function tex(canvas, isColor) {
    var t = new THREE.CanvasTexture(canvas);
    if (isColor) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = MAX_ANISO;
    return t;
  }

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 0.1, 60);
  camera.position.set(0, 0.5, 6.8);
  camera.lookAt(0, 0, 0);

  /* ---------- studio environment: softboxes the metal can reflect ---------- */
  (function () {
    var env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x0c0e11, side: THREE.BackSide })));
    function panel(x, y, z, w, h, power, tint) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
        color: new THREE.Color(tint || 0xffffff).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    }
    panel(-1.5, 6.5, 8.5, 7, 3.2, 2.2);             /* main softbox, up and behind the camera */
    panel(5.5, 4.0, 8.0, 1.6, 6, 1.8, 0xfff0dc);    /* warm strip, right */
    panel(-7.0, 2.0, 7.0, 1.4, 7, 1.4, 0xdce8ff);   /* cool strip, left */
    panel(0, 10, 0, 9, 9, 0.8);                     /* ceiling wash */
    panel(0, -3, 9, 12, 2, 0.4);                    /* low front fill */
    panel(-7, 1, -7, 5, 5, 1.6, 0x00ff41);          /* green kicker, matches the site */
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
  })();

  scene.add(new THREE.AmbientLight(0xffffff, 0.10));
  var keyLight = new THREE.DirectionalLight(0xfff3e2, 1.5);
  keyLight.position.set(2.6, 5.4, 3.6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -2.7; keyLight.shadow.camera.right = 2.7;
  keyLight.shadow.camera.top = 2.7;   keyLight.shadow.camera.bottom = -2.7;
  keyLight.shadow.camera.near = 3.5;  keyLight.shadow.camera.far = 10.5;
  keyLight.shadow.bias = -0.00025;
  keyLight.shadow.normalBias = 0.003;
  scene.add(keyLight);
  var sheen = new THREE.PointLight(0xffffff, 0.5, 12);
  sheen.position.set(-1.8, 3.2, 2.6); scene.add(sheen);
  var rimLight = new THREE.PointLight(0x00ff41, 1.0, 11);
  rimLight.position.set(-3.2, 0.9, -3.0); scene.add(rimLight);
  var fillLight = new THREE.PointLight(0x7a8ea8, 0.5, 14);
  fillLight.position.set(3.0, 1.2, -2.4); scene.add(fillLight);

  var chipGroup = new THREE.Group(); scene.add(chipGroup);
  var W = 3.4, D = 2.2, TH = 0.06, TOP = TH / 2;

  /* seeded, so the board looks the same on every visit */
  var seed = 7700;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  /* ---------- layout (board units, x right, z toward the viewer) ---------- */
  var PKG = { x: 0.35, z: 0, w: 1.62, d: 1.30 };
  var VW = 0.56, VD = 0.64, VRMS = [[-1.13, -0.40], [-1.13, 0.32]];
  var HOLE_R = 0.055;
  var HOLES = [[-1.58, -0.98], [-0.88, -0.98], [1.30, -0.98], [1.60, -0.98],
               [-1.58, 0.98], [-0.88, 0.98], [1.30, 0.98], [1.60, 0.98]];
  var VIAS = [[-0.62, -0.84], [1.30, -0.66], [-0.62, 0.84], [1.30, 0.66]];

  var used = [];
  var pads = [];      /* footprints, for the copper layer */
  var bodies = [];    /* ceramic / epoxy / ferrite bodies */
  var metals = [];    /* tinned terminals and metal cans */
  var outlines = [];  /* silkscreen boxes */
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
  function body(x, z, w, d, h, col) {
    block(x, z, w, d);
    pads.push({ x: x, z: z, w: w, d: d });
    bodies.push({ x: x, z: z, w: w, d: d, h: h, col: col });
  }
  function can(x, z, w, d, h) {
    block(x, z, w, d);
    pads.push({ x: x, z: z, w: w, d: d });
    metals.push({ x: x, z: z, w: w, d: d, h: h, col: 0xb4b7bc });
  }
  /* two-terminal chip part: a body between a pair of tinned end caps */
  function passive(x, z, w, d, h, col) {
    block(x, z, w, d);
    pads.push({ x: x, z: z, w: w, d: d });
    var horiz = w >= d, L = horiz ? w : d, t = L * 0.24, off = L / 2 - t / 2;
    bodies.push({ x: x, z: z, w: horiz ? w - 2 * t : w * 0.9, d: horiz ? d * 0.9 : d - 2 * t, h: h * 0.92, col: col });
    [-1, 1].forEach(function (s) {
      metals.push({ x: x + (horiz ? s * off : 0), z: z + (horiz ? 0 : s * off),
                    w: horiz ? t : w, d: horiz ? d : t, h: h, col: 0xa9acb1 });
    });
  }

  block(PKG.x, PKG.z, PKG.w + 0.12, PKG.d + 0.12);
  VRMS.forEach(function (v) { block(v[0], v[1], VW + 0.14, VD + 0.08); });
  HOLES.forEach(function (h) { block(h[0], h[1], 0.26, 0.26); });
  VIAS.forEach(function (h) { block(h[0], h[1], 0.13, 0.13); });

  /* power stages: rows of moulded inductors above and below the package */
  for (var ix = -0.55; ix <= 1.08; ix += 0.125) {
    body(ix, -0.93, 0.095, 0.095, 0.05, 0x2a2b2e);
    body(ix, 0.93, 0.095, 0.095, 0.05, 0x2a2b2e);
  }
  /* controller ICs and crystal cans */
  [[1.44, -0.42], [1.44, -0.14], [1.44, 0.16], [1.44, 0.42]].forEach(function (p) {
    body(p[0], p[1], 0.17, 0.17, 0.03, 0x121315);
    outlines.push({ x: p[0], z: p[1], w: 0.2, d: 0.2 });
  });
  [[-1.5, 0.80], [-0.66, 0.66], [1.58, -0.75]].forEach(function (p) { can(p[0], p[1], 0.11, 0.11, 0.022); });
  /* passives everywhere else */
  var CERAMIC = [0xb99c74, 0xc8b18a, 0x8c7052, 0xa58a66, 0x151517];
  for (var tries = 0, placed = 0; tries < 2600 && placed < 480; tries++) {
    var x = -1.64 + rnd() * 3.28, z = -1.04 + rnd() * 2.08, k = rnd();
    var w = k < 0.85 ? 0.036 : 0.06, d = k < 0.85 ? 0.019 : 0.06;
    if (k < 0.85 && rnd() < 0.4) { var s = w; w = d; d = s; }
    if (!free(x, z, w, d)) continue;
    placed++;
    if (k < 0.85) passive(x, z, w, d, 0.016, CERAMIC[Math.floor(rnd() * CERAMIC.length)]);
    else body(x, z, w, d, 0.018, 0x151618);
  }

  /* ---------- board texture: mask, copper, traces, pads, silkscreen (+ height map) ---------- */
  var CW = 2048, CH = Math.round(CW * D / W), PXU = CW / W;
  function cx(x) { return (x + W / 2) * PXU; }
  function cz(z) { return (z + D / 2) * PXU; }
  var bc = document.createElement('canvas'), bh = document.createElement('canvas');
  bc.width = bh.width = CW; bc.height = bh.height = CH;
  (function () {
    var g = bc.getContext('2d'), b = bh.getContext('2d'), i, k;
    g.fillStyle = '#0a3520'; g.fillRect(0, 0, CW, CH);
    b.fillStyle = '#707070'; b.fillRect(0, 0, CW, CH);
    /* glass-weave grain and mask mottling */
    for (i = 0; i < 14000; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (rnd() * 0.022) + ')';
      g.fillRect(rnd() * CW, rnd() * CH, 2, 2);
    }
    /* copper pours under the mask */
    for (i = 0; i < 16; i++) {
      var px = rnd() * CW, py = rnd() * CH, pw = 120 + rnd() * 420, ph = 60 + rnd() * 260;
      g.fillStyle = 'rgba(90,170,110,0.06)'; g.fillRect(px, py, pw, ph);
      b.fillStyle = 'rgba(255,255,255,0.10)'; b.fillRect(px, py, pw, ph);
    }
    /* trace buses with 45-degree jogs, each trace ending in a tented via */
    g.lineJoin = b.lineJoin = 'round';
    for (i = 0; i < 110; i++) {
      var n = 3 + Math.floor(rnd() * 6), x0 = rnd() * CW, y0 = rnd() * CH;
      var l1 = 60 + rnd() * 320, dj = (rnd() < 0.5 ? -1 : 1) * (30 + rnd() * 120), l2 = 60 + rnd() * 320;
      var horiz = rnd() < 0.6, alpha = 0.32 + rnd() * 0.3;
      for (k = 0; k < n; k++) {
        var o = k * 7, pts = horiz
          ? [[x0, y0 + o], [x0 + l1, y0 + o], [x0 + l1 + Math.abs(dj), y0 + o + dj], [x0 + l1 + Math.abs(dj) + l2, y0 + o + dj]]
          : [[x0 + o, y0], [x0 + o, y0 + l1], [x0 + o + dj, y0 + l1 + Math.abs(dj)], [x0 + o + dj, y0 + l1 + Math.abs(dj) + l2]];
        [g, b].forEach(function (c) {
          c.strokeStyle = c === g ? 'rgba(64,150,92,' + alpha + ')' : '#a8a8a8';
          c.lineWidth = c === g ? 2.2 : 3;
          c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
          for (var q = 1; q < 4; q++) c.lineTo(pts[q][0], pts[q][1]);
          c.stroke();
        });
        if (k % 2 === 0) {
          var e = pts[rnd() < 0.5 ? 0 : 3];
          g.fillStyle = 'rgba(74,160,100,' + (alpha + 0.15) + ')';
          g.beginPath(); g.arc(e[0], e[1], 4.2, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(4,24,12,0.8)';
          g.beginPath(); g.arc(e[0], e[1], 1.6, 0, Math.PI * 2); g.fill();
          b.fillStyle = '#585858';
          b.beginPath(); b.arc(e[0], e[1], 2.4, 0, Math.PI * 2); b.fill();
        }
      }
    }
    /* keep-out outline around the package */
    g.strokeStyle = 'rgba(225,235,228,0.55)'; g.lineWidth = 3;
    g.strokeRect(cx(PKG.x - PKG.w / 2 - 0.09), cz(PKG.z - PKG.d / 2 - 0.09), (PKG.w + 0.18) * PXU, (PKG.d + 0.18) * PXU);
    g.lineWidth = 1.5;
    g.strokeRect(cx(PKG.x - PKG.w / 2 - 0.14), cz(PKG.z - PKG.d / 2 - 0.14), (PKG.w + 0.28) * PXU, (PKG.d + 0.28) * PXU);
    /* mask openings with tinned pads under every part */
    pads.forEach(function (p) {
      var rx = cx(p.x - p.w / 2 - 0.006), rz = cz(p.z - p.d / 2 - 0.006), rw = (p.w + 0.012) * PXU, rd = (p.d + 0.012) * PXU;
      g.fillStyle = '#072213'; g.fillRect(rx - 1.5, rz - 1.5, rw + 3, rd + 3);
      g.fillStyle = '#8d9094'; g.fillRect(rx, rz, rw, rd);
      b.fillStyle = '#8c8c8c'; b.fillRect(rx, rz, rw, rd);
    });
    /* silkscreen part outlines with pin-1 dots */
    g.strokeStyle = 'rgba(236,238,236,0.8)'; g.lineWidth = 2.5; g.fillStyle = 'rgba(236,238,236,0.85)';
    outlines.forEach(function (p) {
      g.strokeRect(cx(p.x - p.w / 2), cz(p.z - p.d / 2), p.w * PXU, p.d * PXU);
      g.beginPath(); g.arc(cx(p.x - p.w / 2) - 7, cz(p.z - p.d / 2) - 7, 3.5, 0, Math.PI * 2); g.fill();
    });
    g.strokeRect(cx(-0.625), cz(-1.0), 1.77 * PXU, 0.14 * PXU);
    g.strokeRect(cx(-0.625), cz(0.86), 1.77 * PXU, 0.14 * PXU);
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
    [[-1.3, -0.98], [1.0, 1.02], [-1.62, 0.2]].forEach(function (f) {
      g.fillStyle = '#062012'; g.beginPath(); g.arc(cx(f[0]), cz(f[1]), 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c9a65c'; g.beginPath(); g.arc(cx(f[0]), cz(f[1]), 7, 0, Math.PI * 2); g.fill();
    });
    /* silkscreen text */
    g.fillStyle = 'rgba(236,238,236,0.82)'; g.font = 'bold 15px monospace';
    ['C15', 'U406', 'C402', 'L5', 'R12', 'C13', 'U7', 'C05', 'Q3', 'L19', 'C409', 'U12', 'C21', 'R4', 'R88', 'C7', 'FB2', 'C118'].forEach(function (t) {
      var p = pads[Math.floor(rnd() * pads.length)];
      g.fillText(t, cx(p.x) + 10, cz(p.z) - 8);
    });
    g.font = 'bold 22px monospace';
    g.fillText('ZB-7700-A  REV 2  HAVERFORD', cx(-0.5), cz(1.07));
    g.font = 'bold 13px monospace';
    g.fillText('94V-0  2647  PB-FREE', cx(-1.62), cz(-0.76));
  })();
  var boardTex = tex(bc, true), boardBump = tex(bh, false);
  [boardTex, boardBump].forEach(function (t) { t.repeat.set(1 / W, 1 / D); t.offset.set(0.5, 0.5); });

  /* rounded FR4 slab with real drilled mounting holes */
  function roundedRect(w, d, r) {
    var s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);     s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d);     s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r);         s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  var boardShape = roundedRect(W, D, 0.06);
  HOLES.forEach(function (h) {
    var p = new THREE.Path(); p.absarc(h[0], -h[1], HOLE_R, 0, Math.PI * 2, true);
    boardShape.holes.push(p);
  });
  var boardGeo = new THREE.ExtrudeGeometry(boardShape, { depth: TH, bevelEnabled: false, curveSegments: 20 });
  boardGeo.rotateX(-Math.PI / 2); boardGeo.translate(0, -TH / 2, 0);
  var board = new THREE.Mesh(boardGeo, [
    new THREE.MeshStandardMaterial({ map: boardTex, bumpMap: boardBump, bumpScale: 0.0035, roughness: 0.4, metalness: 0.0, envMapIntensity: 0.55 }),
    new THREE.MeshStandardMaterial({ color: lin(0x5b6a3c), roughness: 0.85, metalness: 0.0 })]);
  board.receiveShadow = true; board.castShadow = true;
  chipGroup.add(board);

  /* ---------- components, two instanced meshes ---------- */
  var tmpO = new THREE.Object3D(), unitBox = new THREE.BoxGeometry(1, 1, 1);
  function instanced(list, mat) {
    var m = new THREE.InstancedMesh(unitBox, mat, list.length);
    list.forEach(function (p, i) {
      tmpO.position.set(p.x, TOP + p.h / 2, p.z);
      tmpO.rotation.set(0, 0, 0);
      tmpO.scale.set(p.w, p.h, p.d);
      tmpO.updateMatrix();
      m.setMatrixAt(i, tmpO.matrix);
      m.setColorAt(i, lin(p.col));
    });
    m.castShadow = true; m.receiveShadow = true;
    chipGroup.add(m);
    return m;
  }
  instanced(bodies, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.7 }));
  instanced(metals, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 1.0 }));

  /* ---------- gold-plated mounting holes and plain vias ---------- */
  var goldMat = new THREE.MeshStandardMaterial({ color: lin(0xc79a45), roughness: 0.3, metalness: 1.0, side: THREE.DoubleSide });
  HOLES.forEach(function (h) {
    var ring = new THREE.Mesh(new THREE.RingGeometry(HOLE_R, 0.1, 48), goldMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(h[0], TOP + 0.0015, h[1]);
    ring.receiveShadow = true;
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R - 0.001, HOLE_R - 0.001, TH, 40, 1, true), goldMat);
    barrel.position.set(h[0], 0, h[1]);
    chipGroup.add(ring, barrel);
  });
  var viaMat = new THREE.MeshStandardMaterial({ color: lin(0xa6a9ae), roughness: 0.35, metalness: 1.0, side: THREE.DoubleSide });
  var pitMat = new THREE.MeshBasicMaterial({ color: 0x030303 });
  VIAS.forEach(function (h) {
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.052, 40), viaMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(h[0], TOP + 0.0015, h[1]);
    var pit = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), pitMat);
    pit.rotation.x = -Math.PI / 2; pit.position.set(h[0], TOP + 0.001, h[1]);
    chipGroup.add(ring, pit);
  });

  /* ---------- brushed-metal texture pair (colour + height) ---------- */
  function brushed(wpx, hpx, stops, draw) {
    var c = document.createElement('canvas'), h = document.createElement('canvas');
    c.width = h.width = wpx; c.height = h.height = hpx;
    var g = c.getContext('2d'), b = h.getContext('2d'), i;
    var gr = g.createLinearGradient(0, 0, wpx, hpx);
    gr.addColorStop(0, stops[0]); gr.addColorStop(0.5, stops[1]); gr.addColorStop(1, stops[2]);
    g.fillStyle = gr; g.fillRect(0, 0, wpx, hpx);
    b.fillStyle = '#808080'; b.fillRect(0, 0, wpx, hpx);
    for (i = 0; i < hpx; i++) {                       /* horizontal brush strokes */
      var v = rnd();
      g.fillStyle = v < 0.5 ? 'rgba(255,248,230,' + (v * 0.10) + ')' : 'rgba(40,25,5,' + ((v - 0.5) * 0.09) + ')';
      g.fillRect(0, i, wpx, 1);
      b.fillStyle = 'rgba(' + (v < 0.5 ? '255,255,255,' : '0,0,0,') + (rnd() * 0.16) + ')';
      b.fillRect(0, i, wpx, 1);
    }
    draw(g, b, wpx, hpx);
    return { map: tex(c, true), bump: tex(h, false) };
  }
  var GOLD = ['#e0b964', '#cfa24c', '#b98a3a'];

  /* ---------- gold-lidded power modules ---------- */
  var blackMat = new THREE.MeshStandardMaterial({ color: lin(0x1a1b1d), roughness: 0.7, metalness: 0.0 });
  var pinMat = new THREE.MeshStandardMaterial({ color: lin(0xb9bcc2), roughness: 0.35, metalness: 1.0 });
  var lidTex = brushed(256, 292, GOLD, function (g, b) {
    g.strokeStyle = 'rgba(95,70,30,0.55)'; g.lineWidth = 3; g.strokeRect(10, 10, 236, 272);
    b.strokeStyle = '#404040'; b.lineWidth = 4; b.strokeRect(10, 10, 236, 272);
    g.fillStyle = 'rgba(70,50,20,0.8)'; g.font = 'bold 18px monospace';
    g.fillText('ZB-VR13', 26, 48); g.fillText('1922', 26, 72);
    g.font = '12px monospace';
    g.fillText('N8W2125566 Z7', 26, 250); g.fillText('A0P2FT354630', 26, 266);
    g.beginPath(); g.arc(200, 150, 7, 0, Math.PI * 2); g.fill();
    b.fillStyle = '#383838'; b.beginPath(); b.arc(200, 150, 7, 0, Math.PI * 2); b.fill();
  });
  var lidMat = new THREE.MeshStandardMaterial({ map: lidTex.map, bumpMap: lidTex.bump, bumpScale: 0.0015, roughness: 0.34, metalness: 1.0 });
  var lidSide = new THREE.MeshStandardMaterial({ color: lin(0xb98a3a), roughness: 0.38, metalness: 1.0 });
  VRMS.forEach(function (v) {
    var base = new THREE.Mesh(new THREE.BoxGeometry(VW + 0.06, 0.03, VD + 0.04), blackMat);
    base.position.set(v[0], TOP + 0.015, v[1]); base.castShadow = true; chipGroup.add(base);
    for (var k = 0; k < 8; k++) {
      var zt = v[1] - VD / 2 + 0.05 + k * (VD - 0.1) / 7;
      [-1, 1].forEach(function (sd) {
        var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.04), pinMat);
        tooth.position.set(v[0] + sd * (VW / 2 + 0.045), TOP + 0.01, zt); chipGroup.add(tooth);
      });
    }
    var lid = new THREE.Mesh(new THREE.BoxGeometry(VW, 0.07, VD), [lidSide, lidSide, lidMat, lidSide, lidSide, lidSide]);
    lid.position.set(v[0], TOP + 0.03 + 0.035, v[1]); lid.castShadow = true; lid.receiveShadow = true;
    chipGroup.add(lid);
  });

  /* ---------- the package: substrate, stiffener frame, four dies ---------- */
  var FW = 1.44, FD = 1.14, FT = 0.085, FH = 0.05, SUB = 0.035, SUB_TOP = TOP + SUB;
  var DW = 0.56, DD = 0.36, DIE_H = 0.03;
  var DIES = [[-0.30, 0.24], [0.30, 0.24], [-0.30, -0.185], [0.30, -0.185]];   /* index order matches zones */

  var PW = 1024, PH = Math.round(PW * PKG.d / PKG.w), PPU = PW / PKG.w;
  function qx(x) { return (x + PKG.w / 2) * PPU; }
  function qz(z) { return (z + PKG.d / 2) * PPU; }
  var pc = document.createElement('canvas');
  pc.width = PW; pc.height = PH;
  (function () {
    var g = pc.getContext('2d'), x, z;
    g.fillStyle = '#1d2630'; g.fillRect(0, 0, PW, PH);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (x = 3; x < PW; x += 6) for (z = 3; z < PH; z += 6) g.fillRect(x, z, 1.5, 1.5);
    g.fillStyle = '#12161a';
    g.fillRect(qx(-FW / 2 + FT), qz(-FD / 2 + FT), (FW - 2 * FT) * PPU, (FD - 2 * FT) * PPU);
    /* fan-out routing between the die sites and the frame */
    g.strokeStyle = 'rgba(120,140,160,0.16)'; g.lineWidth = 1;
    for (x = -0.6; x <= 0.6; x += 0.012) {
      g.beginPath(); g.moveTo(qx(x), qz(-0.42)); g.lineTo(qx(x * 0.92), qz(0.46)); g.stroke();
    }
    /* underfill fillet and micro-bump landing pads, revealed when a die lifts out */
    DIES.forEach(function (dp) {
      g.fillStyle = '#0d0f12';
      g.fillRect(qx(dp[0] - DW / 2 - 0.014), qz(dp[1] - DD / 2 - 0.014), (DW + 0.028) * PPU, (DD + 0.028) * PPU);
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
  var subEdge = new THREE.MeshStandardMaterial({ color: lin(0x232a32), roughness: 0.7 });
  var substrate = new THREE.Mesh(new THREE.BoxGeometry(PKG.w, SUB, PKG.d), [subEdge, subEdge,
    new THREE.MeshStandardMaterial({ map: tex(pc, true), roughness: 0.5, metalness: 0.0, envMapIntensity: 0.8 }),
    subEdge, subEdge, subEdge]);
  substrate.position.y = TOP + SUB / 2;
  substrate.castShadow = true; substrate.receiveShadow = true;
  pkgGroup.add(substrate);

  /* nickel-plated stiffener with the notch at the top */
  var frameMat = new THREE.MeshStandardMaterial({ color: lin(0xb9bcc1), roughness: 0.3, metalness: 1.0 });
  function bar(x0, z0, x1, z1) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, FH, z1 - z0), frameMat);
    m.position.set((x0 + x1) / 2, SUB_TOP + FH / 2, (z0 + z1) / 2);
    m.castShadow = true; m.receiveShadow = true;
    pkgGroup.add(m);
  }
  var NOTCH = 0.2, DIP = 0.04;
  bar(-FW / 2, FD / 2 - FT, FW / 2, FD / 2);                       /* bottom */
  bar(-FW / 2, -FD / 2, -FW / 2 + FT, FD / 2 - FT);                /* left */
  bar(FW / 2 - FT, -FD / 2, FW / 2, FD / 2 - FT);                  /* right */
  bar(-FW / 2 + FT, -FD / 2, -NOTCH, -FD / 2 + FT);                /* top, left of notch */
  bar(NOTCH, -FD / 2, FW / 2 - FT, -FD / 2 + FT);                  /* top, right of notch */
  bar(-NOTCH - FT, -FD / 2 + FT, -NOTCH, -FD / 2 + FT + DIP);      /* notch walls */
  bar(NOTCH, -FD / 2 + FT, NOTCH + FT, -FD / 2 + FT + DIP);
  bar(-NOTCH - FT, -FD / 2 + FT + DIP, NOTCH + FT, -FD / 2 + FT + DIP + 0.06);

  /* rows of tiny decoupling caps inside the frame */
  var tinyPos = [];
  for (var tx = -0.56; tx <= 0.56; tx += 0.024) { tinyPos.push([tx, FD / 2 - FT - 0.03]); }
  for (var tz = -0.32; tz <= 0.42; tz += 0.024) { tinyPos.push([-FW / 2 + FT + 0.03, tz], [FW / 2 - FT - 0.03, tz]); }
  for (tx = -0.52; tx <= 0.52; tx += 0.03) { if (Math.abs(tx) > 0.06) tinyPos.push([tx, 0.03]); }
  var tiny = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.008, 0.007),
    new THREE.MeshStandardMaterial({ color: lin(0xb4a48a), roughness: 0.45, metalness: 0.6 }), tinyPos.length);
  tinyPos.forEach(function (p, i) {
    tmpO.position.set(p[0], SUB_TOP + 0.004, p[1]); tmpO.scale.set(1, 1, 1); tmpO.updateMatrix();
    tiny.setMatrixAt(i, tmpO.matrix);
  });
  pkgGroup.add(tiny);

  /* the dies: brushed gold lids scribed into compute tiles */
  function dieTexture() {
    return brushed(512, Math.round(512 * DD / DW), GOLD, function (g, b, Wc, Hc) {
      var cols = 2 + Math.floor(rnd() * 3), rows = 2 + Math.floor(rnd() * 2);
      for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
        var x0 = i * Wc / cols, y0 = j * Hc / rows, bw = Wc / cols, bhh = Hc / rows;
        g.strokeStyle = 'rgba(80,54,18,0.6)'; g.lineWidth = 3;
        g.strokeRect(x0 + 3, y0 + 3, bw - 6, bhh - 6);
        b.strokeStyle = '#2c2c2c'; b.lineWidth = 4;
        b.strokeRect(x0 + 3, y0 + 3, bw - 6, bhh - 6);
        if (rnd() < 0.6) {
          var cut = x0 + bw * (0.3 + rnd() * 0.4);
          g.strokeStyle = 'rgba(80,54,18,0.4)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(cut, y0 + 6); g.lineTo(cut, y0 + bhh - 6); g.stroke();
          b.strokeStyle = '#484848'; b.lineWidth = 3;
          b.beginPath(); b.moveTo(cut, y0 + 6); b.lineTo(cut, y0 + bhh - 6); b.stroke();
        }
      }
      /* chamfered rim */
      g.strokeStyle = 'rgba(255,244,214,0.35)'; g.lineWidth = 4; g.strokeRect(2, 2, Wc - 4, Hc - 4);
      b.strokeStyle = '#5a5a5a'; b.lineWidth = 6; b.strokeRect(0, 0, Wc, Hc);
    });
  }
  var dieSide = new THREE.MeshStandardMaterial({ color: lin(0xb98a3a), roughness: 0.4, metalness: 1.0 });
  var dieBase = new THREE.MeshStandardMaterial({ color: lin(0x2b2d31), roughness: 0.5, metalness: 0.3 });
  var bumpGeo = new THREE.SphereGeometry(0.0065, 8, 6);
  var bumpMat = new THREE.MeshStandardMaterial({ color: lin(0xc4c7cc), roughness: 0.25, metalness: 1.0 });
  var hitMat = new THREE.MeshBasicMaterial({ visible: false });
  var dies = [], pickables = [];
  DIES.forEach(function (dp, i) {
    var t = dieTexture();
    var top = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.002, roughness: 0.32, metalness: 1.0,
                                               emissive: lin(0xffb84a), emissiveIntensity: 0 });
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(DW, DIE_H, DD), [dieSide, dieSide, top, dieBase, dieSide, dieSide]);
    mesh.userData.idx = i; mesh.castShadow = true; mesh.receiveShadow = true;
    var group = new THREE.Group();
    group.position.set(dp[0], SUB_TOP + 0.008 + DIE_H / 2, dp[1]);
    group.add(mesh);
    /* micro-bumps on the underside */
    var bumps = new THREE.InstancedMesh(bumpGeo, bumpMat, 18 * 12), n = 0;
    for (var bi = 0; bi < 18; bi++) for (var bj = 0; bj < 12; bj++) {
      tmpO.position.set(-DW / 2 + (bi + 0.5) * DW / 18, -DIE_H / 2 - 0.004, -DD / 2 + (bj + 0.5) * DD / 12);
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

  var padGlow = new THREE.PointLight(0xffd98a, 0.25, 3.2);
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
    d.glow += ((d.idx === active ? 0.16 : 0) - d.glow) * 0.15;
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
  function setActive(idx) {
    if (idx === active) return;
    if (active >= 0) settle(dies[active]);
    active = idx;
    if (idx >= 0) { lift(dies[idx]); showZone(idx); }   /* the panel keeps the last project, so its link stays reachable */
  }
  function openZone(idx) {
    var l = zones[idx].link;
    if (l.indexOf('http') === 0) window.open(l, '_blank'); else window.location.href = l;
  }

  renderer.domElement.addEventListener('mousemove', function (e) {
    var s = pickAt(e.clientX, e.clientY);
    setActive(s);
    renderer.domElement.style.cursor = s >= 0 ? 'pointer' : 'crosshair';
  });
  renderer.domElement.addEventListener('click', function (e) {
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
    tiltX = BASE_TILT; tiltY = 0;
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
    dies.forEach(function (d) { poseDie(d, t); });
    padGlow.intensity = 0.22 + Math.sin(t * 2.0) * 0.08;
    rimLight.intensity = 0.9 + Math.sin(t * 1.2) * 0.25;
    sheen.position.x = Math.sin(t * 0.5) * 2.4;
    renderer.render(scene, camera);
  }
  animate();

  /* fill the frame, shrinking on narrow screens so the module never clips */
  function fit() {
    var w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    chipGroup.scale.setScalar(Math.min(1.3, 1.05 * w / h));
  }
  fit();
  new ResizeObserver(fit).observe(container);
})();
