// Rendering for Solstice Bay: ground, beach and bay, roads with lane paint,
// buildings with lit windows at night, props, landmarks, cars, peds, the player,
// tracers and particles — plus the day-night grade, streetlight pools, headlight
// cones and the title / pause / busted / wasted screens.
import { WORLD_W, WORLD_H, ROAD_XS, ROAD_YS, ROAD_HALF, LANDMARKS, VIEW_W, VIEW_H, districtAt } from './config.js';
import { starsForHeat } from './police.js';

export function dayFactor(G) {
  // timeOfDay 0..1 (0 = midnight). Daylight peaks at 0.5.
  const s = Math.sin((G.timeOfDay - 0.25) * Math.PI * 2);
  return Math.max(0, Math.min(1, s * 1.4 + 0.25));
}

export function drawWorld(ctx, G) {
  const cam = G.camera;
  const day = dayFactor(G);
  ctx.save();
  ctx.translate(-cam.x + (G.shake ? (G.rand() - 0.5) * G.shake : 0), -cam.y + (G.shake ? (G.rand() - 0.5) * G.shake : 0));
  const vx0 = cam.x - 40, vy0 = cam.y - 40, vx1 = cam.x + VIEW_W + 40, vy1 = cam.y + VIEW_H + 40;

  // Ground by district (drawn as coarse tiles for speed).
  for (let gx = Math.floor(vx0 / 450) * 450; gx < vx1; gx += 450) {
    for (let gy = Math.floor(vy0 / 450) * 450; gy < vy1; gy += 450) {
      ctx.fillStyle = districtAt(gx + 225, gy + 225).ground;
      ctx.fillRect(gx, gy, 452, 452);
    }
  }
  // Bay + beach along the north edge.
  ctx.fillStyle = '#2e7fb8'; ctx.fillRect(vx0, 0, vx1 - vx0, 96);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = Math.floor(vx0 / 90) * 90; x < vx1; x += 90) ctx.fillRect(x + ((G.time * 22) % 30), 30 + (x % 50), 34, 3);
  ctx.fillStyle = '#e8d5a3'; ctx.fillRect(vx0, 96, vx1 - vx0, 26);

  // Roads.
  ctx.fillStyle = '#3c4148';
  for (const rx of ROAD_XS) ctx.fillRect(rx - ROAD_HALF, vy0, ROAD_HALF * 2, vy1 - vy0);
  for (const ry of ROAD_YS) ctx.fillRect(vx0, ry - ROAD_HALF, vx1 - vx0, ROAD_HALF * 2);
  ctx.strokeStyle = 'rgba(245,213,110,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([26, 22]);
  ctx.beginPath();
  for (const rx of ROAD_XS) { ctx.moveTo(rx, vy0); ctx.lineTo(rx, vy1); }
  for (const ry of ROAD_YS) { ctx.moveTo(vx0, ry); ctx.lineTo(vx1, ry); }
  ctx.stroke(); ctx.setLineDash([]);
  // Sidewalk rims.
  ctx.strokeStyle = '#9a917e'; ctx.lineWidth = 5;
  ctx.beginPath();
  for (const rx of ROAD_XS) { ctx.moveTo(rx - ROAD_HALF, vy0); ctx.lineTo(rx - ROAD_HALF, vy1); ctx.moveTo(rx + ROAD_HALF, vy0); ctx.lineTo(rx + ROAD_HALF, vy1); }
  ctx.stroke();

  // Objective marker column.
  const obj = G.objectiveCache;
  if (obj) {
    ctx.fillStyle = 'rgba(255,217,74,0.3)';
    ctx.fillRect(obj.x - 26, Math.max(0, obj.y - 900), 52, 900);
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(obj.x, obj.y, 24 + Math.sin(G.time * 4) * 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a5b00'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', obj.x, obj.y + 8);
  }

  // Buildings.
  for (const b of G.world.buildings) {
    if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
    if (b.roof === 'trim') { ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, 7); }
    // Windows: lit warm at night.
    const lit = 1 - day;
    ctx.fillStyle = lit > 0.45 ? 'rgba(255,214,120,0.85)' : 'rgba(180,220,255,0.28)';
    const cols = Math.max(1, Math.floor(b.w / 26)), rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if (((i * 7 + j * 13 + b.floors) % 5) < (lit > 0.45 ? 3 : 5)) ctx.fillRect(b.x + 8 + i * 26, b.y + 8 + j * 26, 11, 8);
    }
  }
  // Props.
  for (const pr of G.world.props) {
    if (pr.x < vx0 || pr.x > vx1 || pr.y < vy0 || pr.y > vy1) continue;
    if (pr.kind === 'palm') {
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + 3, pr.y - 16); ctx.stroke();
      ctx.strokeStyle = '#3f9e4d'; ctx.lineWidth = 3;
      for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28; ctx.beginPath(); ctx.moveTo(pr.x + 3, pr.y - 16); ctx.lineTo(pr.x + 3 + Math.cos(a) * 15, pr.y - 16 + Math.sin(a) * 7 - 3); ctx.stroke(); }
    } else if (pr.kind === 'lamp') {
      ctx.fillStyle = '#555c66'; ctx.fillRect(pr.x - 2, pr.y - 4, 4, 12);
      if (day < 0.55) { ctx.fillStyle = 'rgba(255,220,130,0.16)'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 44, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe1a0'; ctx.beginPath(); ctx.arc(pr.x, pr.y - 5, 4, 0, 7); ctx.fill(); }
    } else { ctx.fillStyle = '#8a6a44'; ctx.fillRect(pr.x - 12, pr.y - 3, 24, 6); }
  }
  // Landmarks.
  for (const lm of LANDMARKS) {
    if (lm.x < vx0 - 90 || lm.x > vx1 + 90 || lm.y < vy0 - 90 || lm.y > vy1 + 90) continue;
    ctx.save(); ctx.translate(lm.x, lm.y);
    if (lm.kind === 'lighthouse') {
      ctx.fillStyle = '#f2f2f2'; ctx.fillRect(-11, -46, 22, 62);
      ctx.fillStyle = '#e5484d'; ctx.fillRect(-11, -30, 22, 10); ctx.fillRect(-13, -52, 26, 8);
      if (day < 0.6) { ctx.fillStyle = 'rgba(255,240,170,0.25)'; ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(120, -70); ctx.lineTo(120, -26); ctx.closePath(); ctx.fill(); }
    } else if (lm.kind === 'wheel') {
      ctx.strokeStyle = '#e8e8f2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -26, 42, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(-16, 44); ctx.moveTo(0, 16); ctx.lineTo(16, 44); ctx.stroke();
      ctx.fillStyle = '#fd79a8'; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28 + G.time * 0.15; ctx.fillRect(Math.cos(a) * 42 - 4, -26 + Math.sin(a) * 42 - 4, 8, 8); }
    } else if (lm.kind === 'tower') {
      ctx.fillStyle = '#6e7f9e'; ctx.fillRect(-8, -70, 16, 86); ctx.fillStyle = '#ffd94a'; ctx.beginPath(); ctx.arc(0, -74, 7, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = '#8a7a5e'; ctx.fillRect(-30, -18, 60, 36); ctx.fillStyle = '#6e5f45'; ctx.fillRect(-34, -24, 68, 8);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(lm.name, 0, 34);
    ctx.restore();
  }

  drawCars(ctx, G, vx0, vy0, vx1, vy1, day);
  // Peds.
  for (const p of G.peds) {
    if (p.x < vx0 || p.x > vx1 || p.y < vy0 || p.y > vy1) continue;
    drawPerson(ctx, p.x, p.y, p.angle, p.color, p.skin, p.walkPhase, p.hp <= 0);
  }
  // Player (when on foot).
  if (!G.player.car) drawPerson(ctx, G.player.x, G.player.y, G.player.angle, '#ff4757', '#c98d5e', G.player.walkPhase, false, true);
  // Tracers + particles.
  ctx.strokeStyle = 'rgba(255,233,160,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const t of G.tracers) { ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); }
  ctx.stroke();
  for (const q of G.particles) { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }

  ctx.restore();

  // Night grade + headlight cones (screen space overlay is faked in world space above restore: cheap vignette).
  if (day < 0.85) {
    ctx.fillStyle = `rgba(8,10,38,${(0.85 - day) * 0.42})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

export function drawPerson(ctx, x, y, angle, shirt, skin, phase, down, isPlayer) {
  ctx.save(); ctx.translate(x, y);
  if (down) { ctx.rotate(angle + 1.4); ctx.fillStyle = shirt; ctx.fillRect(-11, -5, 22, 10); ctx.restore(); return; }
  const step = Math.sin(phase) * 4;
  ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle + 2.6) * 8 + step * 0.4, Math.sin(angle + 2.6) * 8); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle - 2.6) * 8 - step * 0.4, Math.sin(angle - 2.6) * 8); ctx.stroke();
  ctx.rotate(angle);
  ctx.fillStyle = shirt; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(2.5, 0, 5.4, 0, 7); ctx.fill();
  if (isPlayer) { ctx.fillStyle = '#ffd94a'; ctx.fillRect(-3, -7.5, 9, 4); }
  ctx.restore();
}

export function drawCarShape(ctx, car, day) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  const hl = car.len / 2, hw = car.wid / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-hl + 3, -hw + 4, car.len, car.wid);
  if (car.hp <= 0) ctx.fillStyle = '#2a2a2e';
  else ctx.fillStyle = car.color;
  roundRect(ctx, -hl, -hw, car.len, car.wid, car.kind === 'moto' ? 5 : 7); ctx.fill();
  if (car.kind === 'moto') {
    ctx.fillStyle = '#22242c'; ctx.beginPath(); ctx.arc(2, 0, 5.5, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(16,22,34,0.9)';
    roundRect(ctx, -hl * 0.32, -hw + 3.5, car.len * 0.5, car.wid - 7, 4); ctx.fill();
    ctx.fillStyle = 'rgba(190,225,255,0.85)';
    ctx.fillRect(hl - 6, -hw + 3, 3.4, car.wid - 6); // windshield glint
  }
  if (car.kind === 'taxi') { ctx.fillStyle = '#222'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
  if (car.isPolice) {
    ctx.fillStyle = '#1c2f57'; ctx.fillRect(-hl * 0.3, -hw, car.len * 0.6, car.wid);
    ctx.fillStyle = Math.floor(performance.now() / 280) % 2 ? '#ff4040' : '#4a8dff';
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillText('SBPD', 0, -hw + 8);
  }
  if (car.isFelon) { ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 2; roundRect(ctx, -hl, -hw, car.len, car.wid, 7); ctx.stroke(); }
  // Headlights at night + brake lights.
  ctx.fillStyle = '#fff6c9'; ctx.fillRect(hl - 2, -hw + 2.5, 3, 4.6); ctx.fillRect(hl - 2, hw - 7.1, 3, 4.6);
  ctx.fillStyle = car.brakeLight ? '#ff2a2a' : '#8d1f1f';
  ctx.fillRect(-hl - 1, -hw + 2.5, 3, 4.6); ctx.fillRect(-hl - 1, hw - 7.1, 3, 4.6);
  if (day < 0.5 && car.speed !== 0) {
    ctx.fillStyle = 'rgba(255,244,180,0.13)';
    ctx.beginPath(); ctx.moveTo(hl, -hw + 4); ctx.lineTo(hl + 95, -hw - 12); ctx.lineTo(hl + 95, hw + 12); ctx.lineTo(hl, hw - 4); ctx.closePath(); ctx.fill();
  }
  if (car.hp < car.maxHp * 0.35 && car.hp > 0) { ctx.fillStyle = 'rgba(60,60,60,0.5)'; ctx.beginPath(); ctx.arc(hl - 6, 0, 7 + Math.sin(performance.now() / 130) * 2, 0, 7); ctx.fill(); }
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawCars(ctx, G, vx0, vy0, vx1, vy1, day) {
  const all = [...G.parked, ...G.traffic, ...G.policeCars, ...G.roadblocks];
  if (G.player.car) all.push(G.player.car);
  for (const c of all) {
    if (c.x < vx0 - 70 || c.x > vx1 + 70 || c.y < vy0 - 70 || c.y > vy1 + 70) continue;
    drawCarShape(ctx, c, day);
  }
}

export function drawScreenOverlay(ctx, G) {
  ctx.save(); ctx.textAlign = 'center';
  if (G.screen === 'title') {
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, 'rgba(20,8,40,0.88)'); grad.addColorStop(0.6, 'rgba(120,40,80,0.75)'); grad.addColorStop(1, 'rgba(240,120,60,0.8)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 84px system-ui, sans-serif';
    ctx.fillText('SOLSTICE BAY', 640, 240);
    ctx.fillStyle = '#fff'; ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('A sun-soaked open-world crime story — six jobs, one diamond, zero chill.', 640, 292);
    ctx.font = '18px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const lines = [
      'WASD drive / walk · Shift run · F or Enter: enter/exit car · Mouse aim, click: fight / shoot',
      'Q or 1/2: fists / pistol · R reload · E: talk / start mission · P or Esc: pause · M: mute',
      'Side work: T taxi · C courier · R checkpoint sprint · V vigilante · B cache run',
      G.hasSave ? 'Press ENTER for New Game · C to Continue your save' : 'Press ENTER to start — see Auntie Vera at the diner (gold marker)',
    ];
    lines.forEach((l, i) => ctx.fillText(l, 640, 360 + i * 30));
    ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('100% original: city, people, cars and story invented for this game. Best on desktop Chrome.', 640, 660);
  } else if (G.screen === 'pause') {
    ctx.fillStyle = 'rgba(5,8,14,0.72)'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 44px system-ui, sans-serif'; ctx.fillText('PAUSED', 640, 300);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`Cash $${Math.floor(G.player.money)} · Respect ${G.player.respect} · Missions ${G.missionIndex}/6`, 640, 348);
    ctx.fillText(`Taxi fares ${G.stats.taxi} · Courier ${G.stats.courier} · Sprints won ${G.stats.races} · Vigilante ${G.stats.vigilante} · Cache runs ${G.stats.caches}`, 640, 378);
    ctx.fillText('P or Esc to resume · Progress saves automatically', 640, 424);
  } else if (G.screen === 'busted') {
    ctx.fillStyle = 'rgba(20,10,60,0.66)'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#8ab6ff'; ctx.font = 'bold 76px system-ui, sans-serif'; ctx.fillText('BUSTED', 640, 320);
    ctx.fillStyle = '#fff'; ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('The SBPD impounds your ride and fines you $150. You walk out of HQ a free man.', 640, 366);
    ctx.fillText('Press ENTER to continue', 640, 410);
  } else if (G.screen === 'wasted') {
    ctx.fillStyle = 'rgba(60,4,4,0.66)'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 76px system-ui, sans-serif'; ctx.fillText('WASTED', 640, 320);
    ctx.fillStyle = '#fff'; ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('You wake up at Solstice General. The bill is $120. The bay keeps spinning.', 640, 366);
    ctx.fillText('Press ENTER to continue', 640, 410);
  }
  ctx.restore();
  void starsForHeat;
}
