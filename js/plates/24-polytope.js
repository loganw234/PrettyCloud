"use strict";
Atlas.registerPlate({
  id: "polytope",
  name: "Regular Polytopes in 4D",
  roman: "XXIV",
  accent: "#b8a0ff",
  tex: "\\{\\pm1\\}^4\\;(\\text{tesseract}),\\;\\{\\pm e_i\\}\\;(\\text{16-cell}),\\;\\text{perm}(\\pm1,\\pm1,0,0)\\;(\\text{24-cell})",
  plain: "tesseract {±1}⁴, 16-cell {±eᵢ}, 24-cell perms of (±1,±1,0,0)",
  caption: "Four-dimensional space holds six regular solids where three dimensions hold five. These are three of them, turning through planes we cannot picture and casting their shadows down into space — each point rides along an edge while the whole figure rotates in two independent 4-planes at once. The self-intersections are only in the shadow; upstairs in 4D the edges never touch. Hue carries the fourth coordinate w, so you can watch cells swing toward you out of the fourth dimension and recede back into it.",
  cam: { dist: 3.4, pitch: 0.15, tgtY: 0.0, rot: 0.0 },
  gain: 0.7,
  params: [
    { label: "POLYTOPE",  min: 0,   max: 2,   step: 1,    def: 0    },
    { label: "SPIN XW",   min: -0.5,max: 0.5, step: 0.005,def: 0.17 },
    { label: "SPIN YZ",   min: -0.5,max: 0.5, step: 0.005,def: 0.11 },
    { label: "PROJECTION",min: 0,   max: 1,   step: 1,    def: 0    },
    { label: "SCALE",     min: 0.5, max: 1.4, step: 0.01, def: 0.9  },
    { label: "EDGE BODY", min: 0,   max: 0.08,step: 0.002,def: 0.02 },
    { label: "GLOW",      min: 0,   max: 1,   step: 0.01, def: 0.6  }
  ],
  glsl: `
vec4 poly_e(int idx, float val){
  if(idx == 0) return vec4(val, 0.0, 0.0, 0.0);
  if(idx == 1) return vec4(0.0, val, 0.0, 0.0);
  if(idx == 2) return vec4(0.0, 0.0, val, 0.0);
  return vec4(0.0, 0.0, 0.0, val);
}
vec3 shape_polytope(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int poly = int(P[0] + 0.5);
  uint h = seed;
  vec4 A, B;
  if(poly == 0){                      /* tesseract: edge = flip one bit */
    h = hashu(h); uint vi = h & 15u;
    A = vec4((vi & 1u) != 0u ? 1.0 : -1.0, (vi & 2u) != 0u ? 1.0 : -1.0,
             (vi & 4u) != 0u ? 1.0 : -1.0, (vi & 8u) != 0u ? 1.0 : -1.0);
    h = hashu(h); int ax = int(h % 4u);
    vec4 flip = vec4(ax == 0 ? -1.0 : 1.0, ax == 1 ? -1.0 : 1.0,
                     ax == 2 ? -1.0 : 1.0, ax == 3 ? -1.0 : 1.0);
    B = A*flip;
  } else if(poly == 1){               /* 16-cell: edge between ±e_a and ±e_b, a≠b */
    h = hashu(h); int a = int(h % 4u);
    h = hashu(h); int b = int(h % 4u); if(b == a) b = (b + 1) % 4;
    h = hashu(h); float sa = (h & 1u) != 0u ? 1.0 : -1.0;
    h = hashu(h); float sb = (h & 1u) != 0u ? 1.0 : -1.0;
    A = poly_e(a, sa); B = poly_e(b, sb);
  } else {                            /* 24-cell: perms of (±1,±1,0,0) */
    h = hashu(h); int i = int(h % 4u);
    h = hashu(h); int j = int(h % 4u); if(j == i) j = (j + 1) % 4;
    h = hashu(h); float si = (h & 1u) != 0u ? 1.0 : -1.0;
    h = hashu(h); float sj = (h & 1u) != 0u ? 1.0 : -1.0;
    A = poly_e(i, si) + poly_e(j, sj);
    h = hashu(h); int k = int(h % 4u); if(k == i) k = (k + 1) % 4;
    h = hashu(h); float sk = (h & 1u) != 0u ? 1.0 : -1.0;
    B = poly_e(i, si) + poly_e(k, sk);   /* neighbor shares one signed axis */
  }
  vec4 P4 = mix(A, B, q.x);
  float r1 = P[1]*uT, r2 = P[2]*uT;
  float c1 = cos(r1), s1 = sin(r1);
  P4 = vec4(c1*P4.x - s1*P4.w, P4.y, P4.z, s1*P4.x + c1*P4.w);   /* xw plane */
  float c2 = cos(r2), s2 = sin(r2);
  P4 = vec4(P4.x, c2*P4.y - s2*P4.z, s2*P4.y + c2*P4.z, P4.w);   /* yz plane */
  vec3 p3;
  if(int(P[3] + 0.5) == 0) p3 = P4.xyz*(1.0/(2.6 - P4.w))*2.2;   /* perspective */
  else p3 = P4.xyz/(2.4 - P4.w*0.7);                             /* flatter */
  p3 *= P[4];
  p3 += (rnd.zwz - 0.5)*P[5];          /* edge body */
  col = pal(P4.w*0.22 + 0.5, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  col *= 0.45 + 0.8*P[6];
  return p3;
}`
});
