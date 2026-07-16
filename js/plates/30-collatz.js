"use strict";
Atlas.registerPlate({
  id: "collatz",
  name: "Collatz Coral",
  roman: "XXX",
  accent: "#a8e08f",
  tex: "n\\mapsto\\begin{cases}n/2 & n\\text{ even}\\\\ 3n+1 & n\\text{ odd}\\end{cases},\\qquad \\text{does every }n\\to1?",
  plain: "n → n/2 (even) or 3n+1 (odd);   does every n reach 1?",
  caption: "The simplest unsolved problem in mathematics. Halve it if even, triple-plus-one if odd, and every number ever tested comes tumbling down to 1 — but no one can prove it always does. Draw each number's descent as a path, bending one way at an even step and the other at an odd one, and align them all at their shared destination. The common tails braid together and the millions of trajectories grow into a single organic coral, the shape of a conjecture no proof has yet reached.",
  cam: { dist: 3.2, pitch: 0.2, tgtY: 0.3, rot: 0.03 },
  gain: 0.8,
  params: [
    { label: "MAX n",     min: 2000,max: 50000,step: 100, def: 15000 },
    { label: "EVEN BEND", min: 0,   max: 0.5,  step: 0.005,def: 0.12 },
    { label: "ODD BEND",  min: 0,   max: 0.6,  step: 0.005,def: 0.32 },
    { label: "SEGMENT",   min: 0.02,max: 0.1,  step: 0.002,def: 0.05 },
    { label: "SCALE",     min: 0.5, max: 1.6,  step: 0.01, def: 1.0  },
    { label: "GLOW",      min: 0,   max: 1,    step: 0.01, def: 0.6  }
  ],
  glsl: `
vec3 shape_collatz(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  uint n = 1u + uint(q.x*P[0]);
  uint m = n; int len = 0; uint win = 0u;
  for(int j = 0; j < 220; j++){
    if(m == 1u) break;
    uint par = m & 1u;
    win = (win << 1) | par;                 /* newest parity in bit 0 */
    if(par == 0u) m = m/2u; else m = 3u*m + 1u;
    len++;
  }
  int keep = len < 32 ? len : 32;
  if(keep <= 0){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  uint target = uint(u2f(hashu(seed))*float(keep));
  vec2 pos = vec2(0.0); float dir = PI*0.5;
  vec2 outpos = vec2(0.0); float depth = 0.0;
  for(int j = 0; j < 32; j++){
    if(j >= keep) break;
    uint par = (win >> uint(j)) & 1u;        /* replay from nearest 1 outward */
    dir += (par == 0u) ? P[1] : -P[2];
    pos += P[3]*vec2(cos(dir), sin(dir));
    if(uint(j) == target){ outpos = pos; depth = float(j); }
  }
  vec3 p = vec3(outpos.x, outpos.y, 0.0)*P[4];
  col = pal(depth/float(keep)*0.7 + 0.05, vec3(0.4, 0.5, 0.4), vec3(0.4, 0.45, 0.4),
            vec3(1.0, 0.95, 0.8), vec3(0.2, 0.35, 0.15));
  col *= 0.5 + 0.7*P[5];
  return p;
}`
});
