import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BANTER, CHARACTER } from './banter.js';

/* =========================================================================
   Life-size, boot-proud, animated character for Quest (WebXR), with an
   in-headset animation menu, banter, pokes, hearts and boot clomps.
   Who he is (name, model, move names) lives in banter.js → CHARACTER.
   ========================================================================= */

const NAME = CHARACTER.name;
const MODEL = CHARACTER.model;
const HOME = new THREE.Vector3(0, 0, -1.8);     // 1.8 m in front of you
const ROAM_RADIUS = 1.5;                         // how far he may wander when "On the spot" is off
const LOCO = CHARACTER.loco;
const NO_LOOK = CHARACTER.noLook;
const NAMES = CHARACTER.names;
const pretty = (n) => NAMES[n] || n.replace(/_/g, ' ').replace(/\b(\d+|M|F)\b/g, '').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());

const TEST = new URLSearchParams(location.search).has('test');
const $ = (id) => document.getElementById(id);
const setStatus = (t) => { $('status').textContent = t; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const UP = new THREE.Vector3(0, 1, 0);
const V = () => new THREE.Vector3();
const wpos = (o) => o.getWorldPosition(V());

/* ---------------- renderer / scene ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: TEST });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
$('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const DESK_BG = new THREE.Color(0x2b3035), VR_BG = new THREE.Color(0x16191c);
scene.background = DESK_BG;
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.75;
scene.add(new THREE.HemisphereLight(0xffffff, 0x6b6157, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(1.5, 3, 1.2); scene.add(sun);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.03, 60);
camera.position.set(0.6, 1.6, 1.2);
scene.add(camera);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.0, -1.8); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.55; controls.update();

const world = new THREE.Group(); scene.add(world);           // moved by "Bring here" in XR
const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1 }));
floor.rotation.x = -Math.PI / 2; world.add(floor);
const grid = new THREE.GridHelper(14, 28, 0x50575e, 0x444a50); grid.position.y = 0.002; world.add(grid);

addEventListener('resize', () => {
  if (renderer.xr.isPresenting) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
});

function radialTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const puffTex = radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
const heartTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ff4f93'; g.beginPath(); g.moveTo(64, 112);
  g.bezierCurveTo(10, 72, 4, 30, 36, 20); g.bezierCurveTo(52, 15, 62, 26, 64, 36);
  g.bezierCurveTo(66, 26, 76, 15, 92, 20); g.bezierCurveTo(124, 30, 118, 72, 64, 112); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTex('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1; world.add(shadow);

/* ---------------- sound (synthesised, spatial) ---------------- */
const listener = new THREE.AudioListener(); camera.add(listener);
const actx = listener.context;
let muted = false;
const noiseBuf = (() => { const b = actx.createBuffer(1, actx.sampleRate, actx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
function out3d(pos, vol = 1) {
  const p = actx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1;
  p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
  const g = actx.createGain(); g.gain.value = vol; g.connect(p); p.connect(listener.getInput()); return g;
}
function noise(t, dur) { const s = actx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, Math.random() * 0.5); s.stop(t + dur); return s; }
function env(param, t, peak, a, r) { param.setValueAtTime(0.0001, t); param.exponentialRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(0.0001, t + a + r); }
function sfx(type, pos, vol = 1) {
  if (muted || actx.state !== 'running') return;
  const t = actx.currentTime, out = out3d(pos, vol);
  if (type === 'clomp') {               // heavy boot on the floor
    const o = actx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(rand(95, 120), t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = actx.createGain(); env(g.gain, t, 0.9, 0.003, 0.16); o.connect(g).connect(out); o.start(t); o.stop(t + 0.2);
    const n = noise(t, 0.1), lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const g2 = actx.createGain(); env(g2.gain, t, 0.5, 0.002, 0.07); n.connect(lp).connect(g2).connect(out);
  } else if (type === 'squeak') {       // leather squeak
    const o = actx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.09); o.frequency.exponentialRampToValueAtTime(1100, t + 0.16);
    const vib = actx.createOscillator(); vib.frequency.value = 38; const vg = actx.createGain(); vg.gain.value = 60; vib.connect(vg).connect(o.frequency);
    const g = actx.createGain(); env(g.gain, t, 0.35, 0.01, 0.17); o.connect(g).connect(out); o.start(t); vib.start(t); o.stop(t + 0.2); vib.stop(t + 0.2);
  } else if (type === 'boing') {
    const o = actx.createOscillator(); const f = rand(0.85, 1.2);
    o.frequency.setValueAtTime(180 * f, t); o.frequency.exponentialRampToValueAtTime(560 * f, t + 0.07); o.frequency.exponentialRampToValueAtTime(260 * f, t + 0.28);
    const g = actx.createGain(); env(g.gain, t, 0.5, 0.01, 0.3); o.connect(g).connect(out); o.start(t); o.stop(t + 0.35);
  } else if (type === 'rimshot') {
    [[200, 0], [150, 0.14]].forEach(([f, d]) => {
      const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + d + 0.12);
      const g = actx.createGain(); env(g.gain, t + d, 0.7, 0.004, 0.14); o.connect(g).connect(out); o.start(t + d); o.stop(t + d + 0.2);
    });
    const n = noise(t, 1), hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t + 0.3); g.gain.exponentialRampToValueAtTime(0.5, t + 0.31); g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    n.connect(hp).connect(g).connect(out);
  } else if (type === 'ding') {
    [1320, 1760].forEach((f, i) => { const o = actx.createOscillator(); o.frequency.value = f; const g = actx.createGain(); env(g.gain, t + i * 0.06, 0.18, 0.005, 0.25); o.connect(g).connect(out); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.35); });
  }
}

/* ---------------- voice ---------------- */
const tts = { ok: 'speechSynthesis' in window, voices: [] };
if (tts.ok) { const load = () => { tts.voices = speechSynthesis.getVoices(); }; load(); speechSynthesis.addEventListener?.('voiceschanged', load); }
function voice() {
  const en = tts.voices.filter((v) => /^en/i.test(v.lang));
  const gb = en.filter((v) => /GB|UK/i.test(v.lang + ' ' + v.name));
  const pool = gb.length ? gb : en;
  const male = pool.filter((v) => /male|daniel|george|ryan|arthur|oliver|thomas|james/i.test(v.name) && !/female/i.test(v.name));
  return (male.length ? male : pool)[0] || null;
}
function speak(text) {
  if (!tts.ok || muted) return;
  const clean = text.replace(/…/g, '... ').replace(/—/g, ', ').trim();
  if (!/[a-z]/i.test(clean)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean); const v = voice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
    u.pitch = 0.95; u.rate = 1.02; speechSynthesis.speak(u);
  } catch (e) { /* silent fallback */ }
}
const lineDur = (text) => clamp(1.3 + text.split(/\s+/).length * 0.4, 2.4, 7);

/* ---------------- speech bubble ---------------- */
class Bubble {
  constructor(accent) {
    this.canvas = document.createElement('canvas'); this.canvas.width = 720; this.canvas.height = 330;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthTest: false, opacity: 0 });
    this.sprite = new THREE.Sprite(this.mat); this.sprite.renderOrder = 999;
    this.sprite.scale.set(0.8, 0.8 * 330 / 720, 1); this.sprite.center.set(0.5, 0);
    this.accent = accent; this.until = 0; scene.add(this.sprite);
  }
  set(text, hint = null) {
    const c = this.canvas, g = c.getContext('2d');
    const font = (px, wt = 700) => `${wt} ${px}px "Segoe UI", Roboto, sans-serif`;
    g.clearRect(0, 0, c.width, c.height);
    let size = 54, lines;
    const wrap = () => { g.font = font(size); const out = []; let cur = '';
      for (const w of text.split(' ')) { const tl = cur ? cur + ' ' + w : w; if (g.measureText(tl).width > 600 && cur) { out.push(cur); cur = w; } else cur = tl; }
      if (cur) out.push(cur); return out; };
    do { lines = wrap(); if (lines.length <= 3) break; size -= 4; } while (size > 30);
    const lh = size * 1.18, hs = 36;
    const textW = Math.max(...lines.map((l) => g.measureText(l).width));
    g.font = font(hs, 700); const hintW = hint ? g.measureText(hint).width : 0;
    const w = Math.min(700, Math.max(textW, hintW) + 70), h = lines.length * lh + 40 + (hint ? hs + 14 : 0);
    const tail = 44, x = (c.width - w) / 2, y = c.height - tail - h - 6, cx = c.width / 2, by = y + h;
    g.fillStyle = '#fff'; g.strokeStyle = this.accent; g.lineWidth = 8;
    g.beginPath(); g.roundRect(x, y, w, h, 34); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - 22, by - 2); g.lineTo(cx, by + tail); g.lineTo(cx + 22, by - 2); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(cx - 22, by + 2); g.lineTo(cx, by + tail); g.lineTo(cx + 22, by + 2); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#141618'; g.font = font(size);
    lines.forEach((l, i) => g.fillText(l, cx, y + 22 + lh * (i + 0.5) + 2));
    if (hint) { g.fillStyle = '#4a5057'; g.font = font(hs, 700); g.fillText(hint, cx, y + 22 + lh * lines.length + hs / 2 + 6); }
    this.tex.needsUpdate = true;
  }
  update(dt, t, anchor) {
    const on = t < this.until;
    this.mat.opacity += ((on ? 1 : 0) - this.mat.opacity) * damp(on ? 14 : 6, dt);
    this.sprite.visible = this.mat.opacity > 0.02; this.sprite.position.copy(anchor);
  }
}

/* ---------------- particles: dust, sparkles ---------------- */
const particles = [];
function burst(pos, color, n, speed, life, size, { gravity = -3, additive = true, up = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.position.copy(pos); s.scale.setScalar(size); scene.add(s);
    const v = new THREE.Vector3(rand(-1, 1), rand(0.1, 1) * up, rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
    particles.push({ s, v, life, age: 0, gravity, size });
  }
}
// a few hearts float up from his head and drift towards you
function hearts(n = 5) {
  if (!gav.head) return;
  const from = wpos(gav.headTop).add(new THREE.Vector3(0, 0.05, 0));
  const toYou = headW.clone().sub(from).setY(0).normalize();
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.position.copy(from).add(new THREE.Vector3(rand(-0.12, 0.12), rand(-0.05, 0.05), rand(-0.12, 0.12))); s.scale.setScalar(0.05);
    scene.add(s);
    const v = toYou.clone().multiplyScalar(rand(0.15, 0.35)).add(new THREE.Vector3(rand(-0.08, 0.08), rand(0.25, 0.45), rand(-0.08, 0.08)));
    particles.push({ s, v, life: rand(1.6, 2.4), age: -i * 0.12, gravity: 0, size: 0.05, heart: true });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.age += dt; if (p.age < 0) { p.s.visible = false; continue; } p.s.visible = true; const k = p.age / p.life;
    if (k >= 1) { scene.remove(p.s); p.s.material.dispose(); particles.splice(i, 1); continue; }
    p.v.y += p.gravity * dt; p.v.multiplyScalar(1 - dt * (p.heart ? 0.4 : 1.5)); p.s.position.addScaledVector(p.v, dt);
    p.s.scale.setScalar(p.heart ? p.size * (1 + 0.15 * Math.sin(p.age * 9)) : p.size * (1 + k)); p.s.material.opacity = p.heart ? Math.min(1, 1.6 - 1.6 * k) : 1 - k;
  }
}

/* ---------------- bone maths ---------------- */
function rotateWorld(bone, qW) {
  const q = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(qW);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  bone.updateMatrixWorld(true);
}

/* ---------------- Gav ---------------- */
const gav = {
  root: new THREE.Group(), yaw: 0, actions: [], cur: -1, speed: 1, onSpot: true,
  fl: 0, flv: 0, flAxis: new THREE.Vector3(1, 0, 0), lookW: 0, lookPoint: new THREE.Vector3(0, 1.6, 0),
  talkUntil: 0, laughUntil: 0, temp: null,
};
world.add(gav.root);
gav.root.position.copy(HOME);
const bubble = new Bubble(CHARACTER.accent || '#ffd400');

function setupModel(gltf) {
  const model = gltf.scene;
  model.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  gav.root.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.position.y = -box.min.y; model.updateMatrixWorld(true);
  gav.height = box.max.y - box.min.y;
  gav.model = model;
  const B = (n) => model.getObjectByName('mixamorig' + n);
  Object.assign(gav, {
    hips: B('Hips'), spine1: B('Spine1'), spine2: B('Spine2'), neck: B('Neck'), head: B('Head'), headTop: B('HeadTop_End'),
    feet: ['Left', 'Right'].map((s) => ({ leg: B(s + 'Leg'), foot: B(s + 'Foot'), toe: B(s + 'ToeBase'), down: true, prevY: 0, cd: 0 })),
  });
  // how high each boot's toe and ankle sit when standing (thick soles!) — used to hear footfalls
  for (const f of gav.feet) { f.restToe = wpos(f.toe).y; f.restAnk = wpos(f.foot).y; }
  // rest-pose forward directions (model faces +Z)
  const fwd = new THREE.Vector3(0, 0, 1);
  gav.headFwd = fwd.clone().applyQuaternion(gav.head.getWorldQuaternion(new THREE.Quaternion()).invert());
  gav.neckFwd = fwd.clone().applyQuaternion(gav.neck.getWorldQuaternion(new THREE.Quaternion()).invert());
  gav.mixer = new THREE.AnimationMixer(model);

  const pq = gav.hips.parent.getWorldQuaternion(new THREE.Quaternion());
  const ps = gav.hips.parent.getWorldScale(V()).x;
  for (const clip of gltf.animations) {
    let vel = V();
    const tr = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
    if (tr) {
      const v = tr.values, n = v.length / 3, tt = tr.times, span = (tt[n - 1] - tt[0]) || 1;
      const dx = v[(n - 1) * 3] - v[0], dz = v[(n - 1) * 3 + 2] - v[2];
      vel = new THREE.Vector3(dx, 0, dz).applyQuaternion(pq).multiplyScalar(ps / clip.duration); vel.y = 0;
      for (let i = 0; i < n; i++) { const f = (tt[i] - tt[0]) / span; v[i * 3] -= dx * f; v[i * 3 + 2] -= dz * f; }
    }
    const loco = LOCO.find(([re]) => re.test(clip.name));
    if (loco && vel.length() < 0.15) vel = new THREE.Vector3(0, 0, loco[1]);
    gav.actions.push({ name: clip.name, label: pretty(clip.name), action: gav.mixer.clipAction(clip), vel, travels: !!loco, dur: clip.duration });
  }
  gav.actions.sort((a, b) => a.label.localeCompare(b.label));
}

function play(i, { quiet = false, temp = false } = {}) {
  if (!gav.actions.length) return;
  i = (i + gav.actions.length) % gav.actions.length;
  if (!temp) gav.temp = null;
  const next = gav.actions[i].action, prev = gav.cur >= 0 ? gav.actions[gav.cur].action : null;
  next.reset(); next.setLoop(THREE.LoopRepeat, Infinity); next.setEffectiveWeight(1); next.play();
  if (prev && prev !== next) prev.crossFadeTo(next, 0.35, false);
  gav.cur = i;
  refreshLabels();
  setStatus('Now playing: ' + gav.actions[i].label);
  if (!quiet && !temp) {
    const m = BANTER.moves.find(([re]) => re.test(gav.actions[i].name));
    if (m) { talk.clear(); say(m[1]); }
    if (CHARACTER.flirtyMoves && CHARACTER.flirtyMoves.test(gav.actions[i].name)) { hearts(8); gav.heartsEvery = 1.4; } else gav.heartsEvery = 0;
  }
}
// play a move for a while, then go back to what he was doing
function playFor(re, secs) {
  const i = gav.actions.findIndex((a) => re.test(a.name));
  if (i < 0) return false;
  const back = gav.temp ? gav.temp.back : gav.cur;
  play(i, { temp: true });
  gav.temp = { back, until: simT + Math.min(secs, gav.actions[i].dur * 1.0 + 0.2) };
  return true;
}

/* ---------------- talking ---------------- */
let simT = 0;
function say(text, { dur = null, hint = null, silent = false } = {}) {
  const d = dur || lineDur(text);
  bubble.set(text, hint); bubble.until = simT + d + 0.4;
  if (!silent && text !== '…') { gav.talkUntil = simT + Math.min(d, lineDur(text)) - 0.3; speak(text); }
  return d;
}
const bag = {};
function draw(key, arr) { if (!bag[key] || !bag[key].length) bag[key] = arr.map((_, i) => i).sort(() => Math.random() - 0.5); return arr[bag[key].pop()]; }
function sparkleBoots(n = 8) { for (const f of gav.feet) burst(wpos(f.toe).add(new THREE.Vector3(0, 0.05, 0)), 0xffffff, n, 0.7, 0.6, 0.025, { gravity: 0, up: 1 }); sfx('ding', wpos(gav.feet[0].toe), 0.6); }

const headLog = [];
const talk = {
  q: [], active: false, nextAt: 0, wait: null, autoAt: 16, offerCD: 35, quietUntil: 0,
  start(steps) { this.clear(); this.q = steps; this.active = true; this.nextAt = simT; },
  clear() {
    if (this.active && tts.ok) speechSynthesis.cancel();
    if (this.active) { this.autoAt = simT + rand(20, 32); this.quietUntil = simT + 6; }
    this.q = []; this.active = false; this.wait = null; showAnswer(false);
  },
  answer(yes, why = '') {
    if (!this.wait) return false;
    this.wait = null; showAnswer(false);
    this.q = yes ? jokeSteps(true) : [{ text: pick(why === 'timeout' ? BANTER.noAnswer : BANTER.declined) }];
    this.nextAt = simT + 0.25; refreshLabels();
    return true;
  },
  update(t) {
    if (this.wait) {
      if (t > this.wait.until) this.answer(false, 'timeout');
      else { const g = detectHeadGesture(); if (g) this.answer(g === 'nod'); }
      return;
    }
    if (!this.active || t < this.nextAt) return;
    const step = this.q.shift();
    if (!step) { this.active = false; this.autoAt = t + rand(20, 32); this.quietUntil = t + 6; return; }
    if (step.fn) { step.fn(); this.nextAt = t + (step.pause || 0); return; }
    const d = say(step.text, { dur: step.ask ? 10 : step.dur, hint: step.hint, silent: step.silent });
    if (step.ask) { this.wait = { until: t + 9 }; headLog.length = 0; showAnswer(true); refreshLabels(); return; }
    this.nextAt = t + d + (step.gap ?? 0.35);
  },
};
function jokeSteps(intro) {
  const [setup, punch] = draw('joke', BANTER.jokes);
  const s = [];
  if (intro) s.push({ text: pick(BANTER.jokeIntro), dur: 1.8 });
  s.push({ text: setup, gap: 0.2 }, { text: '…', dur: 1.0, silent: true, gap: 0 }, { text: punch, gap: 0.1 });
  s.push({ fn: () => { sfx('rimshot', wpos(gav.head)); gav.laughUntil = simT + 1.6; }, pause: 1.4 });
  if (Math.random() < 0.5) s.push({ fn: () => hearts(4) }, { text: pick(BANTER.afterJoke) });
  return s;
}
const topicSteps = () => draw('topic', BANTER.topics).map((text) => ({ text }));
function askSteps() { talk.offerCD = simT + rand(50, 80); return [{ text: pick(BANTER.askJoke), hint: BANTER.askHint, ask: true }]; }

// nod / shake
function swings(vals, thr) {
  let n = 0, dir = 0, hi = vals[0], lo = vals[0];
  for (const v of vals) {
    if (dir === 0) { hi = Math.max(hi, v); lo = Math.min(lo, v); if (hi - v > thr) { dir = -1; n++; lo = v; } else if (v - lo > thr) { dir = 1; n++; hi = v; } }
    else if (dir === 1) { if (v > hi) hi = v; else if (hi - v > thr) { dir = -1; n++; lo = v; } }
    else { if (v < lo) lo = v; else if (v - lo > thr) { dir = 1; n++; hi = v; } }
  }
  return n;
}
function detectHeadGesture() {
  if (headLog.length < 6) return null;
  const y0 = headLog[0].y, P = headLog.map((h) => h.p), Y = headLog.map((h) => wrapAngle(h.y - y0));
  const range = (a) => Math.max(...a) - Math.min(...a);
  if (swings(P, 0.09) >= 2 && range(Y) < range(P) * 0.8) { headLog.length = 0; return 'nod'; }
  if (swings(Y, 0.12) >= 2 && range(P) < range(Y) * 0.8) { headLog.length = 0; return 'shake'; }
  return null;
}
const answerRow = $('answer');
function showAnswer(on) { if (answerRow) answerRow.style.display = on ? 'flex' : 'none'; }

/* ---------------- pokes ---------------- */
const pokeState = { cd: 0, times: [] };
function capsules() {
  const hips = wpos(gav.hips).add(new THREE.Vector3(0, 0.05, 0));
  const caps = [
    [hips, wpos(gav.spine2), 0.17, 'body'], [wpos(gav.spine2), wpos(gav.neck), 0.16, 'body'],
    [wpos(gav.head), wpos(gav.headTop), 0.12, 'head'],
  ];
  for (const f of gav.feet) {
    const leg = wpos(f.leg), foot = wpos(f.foot), toe = wpos(f.toe);
    caps.push([leg.clone().lerp(foot, 0.5), foot, 0.075, 'boots'], [foot, toe, 0.075, 'boots']);
  }
  return caps;
}
function poke(point, dir, region) {
  const t = simT;
  if (t < pokeState.cd) return;
  pokeState.cd = t + 0.45;
  if (talk.wait) { talk.answer(true); return; }
  if (region !== 'boots') { const d = V().set(dir.x, 0, dir.z); if (d.lengthSq() < 1e-6) d.set(0, 0, -1); gav.flAxis.crossVectors(UP, d.normalize()).normalize(); gav.flv += 9 * (region === 'head' ? 0.8 : 1.1); }
  sfx(region === 'boots' ? 'squeak' : 'boing', point);
  burst(point, 0xffffff, 6, 0.8, 0.35, 0.03);
  if (talk.active && gav.talkUntil > t) { talk.clear(); say(pick(BANTER.interrupted)); return; }
  pokeState.times = pokeState.times.filter((p) => t - p < 10); pokeState.times.push(t);
  if (pokeState.times.length >= 4) {
    pokeState.times = [];
    talk.clear(); say(BANTER.annoyed);
    playFor(/stomp/i, 3.6);
    return;
  }
  if (region === 'boots') { say(pick(BANTER.pokeBoots)); sparkleBoots(5); }
  else { say(pick(region === 'head' ? BANTER.pokeHead : BANTER.poke), { dur: 2.2 }); if (Math.random() < 0.5) hearts(2); }
}
function rayPoke(ray) {
  let best = null; const pr = V(), ps = V();
  for (const [a, b, r, region] of capsules()) {
    const d2 = ray.distanceSqToSegment(a, b, pr, ps);
    if (d2 < r * r * 1.4) { const dist = pr.distanceTo(ray.origin); if (!best || dist < best.dist) best = { dist, point: pr.clone(), region }; }
  }
  if (best) poke(best.point, ray.direction.clone(), best.region);
  return !!best;
}

/* ---------------- HTML controls (PC / phone preview) ---------------- */
function buildHtmlList() {
  const wrap = $('anims'); wrap.innerHTML = '';
  gav.actions.forEach((a, i) => { const b = document.createElement('button'); b.textContent = a.label; b.onclick = () => { actx.resume(); play(i); }; wrap.appendChild(b); });
}
document.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => { actx.resume(); command(b.dataset.cmd); }));

/* ---------------- floating XR menu ---------------- */
const panel = new THREE.Group(); panel.visible = false; scene.add(panel);
const buttons = [];
const BW = 0.096, BH = 0.04, GAP = 0.008, COLS = 4;
function makeButton(label, cmd, col, row, opts = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 108;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  const b = { mesh, label, cmd, canvas: c, tex, hot: false, hover: false, latch: false, cd: 0, col, row, ...opts };
  mesh.userData.btn = b; panel.add(mesh); buttons.push(b); return b;
}
function drawButton(b) {
  const g = b.canvas.getContext('2d'); g.clearRect(0, 0, 256, 108);
  const active = b.anim !== undefined && b.anim === gav.cur;
  g.fillStyle = b.hot ? '#ffd400' : active ? '#4a3f00' : b.hover ? '#3a3f45' : '#24282c';
  g.beginPath(); g.roundRect(4, 4, 248, 100, 22); g.fill();
  g.strokeStyle = active || b.hot ? '#ffd400' : b.ctrl ? '#8a9096' : '#50575e'; g.lineWidth = active ? 7 : 4; g.stroke();
  let size = 34; g.font = `700 ${size}px "Segoe UI", Roboto, sans-serif`;
  const text = typeof b.label === 'function' ? b.label() : b.label;
  while (g.measureText(text).width > 228 && size > 20) { size -= 2; g.font = `700 ${size}px "Segoe UI", Roboto, sans-serif`; }
  g.fillStyle = b.hot ? '#141618' : '#f3f0e8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 56);
  b.tex.needsUpdate = true;
}
function buildPanel() {
  const rowsA = Math.ceil(gav.actions.length / COLS);
  gav.actions.forEach((a, i) => makeButton(a.label, 'anim', i % COLS, Math.floor(i / COLS), { anim: i }));
  const r = rowsA + 0.35;
  const ctrl = [
    ['◀ Prev', 'prev'], ['Next ▶', 'next'], ['Chat', 'chat'], [() => (talk.wait ? 'Yes please!' : 'Tell a joke'), 'joke'],
    ['Boots!', 'boots'], ['Bring here', 'comehere'], ['Turn 45°', 'turn'], [() => 'Spot: ' + (gav.onSpot ? 'on' : 'off'), 'spot'],
    [() => 'Speed ' + gav.speed + '×', 'speed'], [() => (muted ? 'Sound: off' : 'Sound: on'), 'mute'], ['Hide menu', 'hide'], ['Exit', 'exit'],
  ];
  ctrl.forEach(([l, c], i) => makeButton(l, c, i % COLS, r + Math.floor(i / COLS), { ctrl: true }));
  const rows = r + Math.ceil(ctrl.length / COLS);
  const W = COLS * BW + (COLS - 1) * GAP, H = rows * BH + (rows - 1) * GAP;
  for (const b of buttons) b.mesh.position.set(-W / 2 + BW / 2 + b.col * (BW + GAP), H / 2 - BH / 2 - b.row * (BH + GAP), 0.003);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.03, H + 0.06), new THREE.MeshBasicMaterial({ color: 0x141618, transparent: true, opacity: 0.8 }));
  plate.position.y = 0.012; panel.add(plate);
  const tc = document.createElement('canvas'); tc.width = 512; tc.height = 64;
  const tg = tc.getContext('2d'); tg.fillStyle = '#ffd400'; tg.font = '700 40px "Segoe UI", Roboto, sans-serif'; tg.textBaseline = 'middle'; tg.fillText(NAME + ' — pick a move', 8, 34);
  const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace;
  const title = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.025), new THREE.MeshBasicMaterial({ map: tt, transparent: true }));
  title.position.set(-W / 2 + 0.1, H / 2 + 0.022, 0.003); panel.add(title);
  buttons.forEach(drawButton);
}
function refreshLabels() { buttons.forEach(drawButton); document.querySelectorAll('#anims button').forEach((b, i) => b.classList.toggle('on', i === gav.cur)); }
function pressButton(b) {
  const t = simT; if (t < b.cd) return; b.cd = t + 0.6;
  b.hot = true; drawButton(b); setTimeout(() => { b.hot = false; drawButton(b); }, 220);
  if (b.cmd === 'anim') play(b.anim); else command(b.cmd);
}
function placePanel(headW, yaw) {
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), left = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw));
  panel.position.copy(headW).addScaledVector(fwd, 0.42).addScaledVector(left, 0.3);
  panel.position.y = clamp(headW.y - 0.38, 0.75, 1.6);
  panel.lookAt(headW);
}

/* ---------------- commands ---------------- */
let needRecenter = false, currentSession = null;
function command(cmd) {
  if (cmd === 'next') play(gav.cur + 1);
  else if (cmd === 'prev') play(gav.cur - 1);
  else if (cmd === 'chat') talk.start(topicSteps());
  else if (cmd === 'joke') { if (!talk.answer(true)) talk.start(jokeSteps(true)); }
  else if (cmd === 'yes' || cmd === 'no') talk.answer(cmd === 'yes');
  else if (cmd === 'boots') { talk.clear(); say(pick(BANTER.showBoots)); sparkleBoots(10); hearts(4); playFor(/stomp/i, 3.6); }
  else if (cmd === 'turn') gav.yaw += Math.PI / 4;
  else if (cmd === 'spot') { gav.onSpot = !gav.onSpot; if (gav.onSpot) gav.root.position.copy(HOME); $('spotBtn').textContent = 'On the spot: ' + (gav.onSpot ? 'on' : 'off'); refreshLabels(); }
  else if (cmd === 'speed') { gav.speed = gav.speed === 1 ? 1.5 : gav.speed === 1.5 ? 0.5 : 1; gav.mixer.timeScale = gav.speed; $('speedBtn').textContent = 'Speed: ' + gav.speed + '×'; refreshLabels(); }
  else if (cmd === 'mute') { muted = !muted; if (muted && tts.ok) speechSynthesis.cancel(); $('muteBtn').textContent = muted ? 'Sound: off' : 'Sound: on'; refreshLabels(); }
  else if (cmd === 'comehere') { if (renderer.xr.isPresenting) needRecenter = true; else { gav.root.position.copy(HOME); gav.yaw = 0; } }
  else if (cmd === 'hide') panel.visible = false;
  else if (cmd === 'exit') currentSession?.end();
}
function recenter(headW, gazeW) {
  const yaw = Math.atan2(-gazeW.x, -gazeW.z);
  world.position.set(headW.x, 0, headW.z); world.rotation.y = yaw; world.updateMatrixWorld(true);
  gav.root.position.copy(HOME); gav.yaw = 0;
  placePanel(headW, yaw); panel.visible = true;
}

/* ---------------- XR input ---------------- */
const inputs = [0, 1].map((i) => {
  const ctrl = renderer.xr.getController(i), hand = renderer.xr.getHand(i);
  scene.add(ctrl); scene.add(hand);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.6 }));
  line.scale.z = 3; line.visible = false; ctrl.add(line);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd400 }));
  tip.visible = false; scene.add(tip);
  const inp = { i, ctrl, hand, line, tip, src: null, isHand: false, stickLatch: false, inside: {} };
  ctrl.addEventListener('connected', (e) => { inp.src = e.data; inp.isHand = !!e.data.hand; line.visible = true; });
  ctrl.addEventListener('disconnected', () => { inp.src = null; line.visible = false; tip.visible = false; });
  ctrl.addEventListener('select', () => rayPress(inp));
  ctrl.addEventListener('squeeze', () => { panel.visible = !panel.visible; });
  return inp;
});
const rc = new THREE.Raycaster();
function rayPress(inp) {
  rc.setFromXRController(inp.ctrl);
  if (panel.visible) { const hit = rc.intersectObjects(buttons.map((b) => b.mesh), false)[0]; if (hit) { pressButton(hit.object.userData.btn); return; } }
  rayPoke(rc.ray);   // point at Gav (or his boots) and pull the trigger / pinch = poke
}
// desktop: click to poke
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; actx.resume(); });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  rc.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  rayPoke(rc.ray);
});
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') play(gav.cur + 1); if (e.key === 'ArrowLeft') play(gav.cur - 1);
  if (e.key === 'y') talk.answer(true); if (e.key === 'n') talk.answer(false);
});

function xrInputFrame() {
  const hovered = new Set(), caps = capsules();
  for (const inp of inputs) {
    if (!inp.src) continue;
    const gp = inp.src.gamepad;
    if (gp && gp.axes.length >= 4) {
      const x = gp.axes[2];
      if (Math.abs(x) > 0.7 && !inp.stickLatch) { inp.stickLatch = true; play(gav.cur + (x > 0 ? 1 : -1)); }
      if (Math.abs(x) < 0.3) inp.stickLatch = false;
    }
    if (panel.visible) {
      rc.setFromXRController(inp.ctrl);
      const hit = rc.intersectObjects(buttons.map((b) => b.mesh), false)[0];
      if (hit) { hovered.add(hit.object.userData.btn); inp.line.scale.z = hit.distance; } else inp.line.scale.z = 3;
    }
    // fingertip (hands) or controller tip (controllers) — pokes and button presses
    let p = null;
    if (inp.isHand) {
      const tipJ = (inp.hand.joints || {})['index-finger-tip'];
      if (tipJ && tipJ.visible) { p = wpos(tipJ); inp.tip.position.copy(p); inp.tip.visible = true; } else inp.tip.visible = false;
    } else if (inp.ctrl.visible) p = wpos(inp.ctrl);
    if (!p) continue;
    if (inp.isHand && panel.visible) for (const b of buttons) {
      const lp = b.mesh.worldToLocal(p.clone());
      const inside = Math.abs(lp.x) < BW / 2 && Math.abs(lp.y) < BH / 2 && lp.z < 0.012 && lp.z > -0.04;
      if (inside && !b.latch) { b.latch = true; pressButton(b); }
      if (!inside && (lp.z > 0.02 || Math.abs(lp.x) > BW / 2 + 0.005 || Math.abs(lp.y) > BH / 2 + 0.005)) b.latch = false;
      if (Math.abs(lp.x) < BW / 2 && Math.abs(lp.y) < BH / 2 && lp.z < 0.05 && lp.z > -0.04) hovered.add(b);
    }
    let hitRegion = null;
    for (const [a, b, r, region] of caps) if (new THREE.Line3(a, b).closestPointToPoint(p, true, V()).distanceTo(p) < r) { hitRegion = region; break; }
    if (hitRegion && !inp.inside.r) poke(p.clone(), V().subVectors(wpos(gav.hips), p), hitRegion);
    inp.inside.r = hitRegion;
  }
  for (const b of buttons) { const h = hovered.has(b); if (h !== b.hover) { b.hover = h; drawButton(b); } }
}

/* ---------------- awareness: greet, stare, boot-gazing, too close ---------------- */
const aware = { greeted: false, greetCD: 0, closeCD: 0, stareT: 0, stareCD: 12, bootT: 0, bootCD: 8 };
function awareness(dt, t, headW, gazeW, dUser) {
  if (talk.active || bubble.until > t) { aware.stareT = aware.bootT = 0; return; }
  if (!aware.greeted && dUser < 2.6 && t > aware.greetCD) { aware.greeted = true; aware.greetCD = t + 20; aware.stareCD = Math.max(aware.stareCD, t + 8); say(pick(BANTER.greet)); hearts(4); return; }
  if (dUser > 3.6) aware.greeted = false;
  if (dUser < 0.75 && t > aware.closeCD) { aware.closeCD = t + 10; say(pick(BANTER.close)); hearts(3); return; }
  // looking at his boots?
  const mid = wpos(gav.feet[0].toe).lerp(wpos(gav.feet[1].toe), 0.5).add(new THREE.Vector3(0, 0.08, 0));
  const toBoots = mid.clone().sub(headW), along = toBoots.dot(gazeW);
  const missB = along > 0 ? toBoots.clone().sub(gazeW.clone().multiplyScalar(along)).length() : 9;
  aware.bootT = missB < 0.3 && dUser < 4 ? aware.bootT + dt : 0;
  if (aware.bootT > 1.4 && t > aware.bootCD) { aware.bootCD = t + 18; aware.bootT = 0; say(pick(BANTER.lookBoots)); sparkleBoots(6); hearts(3); return; }
  // staring at his face?
  const toHead = wpos(gav.head).sub(headW).normalize();
  aware.stareT = toHead.dot(gazeW) > 0.975 && dUser < 3.5 ? aware.stareT + dt : 0;
  if (aware.stareT > 3.2 && t > aware.stareCD && t > talk.quietUntil) { aware.stareCD = t + 25; aware.stareT = 0; say(pick(BANTER.stare)); hearts(5); }
}
function autoChat(t, dUser) {
  if (talk.active || t < talk.autoAt || gav.temp) return;
  if (dUser > 4.5 || bubble.until > t) { talk.autoAt = t + 3; return; }
  talk.start(t > talk.offerCD && Math.random() < 0.4 ? askSteps() : topicSteps());
}

/* ---------------- procedural layers on top of the animation ---------------- */
function aim(bone, fwdLocal, amount) {
  const eye = wpos(gav.head).lerp(wpos(gav.headTop), 0.45);
  const rootQ = gav.root.getWorldQuaternion(new THREE.Quaternion()), inv = rootQ.clone().invert();
  const cur = fwdLocal.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(inv).normalize();
  const want = gav.lookPoint.clone().sub(eye).normalize().applyQuaternion(inv);
  const wy = clamp(Math.atan2(want.x, want.z), -1.1, 1.1), wp = clamp(Math.asin(clamp(want.y, -1, 1)), -0.45, 0.3);
  const cy = Math.atan2(cur.x, cur.z), cp = Math.asin(clamp(cur.y, -1, 1));
  const side = new THREE.Vector3(Math.cos(cy), 0, -Math.sin(cy));
  const q = new THREE.Quaternion().setFromAxisAngle(UP, wrapAngle(wy - cy) * amount).multiply(new THREE.Quaternion().setFromAxisAngle(side, -(wp - cp) * amount));
  rotateWorld(bone, rootQ.clone().multiply(q).multiply(inv));
}
function procedural(dt, t, headW, dUser) {
  // flinch spring
  gav.flv += (-150 * gav.fl - 11 * gav.flv) * dt; gav.fl += gav.flv * dt;
  if (Math.abs(gav.fl) > 0.002) {
    rotateWorld(gav.spine1, new THREE.Quaternion().setFromAxisAngle(gav.flAxis, gav.fl * 0.16));
    rotateWorld(gav.spine2, new THREE.Quaternion().setFromAxisAngle(gav.flAxis, gav.fl * 0.12));
  }
  // look at you (not while lying down, flipping, sitting…)
  const a = gav.actions[gav.cur];
  const lookOk = a && !NO_LOOK.test(a.name) && dUser < 5;
  gav.lookPoint.lerp(headW, damp(7, dt));
  gav.lookW += ((lookOk ? 1 : 0) - gav.lookW) * damp(4, dt);
  if (gav.lookW > 0.01) { aim(gav.neck, gav.neckFwd, 0.4 * gav.lookW); aim(gav.head, gav.headFwd, 0.85 * gav.lookW); }
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(gav.root.getWorldQuaternion(new THREE.Quaternion()));
  if (t < gav.talkUntil) {
    const k = Math.min(1, (gav.talkUntil - t) * 3);
    rotateWorld(gav.head, new THREE.Quaternion().setFromAxisAngle(right, k * (Math.sin(t * 8.5) * 0.035 + Math.sin(t * 3.3) * 0.03)));
  }
  if (t < gav.laughUntil) {
    const k = Math.min(1, (gav.laughUntil - t) * 1.5);
    rotateWorld(gav.spine1, new THREE.Quaternion().setFromAxisAngle(right, k * (0.06 + Math.abs(Math.sin(t * 15)) * 0.07)));
    rotateWorld(gav.head, new THREE.Quaternion().setFromAxisAngle(right, -k * 0.12));
  }
}
// boot clomps: a thud and a puff of dust whenever a boot hits the floor
function footsteps(dt, t) {
  for (const f of gav.feet) {
    const p = wpos(f.toe), y = p.y - world.position.y, ya = wpos(f.foot).y - world.position.y;
    const h = Math.min(y - f.restToe, ya - f.restAnk);          // height above "planted"
    const vy = (h - f.prevY) / Math.max(dt, 1e-3);
    f.prevY = h;
    if (!f.down && h < 0.03 && t > f.cd) {          // boot was lifted and has come back down
      f.down = true; f.cd = t + 0.18; gav.steps = (gav.steps || 0) + 1;
      const vol = clamp(0.3 - vy / 2.5, 0.3, 1);
      sfx('clomp', p, vol);
      if (vol > 0.35) burst(p.setY(world.position.y + 0.02), 0xb8aa96, Math.round(4 + vol * 6), 0.5 + vol * 0.6, 0.6, 0.04, { gravity: -0.4, additive: false, up: 0.4 });
    }
    if (h > 0.06) f.down = false;
  }
}

/* ---------------- main loop ---------------- */
const clock = new THREE.Clock();
const headW = V(), gazeW = V();
let ready = false;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); simT += dt; const t = simT;
  const presenting = renderer.xr.isPresenting;
  if (!presenting) controls.update();
  const cam = presenting ? renderer.xr.getCamera() : camera;
  cam.getWorldPosition(headW); cam.getWorldDirection(gazeW);
  if (ready) {
    if (presenting && needRecenter && headW.y > 0.4) { needRecenter = false; recenter(headW, gazeW); }
    if (presenting) xrInputFrame();
    if (gav.heartsEvery && t > (gav.nextHearts || 0)) { gav.nextHearts = t + gav.heartsEvery; hearts(3); }
    if (gav.temp && t > gav.temp.until) { const back = gav.temp.back; gav.temp = null; play(back, { quiet: true }); }
    const me = world.worldToLocal(headW.clone()); me.y = 0;
    const p = gav.root.position, dUser = Math.hypot(me.x - p.x, me.z - p.z);
    const a = gav.actions[gav.cur];
    if (!gav.onSpot && a && a.travels && !gav.temp) {
      const off = p.clone().sub(HOME); off.y = 0;
      const toMe = me.clone().sub(p); toMe.y = 0;
      const heading = gav.yaw + Math.atan2(a.vel.x, a.vel.z);
      let steer = null;
      if (toMe.length() < 1.3 && Math.cos(Math.atan2(toMe.x, toMe.z) - heading) > 0.2) steer = Math.atan2(-toMe.x, -toMe.z);
      else if (off.length() > ROAM_RADIUS * 0.75) steer = Math.atan2(-off.x, -off.z);
      if (steer !== null) gav.yaw += clamp(wrapAngle(steer - heading), -2.2 * dt, 2.2 * dt);
      p.add(a.vel.clone().applyAxisAngle(UP, gav.yaw).multiplyScalar(dt * gav.speed));
    }
    gav.root.rotation.y = gav.yaw;
    gav.mixer.update(dt);
    gav.root.updateMatrixWorld(true);
    procedural(dt, t, headW, dUser);
    footsteps(dt, t);
    headLog.push({ t, p: Math.asin(clamp(gazeW.y, -1, 1)), y: Math.atan2(gazeW.x, gazeW.z) });
    while (headLog.length && t - headLog[0].t > 1.6) headLog.shift();
    talk.update(t);
    awareness(dt, t, headW, gazeW, dUser);
    autoChat(t, dUser);
    const hp = world.worldToLocal(wpos(gav.hips));
    shadow.position.set(hp.x, 0.004, hp.z);
    const lift = clamp(hp.y - gav.height * 0.53, 0, 1);
    shadow.material.opacity = clamp(0.9 - lift * 1.5, 0.15, 0.9); shadow.scale.setScalar(1 + lift * 0.6);
    bubble.update(dt, t, wpos(gav.headTop).add(new THREE.Vector3(0, 0.16, 0)));
  }
  updateParticles(dt);
  renderer.render(scene, camera);
});

/* ---------------- XR session ---------------- */
async function startXR(mode) {
  try {
    await actx.resume();
    const s = await navigator.xr.requestSession(mode, { optionalFeatures: ['local-floor', 'hand-tracking'] });
    const ar = mode === 'immersive-ar';
    scene.background = ar ? null : VR_BG; floor.visible = grid.visible = !ar;
    await renderer.xr.setSession(s); currentSession = s;
    needRecenter = true; aware.greeted = false;
    s.addEventListener('end', () => {
      currentSession = null; scene.background = DESK_BG; floor.visible = grid.visible = true; panel.visible = false;
      world.position.set(0, 0, 0); world.rotation.set(0, 0, 0); gav.root.position.copy(HOME); gav.yaw = 0;
    });
  } catch (e) { setStatus('Could not start: ' + e.message); }
}
$('btnAR').onclick = () => startXR('immersive-ar');
$('btnVR').onclick = () => startXR('immersive-vr');
if (navigator.xr) {
  Promise.all([navigator.xr.isSessionSupported('immersive-ar'), navigator.xr.isSessionSupported('immersive-vr')]).then(([ar, vr]) => {
    $('btnAR').disabled = !ar; $('btnVR').disabled = !vr;
    if (!ar && !vr) setStatus(isSecureContext ? 'Preview mode — open this page in the Quest browser to step in.' : 'Needs an https:// link to enter VR — see README.');
  });
} else setStatus(isSecureContext ? 'Preview mode — open this page in the Quest browser to step in.' : 'Needs an https:// link to enter VR — see README.');

/* ---------------- load ---------------- */
new GLTFLoader().loadAsync(MODEL).then((gltf) => {
  setupModel(gltf); buildHtmlList(); buildPanel();
  const start = gav.actions.findIndex((a) => /idle|look_around|breath/i.test(a.name));
  play(start >= 0 ? start : 0, { quiet: true });
  ready = true; $('loading').remove();
}).catch((e) => { $('loading').textContent = 'Could not load ' + NAME + ': ' + (e.message || e); console.error(e); });

if (TEST) window.APP = {
  gav, play, command, hearts, particles: () => particles.length, camera, controls, panel, buttons, THREE, talk, BANTER, capsules, poke, get t() { return simT; }, get ready() { return ready; },
  showPanel() { placePanel(new THREE.Vector3(0, 1.6, 0), 0); panel.visible = true; },
  setCam(p, tg) { camera.position.set(...p); controls.target.set(...tg); controls.update(); },
  pokeRegion(region) { const c = capsules().find((x) => x[3] === region); poke(c[1].clone(), new THREE.Vector3(0, 0, -1), region); },
};
