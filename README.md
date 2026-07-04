# 🌍 World Conquest

A real-time world domination strategy game in a single HTML file. Pick one of 25 nations — each with a unique specialty — build an army, navy and air force, and paint all 39 regions of a real world map your color.

**Play it:** open `index.html` in any browser, or visit the GitHub Pages deployment.

## Features

- **Real world map** — actual country borders (Natural Earth 110m data), grouped into 39 conquerable regions, rendered on canvas with pan and zoom
- **25 playable nations**, each with a unique specialty (Russia's Red Army, USA's Air Supremacy, China's Industrial Might, Saudi Oil Money…), plus 14 independent regions
- **Time-based warfare** — units train in production queues, invasion forces physically travel across the map, and battles resolve over seconds with live attrition
- **Threats panel** — see exactly who is invading you, what's inbound, and the countdown to impact
- **Age of Empires-style progression** — advance through three Ages (+strength, faster production, richer economy) and buy per-unit upgrades
- **Bulk training** — ×1 / ×5 / ×10 / Max quantities, hotkeys `1` `2` `3`, space to pause
- **Auto-save** — campaigns save to localStorage every 15s; resume from the title screen
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
