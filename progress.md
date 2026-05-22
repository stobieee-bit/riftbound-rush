Original prompt: Make me MegaBonk from Steam

User clarified: "I want all the gameplay, technical and functional elements, make the rest like characters, levels, items, etc.... their own original and legally distinct"

Notes:
- Building an original 3D survivor auto-attacker rather than copying Steam's Megabonk branding, characters, maps, item names, jokes, audio, UI, or art.
- Core feature target: random 3D arena, horde spawning, automatic attacks, XP/level-ups, random rarity upgrades, loot/chests, shrines, boss gate, boss fight, characters, weapons, items, quests/unlocks, local persistence, pause/restart/fullscreen, deterministic browser test hooks.

2026-05-22:
- Scaffolded Vite + Three.js app named Riftbound Rush.
- Added menu, HUD, 3D procedural arena, character definitions, upgrade definitions, enemy roster, pickups, chests, shrines, shops, boss gate, localStorage meta, deterministic `window.advanceTime(ms)`, and `window.render_game_to_text`.
- Installed dependencies and verified `npm run build`.
- Ran the develop-web-game Playwright client against `http://127.0.0.1:5173/`; screenshots were nonblank, enemies spawned, auto-attacks fired, kills/drops appeared, and no console errors were captured.
- Added small internal debug hooks under `window.__riftbound.debug` for deterministic smoke tests.
- Ran a targeted smoke flow covering level-up choices, chest reward choices, shrine reward choices, shop purchase via E, boss gate activation via E, and screenshot capture. Result: `smoke-ok`, no browser errors.
- Fixed mobile HUD/menu overlap, then reran build, the required gameplay client, mobile screenshots, and final targeted smoke flow. Result: `final-smoke-ok`, no browser errors.
- User clarified to keep the game functionally close to Megabonk and avoid invented systems that are not in the source game. Backed out the off-target surge/radar/combo-panel work.
- Added a closer parity pass instead: persistent best score in localStorage, a main-menu quest/unlock list for characters/weapons/items, Gatebreaker Ink unlock gating, and upgrade cards that label offers as Weapon/Item/Tome. Verified `npm run build`, required gameplay client, in-app browser menu screenshot, forced level-up choices, and boss gate activation. Result: `parity-smoke-ok`, no browser errors.
- Fixed cache interaction: chests now require pressing `E` and cost chips to open. Each cache has a visible cost, insufficient chips shows a toast/objective prompt, opening spends chips and then shows the upgrade chooser. Increased enemy chip drop odds to support the cache/shop economy. Verified build, required gameplay client, and targeted economy smoke. Result: `chest-economy-ok`, no browser errors.
- Next: keep future work constrained to source-like systems: more original characters/weapons/items, more quest unlock conditions, additional randomized maps, score/stat polish, controller input, and audio. Avoid invented active meters, radar, or unrelated mode systems.
