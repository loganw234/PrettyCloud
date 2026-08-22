"use strict";
Atlas.registerPlate({
  id: "nested",
  name: "The Nested Rule",
  roman: "LXVI",
  accent: "#6fe0b8",
  tex: "a_i' = a_{i-1} + a_{i+1}\\ (\\mathrm{mod}\\ p),\\qquad \\tbinom{n}{k}\\equiv\\textstyle\\prod_i \\tbinom{n_i}{k_i}\\ (\\mathrm{mod}\\ p)",
  plain: "a′ = left + right (mod p);  C(n,k) ≡ Π C(nᵢ,kᵢ) mod p   (Lucas 1878)",
  caption: "Its neighbour buys every row; this is the rule the algebra lets off. Sum your two neighbours modulo a prime and iterate: the additive automaton - rule 90 when the prime is two - growing Pascal's triangle mod p from a single one. In 1852 Kummer read the divisibility of binomial coefficients off the carries of base-p addition, and in 1878 Lucas made it a product over digits, so every cell of row sixteen million is an arithmetic fact about its own address, reachable with no history at all. That theorem is the renderer: each point picks its cell's digits from the window down, twenty-four choices at the deepest setting, and only nonzero cells are ever constructed, so the triangle Sierpinski drew in 1915 assembles at any depth with nothing spent on the voids. The nonzero residues carry the colour. Tenth of the Mk2 series, and the thirtieth rule's opposite number: DEPTH here is not a price but a preference, and past the resolving power of any sheet the unresolved scales go on depositing their lawful share of light, which is all a measure ever promised.",
  cam: { dist: 3.0, pitch: 0.26, tgtY: 0.0, rot: 0.0 },
  gain: 0.55,
  params: [
    { label: "DEPTH",     min: 4,  max: 24,  step: 1,    def: 12  },
    { label: "MAGNIFY",   min: 0,  max: 22,  step: 0.25, def: 0   },
    { label: "NTH PRIME", min: 1,  max: 4,   step: 1,    def: 1   },
    { label: "TINT",      min: 0,  max: 1,   step: 0.01, def: 0.6 },
    { label: "BAND",      min: 0,  max: 1,   step: 0.01, def: 0.25},
    { label: "SLAB Z",    min: 0,  max: 0.4, step: 0.005,def: 0.08},
    { label: "INK",       min: 0,  max: 1,   step: 0.01, def: 0.5 },
    { label: "STAIN",     min: 0,  max: 1,   step: 0.01, def: 0.5 }
  ],
  glsl: `
// ── the rule algebra forgives ──
// The additive automaton a' = left + right (mod p) grows Pascal's
// triangle mod p, and Kummer and Lucas reduced its every cell to digit
// arithmetic: C(n,k) mod p is the product of the digit binomials of n
// and k base p. So this plate never iterates. A point picks the digits
// of its cell most-significant-first, each level weighted by what the
// window can see, and lands on row sixteen million as cheaply as row
// four - the exact opposite of its neighbour, which buys every row.
// Nonzero cells only are constructed (b <= a at every digit), so no
// point is wasted on the voids and brightness stays a measure.
float nst_u(inout uint s){ s = hashu(s); return u2f(s); }

vec3 nst_stain(vec3 c, float a){
  float cs = cos(a), sn = sin(a);
  vec3 k = vec3(0.57735027);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}

vec3 shape_nested(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 668265263u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  int   D    = int(P[0] + 0.5);
  float mag  = exp2(P[1]);
  int   pidx = int(P[2] + 0.5);
  int   p    = (pidx <= 1) ? 2 : (pidx == 2) ? 3 : (pidx == 3) ? 5 : 7;
  float tint = P[3];
  float band = P[4];
  float slab = P[5];
  float ink  = P[6];
  float stain = (P[7] - 0.5) * 2.2;

  // rows R = p^L, the smallest power of p reaching 2^DEPTH
  int L = 0, R = 1;
  int target = 1 << D;
  for(int i = 0; i < 24; i++){
    if(R >= target) break;
    R *= p; L += 1;
  }

  // lattice: cell (n,k) sits at xu = 2k + (R-1-n), yu = 2n; cells are
  // 2x2 units on the alternating brick lattice, the triangle ~square
  int WU = 2 * R - 1;
  ivec2 ctr = ivec2(WU / 2, R);
  // the dive anchors just inside the bottom-left corner: the k = 0
  // edge is C(n,0) = 1 for every p, a solid rail with the nested
  // corner replicas hanging off it at every scale. The centre is the
  // one place NOT to dive: for p = 2 it is the gasket's great void.
  ivec2 heart = ivec2(R / 64, 2 * R - R / 32);
  ivec2 wc = ctr + ivec2(vec2(heart - ctr) * (1.0 - 1.0 / mag));
  int hwx = int(float(WU / 2) / mag);
  int hwy = int(float(R) / mag);
  ivec4 win = ivec4(wc.x - hwx, wc.y - hwy, wc.x + hwx, wc.y + hwy);
  float km = 2.85 / float(2 * R) * mag;

  // ── the digit descent: 28 candidate digit pairs per level ──
  int n0 = 0, k0 = 0, s = R / p;
  int v = 1;
  bool dead = false;
  uint lineage = 2166136261u;
  for(int lev = 0; lev < L; lev++){
    float w[28];
    float wsum = 0.0;
    for(int a = 0; a < 7; a++){
      if(a >= p) break;
      int ny0 = 2 * (n0 + a * s), ny1 = ny0 + 2 * s;
      int oy = min(ny1, win.w) - max(ny0, win.y);
      for(int b = 0; b < 7; b++){
        if(b > a) break;
        int sl = (a * (a + 1)) / 2 + b;
        w[sl] = 0.0;
        if(oy > 0){
          // conservative box of the child's parallelogram
          int xlo = 2 * (k0 + b * s) + (R - 1) - (n0 + (a + 1) * s - 1);
          int xhi = 2 * (k0 + b * s + s - 1) + (R - 1) - (n0 + a * s);
          int ox = min(xhi + 1, win.z) - max(xlo, win.x);
          if(ox > 0) w[sl] = float(oy) * float(ox);
        }
        wsum += w[sl];
      }
    }
    if(wsum <= 0.0){ dead = true; break; }
    pt = hashu(pt);
    float pick = u2f(pt) * wsum;
    float run = 0.0;
    int ca = 0, cb = 0, cc = 1;
    for(int a = 0; a < 7; a++){
      if(a >= p) break;
      for(int b = 0; b < 7; b++){
        if(b > a) break;
        int sl = (a * (a + 1)) / 2 + b;
        run += w[sl];
        if(pick < run && pick >= run - w[sl] && w[sl] > 0.0){
          ca = a; cb = b;
          // the digit binomial: a constant per slot, never divisible
          // by p since every factor is below it
          cc = (sl == 0) ? 1 : (sl == 1) ? 1 : (sl == 2) ? 1
             : (sl == 3) ? 1 : (sl == 4) ? 2 : (sl == 5) ? 1
             : (sl == 6) ? 1 : (sl == 7) ? 3 : (sl == 8) ? 3 : (sl == 9) ? 1
             : (sl == 10) ? 1 : (sl == 11) ? 4 : (sl == 12) ? 6 : (sl == 13) ? 4 : (sl == 14) ? 1
             : (sl == 15) ? 1 : (sl == 16) ? 5 : (sl == 17) ? 10 : (sl == 18) ? 10 : (sl == 19) ? 5 : (sl == 20) ? 1
             : (sl == 21) ? 1 : (sl == 22) ? 6 : (sl == 23) ? 15 : (sl == 24) ? 20 : (sl == 25) ? 15 : (sl == 26) ? 6 : 1;
        }
      }
    }
    v = (v * cc) % p;
    n0 += ca * s; k0 += cb * s;
    lineage = hashu(lineage ^ (uint(ca * 7 + cb) + 1u) * 2654435761u);
    s /= p;
  }
  if(dead){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }

  // the cell, exact to the lattice: integer offset from the window
  // centre first, the jitter after, in float
  int xu = 2 * k0 + (R - 1 - n0);
  ivec2 cellC = ivec2(xu + 1, 2 * n0 + 1);
  float fx = nst_u(pt);
  float fy = nst_u(pt);
  vec2 seat = (vec2(cellC - wc) + (vec2(fx, fy) - 0.5) * 1.88) * km;

  float lv = float(n0) / float(R);
  float hue = (p == 2) ? 0.0 : float(v - 1) / float(p - 1);
  col = pal(0.34 + 0.45 * hue * tint + 0.10 * lv * band,
            vec3(0.44, 0.52, 0.46), vec3(0.42, 0.48, 0.44),
            vec3(0.95, 1.0, 0.9), vec3(0.12, 0.40, 0.62))
        * (0.5 + 1.4 * ink) * (1.0 - band * 0.55 * (1.0 - lv));
  col = nst_stain(col, stain);
  float z = ((u2f(hashu(lineage)) - 0.5) + (rnd.z - 0.5) * 0.3) * slab;
  return vec3(seat.x, -seat.y, z);
}`
});
