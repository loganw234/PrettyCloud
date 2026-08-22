"use strict";
Atlas.registerPlate({
  id: "rule30",
  name: "Rule Thirty",
  roman: "LXV",
  accent: "#e8c84a",
  tex: "a_i' = a_{i-1}\\ \\oplus\\ (a_i \\lor a_{i+1}),\\qquad 30 = 00011110_2",
  plain: "a′ = left XOR (center OR right);  30 = 00011110₂   (Wolfram 1983)",
  caption: "Take a row of cells, black or white, and let each become the exclusive-or of its left neighbour with the or of itself and its right. That is the whole law: rule thirty of the two hundred fifty-six, in Wolfram's numbering, found in 1983 when he simply tried them all. Grow it from one black cell and the left flank settles into tidy diagonals while the rest dissolves into churn that passes the standard batteries of randomness tests; Mathematica shipped the centre column as its random integers. Nobody can say why. In 2019 Wolfram put thirty thousand dollars on three questions about that column alone, and all three still stand. What is known is the price: the rule is computationally irreducible, and the only road to row ten thousand runs through the ten thousand rows before it. This plate pays full fare - every point of light re-lives the whole history from the seed down to the cell it lands on, the run wound on a register of up to five hundred twelve cells so the growing cone finally meets itself round the ring and the weave begins - and DEPTH prices the rows in powers of two. Ninth of the Mk2 series, and its conscience: the one plate whose depth cannot be addressed, only earned.",
  cam: { dist: 3.0, pitch: 0.22, tgtY: 0.0, rot: 0.0 },
  gain: 0.55,
  params: [
    { label: "DEPTH",   min: 7,   max: 17,  step: 1,    def: 8    },
    { label: "MAGNIFY", min: 0,   max: 14,  step: 0.25, def: 0    },
    { label: "CELLS",   min: 128, max: 512, step: 32,   def: 512  },
    { label: "COLUMNS", min: 1,   max: 16,  step: 1,    def: 1    },
    { label: "SEEDS",   min: 1,   max: 48,  step: 1,    def: 1    },
    { label: "WORLD",   min: 1,   max: 64,  step: 1,    def: 1    },
    { label: "INK",     min: 0,   max: 1,   step: 0.01, def: 0.5  },
    { label: "STAIN",   min: 0,   max: 1,   step: 0.01, def: 0.5  }
  ],
  glsl: `
// ── the register: a ring of cells, iterated the only way there is ──
// Rule 30 is computationally irreducible: no shortcut this project
// would be willing to print reaches row t without living the t rows
// before it. So the plate EARNS its rows - every point re-runs the
// whole history down to the row it means to light - and DEPTH prices
// that honesty in powers of two. The ring is up to 16 words of 32
// cells; CELLS masks the live words so the register can narrow.
const int R30_SUB = 1024;          // lattice units per cell
const int R30_GUT = 24;            // gutter between columns, in cells

float r30_u(inout uint s){ s = hashu(s); return u2f(s); }

vec3 r30_stain(vec3 c, float a){
  float cs = cos(a), sn = sin(a);
  vec3 k = vec3(0.57735027);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}

vec3 shape_rule30(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // Addressed, never stored: the seed row hashes from WORLD and SEEDS
  // alone and the evolution is the rule itself, so every point that
  // walks to row t reconstructs the identical row t and the
  // accumulation is one object. The point's own stream only chooses
  // which cell to light and where to sit inside it.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 374761393u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  int   rowsT = 1 << int(P[0] + 0.5);
  float mag   = exp2(P[1]);
  int   C     = int(P[2] + 0.5);
  int   V     = int(P[3] + 0.5);
  int   seeds = int(P[4] + 0.5);
  uint  world = uint(P[5] + 0.5) * 2654435761u;
  float ink   = P[6];
  float stain = (P[7] - 0.5) * 2.2;
  int   W     = C >> 5;            // live words

  // ── the sheet: V columns of the one run, side by side ──
  int rpp  = (rowsT + V - 1) / V;            // rows per column
  int colW = (C + R30_GUT) * R30_SUB;
  int WU = V * colW - R30_GUT * R30_SUB;     // lattice width
  int HU = rpp * R30_SUB;                    // lattice height

  // MAGNIFY is the site's loupe only: the editions expose at 0. The
  // dive lands on the freshest chaos, the foot of the last column.
  ivec2 ctr = ivec2(WU / 2, HU / 2);
  ivec2 heart = ivec2((V - 1) * colW + (C * R30_SUB) / 2, HU - HU / 8);
  ivec2 wc = ctr + ivec2(vec2(heart - ctr) * (1.0 - 1.0 / mag));
  int hwx = int(float(WU / 2) / mag);
  int hwy = int(float(HU / 2) / mag);
  ivec4 win = ivec4(wc.x - hwx, wc.y - hwy, wc.x + hwx, wc.y + hwy);
  // plate units per lattice unit; the sheet fills a 2.6 x 3.0 frame
  float km = min(2.6 / float(WU), 3.0 / float(HU)) * mag;

  // ── choose a visible cell, uniformly over visible area, so that
  // brightness stays a measure: columns weighted by visible area,
  // then row and cell uniform inside the window. Dead cells cull.
  int rlo = max(0, win.y / R30_SUB);
  int rhi0 = min(rpp - 1, win.w / R30_SUB);
  if(rhi0 < rlo){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
  int wsum[16];
  int acc = 0;
  for(int c = 0; c < 16; c++){
    wsum[c] = 0;
    if(c < V){
      int x0 = max(win.x, c * colW), x1 = min(win.z, c * colW + C * R30_SUB);
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
  int t = cidx * rpp + tl;                   // absolute row of the run

  int xbase = cidx * colW;
  int k0 = max(0, (win.x - xbase) / R30_SUB);
  int k1 = min(C - 1, (win.z - xbase) / R30_SUB);
  if(k1 < k0){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }
  pt = hashu(pt);
  int x = k0 + int(u2f(pt) * float(k1 - k0 + 1));
  x = min(x, k1);

  // before the cone meets itself round the ring the vacuum is dead
  // for certain: cull without paying for the rows
  if(seeds == 1 && 2 * t < C && (x < C / 2 - t || x > C / 2 + t)){
    col = vec3(0.0); return vec3(0.0, -20000.0, 0.0);
  }

  // ── the seed row: SEEDS cells, addressed from WORLD ──
  uint row[16];
  for(int w = 0; w < 16; w++) row[w] = 0u;
  uint sa = hashu(world ^ 0x51EDu);
  for(int s = 0; s < 48; s++){
    if(s >= seeds) break;
    // sequenced explicitly: a side-effecting call inside a ternary is
    // evaluated differently by the D3D and GL backends, and the seed
    // row must be the same object everywhere
    int sx = C >> 1;
    if(s > 0){ sa = hashu(sa); sx = int(u2f(sa) * float(C)); }
    sx = min(sx, C - 1);
    int sw = sx >> 5;
    uint sb = 1u << uint(sx & 31);
    for(int w = 0; w < 16; w++) if(w == sw) row[w] |= sb;
  }

  // ── the toll: t applications of the rule, none of them skippable.
  // Interior words take their neighbours statically; only the ring's
  // two ends pay a runtime select, once per row.
  uint nw[16];
  for(int it = 0; it < t; it++){
    uint rowLast = 0u;
    for(int w = 0; w < 16; w++) if(w == W - 1) rowLast = row[w];
    for(int w = 0; w < 15; w++){
      if(w >= W) break;
      uint lw = (w == 0) ? rowLast : row[w - 1];
      uint rw = (w == W - 1) ? row[0] : row[w + 1];
      uint cw = row[w];
      uint L = (cw << 1) | (lw >> 31);
      uint R = (cw >> 1) | (rw << 31);
      nw[w] = L ^ (cw | R);
    }
    if(W == 16){
      uint lw = row[14];
      uint cw = row[15];
      uint L = (cw << 1) | (lw >> 31);
      uint R = (cw >> 1) | (row[0] << 31);
      nw[15] = L ^ (cw | R);
    }
    for(int w = 0; w < 16; w++) if(w < W) row[w] = nw[w];
  }

  // the cell, and its shoulders for a whisper of texture
  uint wsel = 0u, lsel = 0u, rsel = 0u;
  int xl = (x == 0) ? C - 1 : x - 1;
  int xr = (x == C - 1) ? 0 : x + 1;
  for(int w = 0; w < 16; w++){
    if(w == (x >> 5)) wsel = row[w];
    if(w == (xl >> 5)) lsel = row[w];
    if(w == (xr >> 5)) rsel = row[w];
  }
  if(((wsel >> uint(x & 31)) & 1u) == 0u){
    col = vec3(0.0); return vec3(0.0, -20000.0, 0.0);
  }
  uint nbh = (((lsel >> uint(xl & 31)) & 1u) << 1) | ((rsel >> uint(xr & 31)) & 1u);

  // seat inside the cell square, exact to the lattice: the integer
  // offset from the window centre is taken before the only float
  ivec2 cellLo = ivec2(xbase + x * R30_SUB, tl * R30_SUB);
  float fox = r30_u(pt);
  float foy = r30_u(pt);
  vec2 seat = (vec2(cellLo - wc) + vec2(fox, foy) * float(R30_SUB) * 0.94) * km;

  float band = float(t) / float(rowsT);
  float tone = 0.55 + 0.45 * float(nbh) / 3.0;
  col = pal(0.12 + 0.10 * band + 0.06 * float(nbh),
            vec3(0.52, 0.46, 0.36), vec3(0.46, 0.42, 0.34),
            vec3(1.0, 0.9, 0.65), vec3(0.05, 0.18, 0.42))
        * tone * (0.55 + 1.5 * ink);
  col = r30_stain(col, stain);
  float z = (rnd.y - 0.5) * 0.02;
  return vec3(seat.x, -seat.y, z);
}`
});
