"use strict";
Atlas.registerPlate({
  id: "hilbert",
  name: "The Space-Filling Curve",
  roman: "XLVI",
  accent: "#ffb890",
  tex: "H\\colon[0,1]\\twoheadrightarrow[0,1]^{D},\\qquad |H(s)-H(t)|\\le C\\,|s-t|^{1/D}",
  plain: "H: [0,1] ↠ [0,1]^D (onto),   |H(s)−H(t)| ≤ C·|s−t|^(1/D)",
  caption: "One unbroken thread, never crossing itself, visits every cell — Hilbert's 1891 construction, a year after Peano's: in the limit, a continuous map from segment onto cube, nowhere differentiable, necessarily not one-to-one. Points fall uniformly along the thread: even brightness is the curve spreading the segment's measure evenly through space. Consecutive cells share a face at every ORDER — Hölder locality with the optimal exponent 1/DIMENSION — so hue, the position along the thread, forms coherent patches. Flip MORTON to 1966 bit-interleaving: the same cells in an order teleporting across the cube, shattering the hue — losing the locality spatial indexes prize. Raise ORDER and the thread becomes the cube.",
  cam: { dist: 3.1, pitch: 0.3, tgtY: 0, rot: 0.05 },
  gain: 0.9,
  params: [
    { label: "DIMENSION",   min: 2, max: 3, step: 1,    def: 3    },
    { label: "ORDER",       min: 1, max: 8, step: 1,    def: 4    },
    { label: "MORTON",      min: 0, max: 1, step: 1,    def: 0    },
    { label: "TUBE",        min: 0, max: 1, step: 0.01, def: 0.25 },
    { label: "COLOR CYCLE", min: 0, max: 3, step: 0.01, def: 1.0  },
    { label: "GLOW",        min: 0, max: 1, step: 0.01, def: 0.7  }
  ],
  glsl: `
uvec3 hilbert_decode(uint n, int D, int ord, bool morton){
  /* Skilling transpose (AIP Conf. Proc. 707, 2004), unrolled for D = 2, 3.
     Step 1: distribute the D*ord bits of n round-robin MSB-first;
     axis = bitpos mod D counting from the MSB. */
  uint x0 = 0u; uint x1 = 0u; uint x2 = 0u;
  int nbits = D*ord;                       /* at most 3*6 = 18 or 2*8 = 16 */
  for(int b = 0; b < 18; b++){
    if(b >= nbits) break;
    uint bit = (n >> uint(nbits - 1 - b)) & 1u;
    int ax = b - (b/D)*D;
    if(ax == 0){ x0 = (x0 << 1) | bit; }
    else if(ax == 1){ x1 = (x1 << 1) | bit; }
    else { x2 = (x2 << 1) | bit; }
  }
  if(morton){ return uvec3(x0, x1, x2); }  /* Z-order: stop at de-interleave */
  /* Step 2: Gray decode */
  uint t;
  if(D == 3){ t = x2 >> 1; x2 ^= x1; x1 ^= x0; x0 ^= t; }
  else      { t = x1 >> 1; x1 ^= x0; x0 ^= t; }
  /* Step 3: undo excess work; i-loop unrolled i = D-1 down to 0 */
  uint Q = 2u;
  uint top = 1u << uint(ord);
  for(int k = 0; k < 7; k++){
    if(Q == top) break;
    uint M = Q - 1u;
    if(D == 3){
      if((x2 & Q) != 0u){ x0 ^= M; } else { t = (x0 ^ x2) & M; x0 ^= t; x2 ^= t; }
    }
    if((x1 & Q) != 0u){ x0 ^= M; } else { t = (x0 ^ x1) & M; x0 ^= t; x1 ^= t; }
    if((x0 & Q) != 0u){ x0 ^= M; }         /* i = 0: self-exchange is a no-op */
    Q <<= 1;
  }
  return uvec3(x0, x1, x2);
}
vec3 shape_hilbert(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int D   = (P[0] > 2.5) ? 3 : 2;
  int ord = int(P[1] + 0.5);
  if(ord < 1) ord = 1;
  if(D == 3 && ord > 6) ord = 6;           /* 8^6 cells is the 3D ceiling */
  bool morton = P[2] > 0.5;
  uint cells = 1u << uint(D*ord);          /* <= 262144, exact in float */
  uint n = uint(q.x * float(cells - 1u));
  n = min(n, cells - 2u);
  uvec3 ca = hilbert_decode(n,      D, ord, morton);
  uvec3 cb = hilbert_decode(n + 1u, D, ord, morton);
  float s = 2.4 / float(1u << uint(ord));  /* world edge of one cell */
  vec3 a; vec3 b;
  if(D == 3){
    a = (vec3(ca) + 0.5)*s - 1.2;
    b = (vec3(cb) + 0.5)*s - 1.2;
  } else {
    vec2 fa = (vec2(ca.xy) + 0.5)*s - 1.2;
    vec2 fb = (vec2(cb.xy) + 0.5)*s - 1.2;
    a = vec3(fa.x, 0.0, fa.y);
    b = vec3(fb.x, 0.0, fb.y);
  }
  vec3 p = mix(a, b, q.y);                 /* one spot on one segment */
  p += (rnd.xyz - 0.5) * (2.0*s*P[3]);     /* TUBE: at 1.0 the thread fogs
                                              into the whole cell lattice */
  float along = (float(n) + q.y) / float(cells - 1u);
  col = pal(along*P[4] - uT*0.02, vec3(0.52, 0.46, 0.42), vec3(0.48, 0.42, 0.38),
            vec3(1.0, 1.0, 1.0), vec3(0.00, 0.25, 0.50));
  col *= 0.5 + 0.7*P[5];
  return p;
}`
});
