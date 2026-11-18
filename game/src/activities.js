// Repeatable side work for Solstice Bay: taxi fares (T), courier runs (C),
// checkpoint sprints (R), vigilante stops (V) and cache runs (B) — Vera's
// nephew stashes supply caches around the bay; sweep all four against the
// clock, each cache buying back time. Started with hotkeys near the player,
// paid in cash, tracked in G.stats for the save file.
import { ROAD_XS, ROAD_YS, dist, clamp } from './config.js';
import { createCar } from './vehicles.js';
import { addHeat } from './police.js';

const SPOTS = [
  [950, 920], [3020, 920], [4400, 1580], [1640, 2900], [3710, 2900], [950, 2240],
  [3020, 2900], [4400, 700], [260, 1580], [5140, 2240], [2330, 600], [3710, 1300],
];
function randomSpot(G, far) {
  const rand = G.rand;
  let s = SPOTS[Math.floor(rand() * SPOTS.length)];
  for (let i = 0; i < 8 && far && dist(G.player.x, G.player.y, s[0], s[1]) < 900; i++) s = SPOTS[Math.floor(rand() * SPOTS.length)];
  return { x: s[0] + (rand() - 0.5) * 90, y: s[1] + (rand() - 0.5) * 90 };
}

export function startActivity(G, kind) {
  if (G.activity || G.mission) { G.flashMessage('Finish your current job first.', '#ffd28a'); return; }
  const dest = randomSpot(G, true);
  if (kind === 'taxi') {
    if (!G.player.car) { G.flashMessage('Taxi work needs a car. Grab any ride, then press T.', '#ffd28a'); return; }
    const pick = randomSpot(G, false);
    G.activity = { kind, phase: 'pickup', time: 0, objective: { x: pick.x, y: pick.y, label: 'Taxi: pick up your passenger', mission: false }, dest };
    G.flashMessage('Taxi fare started — pick up the passenger.', '#aee2ff');
  } else if (kind === 'courier') {
    G.activity = { kind, phase: 'deliver', time: 75, objective: { x: dest.x, y: dest.y, label: 'Courier: deliver the parcel before time runs out', mission: false }, dest };
    G.flashMessage('Courier run — 75 seconds. Go!', '#aee2ff');
  } else if (kind === 'race') {
    const gates = [];
    let cur = { x: G.player.x, y: G.player.y };
    for (let i = 0; i < 5; i++) { const s = randomSpot(G, true); gates.push(s); cur = s; void cur; }
    G.activity = { kind, phase: 'run', time: 120, gates, gate: 0, objective: { x: gates[0].x, y: gates[0].y, label: 'Checkpoint sprint: gate 1 of 5', mission: false } };
    G.flashMessage('Checkpoint sprint — hit all 5 gates in 2:00!', '#aee2ff');
  } else if (kind === 'cache') {
    const caches = [];
    for (let i = 0; i < 4; i++) caches.push(randomSpot(G, true));
    G.activity = { kind, phase: 'sweep', time: 150, caches, cache: 0, objective: { x: caches[0].x, y: caches[0].y, label: 'Cache run: cache 1 of 4', mission: false } };
    G.flashMessage('Cache run — sweep all 4 caches. Each one buys +20s!', '#aee2ff');
  } else if (kind === 'vigilante') {
    const spot = randomSpot(G, true);
    const car = createCar(spot.x, spot.y, G.rand() * 6.28, 'sports', '#c0392b');
    car.isFelon = true; car.speed = 120; car.cruise = 200;
    car.ai = { axis: 'x', line: ROAD_YS[2], dir: 1 };
    G.traffic.push(car);
    G.activity = { kind, phase: 'stop', time: 90, felon: car, objective: { x: spot.x, y: spot.y, label: 'Vigilante: stop the red Vyper (ram it or block it)', mission: false } };
    G.flashMessage('Vigilante: a stolen red Vyper is loose. Stop it!', '#ffb3b3');
  }
  G.audio.ui();
}

function pay(G, amount, label, statKey) {
  G.player.money += amount;
  G.stats[statKey]++;
  G.flashMessage(`${label} +$${amount}`, '#7CFC98');
  G.audio.cash();
  G.activity = null;
  G.save();
}

export function updateActivities(G, dt) {
  const a = G.activity;
  if (!a) return;
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  if (a.time > 0 && a.kind !== 'taxi') {
    a.time -= dt;
    if (a.time <= 0) { G.flashMessage('Job failed — out of time.', '#ff8080'); G.activity = null; return; }
  }
  if (a.kind === 'taxi') {
    if (a.phase === 'pickup' && dist(px, py, a.objective.x, a.objective.y) < 70 && G.player.car) {
      a.phase = 'dropoff'; a.objective = { x: a.dest.x, y: a.dest.y, label: 'Taxi: drop your passenger off', mission: false };
      G.audio.pickup(); G.flashMessage('Passenger in. Drive smooth for a tip!', '#aee2ff');
    } else if (a.phase === 'dropoff' && dist(px, py, a.dest.x, a.dest.y) < 74 && G.player.car) {
      const rough = G.player.car.hp < G.player.car.maxHp * 0.6;
      pay(G, rough ? 90 : 150, rough ? 'Taxi fare (rough ride, small tip).' : 'Taxi fare + smooth-driving tip!', 'taxi');
    }
  } else if (a.kind === 'courier') {
    if (dist(px, py, a.dest.x, a.dest.y) < 74) pay(G, 130 + Math.ceil(a.time) * 2, 'Courier delivered!', 'courier');
  } else if (a.kind === 'race') {
    const gate = a.gates[a.gate];
    a.objective.x = gate.x; a.objective.y = gate.y;
    a.objective.label = `Checkpoint sprint: gate ${a.gate + 1} of 5 — ${Math.ceil(a.time)}s left`;
    if (dist(px, py, gate.x, gate.y) < 92) {
      a.gate++; G.audio.pickup();
      if (a.gate >= a.gates.length) { pay(G, 300, 'Sprint won! Clean lines, fast hands.', 'races'); }
    }
  } else if (a.kind === 'cache') {
    const spot = a.caches[a.cache];
    a.objective.x = spot.x; a.objective.y = spot.y;
    a.objective.label = `Cache run: cache ${a.cache + 1} of 4 — ${Math.ceil(a.time)}s left`;
    if (dist(px, py, spot.x, spot.y) < 80) {
      a.cache++; G.audio.pickup();
      if (a.cache >= a.caches.length) { pay(G, 240 + Math.ceil(a.time) * 2, 'Cache run complete! Every stash swept.', 'caches'); return; }
      a.time += 20;
      G.flashMessage(`Cache ${a.cache} of 4 secured — +20s. Keep moving!`, '#7CFC98');
    }
  } else if (a.kind === 'vigilante') {
    a.objective.x = a.felon.x; a.objective.y = a.felon.y;
    if (a.felon.hp <= 25 || Math.abs(a.felon.speed) < 8 && dist(px, py, a.felon.x, a.felon.y) < 130) {
      addHeat(G, 6, px, py);
      pay(G, 260, 'Vigilante: felon stopped. The bay thanks you.', 'vigilante');
    }
  }
  void clamp; void ROAD_XS;
}
