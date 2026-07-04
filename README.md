# 🌍 World Conquest

A real-time world domination strategy game in a single HTML file. Pick one of 25 nations — each with a unique specialty — build an army, navy and air force, and paint all 39 regions of a real world map your color.

**Play it:** open `index.html` in any browser, or visit the GitHub Pages deployment.

## Features

- **Real world map** — actual country borders (Natural Earth 110m data), grouped into 44 conquerable regions, rendered on canvas with pan and zoom. Superpowers span multiple regions (Western/Eastern US, European Russia/Siberia/Far East…) so they fall piece by piece, not in one battle
- **25 playable nations**, each with a unique specialty, plus 14 independent regions. Capture a nation's capital ★ to gain 40% of its specialty
- **Time-based warfare** — units train in production queues, invasion forces physically travel across the map, and battles resolve over seconds with live attrition
- **War declarations & diplomacy** — enemies declare war before invading, demand (and pay) tribute, honor truces, and hold grudges
- **Nukes** — the Atomic Era unlocks warheads: 45s to build, strike anywhere, 75s of fallout
- **Naval blockades** — park a fleet off an enemy coast to choke its income until they break the blockade
- **Monuments** — build wonders for local income and empire-wide strength
- **Threats panel & news ticker** — see exactly who is invading you and the countdown to impact
- **Age of Empires-style progression** — three Ages plus per-unit upgrade tiers
- **Difficulty levels and scenarios** — Standard, Cold War, Duel, and Blitz
- **Bulk training** — ×1 / ×5 / ×10 / Max quantities, repeat production, hotkeys `1` `2` `3`, space to pause
- **Auto-save + save codes** — resume from the title screen, or export/import a campaign as a portable code
- **End-of-game replay** — a timelapse of the whole world changing hands
- **1× / 2× / 4× game speed**, sound effects, touch support

## How to play

1. Pick a nation. Its specialty shapes your strategy (navy powers want sea lanes, income powers want a long game).
2. Select your territory, queue units. Gold accrues per second per territory.
3. Click a highlighted neighbor to invade (red), air-strike (gold), or redeploy (blue). Sea lanes need at least one Fleet escort.
4. Watch the Threats panel — retaliate against whoever dares attack you.
5. Own all 39 regions.

## Development

The game is generated from two inputs:

- `template.html` — all game code, with a `__WORLD__` placeholder
- `countries.geo.json` — world country borders (from [johan/world.geo.json](https://github.com/johan/world.geo.json))

`build.js` groups countries into territories, simplifies and projects the geometry (Miller projection), derives the adjacency graph from shared border vertices, and injects the result:

```sh
node build.js                      # regenerates world-data.json
node -e "const fs=require('fs');fs.writeFileSync('index.html',fs.readFileSync('template.html','utf8').split('__WORLD__').join(fs.readFileSync('world-data.json','utf8')))"
```

No dependencies, no build framework, no server — the output is one self-contained file.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
