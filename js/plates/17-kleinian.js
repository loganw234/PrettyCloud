"use strict";
Atlas.registerPlate({
  id: "kleinian",
  name: "Indra's Pearls",
  roman: "XVII",
  accent: "#f6a6ff",
  tex: "z\\mapsto C_k+\\dfrac{r_k^2\\,(z-C_k)}{|z-C_k|^2},\\qquad \\Lambda=\\overline{\\langle\\text{inversions}\\rangle\\cdot z_0}",
  plain: "z ↦ Cₖ + rₖ²(z−Cₖ)/|z−Cₖ|²   (limit set of the inversion group)",
  caption: "Reflect a point in one of a ring of circles, chosen at random, and repeat forever. The orbit is drawn onto the limit set of the group the circles generate — a self-similar necklace where every pearl is fringed by smaller pearls, the fractal that Klein glimpsed and Mandelbrot rendered. At tangency the circles kiss and the gasket condenses; the RADIUS dial walks it from scattered dust through the perfect gasket to overlap. The whole thing is wrapped back onto a sphere by inverse stereographic projection so it turns in space.",
  cam: { dist: 3.2, pitch: 0.20, tgtY: 0.0, rot: 0.06 },
  gain: 0.7,
  params: [
    { label: "CIRCLES",     min: 3, max: 6,   step: 1,    def: 3   },
    { label: "RING",        min: 0.6,max: 1.6, step: 0.01,def: 1.0 },
    { label: "RADIUS ×tan", min: 0.6,max: 1.25,step: 0.005,def: 1.0 },
    { label: "ITERATIONS",  min: 6, max: 40,  step: 1,    def: 22  },
    { label: "SCALE",       min: 0.6,max: 1.8, step: 0.01,def: 1.2 },
    { label: "SPHERE ↔ FLAT",min: 0, max: 1,   step: 0.01,def: 1.0 },
    { label: "GLOW",        min: 0, max: 1,   step: 0.01, def: 0.55 }
  ],
  glsl: `
vec3 shape_kleinian(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int nc = int(P[0] + 0.5); nc = max(3, min(6, nc));
  float ncf = float(nc);
  float ring = P[1];
  float cr = P[2]*ring*sin(PI/ncf);       /* ×tangency radius */
  vec2 z = (rnd.xy - 0.5)*2.0*ring;
  uint h = seed;
  float last = 0.0;
  for(int j = 0; j < 40; j++){
    if(float(j) >= P[3]) break;
    h = hashu(h);
    float k = floor(u2f(h)*ncf);
    float a = k/ncf*TAU;
    vec2 C = ring*vec2(cos(a), sin(a));
    vec2 d = z - C;
    z = C + cr*cr*d/(dot(d, d) + 1.0e-6);  /* circle inversion */
    last = k;
  }
  vec3 flat3 = vec3(z*P[4], 0.0);
  float dd = dot(z, z);
  vec3 sph = vec3(2.0*z.x, 2.0*z.y, dd - 1.0)/(dd + 1.0) * (P[4]*1.15);
  vec3 p = mix(flat3, sph, clamp(P[5], 0.0, 1.0));
  col = pal(last/ncf*0.9 + 0.05, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  col *= 0.5 + 0.7*P[6];
  return p;
}`
});
