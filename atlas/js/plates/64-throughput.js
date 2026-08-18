"use strict";
Atlas.registerPlate({
  id: "throughput",
  name: "Throughput",
  roman: "LXIV",
  accent: "#5a86ff",
  tex: "\\Phi(y)=\\Phi_0\\!\\prod_{b<y}(1-\\sigma_b),\\quad x\\in\\tfrac{1}{256}\\,\\mathbb{Z}\\ \\mathrm{tiles},\\quad 45\\,\\mathrm{s}^{-1}",
  plain: "Φ(y) = Φ₀ · Π(1−σᵦ): the bus drains as the blocks tap it;  every position in 1/256 tile;  a blue belt carries 45 a second",
  caption: "A factory laid out the way the automation game's players lay them: a hundred-tile city grid, a two-column main bus, smelting west of it and assembly east, nuclear at the cap, rails on the seams and a silo in the corner office. The plate was calibrated against a real megabase blueprint book, and it keeps the game's own habits honestly: production blocks are stamped copies the way cache mirrors a bitcell, every belt slot and machine sits on the game's quarter-tile and 1/256-tile lattices, and item density on a lane is a conservation law, the bus dimming block by block as its flow is tapped, brightness equalling measure equalling items per second. The game runs famously bit-exact in lockstep, which is the same oath this atlas swears, so the eighth Mk2 plate is a portrait of kin: arithmetic that grew a body, drawn by arithmetic that grows a picture. The factory must grow; DEPTH is how much of it you can afford to see.",
  cam: { dist: 3.0, pitch: 0.22, tgtY: 0.0, rot: 0.0 },
  gain: 0.5,
  params: [
    { label: "DEPTH",        min: 2,   max: 16,  step: 1,    def: 16   },
    { label: "MAGNIFY",      min: 0,   max: 14,  step: 0.25, def: 0    },
    { label: "WORLD",        min: 1,   max: 64,  step: 1,    def: 11   },
    { label: "SCIENCE",      min: 0.2, max: 2.0, step: 0.05, def: 1.0  },
    { label: "BACKPRESSURE", min: 0,   max: 1,   step: 0.01, def: 0.35 },
    { label: "TRAINS",       min: 0,   max: 1,   step: 0.01, def: 0.55 },
    { label: "NIGHT",        min: 0,   max: 1,   step: 0.01, def: 0.65 },
    { label: "STAIN",        min: 0,   max: 1,   step: 0.01, def: 0.50 }
  ],
  glsl: `
// ── the survey: whole numbers, measured off a real blueprint book ──
// tile = 4096 units; the map is 3200 tiles; a city block is 100 tiles
// on an absolute grid (the book says snap-to-grid 100, absolute). The
// same census rules as LXIII apply: one call site per engine, and no
// descent loop at all - a city's hierarchy is fixed, not recursive.
// Census entry: 30 s cold link on D3D all the same (the vocabulary is
// wide - eleven district types and their furniture), 29 ms from the
// disk cache forever after, against the breakdown's 0.2 s. Accepted
// as LXIII's was: the link is asynchronous and once per visitor.
const int FTL  = 4096;        // one tile
const int FBLK = 409600;      // the hundred-tile city block
const int FDIE = 13107200;    // the map, 3200 tiles
const int FCTR = 6553600;     // map centre
const int FIT  = 1024;        // a belt slot: quarter tile

float thr_u(inout uint s){ s = hashu(s); return u2f(s); }

// map-view night palette; structures by class
vec3 thr_lay(int m){
  if(m == 0)  return vec3(0.055, 0.055, 0.065);  // ground
  if(m == 1)  return vec3(0.10, 0.16, 0.34);     // water
  if(m == 2)  return vec3(0.58, 0.58, 0.58);     // rail
  if(m == 3)  return vec3(0.30, 0.47, 1.00);     // express belt
  if(m == 4)  return vec3(1.00, 0.45, 0.12);     // furnace glow
  if(m == 5)  return vec3(0.35, 0.78, 0.72);     // assembler
  if(m == 6)  return vec3(1.00, 0.45, 0.75);     // lab
  if(m == 7)  return vec3(0.82, 0.76, 0.58);     // pole, turbine, frame
  if(m == 8)  return vec3(1.00, 0.95, 0.70);     // lamp
  if(m == 9)  return vec3(0.70, 0.78, 0.68);     // wall
  if(m == 10) return vec3(1.00, 0.28, 0.36);     // laser turret
  if(m == 11) return vec3(0.34, 0.64, 0.68);     // pipe
  if(m == 12) return vec3(0.24, 0.22, 0.48);     // solar panel
  if(m == 13) return vec3(1.00, 0.66, 0.25);     // chest
  if(m == 14) return vec3(1.00, 0.34, 0.20);     // heat pipe
  return vec3(0.93, 0.93, 0.98);                 // silo, radar dish
}

// what rides the belts; classes keyed by district recipe
vec3 thr_item(int c){
  if(c == 0) return vec3(0.62, 0.70, 0.86);      // iron plate
  if(c == 1) return vec3(0.95, 0.52, 0.22);      // copper plate
  if(c == 2) return vec3(0.30, 0.95, 0.42);      // electronic circuit
  if(c == 3) return vec3(0.95, 0.30, 0.30);      // advanced circuit
  if(c == 4) return vec3(0.35, 0.55, 1.00);      // processing unit
  if(c == 5) return vec3(0.80, 0.84, 0.90);      // steel
  if(c == 6) return vec3(0.92, 0.92, 0.80);      // plastic
  if(c == 7) return vec3(0.55, 0.58, 0.62);      // gear
  return vec3(0.85, 0.30, 0.80);                 // science pack
}

vec3 thr_stain(vec3 c, float a){
  float cs = cos(a), sn = sin(a);
  vec3 k = vec3(0.57735027);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}

// the other half of importance sampling: a grid stage draws only the
// index range the window can see, but the INDEX stays absolute, so a
// machine keeps its identity however the frame crops it
ivec2 thr_span(int base, int pitch, int n, int w0, int w1){
  int i0 = (w0 <= base) ? 0 : (w0 - base) / pitch;
  int i1 = (w1 < base) ? -1 : min(n - 1, (w1 - base) / pitch);
  return ivec2(i0, i1);
}

vec3 shape_throughput(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // Addressed, never stored: block types come from the city plan,
  // stamped block interiors hash from their TYPE (the game's players
  // stamp one blueprint; five copper blocks in the book are byte
  // identical), and an item on a belt is a slot index under a hash.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 668265263u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  int   maxD  = int(P[0] + 0.5);
  float mag   = exp2(P[1]);
  uint  world = uint(P[2] + 0.5) * 2654435761u;
  float sci   = P[3];
  float back  = P[4];
  float trn   = P[5];
  float night = P[6];
  float stain = (P[7] - 0.50) * 2.2;

  // the city plan: core size in blocks, hashed from WORLD
  uint wk = hashu(world ^ 0x5157u);
  int cw = 18 + int(wk % 5u);             // 18..22 columns
  int ch = 24 + int((wk >> 3) % 5u);      // 24..28 rows
  int cx0 = 16 - cw / 2, cy0 = 16 - ch / 2;      // in block coords, 32x32 map
  int busL = cx0 + cw / 2 - 1;            // two bus columns at centre
  int peak = cy0 + (ch * 5) / 8;          // bus flow peaks south of centre

  // the dive has a destination: map centre is the road between the
  // bus blocks, honest and empty, so the window pans into the thick
  // of the bus as it deepens - integers all the way, and at MAGNIFY 0
  // it is exactly the whole map
  int hw = int(float(FCTR) / mag);
  ivec2 heart = ivec2((busL + 1) * FBLK + 47 * FTL + FTL / 2, peak * FBLK + 50 * FTL);
  ivec2 wc = ivec2(FCTR) + ivec2(vec2(heart - ivec2(FCTR)) * (1.0 - 1.0 / mag));
  ivec4 win = ivec4(wc.x - hw, wc.y - hw, wc.x + hw, wc.y + hw);
  float km = mag * 1.9836426e-7;          // plate units per map unit

  pt = hashu(pt);
  float bias = mix(0.72, 0.20, clamp(P[1] / 14.0, 0.0, 1.0));
  int d = int(pow(u2f(pt), bias) * float(maxD));
  if(d > 8){
    // fold spare depth back: mostly into the furniture and the flow,
    // one part in eight to the floor, which is most of any factory
    int fh = int(hashu(pt ^ 0x9E37u) % 8u);
    d = (fh == 7) ? 0 : 3 + (fh % 6);
  }

  int fmode = 0;                 // 0 cull, 1 wire, 2 fill, 3 dot, 4 seated, 5 tracks
  bool fhz = true; int fa0 = 0, fa1 = 0, fcc = 0, fw = 0;
  ivec2 flo = ivec2(0), fhi = ivec2(0);
  ivec2 fct = ivec2(0); int fr = 0;
  ivec2 fa = ivec2(0);
  vec2  fo = vec2(0.0);
  int   lay = 0;
  float glow = 1.0;
  uint  tex = pt;
  int tBase = 0, tPitch = 1, tN = 1, tA0 = 0, tA1 = 0, tW = 0;
  float tOcc = 1.0, tDot = 0.0;
  uint tSalt = 0u;
  bool tHz = false;

  // ── pick a block the window can see (uniform over visible core) ──
  int b0x = max(cx0, win.x / FBLK), b1x = min(cx0 + cw - 1, win.z / FBLK);
  int b0y = max(cy0, win.y / FBLK), b1y = min(cy0 + ch - 1, win.w / FBLK);
  bool coreVis = (b0x <= b1x) && (b0y <= b1y);
  int bx = b0x, by = b0y;
  if(coreVis){
    bx = b0x + int(thr_u(pt) * float(b1x - b0x + 1));
    by = b0y + int(thr_u(pt) * float(b1y - b0y + 1));
    bx = min(bx, b1x); by = min(by, b1y);
  } else { thr_u(pt); thr_u(pt); }
  ivec2 blo = ivec2(bx, by) * FBLK;
  int lx = bx - cx0, ly = by - cy0;      // core-local block coords

  // district: 0 rail ring, 1 station W, 2 smelt, 3 bus, 4 assembly,
  // 5 station E, 6 nuclear, 7 science+silo, 8 solar, 9 oil, 10 hub
  int typ = 4;
  bool ring = (lx == 0 || ly == 0 || lx == cw - 1 || ly == ch - 1);
  uint bk = hashu(world ^ uint(bx * 73 + by) * 2246822519u);
  if(ring) typ = 0;
  else if(lx == 1) typ = 1;
  else if(lx == cw - 2) typ = 5;
  else if(ly == 1) typ = 6;
  else if(lx == busL || lx == busL + 1) typ = 3;
  else if(ly <= 3 && lx >= cw - 6) typ = 7;
  else if(lx < busL){
    // west bank: smelting country with company
    uint dk = bk >> 6;
    typ = (dk % 16u < 9u) ? 2 : (dk % 16u < 12u) ? 4 : (dk % 16u < 14u) ? 10 : 8;
  } else {
    // east bank: assembly country, oil to the south
    uint dk = bk >> 6;
    if(ly >= ch - 8 && (dk & 3u) == 0u) typ = 9;
    else if(ly >= ch - 6 && (dk & 7u) == 1u) typ = 8;
    else typ = ((dk % 16u) < 3u) ? 10 : 4;
  }
  // stamped interiors: one key per TYPE, not per block
  uint tk = hashu(world ^ uint(typ) * 668265263u);

  // bus saturation profile, calibrated to the book's own belt census
  float tt = clamp(1.0 - abs(float(by - peak)) / (float(ch) * 0.55), 0.0, 1.0);
  float sat = clamp((0.10 + 0.90 * tt * tt) * mix(0.7, 1.15, back) * sci, 0.04, 1.0);

  float u = thr_u(pt);

  if(d == 0){
    // ───── the land: water, ore, spawner country at the rim ─────
    // magnified, the rim is elsewhere: the floor takes the ladder
    u *= mix(1.0, 0.22, clamp(P[1] / 8.0, 0.0, 1.0));
    if(u < 0.30){
      // lakes: a few hashed pools, one lapping the core's southwest
      int k = int(thr_u(pt) * 4.0);
      uint lk = hashu(world ^ uint(k) * 40503u ^ 0xACEDu);
      ivec2 c2 = ivec2(int(lk % 26u), int((lk >> 5) % 26u)) * (FDIE / 32) + FDIE / 12;
      if(k == 0) c2 = ivec2(cx0 * FBLK - FBLK / 2, (cy0 + ch) * FBLK - FBLK);
      int rad = FBLK + int(lk % 7u) * (FBLK / 3);
      float a = thr_u(pt) * 6.2831853;
      float rr = float(rad) * (0.55 + 0.45 * thr_u(pt));
      fo = vec2(c2) + vec2(cos(a), sin(a)) * rr
         + vec2(cos(a * 3.0 + float(lk % 9u)), sin(a * 2.0)) * float(rad) * 0.18;
      fmode = 4; fa = ivec2(fo); lay = 1; glow = 0.5;
    } else if(u < 0.62){
      // ore country: six patches sit under the six outposts (a mine
      // digs where the ore is), the rest lie wild and unworked
      int k = int(thr_u(pt) * 10.0);
      ivec2 c2;
      uint ok;
      if(k < 6){
        uint sk = hashu(world ^ uint(k) * 19391u ^ 0x0517u);
        bool west = (k & 1) == 0;
        int oy = (cy0 + 2 + int(sk % uint(max(ch - 4, 1)))) * FBLK + FBLK / 2;
        int ox = west ? cx0 * FBLK - (3 + int((sk >> 6) % 4u)) * FBLK
                      : (cx0 + cw) * FBLK + (3 + int((sk >> 6) % 4u)) * FBLK;
        c2 = ivec2(ox, oy); ok = sk;
      } else {
        ok = hashu(world ^ uint(k) * 30011u ^ 0x0BEu);
        c2 = ivec2(int(ok % 29u), int((ok >> 6) % 29u)) * (FDIE / 30);
        ivec2 rel = c2 - FCTR;
        if(abs(rel.x) < (cw / 2 + 3) * FBLK && abs(rel.y) < (ch / 2 + 3) * FBLK)
          c2 += ivec2((rel.x < 0 ? -1 : 1) * (cw / 2 + 5) * FBLK, 0);
      }
      float a = thr_u(pt) * 6.2831853;
      float rr = sqrt(thr_u(pt)) * float(FBLK) * (0.5 + float(ok % 5u) * 0.16);
      fo = vec2(c2) + vec2(cos(a), sin(a)) * rr * vec2(1.0, 0.7 + 0.006 * float(ok % 64u));
      fmode = 4; fa = ivec2(fo);
      int kind = int(ok % 5u);
      col = (kind == 0) ? vec3(0.45, 0.55, 0.72) : (kind == 1) ? vec3(0.85, 0.45, 0.20)
          : (kind == 2) ? vec3(0.22, 0.22, 0.26) : (kind == 3) ? vec3(0.66, 0.58, 0.44)
          : vec3(0.35, 0.90, 0.25);
      lay = -1; glow = (kind == 4) ? 1.6 : 0.9;
    } else if(u < 0.80){
      // spawner country: nests and worm dots far from the wall-less core
      int k = int(thr_u(pt) * 12.0);
      uint nk = hashu(world ^ uint(k) * 48611u ^ 0xB17Eu);
      ivec2 c2 = ivec2(int(nk % 31u), int((nk >> 6) % 31u)) * (FDIE / 31);
      ivec2 rel = c2 - FCTR;
      if(abs(rel.x) < (cw / 2 + 6) * FBLK) c2.x = (rel.x < 0) ? FBLK * 3 : FDIE - FBLK * 3;
      int m = int(thr_u(pt) * 8.0);
      uint mk = hashu(nk ^ uint(m) * 2654435761u);
      fct = c2 + ivec2(int(mk % 20481u) - 10240, int((mk >> 11) % 20481u) - 10240);
      fmode = 3; fr = 1600 + int(mk % 2400u);
      col = vec3(0.78, 0.36, 0.30); lay = -1; glow = 0.85;
    } else {
      // ground grain inside the core: concrete pale, grass dark
      if(!coreVis){ fmode = 0; }
      else {
        ivec2 g0 = max(blo, win.xy), g1 = min(blo + FBLK, win.zw);
        ivec2 pp = g0 + ivec2(int(thr_u(pt) * float(g1.x - g0.x)), int(thr_u(pt) * float(g1.y - g0.y)));
        fct = pp; fmode = 3; fr = 220;
        bool pave = (typ == 3 || typ == 7 || ((bk >> 8) & 3u) == 0u);
        col = pave ? vec3(0.20, 0.20, 0.21) : vec3(0.07, 0.10, 0.07);
        lay = -1; glow = mix(1.1, 0.5, night);
      }
    }
  } else if(d == 1){
    // ───── rails on the seams; spurs; trains where the hash parks them ─────
    if(u < 0.55 && coreVis){
      // the ring and every seam: double track at +-3 of the block edge,
      // exactly the book's geometry
      bool hz2 = thr_u(pt) < 0.5;
      int seam = (hz2 ? by : bx) * FBLK + FBLK; // south or east seam of block
      bool inner = thr_u(pt) < 0.5;
      int cc = seam + (inner ? -3 : 3) * FTL;
      bool onRing = hz2 ? (ly == 0 || ly == ch - 1 || lx == 0 || lx == cw - 1)
                        : (lx == 0 || lx == cw - 1 || ly == 0 || ly == ch - 1);
      bool seamRail = onRing || ((bk & 3u) == 0u);   // some interior seams carry rail
      if(!seamRail){ fmode = 0; }
      else {
        fmode = 1; fhz = hz2; fcc = cc; fw = 340;
        fa0 = (hz2 ? bx : by) * FBLK; fa1 = fa0 + FBLK;
        lay = 2; glow = 1.25;
        if(thr_u(pt) < 0.30){
          // sleepers: the 2-tile tie cadence reads as rail at distance
          int along = fa0 + (int(thr_u(pt) * 50.0) * 2 + 1) * FTL;
          fct = hz2 ? ivec2(along, seam + (inner ? -3 : 3) * FTL)
                    : ivec2(seam + (inner ? -3 : 3) * FTL, along);
          fmode = 3; fr = 700; glow = 0.55;
        }
      }
    } else if(u < 0.75 && coreVis){
      // a train: locomotive and four wagons, 28 tiles nose to tail
      bool hz2 = thr_u(pt) < 0.5;
      int seam = (hz2 ? by : bx) * FBLK + FBLK;
      uint trk = hashu(world ^ uint((hz2 ? by : bx) * 131 + (hz2 ? bx : by)) * 40503u ^ 0x7124u);
      if(u2f(trk) > trn * 0.55){ fmode = 0; }
      else {
        int nose = (hz2 ? bx : by) * FBLK + int((trk >> 8) % uint(FBLK - 28 * FTL));
        int car = int(thr_u(pt) * 5.0);
        int a0 = nose + car * 7 * FTL, a1 = a0 + 6 * FTL;
        int cc = seam + (((trk & 1u) == 0u) ? -3 : 3) * FTL;
        flo = hz2 ? ivec2(a0, cc - FTL) : ivec2(cc - FTL, a0);
        fhi = hz2 ? ivec2(a1, cc + FTL) : ivec2(cc + FTL, a1);
        fmode = 2; lay = -1;
        col = (car == 0) ? vec3(1.0, 0.78, 0.30) : vec3(0.62, 0.50, 0.92);
        glow = (car == 0) ? 1.2 : 0.8;
      }
    } else {
      // spur to a walled mining outpost, drills on the 3-and-4 pitch
      int k = int(thr_u(pt) * 6.0);
      uint sk = hashu(world ^ uint(k) * 19391u ^ 0x0517u);
      bool west = (k & 1) == 0;
      int oy = (cy0 + 2 + int(sk % uint(max(ch - 4, 1)))) * FBLK + FBLK / 2;
      int ox = west ? cx0 * FBLK - (3 + int((sk >> 6) % 4u)) * FBLK
                    : (cx0 + cw) * FBLK + (3 + int((sk >> 6) % 4u)) * FBLK;
      float uu = thr_u(pt);
      if(uu < 0.34){
        // the spur itself
        fmode = 1; fhz = true; fcc = oy + ((k & 1) == 0 ? -3 : 3) * FTL; fw = 340;
        fa0 = min(ox, cx0 * FBLK); fa1 = max(ox, (cx0 + cw) * FBLK);
        if(west){ fa0 = ox; fa1 = cx0 * FBLK; } else { fa0 = (cx0 + cw) * FBLK; fa1 = ox; }
        lay = 2; glow = 0.8;
      } else if(uu < 0.62){
        // the outpost wall: a 113-tile ring of teeth
        int side = int(thr_u(pt) * 4.0);
        int hw2 = 56 * FTL;
        bool hz3 = side < 2;
        int ec = (side == 0) ? oy - hw2 : (side == 1) ? oy + hw2
               : (side == 2) ? ox - hw2 : ox + hw2;
        fmode = 1; fhz = hz3; fcc = ec; fw = 900;
        fa0 = (hz3 ? ox : oy) - hw2; fa1 = (hz3 ? ox : oy) + hw2;
        lay = 9; glow = 0.7;
        if(thr_u(pt) < 0.22){ // turret file every second tile, one row in
          int along = fa0 + 2 * FTL * int(thr_u(pt) * 56.0);
          fct = hz3 ? ivec2(along, ec + (side == 0 ? 3 : -3) * FTL)
                    : ivec2(ec + (side == 2 ? 3 : -3) * FTL, along);
          fmode = 3; fr = 800; lay = 10; glow = 1.4;
        }
      } else {
        // the drill field: 3x3 drills, mirrored pairs on the 3/4 rhythm
        int r = int(thr_u(pt) * 15.0), c = int(thr_u(pt) * 16.0);
        int gx = ox - 27 * FTL + (c / 2) * 7 * FTL + (c & 1) * 3 * FTL;
        int gy = oy - 22 * FTL + r * 3 * FTL;
        flo = ivec2(gx, gy); fhi = flo + ivec2(3 * FTL);
        fmode = 2; lay = -1; col = vec3(1.0, 0.68, 0.28); glow = 0.75;
      }
    }
  } else if(!coreVis){
    fmode = 0;
  } else if(d == 2){
    // ───── block furniture the whole city shares ─────
    if(u < 0.30){
      // the lamp ring: pairs riding the road, warm at night
      int side = int(thr_u(pt) * 4.0);
      int k = int(thr_u(pt) * 8.0);
      int acr = ((side & 1) == 0 ? -1 : 1) * (13 * FTL) / 2;
      bool hz2 = side < 2;
      int base = (hz2 ? blo.y : blo.x) + ((side == 0 || side == 2) ? 0 : FBLK);
      int along = (hz2 ? blo.x : blo.y) + (k * 25 + 5) * FTL / 2;
      fct = hz2 ? ivec2(along, base + acr) : ivec2(base + acr, along);
      fmode = 3; fr = 300; lay = 8; glow = mix(0.25, 2.2, night);
    } else if(u < 0.52){
      // big poles at the book's 30/10 cadence, wire implied by cadence
      int side = int(thr_u(pt) * 4.0);
      int k = int(thr_u(pt) * 6.0);
      int off = (k == 0) ? -5 : (k == 1) ? 5 : (k == 2) ? 35 : (k == 3) ? 65 : (k == 4) ? 95 : 105;
      bool hz2 = side < 2;
      int base = (hz2 ? blo.y : blo.x) + ((side == 0 || side == 2) ? 0 : FBLK);
      int along = (hz2 ? blo.x : blo.y) + off * FTL;
      fct = hz2 ? ivec2(along, base) : ivec2(base, along);
      fmode = 3; fr = 520; lay = 7; glow = 0.8;
    } else if(u < 0.72){
      // roboports: a two by two at 25 and 75, coverage exactly tiling
      int k = int(thr_u(pt) * 4.0);
      fct = blo + ivec2(((k & 1) == 0 ? 25 : 75) * FTL, (k < 2 ? 25 : 75) * FTL);
      fmode = 3; fr = 1500; lay = 13; glow = 0.85;
      if(thr_u(pt) < 0.5){ fr = 700; glow = 1.3; } // the charging lights
    } else if(u < 0.80 && (typ == 0 || ((bk >> 5) & 7u) == 0u)){
      // one radar per road block, the book's corner habit
      fct = blo + ivec2(925, 75) * (FTL / 10);
      fmode = 3; fr = 1100; lay = 15; glow = 1.1;
    } else if(u < 0.92){
      // medium poles inside production blocks on the 7-tile lattice
      if(typ == 3 || typ == 0){ fmode = 0; }
      else {
        int gx = int(thr_u(pt) * 14.0), gy = int(thr_u(pt) * 14.0);
        fct = blo + ivec2(3 * FTL + gx * 7 * FTL, 3 * FTL + gy * 7 * FTL);
        fmode = 3; fr = 260; lay = 7; glow = 0.65;
      }
    } else {
      // the operator's habit: PC64 written in lamps by the silo
      if(typ != 7){ fmode = 0; }
      else {
        int ch2 = int(thr_u(pt) * 4.0);
        uint rows = (ch2 == 0) ? 0x7D1Fu : (ch2 == 1) ? 0x2A97u : (ch2 == 2) ? 0x624Fu : 0x113Fu;
        int rr = int(thr_u(pt) * 4.0), cc2 = int(thr_u(pt) * 4.0);
        if(((rows >> uint(rr * 4 + cc2)) & 1u) == 0u){ fmode = 0; }
        else {
          fct = blo + ivec2(58 * FTL + ch2 * 6 * FTL + cc2 * FTL, 88 * FTL + rr * FTL);
          fmode = 3; fr = 240; lay = 8; glow = mix(0.3, 2.4, night);
        }
      }
    }
  } else if(d == 3){
    // ───── each district's primary furniture, stamped from its type ─────
    if(typ == 3){
      // THE BUS: fourteen groups of four express lanes, five-tile
      // pitch. The salt is global and the occupancy is the local
      // saturation, so the surviving groups are a nested set: lanes
      // die off away from the peak exactly as the book's belt census
      // does, and the taper is structure, not shading.
      fmode = 5; tHz = false;
      tBase = blo.x + 15 * FTL + (3 * FTL) / 2; tPitch = 5 * FTL; tN = 14;
      tA0 = blo.y + 4 * FTL; tA1 = blo.y + FBLK - 4 * FTL;
      tW = 3 * FTL + FTL / 2; tOcc = clamp(sat * 1.35, 0.05, 1.0); tDot = 0.0;
      tSalt = tk; lay = 3; glow = 0.55 + 0.75 * sat;
    } else if(typ == 2){
      // smelter: paired furnace rows on the measured 3-7-3 rhythm
      ivec2 prs = thr_span(blo.y + 3 * FTL, 10 * FTL, 10, win.y - 6 * FTL, win.w);
      int cnt = 2 + int(24.0 * min(sci, 1.25));
      ivec2 ccs = thr_span(blo.x + 4 * FTL, 3 * FTL, cnt, win.x - 3 * FTL, win.z);
      if(prs.x > prs.y || ccs.x > ccs.y){ fmode = 0; }
      else {
      int pr = prs.x + int(thr_u(pt) * float(prs.y - prs.x + 1));
      int row = min(pr, prs.y) * 10 + ((thr_u(pt) < 0.5) ? 3 : 6);
      int cc2 = ccs.x + int(thr_u(pt) * float(ccs.y - ccs.x + 1));
      cc2 = min(cc2, ccs.y);
      flo = blo + ivec2(4 * FTL + cc2 * 3 * FTL, row * FTL);
      fhi = flo + ivec2(3 * FTL, 3 * FTL);
      fmode = 2; lay = -1;
      col = vec3(0.44, 0.39, 0.36); glow = 0.95;
      if(thr_u(pt) < 0.5){ // the mouth glows with the charge
        fct = flo + ivec2(3 * FTL / 2); fmode = 3; fr = 520;
        lay = 4; glow = mix(1.1, 2.3, night) * (0.4 + 0.6 * sat);
      }
      }
    } else if(typ == 4 || typ == 10){
      // assembly: machine rows with working lights, hub blocks denser
      ivec2 prs = thr_span(blo.y + 5 * FTL, 12 * FTL, 8, win.y - 3 * FTL, win.w);
      int cnt = 2 + int(20.0 * min(sci, 1.25));
      ivec2 ccs = thr_span(blo.x + 5 * FTL, 4 * FTL, cnt, win.x - 3 * FTL, win.z);
      if(prs.x > prs.y || ccs.x > ccs.y){ fmode = 0; }
      else {
      int pr = prs.x + int(thr_u(pt) * float(prs.y - prs.x + 1));
      int row = 5 + min(pr, prs.y) * 12;
      int cc2 = ccs.x + int(thr_u(pt) * float(ccs.y - ccs.x + 1));
      cc2 = min(cc2, ccs.y);
      flo = blo + ivec2(5 * FTL + cc2 * 4 * FTL, row * FTL);
      fhi = flo + ivec2(3 * FTL, 3 * FTL);
      fmode = 2; lay = -1;
      col = vec3(0.24, 0.44, 0.42); glow = 1.1;
      if(thr_u(pt) < 0.35){
        fct = flo + ivec2(3 * FTL / 2); fmode = 3; fr = 380;
        lay = 5; glow = 1.8;
      }
      if(typ == 10 && thr_u(pt) < 0.45){ // the hub's chest field
        fct = blo + ivec2(int(thr_u(pt) * 90.0 + 5.0) * FTL, int(thr_u(pt) * 20.0 + 75.0) * FTL);
        fmode = 3; fr = 300; lay = 13; glow = 1.0;
      }
      }
    } else if(typ == 6){
      // nuclear: reactor pair, heat cross, turbine banks
      float uu = thr_u(pt);
      if(uu < 0.22){
        flo = blo + ivec2(45 * FTL, 40 * FTL) + ivec2((thr_u(pt) < 0.5 ? 0 : 5) * FTL, 0);
        fhi = flo + ivec2(5 * FTL, 5 * FTL);
        fmode = 2; lay = -1; col = vec3(0.30, 0.85, 0.45); glow = 1.8;
      } else if(uu < 0.50){
        bool hz2 = thr_u(pt) < 0.5;
        fmode = 1; fhz = hz2;
        fcc = (hz2 ? blo.y + 42 * FTL : blo.x + 47 * FTL) + int(thr_u(pt) * 3.0) * FTL;
        fa0 = (hz2 ? blo.x : blo.y) + 8 * FTL; fa1 = fa0 + 84 * FTL;
        fw = 700; lay = 14; glow = 1.6;
      } else {
        fmode = 5; tHz = true;
        tBase = blo.y + 8 * FTL; tPitch = 4 * FTL; tN = 8;
        tA0 = blo.x + 8 * FTL; tA1 = blo.x + 92 * FTL;
        tW = 3 * FTL; tOcc = 0.85; tDot = 0.15;
        tSalt = tk ^ 0x77u; lay = 7; glow = 0.6;
      }
    } else if(typ == 7){
      // the corner office: labs, the silo, the landing pad
      float uu = thr_u(pt);
      if(uu < 0.14 && ((bk >> 4) & 3u) == 0u){
        flo = blo + ivec2(60 * FTL, 30 * FTL); fhi = flo + ivec2(9 * FTL, 9 * FTL);
        fmode = 2; lay = 15; glow = 1.5;
      } else if(uu < 0.6){
        int r = int(thr_u(pt) * 6.0), c = int(thr_u(pt) * 12.0);
        flo = blo + ivec2(5 * FTL + c * 4 * FTL, 8 * FTL + r * 8 * FTL);
        fhi = flo + ivec2(3 * FTL, 3 * FTL);
        fmode = 2; lay = -1; col = vec3(0.34, 0.15, 0.26); glow = 0.8;
        if(thr_u(pt) < 0.4){ fct = flo + ivec2(3 * FTL / 2); fmode = 3; fr = 420; lay = 6; glow = 1.5; }
      } else {
        fct = blo + ivec2(int(thr_u(pt) * 40.0 + 5.0) * FTL, int(thr_u(pt) * 18.0 + 76.0) * FTL);
        fmode = 3; fr = 300; lay = 13; glow = 0.95;
      }
    } else if(typ == 8){
      // solar: the 7-lattice tiling, panels against accumulators 25:21
      ivec2 gxs = thr_span(blo.x, 7 * FTL, 14, win.x - 7 * FTL, win.z);
      ivec2 gys = thr_span(blo.y, 7 * FTL, 14, win.y - 7 * FTL, win.w);
      if(gxs.x > gxs.y || gys.x > gys.y){ fmode = 0; }
      else {
      int gx = gxs.x + min(int(thr_u(pt) * float(gxs.y - gxs.x + 1)), gxs.y - gxs.x);
      int gy = gys.x + min(int(thr_u(pt) * float(gys.y - gys.x + 1)), gys.y - gys.x);
      ivec2 cell = blo + ivec2(gx * 7 * FTL, gy * 7 * FTL) + 3 * FTL / 2;
      uint ck = hashu(tk ^ uint(gx * 17 + gy) * 40503u);
      bool acc = ((ck >> 3) % 25u) < 11u;
      flo = cell + ivec2(int(ck % 3u), int((ck >> 8) % 3u)) * FTL;
      fhi = flo + (acc ? ivec2(2 * FTL) : ivec2(3 * FTL));
      fmode = 2; lay = -1;
      col = acc ? vec3(0.48, 0.48, 0.62) : vec3(0.32, 0.30, 0.60);
      glow = acc ? 0.95 : mix(1.2, 0.7, night);
      }
    } else if(typ == 9){
      // oil: refinery pentagons as five-tile bodies, tanks, pipe runs
      float uu = thr_u(pt);
      if(uu < 0.30){
        int r = int(thr_u(pt) * 3.0), c = int(thr_u(pt) * 6.0);
        flo = blo + ivec2(6 * FTL + c * 8 * FTL, 8 * FTL + r * 10 * FTL);
        fhi = flo + ivec2(5 * FTL, 5 * FTL);
        fmode = 2; lay = -1; col = vec3(0.42, 0.32, 0.55); glow = 0.85;
      } else if(uu < 0.55){
        int r = int(thr_u(pt) * 2.0), c = int(thr_u(pt) * 5.0);
        fct = blo + ivec2(10 * FTL + c * 9 * FTL, 48 * FTL + r * 9 * FTL);
        fmode = 3; fr = 1100; lay = 11; glow = 0.7;
      } else {
        fmode = 5; tHz = (thr_u(pt) < 0.5);
        tBase = (tHz ? blo.y : blo.x) + 62 * FTL; tPitch = 2 * FTL; tN = 9;
        tA0 = (tHz ? blo.x : blo.y) + 4 * FTL; tA1 = tA0 + 92 * FTL;
        tW = FTL / 2; tOcc = 0.7; tDot = 0.3;
        tSalt = tk ^ 0x0117u; lay = 11; glow = 0.65;
      }
    } else if(typ == 1 || typ == 5){
      // station: platforms, chest files, and the parked consist
      float uu = thr_u(pt);
      int py = blo.y + 12 * FTL + int((bk >> 9) % 3u) * 24 * FTL;
      if(uu < 0.30){
        fmode = 1; fhz = false;
        fcc = blo.x + (typ == 1 ? 30 : 70) * FTL + (thr_u(pt) < 0.5 ? -3 : 3) * FTL;
        fa0 = blo.y + 4 * FTL; fa1 = blo.y + 96 * FTL;
        fw = 340; lay = 2; glow = 0.9;
      } else if(uu < 0.62){
        int k = int(thr_u(pt) * 24.0);
        int cx2 = blo.x + (typ == 1 ? 34 : 62) * FTL;
        fct = ivec2(cx2 + (thr_u(pt) < 0.5 ? 0 : 2 * FTL), blo.y + (8 + k * 7 / 2) * FTL);
        fmode = 3; fr = 340; lay = 13; glow = 0.95;
      } else {
        uint pk = hashu(bk ^ 0x424Du);
        if(u2f(pk) > trn){ fmode = 0; }
        else {
          int car = int(thr_u(pt) * 5.0);
          int a0 = py + car * 7 * FTL;
          int cc2 = blo.x + (typ == 1 ? 30 : 70) * FTL - 3 * FTL;
          flo = ivec2(cc2 - FTL, a0); fhi = ivec2(cc2 + FTL, a0 + 6 * FTL);
          fmode = 2; lay = -1;
          col = (car == 0) ? vec3(1.0, 0.78, 0.30) : vec3(0.62, 0.50, 0.92);
          glow = 0.95;
        }
      }
    } else { fmode = 0; }
  } else if(d == 4){
    // ───── the feed layer: belts into machines, inserters, splitters ─────
    if(typ == 2 || typ == 4 || typ == 10 || typ == 7){
      float uu = thr_u(pt);
      int rp = (typ == 2) ? 10 : (typ == 4 || typ == 10) ? 12 : 8;
      int rows = (typ == 2) ? 10 : 8;
      int pr = int(thr_u(pt) * float(rows));
      if(uu < 0.5){
        // in and out lanes hugging the machine rows
        fmode = 1; fhz = true;
        fcc = blo.y + (pr * rp + (thr_u(pt) < 0.5 ? 1 : (rp - 1))) * FTL + FTL / 2;
        fa0 = blo.x + 4 * FTL; fa1 = blo.x + 96 * FTL;
        fw = 700; lay = 3; glow = 0.6 + 0.6 * sat;
      } else {
        // the inserter files between, amber wrists at work
        int cc2 = int(thr_u(pt) * 30.0);
        fct = blo + ivec2((4 + cc2 * 3) * FTL + FTL / 2, (pr * rp + 2) * FTL + FTL / 2);
        fmode = 3; fr = 240; lay = -1;
        col = vec3(0.35, 0.95, 0.45); glow = 1.3;
      }
    } else if(typ == 3){
      // the bus resolved: one lane, its undergrounds, its splitters;
      // the same nested survival as the ribbons above
      int g = int(thr_u(pt) * 14.0), l = int(thr_u(pt) * 4.0);
      int lx2 = blo.x + 15 * FTL + g * 5 * FTL + l * FTL + FTL / 2;
      if(u2f(hashu(tk ^ uint(g) * 2654435761u)) > clamp(sat * 1.35, 0.05, 1.0)){ fmode = 0; }
      else {
      float uu = thr_u(pt);
      if(uu < 0.72){
        fmode = 1; fhz = false; fcc = lx2;
        fa0 = blo.y + 4 * FTL; fa1 = blo.y + 96 * FTL;
        fw = 760; lay = 3; glow = 0.45 + 0.75 * sat;
      } else if(uu < 0.88){
        // underground dive at the seam: two arrows, a held breath
        fct = ivec2(lx2, blo.y + (thr_u(pt) < 0.5 ? 2 : 98) * FTL);
        fmode = 3; fr = 400; lay = 3; glow = 1.1;
      } else {
        uint sk2 = hashu(bk ^ uint(g * 7 + l) * 19391u);
        if((sk2 & 7u) != 0u){ fmode = 0; }
        else {
          fct = ivec2(lx2, blo.y + int((sk2 >> 4) % 88u + 6u) * FTL);
          fmode = 3; fr = 520; lay = 3; glow = 1.3;
        }
      }
      }
    } else { fmode = 0; }
  } else if(d == 5){
    // ───── walls where the map needs teeth; pipes; platform lamps ─────
    if(typ == 9 && thr_u(pt) < 0.6){
      bool hz2 = thr_u(pt) < 0.5;
      fmode = 1; fhz = hz2;
      fcc = (hz2 ? blo.y : blo.x) + int(thr_u(pt) * 90.0 + 5.0) * FTL;
      int a0 = (hz2 ? blo.x : blo.y) + int(thr_u(pt) * 40.0) * FTL;
      fa0 = a0; fa1 = a0 + int(thr_u(pt) * 30.0 + 6.0) * FTL;
      fw = 420; lay = 11; glow = 0.6;
    } else if((typ == 1 || typ == 5) && thr_u(pt) < 0.5){
      int k = int(thr_u(pt) * 12.0);
      fct = blo + ivec2((typ == 1 ? 27 : 73) * FTL, (8 * k + 6) * FTL);
      fmode = 3; fr = 240; lay = 8; glow = mix(0.3, 1.8, night);
    } else if(typ == 2 && thr_u(pt) < 0.5){
      // steel chests catching plates at row ends
      int pr = int(thr_u(pt) * 10.0);
      fct = blo + ivec2((thr_u(pt) < 0.5 ? 3 : 97) * FTL, (pr * 10 + 4) * FTL);
      fmode = 3; fr = 330; lay = 13; glow = 0.9;
    } else { fmode = 0; }
  } else {
    // ───── d >= 6: the flow itself - item slots under the hash ─────
    // A lane is slots every quarter tile; a slot is occupied when its
    // address hashes under the local saturation. BACKPRESSURE clumps
    // the survivors the way a jam does.
    int lane = 0, lx2 = 0, la0 = 0, la1 = 0, cls = 0;
    float occ = 0.0;
    int wl0 = 0, wl1 = 0;
    if(typ == 3){
      // the lane index clips to the window like every other grid
      ivec2 gs = thr_span(blo.x + 15 * FTL, 5 * FTL, 14, win.x - 5 * FTL, win.z);
      if(gs.x > gs.y){ fmode = 0; lane = -1; }
      int g = (lane < 0) ? 0 : gs.x + min(int(thr_u(pt) * float(gs.y - gs.x + 1)), gs.y - gs.x);
      int l = int(thr_u(pt) * 4.0);
      lx2 = blo.x + 15 * FTL + g * 5 * FTL + l * FTL + FTL / 2;
      la0 = blo.y + 4 * FTL; la1 = blo.y + 96 * FTL;
      uint lk2 = hashu(world ^ uint(g * 4 + l) * 2246822519u);
      cls = int(lk2 % 8u);
      // backpressure acts on occupancy itself: a jam packs the lane
      // even where the taper already runs full
      occ = sat * (0.55 + 0.55 * u2f(lk2)) * mix(0.80, 1.40, back);
      if(u2f(hashu(tk ^ uint(g) * 2654435761u)) > clamp(sat * 1.35, 0.05, 1.0)) occ = 0.0;
      if(lane == 0) lane = 1;
    } else if(typ == 2 || typ == 4 || typ == 10){
      int rp = (typ == 2) ? 10 : 12;
      ivec2 prs = thr_span(blo.y, rp * FTL, 10, win.y - rp * FTL, win.w);
      if(prs.x > prs.y){ fmode = 0; lane = -1; }
      int pr = (lane < 0) ? 0 : prs.x + min(int(thr_u(pt) * float(prs.y - prs.x + 1)), prs.y - prs.x);
      bool inLane = thr_u(pt) < 0.5;
      int cc2 = blo.y + (pr * rp + (inLane ? 1 : (rp - 1))) * FTL + FTL / 2;
      lx2 = cc2; la0 = blo.x + 4 * FTL; la1 = blo.x + 96 * FTL;
      cls = (typ == 2) ? (inLane ? 0 : 5) : (typ == 10 ? 7 : (inLane ? 2 : 3));
      if(typ == 2 && ((tk >> 7) & 1u) == 1u) cls = 1;
      occ = clamp(sat * (inLane ? 1.0 : 0.75) * mix(0.80, 1.40, back), 0.05, 1.0);
      if(lane == 0) lane = 2;
    } else { fmode = 0; }
    if(lane > 0){
      // slots are absolute addresses; the window clips the index range
      wl0 = (lane == 1) ? win.y : win.x;
      wl1 = (lane == 1) ? win.w : win.z;
      int slots = (la1 - la0) / FIT;
      int s0 = (wl0 <= la0) ? 0 : (wl0 - la0) / FIT;
      int s1 = (wl1 < la0) ? -1 : min(slots - 1, (wl1 - la0) / FIT);
      if(s1 < s0){ lane = 0; fmode = 0; }
      else {
      int i = s0 + min(int(thr_u(pt) * float(s1 - s0 + 1)), s1 - s0);
      uint ik = hashu(uint(lx2) ^ uint(i) * 2654435761u ^ world);
      // jammed lanes keep runs of eight; starved lanes keep loners
      uint gk = hashu(uint(lx2) ^ uint(i >> 3) * 40503u ^ world ^ 0x1A6u);
      float keep = mix(u2f(ik), u2f(gk), back * 0.85);
      if(keep > occ){ fmode = 0; }
      else {
        int along = la0 + i * FIT + FIT / 2;
        ivec2 c2 = (lane == 1) ? ivec2(lx2 + ((int(ik >> 9) & 1) * 2 - 1) * (FTL / 4), along)
                               : ivec2(along, lx2 + ((int(ik >> 9) & 1) * 2 - 1) * (FTL / 4));
        if(d >= 7 && mag > 300.0){
          // close enough to matter: the item grows its silhouette -
          // slabs for plates, a pin-grid board for circuits, teeth
          // for the gear, a disc for what pours and what bubbles
          int shape = (cls == 7) ? 2 : (cls >= 2 && cls <= 4) ? 1 : (cls == 6 || cls == 8) ? 3 : 0;
          float p = thr_u(pt);
          if(shape == 0){
            vec2 hs = vec2(380.0, 260.0);
            fo = vec2(c2) + ((p < 0.25) ? vec2(mix(-hs.x, hs.x, p * 4.0), -hs.y)
               : (p < 0.5)  ? vec2(hs.x, mix(-hs.y, hs.y, (p - 0.25) * 4.0))
               : (p < 0.75) ? vec2(mix(hs.x, -hs.x, (p - 0.5) * 4.0), hs.y)
               :              vec2(-hs.x, mix(hs.y, -hs.y, (p - 0.75) * 4.0)));
          } else if(shape == 1){
            if(p < 0.55){
              float e = (p / 0.55) * 4.0;
              float t = fract(e) * 600.0 - 300.0;
              int side = int(e);
              fo = vec2(c2) + ((side == 0) ? vec2(t, -300.0) : (side == 1) ? vec2(300.0, t)
                             : (side == 2) ? vec2(t, 300.0) : vec2(-300.0, t));
            } else {
              fo = vec2(c2) + vec2(float(int(thr_u(pt) * 3.0) - 1), float(int(thr_u(pt) * 3.0) - 1)) * 170.0;
            }
          } else if(shape == 2){
            float a = thr_u(pt) * 6.2831853;
            bool tooth = thr_u(pt) < 0.35;
            if(tooth) a = (floor(a * 1.2732395) + 0.5) * 0.7853982;
            fo = vec2(c2) + vec2(cos(a), sin(a)) * (tooth ? 400.0 : 290.0);
          } else {
            float a = thr_u(pt) * 6.2831853;
            fo = vec2(c2) + vec2(cos(a), sin(a)) * 280.0;
          }
          fmode = 4; fa = c2;
        } else {
          fct = c2; fmode = 3; fr = (mag > 300.0) ? 90 : 230;
        }
        lay = -1; col = thr_item(cls); glow = 1.7;
      }
      }
    }
  }

  // ───── the engines: one call site each ─────
  bool hit = false;
  vec2 xy = vec2(0.0);
  if(fmode == 1){
    // the wire samples only the stretch the window can see
    fa0 = max(fa0, fhz ? win.x : win.y);
    fa1 = min(fa1, fhz ? win.z : win.w);
    if(fa0 >= fa1){ hit = false; }
    else {
      int along = fa0 + int(thr_u(pt) * float(fa1 - fa0));
      ivec2 c2 = fhz ? ivec2(along, fcc) : ivec2(fcc, along);
      if(c2.x < win.x || c2.x > win.z || c2.y < win.y || c2.y > win.w){ hit = false; }
      else {
        float across = (thr_u(pt) - 0.5) * float(fw);
        xy = vec2(c2) + (fhz ? vec2(0.0, across) : vec2(across, 0.0));
        hit = true;
      }
    }
  } else if(fmode == 2){
    ivec2 clo = max(flo, win.xy), chi = min(fhi, win.zw);
    if(clo.x >= chi.x || clo.y >= chi.y){ hit = false; }
    else {
      xy = vec2(clo) + vec2(thr_u(pt), thr_u(pt)) * vec2(chi - clo);
      hit = true;
    }
  } else if(fmode == 3){
    if(fct.x + fr < win.x || fct.x - fr > win.z || fct.y + fr < win.y || fct.y - fr > win.w){ hit = false; }
    else {
      float a = thr_u(pt) * 6.2831853;
      float rr2 = sqrt(thr_u(pt)) * float(fr);
      xy = vec2(fct) + vec2(cos(a), sin(a)) * rr2;
      hit = true;
    }
  } else if(fmode == 4){
    xy = fo;
    hit = !(fa.x < win.x || fa.x > win.z || fa.y < win.y || fa.y > win.w);
  } else if(fmode == 5){
    // runs and their indexes both clip to the window; the run keeps
    // its absolute index so occupancy stays addressed
    ivec2 ks = thr_span(tBase, tPitch, tN,
                        (tHz ? win.y : win.x) - tW, (tHz ? win.w : win.z) + tW);
    int a0 = max(tA0, tHz ? win.x : win.y);
    int a1 = min(tA1, tHz ? win.z : win.w);
    if(ks.x > ks.y || a0 >= a1){ hit = false; }
    else {
    int k = ks.x + min(int(thr_u(pt) * float(ks.y - ks.x + 1)), ks.y - ks.x);
    int cc2 = tBase + k * tPitch;
    uint rk = hashu(tSalt ^ uint(k) * 2654435761u);
    if(u2f(rk) > tOcc){ hit = false; }
    else {
      int along = a0 + int(thr_u(pt) * float(max(a1 - a0, 1)));
      ivec2 c2 = tHz ? ivec2(along, cc2) : ivec2(cc2, along);
      if(c2.x < win.x || c2.x > win.z || c2.y < win.y || c2.y > win.w){ hit = false; }
      else if(tDot > 0.0 && thr_u(pt) < tDot){
        xy = vec2(c2); hit = true; glow *= 1.5;
      } else {
        float across = (thr_u(pt) - 0.5) * float(tW);
        xy = vec2(c2) + (tHz ? vec2(0.0, across) : vec2(across, 0.0));
        hit = true;
      }
    }
    }
  }

  if(!hit){
    col = vec3(0.0);
    return vec3(0.0, -20000.0, 0.0);
  }
  if(lay >= 0) col = thr_lay(lay);
  col *= glow;
  // night pulls the ambient classes down and lets the lit ones carry
  if(lay == 0 || lay == 1 || lay == 12) col *= mix(1.0, 0.45, night);
  col = thr_stain(col, stain);

  vec2 rel = (xy - vec2(wc)) * km;
  return vec3(rel.x, rel.y, 0.0);
}
`});
