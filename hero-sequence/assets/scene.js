// The ticket scene: a "Do these first" kitchen ticket on a dark counter lifts toward the camera
// and the report behind it (score, score parts, ratings, progress) unfolds into layered plates.
// Colours come from the app's tokens.css and figures from content.json, so the frames match the
// dashboard. Everything visible is a function of time t in [0, 4].

const DURATION = 4;
const DESIGN_PX_PER_UNIT = 200;
const LENS_FOV = 30;
const TEXTURE_SCALE = 3.5;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const window01 = (t, a, b) => clamp01((t - a) / (b - a));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const easeOut = (x) => 1 - (1 - x) ** 3;
const num = (n) => n.toLocaleString('en-US');

function readTokens(mode) {
  const root = document.documentElement;
  const before = root.dataset.mode;
  root.dataset.mode = mode;
  const style = getComputedStyle(root);
  // The plates are sheets, so they take the sheet's colours; the ticket and the stage have their own.
  const sheet = { paper: 'sheet', 'paper-2': 'sheet-2', 'paper-3': 'sheet-3', ink: 'sheet-ink', 'ink-2': 'sheet-ink-2', muted: 'sheet-muted', rule: 'sheet-rule', 'rule-strong': 'sheet-rule-strong', accent: 'sheet-accent' };
  const out = Object.fromEntries(Object.entries(sheet).map(([n, token]) => [n, style.getPropertyValue(`--${token}`).trim()]));
  out.ticket = style.getPropertyValue('--color-ticket').trim();
  out.stage = style.getPropertyValue('--color-stage').trim();
  if (before === undefined) delete root.dataset.mode;
  else root.dataset.mode = before;
  return out;
}

const probe = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
function toColor(THREE, css) {
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

// ---------- 2D drawing for the paper faces, in design pixels ----------

const FONT_BODY = '"Onest Variable", sans-serif';
const FONT_DISPLAY = '"Fraunces Variable", serif';

function painter(THREE, renderer, designW, designH, background, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(designW * TEXTURE_SCALE);
  canvas.height = Math.round(designH * TEXTURE_SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, designW, designH);
  ctx.textBaseline = 'alphabetic';
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function write(ctx, str, x, y, { size = 15, weight = 400, color, align = 'left', family = FONT_BODY, tracking = 0 }) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.letterSpacing = `${tracking}px`;
  ctx.fillText(str, x, y);
  ctx.letterSpacing = '0px';
  return ctx.measureText(str).width;
}

function wrap(ctx, str, maxWidth, font) {
  ctx.font = font;
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function rule(ctx, x1, x2, y, color, width = 1, dash) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function meter(ctx, x, y, w, share, fill, track) {
  const h = 8;
  ctx.fillStyle = track;
  ctx.beginPath();
  ctx.roundRect(x, y - h / 2, w, h, h / 2);
  ctx.fill();
  if (share <= 0) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y - h / 2, Math.max(h, w * share), h, h / 2);
  ctx.fill();
}

// The logo: a kitchen ticket on ink, three ruled lines and a short ink-blue line.
function logo(ctx, x, y, s, c) {
  ctx.fillStyle = c.ink;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, s * 0.22);
  ctx.fill();
  ctx.fillStyle = c.ticket;
  ctx.fillRect(x + s * 0.28, y + s * 0.2, s * 0.44, s * 0.6);
  ctx.fillStyle = c.ink;
  for (let i = 0; i < 3; i++) ctx.fillRect(x + s * 0.34, y + s * (0.3 + i * 0.12), s * 0.32, s * 0.05);
  ctx.fillStyle = c.accent;
  ctx.fillRect(x + s * 0.34, y + s * 0.66, s * 0.18, s * 0.06);
}

function drawTicket(ctx, w, h, c, content) {
  const pad = 26;
  write(ctx, 'Do these first', pad, 54, { size: 26, weight: 600, color: c.ink });
  write(ctx, `3 of ${content.actionCount}`, w - pad, 53, { size: 15, color: c['ink-2'], align: 'right' });
  rule(ctx, pad, w - pad, 78, c.ink, 1.2, [5, 4]);
  let y = 120;
  content.actions.forEach((a, i) => {
    write(ctx, String(i + 1), pad - 2, y + 4, { size: 34, weight: 420, color: c.accent, family: FONT_DISPLAY });
    const lines = wrap(ctx, a.title, w - pad * 2 - 32, `600 20px ${FONT_BODY}`);
    lines.forEach((line, j) => write(ctx, line, pad + 32, y + j * 26, { size: 20, weight: 600, color: c.ink }));
    y += (lines.length - 1) * 26 + 30;
    const tw = write(ctx, 'Time', pad + 32, y, { size: 15, color: c['ink-2'] });
    const vw = write(ctx, a.time, pad + 32 + tw + 7, y, { size: 15, weight: 600, color: c.ink });
    const cx = pad + 32 + tw + 7 + vw + 18;
    const cw = write(ctx, 'Cost', cx, y, { size: 15, color: c['ink-2'] });
    write(ctx, a.cost, cx + cw + 7, y, { size: 15, weight: 600, color: c.ink });
    y += 24;
    if (i < content.actions.length - 1) rule(ctx, pad, w - pad, y, c.rule, 1);
    y += 42;
  });
  rule(ctx, pad, w - pad, h - 62, c.ink, 1.2, [5, 4]);
  write(ctx, content.restaurant, pad, h - 32, { size: 15, weight: 600, color: c.ink });
  write(ctx, content.asOf, w - pad, h - 32, { size: 15, color: c['ink-2'], align: 'right' });
}

// The score on its plate: a ring that fills clockwise from the top, as on the report's overview,
// beside the six parts on a wheel.
function drawScore(ctx, w, h, c, content) {
  const pad = 26;
  logo(ctx, pad, 21, 26, c);
  write(ctx, 'Restaurant Command Center', pad + 36, 40, { size: 15, weight: 600, color: c.ink });
  rule(ctx, pad, w - pad, 62, c.rule);
  write(ctx, 'Online presence score', pad, 96, { size: 21, weight: 600, color: c.ink });

  const cx = pad + 76;
  const cy = 190;
  const r = 68;
  ctx.save();
  ctx.lineWidth = 12;
  ctx.strokeStyle = c['paper-3'];
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = c.accent;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01(content.score / 100));
  ctx.stroke();
  ctx.restore();
  write(ctx, String(content.score), cx, cy + 16, { size: 58, weight: 420, color: c.ink, family: FONT_DISPLAY, tracking: -2, align: 'center' });
  write(ctx, 'out of 100', cx, cy + 36, { size: 11, color: c['ink-2'], align: 'center' });

  // The wheel: each part on its own spoke, 0 at the centre and 100 at the rim.
  const wx = w - pad - 84;
  const R = 62;
  const n = content.parts.length;
  const at = (i, radius) => [wx + Math.sin((i / n) * Math.PI * 2) * radius, cy - Math.cos((i / n) * Math.PI * 2) * radius];
  const polygon = (radiusOf) => {
    ctx.beginPath();
    content.parts.forEach((p, i) => {
      const [x, y] = at(i, radiusOf(p));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = c.rule;
  for (const share of [0.25, 0.5, 0.75, 1]) {
    polygon(() => R * share);
    ctx.stroke();
  }
  content.parts.forEach((_, i) => {
    const [x, y] = at(i, R);
    ctx.beginPath();
    ctx.moveTo(wx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  });
  polygon((p) => R * clamp01(p.score / 100));
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = c.accent;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = c.accent;
  ctx.stroke();
  ctx.restore();

  write(ctx, content.label, pad, h - 22, { size: 20, weight: 450, color: c.ink, family: FONT_DISPLAY });
  write(ctx, content.trend, w - pad, h - 22, { size: 14, color: c['ink-2'], align: 'right' });
}

function drawParts(ctx, w, h, c, content) {
  const pad = 26;
  write(ctx, 'How the score is built', pad, 46, { size: 21, weight: 600, color: c.ink });
  write(ctx, 'Part', pad, 82, { size: 14, color: c['ink-2'] });
  write(ctx, 'Weight', 222, 82, { size: 14, color: c['ink-2'], align: 'right' });
  write(ctx, 'Score', w - pad, 82, { size: 14, color: c['ink-2'], align: 'right' });
  rule(ctx, pad, w - pad, 94, c['rule-strong'], 2);
  content.parts.forEach((p, i) => {
    const y = 127 + i * 36;
    write(ctx, p.label, pad, y, { size: 16, color: c.ink });
    write(ctx, `${p.weight}%`, 222, y, { size: 15, color: c['ink-2'], align: 'right' });
    meter(ctx, 236, y - 5, 100, p.score / 100, c.accent, c['paper-3']);
    write(ctx, String(p.score), w - pad, y, { size: 16, weight: 600, color: c.ink, align: 'right' });
    rule(ctx, pad, w - pad, y + 13, c.rule);
  });
}

function drawRatings(ctx, w, h, c, content) {
  const pad = 26;
  write(ctx, 'Ratings by platform', pad, 46, { size: 21, weight: 600, color: c.ink });
  write(ctx, 'Platform', pad, 82, { size: 14, color: c['ink-2'] });
  write(ctx, 'Rating', 150, 82, { size: 14, color: c['ink-2'] });
  write(ctx, 'Reviews', w - pad, 82, { size: 14, color: c['ink-2'], align: 'right' });
  rule(ctx, pad, w - pad, 94, c['rule-strong'], 2);
  content.ratings.forEach((r, i) => {
    const y = 128 + i * 38;
    write(ctx, r.platform, pad, y, { size: 16, weight: 600, color: c.ink });
    write(ctx, r.rating.toFixed(1), 150, y, { size: 16, color: c.ink });
    meter(ctx, 190, y - 5, 112, r.rating / 5, c.accent, c['paper-3']);
    write(ctx, num(r.reviews), w - pad, y, { size: 16, color: c.ink, align: 'right' });
    rule(ctx, pad, w - pad, y + 15, c.rule);
  });
}

function drawProgress(ctx, w, h, c, content) {
  const pad = 26;
  write(ctx, 'Score by month', pad, 46, { size: 21, weight: 600, color: c.ink });
  const floor = 0;
  const ceil = 100;
  const x0 = pad + 26;
  const x1 = w - pad - 14;
  const y0 = 210;
  const y1 = 80;
  const yOf = (v) => y0 - ((v - floor) / (ceil - floor)) * (y0 - y1);
  for (let v = floor; v <= ceil; v += 25) {
    rule(ctx, x0, x1, yOf(v), c.rule);
    write(ctx, String(v), x0 - 8, yOf(v) + 4, { size: 13, color: c['ink-2'], align: 'right' });
  }
  const pts = content.history.map((p, i) => [x0 + 10 + (i * (x1 - x0 - 20)) / (content.history.length - 1), yOf(p.score)]);
  ctx.save();
  const fade = ctx.createLinearGradient(0, y1, 0, y0);
  fade.addColorStop(0, c.accent);
  fade.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = fade;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.lineTo(pts.at(-1)[0], y0);
  ctx.lineTo(pts[0][0], y0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.fillStyle = c.accent;
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const [lx, ly] = pts.at(-1);
  write(ctx, String(content.history.at(-1).score), lx, ly - 12, { size: 16, weight: 600, color: c.ink, align: 'center' });
  content.history.forEach((p, i) => write(ctx, p.month, pts[i][0], y0 + 24, { size: 13, color: c['ink-2'], align: 'center' }));
}

// ---------- geometry ----------

function roundedRect(THREE, w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

// A ticket with perforation bites along the top and bottom edges.
function ticketShape(THREE, w, h) {
  const r = 0.03;
  const step = 0.1;
  const count = Math.floor((w - step) / step);
  const start = -((count - 1) * step) / 2;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  for (let i = 0; i < count; i++) {
    const cx = start + i * step;
    s.lineTo(cx - r, -h / 2);
    s.absarc(cx, -h / 2, r, Math.PI, 0, true);
  }
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2);
  for (let i = count - 1; i >= 0; i--) {
    const cx = start + i * step;
    s.lineTo(cx + r, h / 2);
    s.absarc(cx, h / 2, r, 0, Math.PI, true);
  }
  s.lineTo(-w / 2, h / 2);
  s.lineTo(-w / 2, -h / 2);
  return s;
}

function slab(THREE, shape, w, h, depth, bevel, faceMaterial, edgeMaterial) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -depth / 2);
  faceMaterial.map.repeat.set(1 / w, 1 / h);
  faceMaterial.map.offset.set(0.5, 0.5);
  const mesh = new THREE.Mesh(geometry, [faceMaterial, edgeMaterial]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ---------- scene ----------

export function createScene(THREE, { width, height, framing, content, environment, renderer }) {
  const light = readTokens('light');
  const dark = readTokens('dark');
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = 0.36;

  const stage = toColor(THREE, light.stage);
  scene.background = stage;
  scene.fog = new THREE.Fog(stage, 13, 26);

  // The pass: dark brushed stainless steel, the surface tickets sit on in a restaurant kitchen.
  // Fine streaks in the roughness give the brushed grain; they are hashed from their index, not random.
  const grain = document.createElement('canvas');
  grain.width = 8;
  grain.height = 1024;
  const g = grain.getContext('2d');
  for (let y = 0; y < grain.height; y++) {
    const h = Math.sin(y * 12.9898) * 43758.5453;
    const v = 150 + Math.round((h - Math.floor(h)) * 70);
    g.fillStyle = `rgb(${v}, ${v}, ${v})`;
    g.fillRect(0, y, grain.width, 1);
  }
  const grainMap = new THREE.CanvasTexture(grain);
  grainMap.wrapS = grainMap.wrapT = THREE.RepeatWrapping;
  grainMap.repeat.set(1, 18);
  const counter = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshPhysicalMaterial({
      color: toColor(THREE, dark['paper-3']),
      metalness: 0.6,
      roughness: 1,
      roughnessMap: grainMap,
      envMapIntensity: 0.45,
      dithering: true,
    }),
  );
  counter.rotation.x = -Math.PI / 2;
  counter.receiveShadow = true;
  scene.add(counter);

  // Soft key from front left, warm; cool rim from behind right; the key's falloff on the
  // counter is the vignette.
  // A warm heat lamp over the pass.
  const key = new THREE.SpotLight(0xffe6c8, 560, 0, 0.44, 0.9, 2);
  key.position.set(-2.2, 10, 9.5);
  key.target.position.set(1.0, 0.9, 0.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 7;
  key.shadow.camera.far = 22;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 25;
  key.shadow.bias = -0.0004;
  key.shadow.intensity = 0.8;
  scene.add(key, key.target);

  // A soft rectangular heat lamp over the pass; its long reflection is what reads as steel.
  const lamp = new THREE.RectAreaLight(0xffd9b0, 2.2, 9, 1.1);
  lamp.position.set(0.8, 6.5, -2.5);
  lamp.lookAt(0.8, 0, -2.5);
  scene.add(lamp);

  const rim = new THREE.DirectionalLight(0xd9e6ff, 2.2);
  rim.position.set(7, 6, -8);
  scene.add(rim);

  const edge = new THREE.MeshStandardMaterial({ color: toColor(THREE, light['paper-2']).multiplyScalar(0.96), roughness: 0.38 });
  const ticketEdge = new THREE.MeshStandardMaterial({ color: toColor(THREE, light.ticket).multiplyScalar(0.92), roughness: 0.9 });

  const unit = (px) => px / DESIGN_PX_PER_UNIT;
  const plateSpecs = [
    { id: 'score', w: 410, h: 320, draw: drawScore },
    { id: 'parts', w: 410, h: 340, draw: drawParts },
    { id: 'ratings', w: 410, h: 196, draw: drawRatings },
    { id: 'progress', w: 410, h: 250, draw: drawProgress },
  ];

  const ticketW = 340;
  const ticketH = 500;
  const ticketFace = new THREE.MeshStandardMaterial({
    map: painter(THREE, renderer, ticketW, ticketH, light.ticket, (ctx) => drawTicket(ctx, ticketW, ticketH, light, content)),
    roughness: 0.92,
  });
  const ticket = slab(THREE, ticketShape(THREE, unit(ticketW), unit(ticketH)), unit(ticketW), unit(ticketH), 0.01, 0, ticketFace, ticketEdge);
  // A slight curl along the ticket's length, as thin paper has.
  const pos = ticket.geometry.attributes.position;
  const halfH = unit(ticketH) / 2;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + 0.05 * (pos.getY(i) / halfH) ** 2);
  ticket.geometry.computeVertexNormals();
  scene.add(ticket);

  const plates = plateSpecs.map((spec) => {
    const face = new THREE.MeshPhysicalMaterial({
      map: painter(THREE, renderer, spec.w, spec.h, light['paper-2'], (ctx) => spec.draw(ctx, spec.w, spec.h, light, content)),
      roughness: 0.5,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
    });
    const mesh = slab(THREE, roundedRect(THREE, unit(spec.w), unit(spec.h), 0.06), unit(spec.w), unit(spec.h), 0.045, 0.014, face, edge);
    scene.add(mesh);
    return mesh;
  });

  // End layout: the ticket in front; the score and its parts behind it; ratings and progress
  // further back, tucked partly behind the middle column so the whole report stays large.
  const cluster = new THREE.Object3D();
  cluster.position.set(0.6, 0.32, 0);
  cluster.rotation.set(-0.03, -0.32, 0);
  cluster.updateMatrixWorld();
  const slot = (x, y, z, ry = 0) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    o.rotation.set(0, ry, 0);
    cluster.add(o);
    o.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    o.matrixWorld.decompose(p, q, new THREE.Vector3());
    return { p, q };
  };
  const wide = framing === 'wide';
  const ticketEnd = slot(-1.05, 1.5, 0.9, 0.14);
  const plateEnds = wide
    ? [slot(0.9, 2.58, 0.0), slot(0.9, 0.82, -0.12), slot(2.75, 3.95, -1.3), slot(3.0, 2.25, -1.5)]
    : [slot(0.95, 2.55, 0.0), slot(0.95, 0.8, -0.12), slot(1.55, 3.8, -1.3), slot(-0.7, 3.55, -1.5)];

  const ticketStart = {
    p: new THREE.Vector3(0.55, 0.03, 0.9),
    q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.2, 'XYZ')),
  };

  const bezier = (a, b, c, t) => a.clone().multiplyScalar((1 - t) ** 2).add(b.clone().multiplyScalar(2 * (1 - t) * t)).add(c.clone().multiplyScalar(t * t));

  // Timing, in seconds of the 4-second film (one second is a quarter of the hero's scroll).
  // The ticket lifts almost at once; each plate leaves once the ticket stands nearly upright, so
  // none passes through it; the back plates leave first and the score lands last.
  const TICKET = [0.12, 1.55];
  const launchOrder = [3, 2, 1, 0];
  const plateWindows = plates.map((_, i) => {
    const a = 1.05 + launchOrder[i] * 0.26;
    return [a, a + 1.45];
  });

  function ticketPose(t) {
    const k = easeInOut(window01(t, TICKET[0], TICKET[1]));
    const lift = new THREE.Vector3().lerpVectors(ticketStart.p, ticketEnd.p, 0.5).setY(ticketEnd.p.y - 0.15);
    return { p: bezier(ticketStart.p, lift, ticketEnd.p, k), q: ticketStart.q.clone().slerp(ticketEnd.q, k) };
  }

  // Camera: high over the counter, down and round to face the unfolded report, then a slow push in.
  const camera = new THREE.PerspectiveCamera(LENS_FOV, width / height, 0.1, 100);
  const keys = wide
    ? [
        { t: 0, pos: [0.75, 6.6, 5.6], at: [0.6, 0.15, 0.6], shift: 0.5, lift: 0.12 },
        { t: 2.7, pos: [-0.6, 4.5, 14.2], at: [0.95, 1.95, 0], shift: 0.33, lift: 0.16 },
        { t: 4, pos: [-0.5, 4.15, 12.9], at: [0.95, 2.0, 0], shift: 0.28, lift: 0.17 },
      ]
    : [
        { t: 0, pos: [0.6, 8.0, 6.6], at: [0.55, 0.0, 0.6], shift: 0, lift: 0 },
        { t: 2.7, pos: [0.3, 4.8, 14.6], at: [0.6, 2.15, 0], shift: 0, lift: 0 },
        { t: 4, pos: [0.42, 4.5, 12.9], at: [0.8, 2.2, 0], shift: 0, lift: 0 },
      ];

  function cameraAt(t) {
    const [a, b] = t < keys[1].t ? [keys[0], keys[1]] : [keys[1], keys[2]];
    const raw = window01(t, a.t, b.t);
    const k = a === keys[0] ? raw * raw * (3 - 2 * raw) : 1 - (1 - raw) ** 2;
    const mix = (x, y) => x + (y - x) * k;
    camera.position.set(mix(a.pos[0], b.pos[0]), mix(a.pos[1], b.pos[1]), mix(a.pos[2], b.pos[2]));
    camera.lookAt(mix(a.at[0], b.at[0]), mix(a.at[1], b.at[1]), mix(a.at[2], b.at[2]));
    // A lens shift moves the subject off centre without tilting the verticals.
    const lift = mix(a.lift, b.lift);
    const fullW = width * (1 + mix(a.shift, b.shift));
    const fullH = height * (1 + lift);
    // A taller virtual frame would also zoom in; widening the lens by the same amount cancels that.
    camera.fov = (2 * Math.atan(Math.tan((LENS_FOV / 2) * (Math.PI / 180)) * (1 + lift)) * 180) / Math.PI;
    camera.aspect = fullW / fullH;
    camera.setViewOffset(fullW, fullH, 0, 0, width, height);
    camera.updateProjectionMatrix();
  }

  function poseAt(time) {
    const t = Math.min(DURATION, Math.max(0, time));
    cameraAt(t);
    const tp = ticketPose(t);
    ticket.position.copy(tp.p);
    ticket.quaternion.copy(tp.q);
    plates.forEach((plate, i) => {
      const [a, b] = plateWindows[i];
      if (t < a) {
        plate.visible = false;
        return;
      }
      plate.visible = true;
      const k = easeInOut(window01(t, a, b));
      // Each plate starts small, hidden just behind the ticket, and slides out behind its plane.
      const origin = ticketPose(a);
      const behind = new THREE.Vector3(0, 0, -0.35).applyQuaternion(ticketEnd.q).add(origin.p);
      const end = plateEnds[i];
      const rise = behind.clone().lerp(end.p, 0.5).setY(Math.max(behind.y, end.p.y) + 0.45);
      rise.z = Math.min(rise.z, behind.z);
      plate.position.copy(bezier(behind, rise, end.p, k));
      plate.quaternion.copy(ticketEnd.q.clone().slerp(end.q, easeOut(k)));
      plate.scale.setScalar(0.4 + 0.6 * easeOut(k));
    });
  }

  return { scene, camera, poseAt };
}
