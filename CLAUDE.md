# World Conquest — Claude Instructions & Project State

Browser RTS in a single HTML file. Owner's mandate: "lets make this game great <3" — they trust judgment calls on design. Session compacted 2026-07-07; this file is the restart point.

## Live deployments

- **Public URL (friends play here):** https://durvesh1992.github.io/world-conquest/
- **Claude artifact:** https://claude.ai/code/artifact/98e59730-d6e3-4b6a-a94c-e4f35001e2d3
  - To update it from a new session, the Artifact tool call MUST include `url: "https://claude.ai/code/artifact/98e59730-d6e3-4b6a-a94c-e4f35001e2d3"` — otherwise a new URL is minted.
  - The artifact viewer sandboxes localStorage; the game detects this (`CAN_SAVE`) and points players to export/import save codes.
- **Repo:** https://github.com/durvesh1992/world-conquest (user's personal account `durvesh1992`; `gh` CLI is authenticated with `workflow` scope).

## Deploy pipeline (do not change)

Push to `main` → `.github/workflows/deploy.yml` (GitHub Actions, actions/deploy-pages) → live in ~20s.
⚠ Pages `build_type` must stay `"workflow"`. The legacy Jekyll builder wedges for 40+ minutes on this repo — never switch back.

## Build

- `template.html` — ALL game code (CSS/HTML/JS), with a `__WORLD__` placeholder. **Edit this, never index.html.**
- `build.js` — reads `countries.geo.json` (world.geo.json / Natural Earth 110m), groups ISO codes into territories, splits superpowers by meridian clipping, simplifies (Douglas-Peucker, closed-ring midpoint anchor), projects (Miller), derives adjacency from shared 2dp border vertices, writes `world-data.json`.
- Rebuild both:
  ```sh
  node build.js
  node -e "const fs=require('fs');fs.writeFileSync('index.html',fs.readFileSync('template.html','utf8').split('__WORLD__').join(fs.readFileSync('world-data.json','utf8')))"
  ```

### build.js gotchas
- Split regions (uswest/useast, russia/siberia/fareast, chinawest/china, canadawest/canada) share only 2 clip-line vertices → their sibling adjacency is in `FORCE_LAND`, not auto-detected.
- Russia uses `shiftNeg` (+360 on negative lons) and post-clip **split at lon 180** — removing that reintroduces horizontal streak artifacts across the map.
- Label anchor picks largest ring but penalizes polar centroids (|lat|>70 → area×0.15) so Eastern Canada's badge doesn't sit on Greenland.
- `REGION_NATION` maps split region → (nation, capital flag). All other territories: nation=id, cap=1.

## Game architecture (template.html)

- Territories ≠ nations: `WORLD.terr[i] = {id, nation, cap, rings, cx, cy}`; `TMETA`/`tName`/`tFlag` for territory display, `NAT[owner]` for faction display, `CAPOF[nation]` = capital tid.
- State `S`: terr{owner,army,navy,air(floats),queue,monument,repeat,fallout}, gold/age/upg/nukes/nukeBuild per nation, convoys[], battles{}, blockades{}, hostile/truce/grudge (pairKey a|b sorted), demand (AI ultimatum), hist (replay snapshots every 5s), effMods/monCount (recomputeMods() — call after ANY ownership/monument change).
- Capital perk: holding another nation's capital grants 40% of its mods (blend `1+(m-1)*0.4` in recomputeMods).
- Combat: convoys travel (70px/s, strike 130, nuke 200), battles attrit `killed/s = enemyPower*0.012` (defender ×1.3 def bonus, attacker fights at 0.8 back-rate); capture when defender <0.05 units.
- Balance: minors cap at 18 units & build 1-slot; AI thresh `max(1.05, 1.45−t·0.0012)+DIFFS.th`, ×1.3 vs majors before t=300, ×0.7 with grudge; grace vs player = DIFFS.grace; AI declares war one act before invading.
- Save: localStorage key `worldconquest.save.v3`, snapshot()/loadSave()/export-import codes (`WC1.` + unicode-safe base64). Bump version on schema change.
- Scenarios in newGame(): coldwar (rival=usa/russia owns opposite hemisphere), duel (S.minorized majors), blitz (gold 3000, age 2, ×1.5 garrisons).

## Testing (headless Chrome, no framework)

```sh
cat index.html > test.html && cat >> test.html <<'EOF'
<script>
window.onerror=(m,s,l,c)=>{document.title='JSERR: '+m+' @'+l};
setTimeout(()=>{ startGame('uk'); for(let i=0;i<1200;i++) simulate(0.25);
  document.title='OK owners='+new Set(Object.values(S.terr).map(t=>t.owner)).size; },300);
</script>
EOF
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --virtual-time-budget=9000 --dump-dom "file://$PWD/test.html" 2>/dev/null | grep -o '<title>[^<]*</title>'
```
Also syntax-check first: `awk '/<script>/{f=1;next}/<\/script>/{f=0}f' index.html > /tmp/wc.js && node --check /tmp/wc.js`. Screenshot with `--screenshot=shot.png --window-size=1440,900`. Drive scenarios/features by calling game functions directly (buyAge, launch, demandTribute…) and reporting via document.title.

## TODO backlog (suggested to owner; build when they pick, or when told "make it better")

1. **Alliances & pacts** — AI offers based on shared enemies; allies join wars; betrayal costs reputation
2. **Generals/heroes** — one per nation, +25% to battles where stationed, can be killed
3. **Fortifications** — buildable per-territory defense structure
4. **Rally points / auto-front** — auto-forward new units to threatened borders (owner hates micromanagement — high value)
5. **Multiple named save slots**
6. **Stats screen** — units lost, biggest battle, war history
7. **Leaderboard** — fastest world conquest times
8. **Peace treaties, more scenarios**

## Owner preferences

- Hates click-heavy micromanagement; loves bulk/auto options.
- Always wants to see who is attacking (threats panel, declarations) so they can retaliate.
- Wanted: real-map visuals (Plague Inc), time-based build/attack, AoE-style progression — all shipped.
- After changes: rebuild, test headless, push (auto-deploys), and redeploy the artifact with the `url:` param.
