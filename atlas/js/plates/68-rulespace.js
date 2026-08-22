"use strict";
Atlas.registerPlate({
  id: "rulespace",
  name: "The Rule Space",
  roman: "LXVIII",
  accent: "#c9b8ff",
  tex: "a_i' = f(a_{i-1}, a_i, a_{i+1}),\\qquad f \\in \\{0,1\\}^{\\{0,1\\}^3},\\qquad |\\,\\mathcal{F}\\,| = 256",
  plain: "a′ = f(left, center, right) for every possible f: all 256 elementary rules",
  caption: "Two states, three neighbours: there are exactly two hundred fifty-six possible laws, and this plate runs all of them at once, arranged by their Wolfram number, high nibble down and low nibble across. Nothing here is a thumbnail - every tile is its own automaton, grown live from its own seed on a ring of one hundred twenty-eight cells the same honest way as plate LXV, and the tint is measured rather than cited: each tile's colour follows the activity its opening rows actually exhibit, so Wolfram's four classes sort themselves onto the sheet - the stillborn, the periodic, the boiling, and the strange few that compute. Under mirror and complement only eighty-eight of the two hundred fifty-six are genuinely different, which you can check by eye: the sheet nearly repeats itself in reflections. The dive lands where it must, on the tile of rule thirty. Twelfth of the Mk2 series and the suite's colophon: rules thirty, ninety and one hundred ten hang here as three tiles among the two hundred fifty-six.",
  cam: { dist: 3.0, pitch: 0.30, tgtY: 0.0, rot: 0.0 },
  gain: 0.5,
  params: [
    { label: "DEPTH",   min: 5, max: 9,   step: 1,    def: 7    },
    { label: "MAGNIFY", min: 0, max: 12,  step: 0.25, def: 0    },
    { label: "SEEDING", min: 1, max: 16,  step: 1,    def: 1    },
    { label: "WORLD",   min: 1, max: 64,  step: 1,    def: 1    },
    { label: "TINT",    min: 0, max: 1,   step: 0.01, def: 0.6  },
    { label: "FLARE",   min: 0, max: 1,   step: 0.01, def: 0.35 },
    { label: "INK",     min: 0, max: 1,   step: 0.01, def: 0.5  },
    { label: "STAIN",   min: 0, max: 1,   step: 0.01, def: 0.5  }
  ],
  glsl: `
// ── the whole book at once ──
// Two states, three neighbours: 2^(2^3) = 256 possible laws, the
// entire space of elementary cellular automata, arranged by their
// Wolfram number - high nibble down, low nibble across. Every tile is
// computed live from its own seed the same honest way as LXV, on a
// ring of 128 cells; nothing is a thumbnail. The tint is measured,
// not cited: each tile's hue follows the activity its own opening
// rows exhibit, so the four classes sort themselves by behaviour.
const int RSP_SUB  = 512;              // lattice units per cell
const int RSP_TW   = 65536;            // tile side: 128 cells
const int RSP_GUT  = 8192;             // gutter: 16 cells
const int RSP_PIT  = 73728;            // tile pitch
const int RSP_TOT  = 16 * 73728 - 8192;

float rsp_u(inout uint s){ s = hashu(s); return u2f(s); }

vec3 rsp_stain(vec3 c, float a){
  float cs = cos(a), sn = sin(a);
  vec3 k = vec3(0.57735027);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}

int rsp_pop(uint v){
  v = v - ((v >> 1) & 0x55555555u);
  v = (v & 0x33333333u) + ((v >> 2) & 0x33333333u);
  v = (v + (v >> 4)) & 0x0F0F0F0Fu;
  return int((v * 0x01010101u) >> 24);
}

vec3 shape_rulespace(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 217645177u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  int   rowsT = 1 << int(P[0] + 0.5);
  float mag   = exp2(P[1]);
  int   seeds = int(P[2] + 0.5);
  uint  world = uint(P[3] + 0.5) * 2654435761u;
  float tint  = P[4];
  float flare = P[5];
  float ink   = P[6];
  float stain = (P[7] - 0.5) * 2.2;
  const int C = 128;
  int rowPitch = RSP_TW / rowsT;       // exact: rowsT divides 65536

  // ── the survey sheet, and the dive onto rule thirty's tile ──
  ivec2 ctr = ivec2(RSP_TOT / 2, RSP_TOT / 2);
  ivec2 heart = ivec2(14 * RSP_PIT + RSP_TW / 2, 1 * RSP_PIT + (RSP_TW * 3) / 4);
  ivec2 wc = ctr + ivec2(vec2(heart - ctr) * (1.0 - 1.0 / mag));
  int hw = int(float(RSP_TOT / 2) / mag);
  ivec4 win = ivec4(wc.x - hw, wc.y - hw, wc.x + hw, wc.y + hw);
  float km = 2.85 / float(RSP_TOT) * mag;

  // ── choose a tile: the grid is separable, so the two axes weight
  // independently by clipped extent ──
  int wx[16]; int accx = 0;
  int wy[16]; int accy = 0;
  for(int g = 0; g < 16; g++){
    int a0 = max(win.x, g * RSP_PIT), a1 = min(win.z, g * RSP_PIT + RSP_TW);
    wx[g] = max(0, a1 - a0) >> 9;
    accx += wx[g];
    int b0 = max(win.y, g * RSP_PIT), b1 = min(win.w, g * RSP_PIT + RSP_TW);
    wy[g] = max(0, b1 - b0) >> 9;
    accy += wy[g];
  }
  if(accx <= 0 || accy <= 0){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
  pt = hashu(pt);
  int px2 = int(u2f(pt) * float(accx));
  int gx = 0; int runx = 0;
  for(int g = 0; g < 16; g++){
    runx += wx[g];
    if(px2 >= runx - wx[g] && px2 < runx && wx[g] > 0) gx = g;
  }
  pt = hashu(pt);
  int py2 = int(u2f(pt) * float(accy));
  int gy = 0; int runy = 0;
  for(int g = 0; g < 16; g++){
    runy += wy[g];
    if(py2 >= runy - wy[g] && py2 < runy && wy[g] > 0) gy = g;
  }
  int rule = gy * 16 + gx;
  ivec2 tlo = ivec2(gx * RSP_PIT, gy * RSP_PIT);

  // ── row and cell inside the tile, clipped to the window ──
  int rlo = max(0, (win.y - tlo.y) / rowPitch);
  int rhi = min(rowsT - 1, (win.w - tlo.y) / rowPitch);
  int k0 = max(0, (win.x - tlo.x) / RSP_SUB);
  int k1 = min(C - 1, (win.z - tlo.x) / RSP_SUB);
  if(rhi < rlo || k1 < k0){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
  pt = hashu(pt);
  int t = rlo + int(u2f(pt) * float(rhi - rlo + 1));
  t = min(t, rhi);
  pt = hashu(pt);
  int x = k0 + int(u2f(pt) * float(k1 - k0 + 1));
  x = min(x, k1);

  // ── the tile's seed row, addressed from WORLD and its own number ──
  uint row[4];
  row[0] = 0u; row[1] = 0u; row[2] = 0u; row[3] = 0u;
  uint sa = hashu(world ^ (uint(rule) * 668265263u) ^ 0xA11Cu);
  for(int s = 0; s < 16; s++){
    if(s >= seeds) break;
    int sx = C >> 1;
    if(s > 0){ sa = hashu(sa); sx = int(u2f(sa) * float(C)); }
    sx = min(sx, C - 1);
    int sw = sx >> 5;
    uint sb = 1u << uint(sx & 31);
    for(int w = 0; w < 4; w++) if(w == sw) row[w] |= sb;
  }

  // ── the toll, generic this time: eight neighbourhood masks, the
  // rule's own bits deciding which survive. Activity is measured on
  // the opening thirty-two rows and becomes the tile's tint.
  uint nw[4];
  int act = 0, actN = 0;
  for(int it = 0; it < t; it++){
    for(int w = 0; w < 4; w++){
      uint lw = (w == 0) ? row[3] : row[w - 1];
      uint rw = (w == 3) ? row[0] : row[w + 1];
      uint cw = row[w];
      uint L = (cw << 1) | (lw >> 31);
      uint R = (cw >> 1) | (rw << 31);
      uint nL = ~L, nC = ~cw, nR = ~R;
      uint acc = 0u;
      if((rule & 1)   != 0) acc |= nL & nC & nR;
      if((rule & 2)   != 0) acc |= nL & nC & R;
      if((rule & 4)   != 0) acc |= nL & cw & nR;
      if((rule & 8)   != 0) acc |= nL & cw & R;
      if((rule & 16)  != 0) acc |= L & nC & nR;
      if((rule & 32)  != 0) acc |= L & nC & R;
      if((rule & 64)  != 0) acc |= L & cw & nR;
      if((rule & 128) != 0) acc |= L & cw & R;
      nw[w] = acc;
    }
    if(it < 32){
      act += rsp_pop(nw[0] ^ row[0]) + rsp_pop(nw[1] ^ row[1])
           + rsp_pop(nw[2] ^ row[2]) + rsp_pop(nw[3] ^ row[3]);
      actN += 1;
    }
    for(int w = 0; w < 4; w++) row[w] = nw[w];
  }

  uint wsel = 0u;
  for(int w = 0; w < 4; w++) if(w == (x >> 5)) wsel = row[w];
  if(((wsel >> uint(x & 31)) & 1u) == 0u){
    col = vec3(0.0); return vec3(0.0, -20000.0, 0.0);
  }

  ivec2 cellLo = tlo + ivec2(x * RSP_SUB, t * rowPitch);
  float fox = rsp_u(pt);
  float foy = rsp_u(pt);
  vec2 seat = (vec2(cellLo - wc)
               + vec2(fox * 0.94 * float(RSP_SUB), foy * 0.94 * float(rowPitch))) * km;

  // activity per cell per sampled row, 0 dead .. ~0.5 boiling
  float a = (actN > 0) ? float(act) / (float(actN) * float(C)) : 0.0;
  float heat = clamp(a * 2.6, 0.0, 1.0);
  col = pal(0.62 - 0.50 * heat * tint,
            vec3(0.46, 0.44, 0.50), vec3(0.44, 0.42, 0.48),
            vec3(0.9, 0.85, 1.0), vec3(0.10, 0.30, 0.55))
        * (0.45 + 1.3 * ink) * (0.45 + flare * (0.25 + 1.5 * heat));
  col = rsp_stain(col, stain);
  float z = (rnd.y - 0.5) * 0.02;
  return vec3(seat.x, -seat.y, z);
}`
});
