"use strict";
Atlas.registerPlate({
  id: "ifs",
  name: "The Chaos Game",
  roman: "VII",
  accent: "#b8f78f",
  tex: "p_{k+1} = (1-r)\\,p_k + r\\,v_{j_k},\\qquad j_k \\sim \\mathrm{Uniform}\\{1,\\dots,n\\}",
  plain: "p\u2096\u208a\u2081 = (1\u2212r)p\u2096 + r\u00b7v\u2c7c,   j ~ Uniform{1..n}",
  caption: "Pick a random vertex, step a fraction r toward it, repeat. Nothing else. For r = \u00bd and four vertices the orbit's closure is the Sierpi\u0144ski tetrahedron \u2014 an iterated function system whose attractor is the unique fixed point of Hutchinson's contraction on the space of compact sets. Slide r, add a twist per step, or change the vertex count, and you walk through an entire family of self-similar measures. Hue can trace either radius or the last symbolic address.",
  cam: { dist: 3.2, pitch: 0.30, tgtY: 0.0, rot: 0.05 },
  gain: 0.7,
  params: [
    { label: "VERTICES",    min: 3,    max: 8,    step: 1,     def: 4    },
    { label: "CONTRACTION", min: 0.25, max: 0.75, step: 0.005, def: 0.5  },
    { label: "TWIST / STEP",min: -0.7, max: 0.7,  step: 0.005, def: 0    },
    { label: "ITERATIONS",  min: 6,    max: 28,   step: 1,     def: 18   },
    { label: "HUE: RADIUS\u2194ADDRESS", min: 0, max: 1, step: 0.01, def: 0.7 }
  ],
  glsl: `
vec3 ifs_vertex(float k, float n){
  /* n vertices spread on the sphere by a golden spiral */
  float z = 1.0 - 2.0*(k + 0.5)/n;
  float r = sqrt(max(0.0, 1.0 - z*z));
  float a = k * 2.39996322973;
  return vec3(r*cos(a), z, r*sin(a));
}
vec3 shape_ifs(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float n = max(P[0], 3.0);
  vec3 pt = rnd.xyz*2.0 - 1.0;           /* hashed starting point */
  uint h = seed;
  float last = 0.0;
  float ca = cos(P[2]), sa = sin(P[2]);
  for(int j = 0; j < 28; j++){
    if(float(j) >= P[3]) break;
    h = hashu(h);                        /* the coin flips */
    float k = floor(u2f(h)*n);
    last = k;
    pt = mix(pt, ifs_vertex(k, n), P[1]);
    pt = vec3(ca*pt.x - sa*pt.z, pt.y, sa*pt.x + ca*pt.z);
  }
  vec3 byRad = pal(length(pt)*0.8, vec3(0.40,0.50,0.35), vec3(0.35,0.40,0.30),
                   vec3(1.0,0.9,0.8), vec3(0.30,0.15,0.45));
  vec3 byAdr = pal(last/n, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0,0.33,0.67));
  col = mix(byRad, byAdr, P[4]);
  return pt * 1.15;
}`
});
