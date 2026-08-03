"use strict";
Atlas.registerPlate({
  id: "modmul",
  name: "Modular Multiplication",
  roman: "X",
  accent: "#f2a0ff",
  tex: "j \\;\\longmapsto\\; m\\,j \\pmod{n},\\qquad \\text{chords envelope an epicycloid of } \\lfloor m\\rfloor - 1 \\text{ cusps}",
  plain: "j \u21a6 m\u00b7j (mod n) \u2014 chords envelope an epicycloid",
  caption: "Join every residue j on a circle to m\u00b7j mod n, and the chords envelope an epicycloid: a cardioid at m = 2, a nephroid at 3, and onward through the whole family. The multiplier slides continuously, so you can watch number theory deform through geometry in real time. The LIFT lever unrolls the circle into a helix, turning each chord into a strut of a modular bridge.",
  cam: { dist: 3.2, pitch: 0.35, tgtY: 0.0, rot: 0.04 },
  gain: 0.8,
  params: [
    { label: "MULTIPLIER m", min: 1,  max: 12,  step: 0.01, def: 2    },
    { label: "MODULUS n",    min: 24, max: 720, step: 1,    def: 240  },
    { label: "HELIX LIFT",   min: 0,  max: 1.2, step: 0.01, def: 0    },
    { label: "m DRIFT",      min: 0,  max: 0.3, step: 0.005,def: 0.05 },
    { label: "HUE: INDEX\u2194LENGTH", min: 0, max: 1, step: 0.01, def: 0.25 }
  ],
  glsl: `
vec3 shape_modmul(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float n = P[1];
  float m = mod(P[0] + P[3]*uT, n);      /* wrap: multiplier mod n is the same map */
  float j = floor(q.y*n);
  float t = q.x;                          /* position along the chord */
  float f2 = fract(m*j/n);
  float a1 = TAU*j/n;
  float a2 = TAU*f2;
  vec2 A = vec2(cos(a1), sin(a1));
  vec2 B = vec2(cos(a2), sin(a2));
  float y1 = P[2]*(j/n - 0.5)*2.0;
  float y2 = P[2]*(f2  - 0.5)*2.0;
  vec3 p = vec3(mix(A.x, B.x, t), mix(y1, y2, t), mix(A.y, B.y, t))*1.25;
  float clen = length(B - A)*0.5;
  vec3 byIdx = pal(j/n,       vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  vec3 byLen = pal(clen*0.9,  vec3(0.52,0.36,0.30), vec3(0.45,0.36,0.30),
                   vec3(1.0,0.9,0.8), vec3(0.05,0.25,0.50));
  col = mix(byIdx, byLen, P[4]) * (0.55 + 0.45*sin(PI*t));
  return p;
}`
});
