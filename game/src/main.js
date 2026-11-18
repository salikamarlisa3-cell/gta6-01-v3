// SOLSTICE BAY — boot and game loop. Assembles the city, player, traffic, peds,
// police, missions and activities into one state object, then runs a fixed-step
// simulation with a smooth follow camera. Screens: title, play, pause, busted,
// wasted. ?scene=cover|drive|chase|mission&seed=7 stages a screenshot scene.
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, clamp, districtAt, PLAYER_START, HOSPITAL, POLICE_HQ } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createInput, ACT_PAUSE, ACT_INTERACT } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { spawnPolice, updatePolice } from './police.js';
import { updateCombat } from './combat.js';
import { updateMissions, tryStartMission, currentObjective } from './missions.js';
import { startActivity, updateActivities } from './activities.js';
import { drawWorld, drawScreenOverlay } from './render.js';
import { drawHUD } from './hud.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { setupScene, sceneStep } from './shots.js';

const params = new URLSearchParams(window.location.search);
const sceneName = params.get('scene');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize() {
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize); resize();

const saved = loadGame();
const G = {
  rand: createRandom(seed * 1000 + 17),
  time: 0, timeOfDay: 0.42, screen: sceneName ? 'play' : 'title',
  heat: 0, seenT: 99, lastSeen: null, lastCrime: null, bustT: 0, gunfireT: 0,
  mission: null, missionIndex: saved?.missionIndex ?? 0, activity: null,
  stats: { taxi: saved?.taxiDone ?? 0, courier: saved?.courierDone ?? 0, races: saved?.racesWon ?? 0, vigilante: 0, caches: 0 },
  tracers: [], particles: [], policeCars: [], cops: [], roadblocks: [], traffic: [], parked: [], peds: [],
  camera: { x: 0, y: 0 }, shake: 0, message: '', messageT: 0, messageColor: '#fff',
  dialogue: null, objectiveCache: null, districtName: '', hasSave: !!saved,
  spawnCd: 0, roadblockCd: 0, nearestCopDist: 99999, sceneName, sceneCar: null,
};
G.world = createWorld(createRandom(seed));
G.audio = createAudio();
G.input = createInput(canvas);
G.player = createPlayer(sceneName ? null : saved);
spawnTraffic(G); spawnPeds(G); spawnPolice(G);
G.camera.x = clamp(G.player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
G.camera.y = clamp(G.player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);

G.flashMessage = (text, color) => { G.message = text; G.messageColor = color || '#fff'; G.messageT = 3.4; };
G.showDialogue = (lines) => { G.dialogue = { lines, idx: 0 }; };
G.save = () => saveGame(G);
G.busted = () => {
  G.screen = 'busted'; G.heat = 0; G.bustT = 0;
  G.player.money = Math.max(0, G.player.money - 150);
  if (G.player.car) { G.player.car = null; }
  G.policeCars = []; G.roadblocks = [];
};
G.wasted = () => {
  G.screen = 'wasted'; G.heat = 0;
  G.player.money = Math.max(0, G.player.money - 120);
  G.player.car = null; G.policeCars = []; G.roadblocks = [];
};
window.__game = G;

function respawn(at) {
  G.player.x = at.x + 60; G.player.y = at.y + 130;
  G.player.health = 100; G.player.armor = 0;
  G.screen = 'play'; G.save();
}

function keyPressed(code) { return G.input.wasPressed(code); }

function step(dt) {
  G.time += dt;
  if (G.messageT > 0) G.messageT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 16);
  const actions = G.input.peekActions();

  if (G.screen === 'title') {
    if (keyPressed('Enter')) {
      G.audio.unlock();
      if (!(G.hasSave && G.input.keys.has('ShiftLeft'))) { /* enter = new or continue below */ }
      startRun(false);
    } else if (keyPressed('KeyC') && G.hasSave) { G.audio.unlock(); startRun(true); }
    updateTraffic(G, dt); updatePeds(G, dt);
    return;
  }
  if (G.screen === 'busted' || G.screen === 'wasted') {
    if (keyPressed('Enter')) respawn(G.screen === 'busted' ? POLICE_HQ : HOSPITAL);
    return;
  }
  if (actions & ACT_PAUSE) {
    G.input.takeActions();
    G.screen = G.screen === 'pause' ? 'play' : 'pause';
    G.audio.ui();
    return;
  }
  if (G.screen === 'pause') return;

  // Dialogue freezes the street while people talk; E advances.
  if (G.dialogue) {
    if (actions & ACT_INTERACT) {
      G.input.takeActions();
      G.dialogue.idx++;
      G.audio.ui();
      if (G.dialogue.idx >= G.dialogue.lines.length) G.dialogue = null;
    }
    return;
  }
  if ((actions & ACT_INTERACT) && tryStartMission(G)) { G.input.takeActions(); return; }

  if (sceneName) sceneStep(G, dt);
  G.timeOfDay = (G.timeOfDay + dt / 300) % 1;
  updatePlayer(G, dt);
  updateCombat(G, dt);
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateMissions(G, dt);
  updateActivities(G, dt);
  if (keyPressed('KeyT')) startActivity(G, 'taxi');
  if (keyPressed('KeyC')) startActivity(G, 'courier');
  if (keyPressed('KeyR')) startActivity(G, 'race');
  if (keyPressed('KeyV')) startActivity(G, 'vigilante');
  if (keyPressed('KeyB')) startActivity(G, 'cache');
  if (keyPressed('KeyM')) G.flashMessage(G.audio.toggleMute() ? 'Sound off' : 'Sound on', '#aee2ff');
  // District banner.
  const dName = districtAt(G.player.x, G.player.y).name;
  if (dName !== G.districtName) {
    if (G.districtName) G.flashMessage('— ' + dName + ' —', '#ffe9a0');
    G.districtName = dName;
  }
  G.objectiveCache = currentObjective(G);
  // Camera follows the player (or their car) with a soft lead.
  const tx = (G.player.car ? G.player.car.x : G.player.x) - VIEW_W / 2;
  const ty = (G.player.car ? G.player.car.y : G.player.y) - VIEW_H / 2;
  G.camera.x += (clamp(tx, 0, WORLD_W - VIEW_W) - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (clamp(ty, 0, WORLD_H - VIEW_H) - G.camera.y) * Math.min(1, dt * 5);
  const sirenNear = G.policeCars.length > 0 && G.nearestCopDist < 620;
  G.audio.update(dt, G.player.car ? G.player.car.speed : null, sirenNear);
}

function startRun(keepSave) {
  if (!keepSave && G.hasSave) { /* Enter starts fresh from mission progress but keeps cash? No: fresh run. */ }
  if (!keepSave) {
    clearSave();
    G.missionIndex = 0;
    G.player = createPlayer(null);
    G.player.x = PLAYER_START.x; G.player.y = PLAYER_START.y;
    G.stats = { taxi: 0, courier: 0, races: 0, vigilante: 0, caches: 0 };
    G.hasSave = false;
  }
  G.screen = 'play';
  G.flashMessage("Welcome to Solstice Bay. Gold marker: Auntie Vera's diner.", '#ffe9a0');
}

function draw() {
  // Scale the 1280x720 logical view to the window, letterboxed.
  const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#160a24'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, (canvas.width - VIEW_W * scale) / 2, (canvas.height - VIEW_H * scale) / 2);
  // Mouse coords are in canvas pixels; convert input aim to logical space in player via camera in update:
  drawWorld(ctx, G);
  if (G.screen !== 'title') drawHUD(ctx, G);
  drawScreenOverlay(ctx, G);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// Convert mouse position to logical 1280x720 coordinates every frame for aiming.
function syncMouseLogical() {
  const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
  const ox = (canvas.width - VIEW_W * scale) / 2, oy = (canvas.height - VIEW_H * scale) / 2;
  G.input.mouse.x = (G.input.mouse.sx * (canvas.width / Math.max(1, canvas.clientWidth)) - ox) / scale;
  G.input.mouse.y = (G.input.mouse.sy * (canvas.height / Math.max(1, canvas.clientHeight)) - oy) / scale;
}

if (sceneName) setupScene(G, sceneName);

let last = performance.now(), acc = 0, sceneTimer = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  let elapsed = Math.min(0.25, (now - last) / 1000); last = now;
  acc += elapsed;
  syncMouseLogical();
  while (acc >= STEP) { step(STEP); acc -= STEP; if (sceneName) sceneTimer += STEP; }
  G.input.clearPressed();
  draw();
  if (sceneName && sceneTimer > 2.6 && !window.__shotReady) window.__shotReady = true;
}
requestAnimationFrame(frame);
