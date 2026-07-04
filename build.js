// Preprocess countries.geo.json -> compact projected territory data + adjacency
const fs = require('fs');
const G = JSON.parse(fs.readFileSync(__dirname + '/countries.geo.json', 'utf8'));

// ISO3 -> territory id
const MAP = {
  USA:'usa', CAN:'canada', GRL:'canada', MEX:'mexico',
  GTM:'centralamerica', BLZ:'centralamerica', HND:'centralamerica', SLV:'centralamerica',
  NIC:'centralamerica', CRI:'centralamerica', PAN:'centralamerica',
  CUB:'cuba', HTI:'cuba', DOM:'cuba', JAM:'cuba', BHS:'cuba', PRI:'cuba', TTO:'cuba',
  COL:'colombia', VEN:'colombia', ECU:'colombia', GUY:'colombia', SUR:'colombia',
  BRA:'brazil', PER:'andes', BOL:'andes', PRY:'andes',
  ARG:'argentina', CHL:'argentina', URY:'argentina', FLK:'argentina',
  GBR:'uk', IRL:'uk', FRA:'france',
  DEU:'germany', NLD:'germany', BEL:'germany', LUX:'germany', CHE:'germany', AUT:'germany', CZE:'germany',
  ESP:'spain', PRT:'spain', ITA:'italy', MLT:'italy',
  NOR:'scandinavia', SWE:'scandinavia', FIN:'scandinavia', DNK:'scandinavia', ISL:'scandinavia',
  POL:'poland', SVK:'poland', HUN:'poland',
  SVN:'balkans', HRV:'balkans', BIH:'balkans', SRB:'balkans', MNE:'balkans', MKD:'balkans',
  ALB:'balkans', GRC:'balkans', BGR:'balkans', ROU:'balkans', KOS:'balkans',
  UKR:'easteurope', BLR:'easteurope', MDA:'easteurope', LTU:'easteurope', LVA:'easteurope', EST:'easteurope',
  RUS:'russia', TUR:'turkey',
  SYR:'levant', IRQ:'levant', JOR:'levant', ISR:'levant', LBN:'levant', PSE:'levant', CYP:'levant',
  SAU:'saudi', YEM:'saudi', OMN:'saudi', ARE:'saudi', QAT:'saudi', KWT:'saudi',
  IRN:'iran',
  KAZ:'centralasia', UZB:'centralasia', TKM:'centralasia', KGZ:'centralasia', TJK:'centralasia', MNG:'centralasia',
  PAK:'pakistan', AFG:'pakistan',
  IND:'india', LKA:'india', NPL:'india', BTN:'india', BGD:'india',
  CHN:'china', TWN:'china', KOR:'korea', PRK:'korea', JPN:'japan',
  MMR:'seasia', THA:'seasia', LAO:'seasia', VNM:'seasia', KHM:'seasia', MYS:'seasia',
  IDN:'indonesia', PHL:'indonesia', PNG:'indonesia', BRN:'indonesia', TLS:'indonesia',
  AUS:'australia', NZL:'australia', NCL:'australia', FJI:'australia', VUT:'australia', SLB:'australia',
  MAR:'maghreb', DZA:'maghreb', TUN:'maghreb', LBY:'maghreb', ESH:'maghreb',
  EGY:'egypt',
  MRT:'westafrica', MLI:'westafrica', NER:'westafrica', TCD:'westafrica', SEN:'westafrica',
  GMB:'westafrica', GNB:'westafrica', GIN:'westafrica', SLE:'westafrica', LBR:'westafrica',
  CIV:'westafrica', GHA:'westafrica', TGO:'westafrica', BEN:'westafrica', BFA:'westafrica',
  NGA:'nigeria', CMR:'nigeria',
  CAF:'centralafrica', COD:'centralafrica', COG:'centralafrica', GAB:'centralafrica', GNQ:'centralafrica', AGO:'centralafrica',
  ETH:'eastafrica', ERI:'eastafrica', DJI:'eastafrica', SOM:'eastafrica', KEN:'eastafrica',
  UGA:'eastafrica', RWA:'eastafrica', BDI:'eastafrica', TZA:'eastafrica', SSD:'eastafrica', SDN:'eastafrica',
  ZAF:'southafrica', NAM:'southafrica', BWA:'southafrica', ZWE:'southafrica', MOZ:'southafrica',
  MWI:'southafrica', ZMB:'southafrica', LSO:'southafrica', SWZ:'southafrica', MDG:'southafrica',
};
Object.assign(MAP, {
  GEO:'turkey', ARM:'turkey', AZE:'turkey',      // Caucasus -> Turkey group
  GUF:'colombia', 'CS-KM':'balkans',
});
const NAME_MAP = { 'Northern Cyprus':'levant', 'Somaliland':'eastafrica', 'Kosovo':'balkans' };
const SKIP = new Set(['ATA','ATF','BMU']);

// ---- projection: Miller cylindrical, lat clamp [-58, 84] ----
const W = 2000;
const K = W / (2 * Math.PI);
const millerY = latDeg => {
  const p = latDeg * Math.PI / 180;
  return 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p));
};
const YMAX = millerY(84), YMIN = millerY(-58);
const H = Math.round((YMAX - YMIN) * K);
const proj = ([lon, lat]) => [
  (lon + 180) / 360 * W,
  (YMAX - millerY(Math.max(-58, Math.min(84, lat)))) * K,
];

// ---- helpers ----
function ringArea(r) { // shoelace on lon/lat
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}
function centroidOf(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    const c = x1 * y2 - x2 * y1;
    a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
  }
  a /= 2;
  return a ? [cx / (6 * a), cy / (6 * a)] : r[0];
}
// Douglas-Peucker
function dp(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  // closed rings: first==last gives a degenerate baseline — anchor the midpoint
  const mid = Math.floor(pts.length / 2); keep[mid] = 1;
  const stack = [[0, mid], [mid, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let dmax = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// ---- collect rings per territory ----
const terr = {}; const unmapped = [];
for (const f of G.features) {
  const iso = f.id;
  if (SKIP.has(iso)) continue;
  const tid = MAP[iso] || NAME_MAP[f.properties && f.properties.name];
  if (!tid) { unmapped.push(iso + ' ' + (f.properties && f.properties.name)); continue; }
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    for (const ring of poly) {
      // France: drop overseas (South America / Caribbean) rings
      if (iso === 'FRA') {
        const c = centroidOf(ring);
        if (c[0] < -20) continue;
      }
      (terr[tid] = terr[tid] || { rings: [], raw: [] }).raw.push(ring);
    }
  }
}
console.log('UNMAPPED:', unmapped.length ? unmapped.join(' | ') : 'none');

// ---- adjacency from shared border vertices (2dp exact grid) ----
const vmap = new Map();
for (const tid in terr)
  for (const ring of terr[tid].raw)
    for (const [lon, lat] of ring) {
      const k = lon.toFixed(2) + ',' + lat.toFixed(2);
      let s = vmap.get(k); if (!s) vmap.set(k, s = new Set());
      s.add(tid);
    }
const pairCount = {};
for (const s of vmap.values())
  if (s.size > 1) {
    const ids = [...s].sort();
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const k = ids[i] + '|' + ids[j];
        pairCount[k] = (pairCount[k] || 0) + 1;
      }
  }
const landAdj = Object.keys(pairCount).filter(k => pairCount[k] >= 3).map(k => k.split('|'));

// ---- simplify + project ----
const OUT = [];
for (const tid in terr) {
  const rings = [];
  let bestA = -1, capC = null;
  for (const ring of terr[tid].raw) {
    const a = ringArea(ring);
    if (a > bestA) { bestA = a; capC = proj(centroidOf(ring)); }
    if (a < 0.35 && terr[tid].raw.length > 1) continue; // drop small islets
    const simp = dp(ring, 0.15);
    if (simp.length < 4) continue;
    rings.push(simp.map(proj).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
  }
  if (!rings.length || !capC) { console.log('EMPTY TERRITORY:', tid); continue; }
  OUT.push({ id: tid, rings, cx: Math.round(capC[0]), cy: Math.round(capC[1]) });
}

// ---- manual lanes ----
const SEA = [
  ['usa','uk'],['usa','japan'],['usa','russia'],['usa','cuba'],['mexico','cuba'],['cuba','colombia'],
  ['canada','scandinavia'],['canada','uk'],['brazil','westafrica'],['argentina','southafrica'],
  ['uk','france'],['uk','scandinavia'],['spain','maghreb'],['italy','maghreb'],
  ['egypt','saudi'],['saudi','iran'],['saudi','eastafrica'],
  ['japan','korea'],['japan','russia'],['indonesia','australia'],
];
const FORCE_LAND = [['russia','korea'],['egypt','levant']]; // borders too short for 110m vertex matching

const key = (a,b)=>[a,b].sort().join('|');
const landSet = new Set(landAdj.map(([a,b])=>key(a,b)));
for (const [a,b] of FORCE_LAND) landSet.add(key(a,b));
const ADJ = [];
for (const k of landSet) { const [a,b]=k.split('|'); ADJ.push([a,b,'L']); }
for (const [a,b] of SEA) if (!landSet.has(key(a,b))) ADJ.push([a,b,'S']);

const world = { w: W, h: H, terr: OUT, adj: ADJ };
fs.writeFileSync(__dirname + '/world-data.json', JSON.stringify(world));

// ---- report ----
console.log('map size', W, 'x', H, '| territories:', OUT.length,
  '| total pts:', OUT.reduce((s,t)=>s+t.rings.reduce((x,r)=>x+r.length,0),0),
  '| json bytes:', fs.statSync(__dirname + '/world-data.json').size);
const nb = {};
for (const [a,b,t] of ADJ){ (nb[a]=nb[a]||[]).push(b+(t==='S'?'~':'')); (nb[b]=nb[b]||[]).push(a+(t==='S'?'~':'')); }
for (const t of OUT.map(t=>t.id).sort())
  console.log(t.padEnd(15), '->', (nb[t]||[]).sort().join(', ') || 'ISOLATED!');
