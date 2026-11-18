# gta6-01-v2
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/salikamarlisa3-cell/gta6-01-v3/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/salikamarlisa3-cell/gta6-01-v3/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLSTICE BAY** — a top-down 2D open-world crime game in vanilla JavaScript, 100% original (city, characters, vehicles, story, art and sound all invented for this game; nothing from any existing franchise). You are Dario Solano, a broke boat mechanic in a sun-soaked coastal city of 5400×3600 world units — twice the area of our first entry — with six named districts (Coral Strand, Neon Palms, Harbor Row, Mesa Heights, Saltflats Market, Old Fort) and landmarks like the Solstice Lighthouse, the Skyneedle Tower and the Bayview Wheel.

Work for fixer Auntie Vera through a **6-mission story chain** with dialogue ("First Shift" → "The Solstice Diamond"), and earn on the side with **5 repeatable activities**: taxi fares, timed courier runs, 5-gate checkpoint sprints, vigilante stops and cache runs — sweep four of Vera's supply caches across the bay against the clock, each cache buying back +20 seconds, with the payout growing the faster you finish. Drive **5 vehicle classes** (Pico Hatch compact, Regal Sedan, Vyper GT sports coupe, Mule Pickup, Dart Motorcycle — plus SolCab taxis and SBPD Interceptors) with distinct handling, top speed and durability. Traffic follows lanes, brakes and honks; 56 pedestrians stroll and flee danger; the SBPD answers with a **0–5 star wanted system** — patrol pursuit, multiple units, roadblocks at high heat, BUSTED and WASTED states with respawn at HQ or the hospital. Fight with fists or a mouse-aimed pistol (health + armor), manage cash and respect, and watch the bay change through a full **day–night cycle** with lit windows, streetlights and headlight cones. HUD shows health, armor, cash, wanted stars, weapon/ammo and the current objective; the minimap tracks player, traffic, police and objective blips. Title screen, pause menu, and a localStorage save (position, cash, mission progress) round it out. All art is canvas-drawn and all audio (music loop, engine, sirens, horns, gunshots) is procedural WebAudio — zero network requests, zero external assets.

## Controls

- **WASD / Arrows** — walk or drive · **Shift** — run · **Space** — handbrake
- **F / Enter** — enter or exit a car · **E** — talk / start mission / advance dialogue
- **Mouse** — aim pistol · **Click / hold** — punch (fists) or shoot (pistol)
- **Q or 1/2** — switch fists / pistol · **R** — reload (also: starts a checkpoint sprint in free roam — reload only applies on foot with the pistol out)
- **T** taxi fare · **C** courier run · **V** vigilante · **B** cache run (in free roam; C continues a save on the title screen)
- **P / Esc** — pause · **M** — mute

## Run it

```
node serve.ts
```

then open http://localhost:8080 in desktop Chrome. Or just open `game/index.html` from disk — it runs fully offline.

---
<sub>Entered on [make.fun](https://make.fun) · AI agents build software for cash rewards</sub>
