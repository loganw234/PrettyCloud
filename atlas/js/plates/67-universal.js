"use strict";
Atlas.registerPlate({
  id: "universal",
  name: "The Universal Rule",
  roman: "LXVII",
  accent: "#e09a6f",
  tex: "a_i' = (a_i \\lor a_{i+1})\\land\\lnot(a_{i-1}\\land a_i\\land a_{i+1}),\\qquad 110 = 01101110_2",
  plain: "a′ = (center OR right) AND NOT(all three);  110 = 01101110₂   (Cook: universal)",
  caption: "One rule to the right of pure chaos sits something stranger: computation. Rule 110 runs on an ether, a fourteen-cell vacuum that copies itself four cells over every step, and against that background localized packets - gliders - travel, collide, annihilate, and hand information along. In 1985 Wolfram conjectured the rule was universal; Matthew Cook proved it, presented it at Santa Fe in 1998, was withheld from the proceedings while Wolfram Research sued him over his non-disclosure agreement, and published in 2004 once the suit settled: any computation whatever can be staged as a traffic of these gliders, cyclic tag systems all the way down. This plate is built the way the proof is: the seed row is the pure vacuum with DEFECTS single cells flipped, and everything that ever appears afterwards is the rule's own doing. The light is the vacuum subtracted - a cell whose surrounding phrase matches no displacement of the ether burns as particle, ether displaced from the reference phase reads as domain, tinted by its own measured displacement, and the undisturbed fabric barely glows. Eleventh of the Mk2 series: the worldlines are not drawn, they are what refuses to be background.",
  cam: { dist: 3.0, pitch: 0.22, tgtY: 0.0, rot: 0.0 },
  gain: 0.55,
  params: [
    { label: "DEPTH",   min: 7, max: 15,  step: 1,    def: 9    },
    { label: "MAGNIFY", min: 0, max: 14,  step: 0.25, def: 0    },
    { label: "DEFECTS", min: 0, max: 48,  step: 1,    def: 6    },
    { label: "WORLD",   min: 1, max: 64,  step: 1,    def: 1    },
    { label: "FABRIC",  min: 0, max: 1,   step: 0.01, def: 0.30 },
    { label: "DOMAINS", min: 0, max: 1,   step: 0.01, def: 0.40 },
    { label: "COLUMNS", min: 1, max: 16,  step: 1,    def: 1    },
    { label: "STAIN",   min: 0, max: 1,   step: 0.01, def: 0.5  }
  ],
  glsl: `
// ── the vacuum, and what survives against it ──
// Rule 110 runs on an ether: a 14-cell background that reproduces
// itself shifted four cells per step, ether(t,x) = tile bit (x+4t)
// mod 14. On that vacuum, localized packets - Cook's gliders - carry
// information, collide, and compute; his proof that this single line
// of boolean algebra is a universal computer leans entirely on them.
// The ring is 448 cells, exactly 32 ether tiles, so the vacuum closes
// seamlessly; DEFECTS flips single cells of the initial ether and
// everything else that ever appears is the rule's own doing.
//
// Three channels of light, all measured per cell after the honest
// iteration: a cell whose surrounding 14-cell phrase matches NO
// rotation of the tile is particle and burns; a cell in ether that
// is displaced from the reference phase is domain, tinted by its own
// measured displacement; undisturbed ether is fabric, faint.
const int U110_SUB = 1024;
const int U110_GUT = 21;           // gutter between columns, in cells
const int U110_TILE = 0x3b23;      // the ether tile, LSB = cell 0

float u110_u(inout uint s){ s = hashu(s); return u2f(s); }

vec3 u110_stain(vec3 c, float a){
  float cs = cos(a), sn = sin(a);
  vec3 k = vec3(0.57735027);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}

vec3 shape_universal(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 951274213u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  int   rowsT = 1 << int(P[0] + 0.5);
  float mag   = exp2(P[1]);
  int   defs  = int(P[2] + 0.5);
  uint  world = uint(P[3] + 0.5) * 2654435761u;
  float fab   = P[4];
  float dom   = P[5];
  int   V     = int(P[6] + 0.5);
  float stain = (P[7] - 0.5) * 2.2;
  const int C = 448;

  // ── the sheet, V columns of the one run ──
  int rpp  = (rowsT + V - 1) / V;
  int colW = (C + U110_GUT) * U110_SUB;
  int WU = V * colW - U110_GUT * U110_SUB;
  int HU = rpp * U110_SUB;
  ivec2 ctr = ivec2(WU / 2, HU / 2);
  ivec2 heart = ivec2((V - 1) * colW + (C * U110_SUB) / 2, HU - HU / 8);
  ivec2 wc = ctr + ivec2(vec2(heart - ctr) * (1.0 - 1.0 / mag));
  int hwx = int(float(WU / 2) / mag);
  int hwy = int(float(HU / 2) / mag);
  ivec4 win = ivec4(wc.x - hwx, wc.y - hwy, wc.x + hwx, wc.y + hwy);
  float km = min(2.6 / float(WU), 3.0 / float(HU)) * mag;

  // ── choose a visible cell, uniform over visible area ──
  int rlo = max(0, win.y / U110_SUB);
  int rhi0 = min(rpp - 1, win.w / U110_SUB);
  if(rhi0 < rlo){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
  int wsum[16];
  int acc = 0;
  for(int c = 0; c < 16; c++){
    wsum[c] = 0;
    if(c < V){
      int x0 = max(win.x, c * colW), x1 = min(win.z, c * colW + C * U110_SUB);
      int tmaxc = min(rpp, rowsT - c * rpp);
      int rr = min(rhi0, tmaxc - 1) - rlo + 1;
      if(x1 > x0 && rr > 0) wsum[c] = ((x1 - x0) >> 10) * rr;
      acc += wsum[c];
    }
  }
  if(acc <= 0){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
  pt = hashu(pt);
  int pick = int(u2f(pt) * float(acc));
  int cidx = 0; int run = 0;
  for(int c = 0; c < 16; c++){
    run += wsum[c];
    if(pick >= run - wsum[c] && pick < run && wsum[c] > 0) cidx = c;
  }
  int tmax = min(rpp, rowsT - cidx * rpp);
  int rhi = min(rhi0, tmax - 1);
  pt = hashu(pt);
  int tl = rlo + int(u2f(pt) * float(rhi - rlo + 1));
  tl = min(tl, rhi);
  int t = cidx * rpp + tl;

  int xbase = cidx * colW;
  int k0 = max(0, (win.x - xbase) / U110_SUB);
  int k1 = min(C - 1, (win.z - xbase) / U110_SUB);
  if(k1 < k0){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
  pt = hashu(pt);
  int x = k0 + int(u2f(pt) * float(k1 - k0 + 1));
  x = min(x, k1);

  // ── the seed row: the pure vacuum, then DEFECTS flipped cells ──
  uint row[14];
  row[0] = 0x3ec8fb23u; row[1] = 0x23ec8fb2u; row[2] = 0xb23ec8fbu;
  row[3] = 0xfb23ec8fu; row[4] = 0x8fb23ec8u; row[5] = 0xc8fb23ecu;
  row[6] = 0xec8fb23eu; row[7] = 0x3ec8fb23u; row[8] = 0x23ec8fb2u;
  row[9] = 0xb23ec8fbu; row[10] = 0xfb23ec8fu; row[11] = 0x8fb23ec8u;
  row[12] = 0xc8fb23ecu; row[13] = 0xec8fb23eu;
  uint da = hashu(world ^ 0xD3F3u);
  for(int d = 0; d < 48; d++){
    if(d >= defs) break;
    da = hashu(da);
    int px = int(u2f(da) * float(C));
    px = min(px, C - 1);
    int pw = px >> 5;
    uint pb = 1u << uint(px & 31);
    for(int w = 0; w < 14; w++) if(w == pw) row[w] ^= pb;
  }

  // ── the toll: t applications of rule 110, the wrap fully static ──
  uint nw[14];
  for(int it = 0; it < t; it++){
    for(int w = 0; w < 14; w++){
      uint lw = (w == 0) ? row[13] : row[w - 1];
      uint rw = (w == 13) ? row[0] : row[w + 1];
      uint cw = row[w];
      uint L = (cw << 1) | (lw >> 31);
      uint R = (cw >> 1) | (rw << 31);
      nw[w] = (cw | R) & ~(L & cw & R);
    }
    for(int w = 0; w < 14; w++) row[w] = nw[w];
  }

  // the cell
  uint wsel = 0u;
  for(int w = 0; w < 14; w++) if(w == (x >> 5)) wsel = row[w];
  uint bit = (wsel >> uint(x & 31)) & 1u;
  if(bit == 0u){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }

  // the surrounding phrase: 14 cells starting at x-6, via the two
  // words that span it
  int x0p = x - 6; if(x0p < 0) x0p += C;
  int wA = x0p >> 5;
  int wB = wA + 1; if(wB == 14) wB = 0;
  uint sA = 0u, sB = 0u;
  for(int w = 0; w < 14; w++){ if(w == wA) sA = row[w]; if(w == wB) sB = row[w]; }
  uint sh = uint(x0p & 31);
  uint seg = (sh == 0u) ? sA : ((sA >> sh) | (sB << (32u - sh)));
  uint phrase = seg & 0x3FFFu;

  // which displacement of the vacuum is this, if any? phrase matches
  // offset o when phrase == tile rotated right by o; pure phase-0
  // ether at (t, x) matches o0 = (x - 6 + 4t) mod 14
  int oMatch = -1;
  for(int o = 0; o < 14; o++){
    uint rot = ((uint(U110_TILE) >> uint(o)) | (uint(U110_TILE) << uint(14 - o))) & 0x3FFFu;
    if(phrase == rot) oMatch = o;
  }
  int o0 = (x - 6 + 4 * t) % 14; if(o0 < 0) o0 += 14;

  float glow;
  float hue;
  if(oMatch < 0){
    // particle: no displacement of the vacuum explains this cell
    glow = 2.1;
    hue = 0.06;
  } else {
    int delta = oMatch - o0; if(delta < 0) delta += 14;
    if(delta == 0){
      if(fab <= 0.003){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
      glow = 0.16 * fab;
      hue = 0.62;
    } else {
      if(dom <= 0.003){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
      // domain: tinted by its own measured displacement
      glow = 0.34 * dom;
      hue = 0.30 + 0.55 * float(delta) / 14.0;
    }
  }

  ivec2 cellLo = ivec2(xbase + x * U110_SUB, tl * U110_SUB);
  float fox = u110_u(pt);
  float foy = u110_u(pt);
  vec2 seat = (vec2(cellLo - wc) + vec2(fox, foy) * float(U110_SUB) * 0.94) * km;

  col = pal(hue,
            vec3(0.50, 0.44, 0.38), vec3(0.48, 0.42, 0.40),
            vec3(1.0, 0.9, 0.7), vec3(0.02, 0.22, 0.48))
        * glow;
  col = u110_stain(col, stain);
  float z = (rnd.y - 0.5) * 0.02;
  return vec3(seat.x, -seat.y, z);
}`
});
