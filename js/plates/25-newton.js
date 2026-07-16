"use strict";
Atlas.registerPlate({
  id: "newton",
  name: "Newton's Fractal",
  roman: "XXV",
  accent: "#ffb84d",
  tex: "z_{n+1}=z_n-a\\,\\dfrac{z_n^{\\,d}-1}{d\\,z_n^{\\,d-1}},\\qquad \\text{basins of the }d\\text{ roots of unity}",
  plain: "zₙ₊₁ = zₙ − a (zᵈ−1)/(d zᵈ⁻¹)   — basins of the d-th roots of unity",
  caption: "Drop Newton's root-finder onto the complex plane and ask, from each starting point, which root it runs to. The answer partitions the plane into basins — but their boundary is no curve. It is a fractal where all d basins meet at once, so that between any two colours you always find the third: the Wada property made visible. Iteration count becomes relief, so the ridges rise along the boundary where the method dithers. Over-relaxation a ≠ 1 shears the whole structure into spirals.",
  cam: { dist: 3.4, pitch: 0.5, tgtY: 0.2, rot: 0.03 },
  gain: 0.9,
  params: [
    { label: "DEGREE d",   min: 3,   max: 5,   step: 1,    def: 3   },
    { label: "OVER-RELAX a",min: 0.3,max: 1.6, step: 0.005,def: 1.0 },
    { label: "ZOOM",       min: 0.4, max: 8,   step: 0.05, def: 1   },
    { label: "ITERATIONS", min: 8,   max: 80,  step: 1,    def: 40  },
    { label: "RELIEF",     min: 0,   max: 1.2, step: 0.01, def: 0.6 },
    { label: "GLOW",       min: 0,   max: 1,   step: 0.01, def: 0.6 }
  ],
  glsl: `
vec2 newton_cpow(vec2 z, int n){
  vec2 r = vec2(1.0, 0.0);
  for(int i = 0; i < 4; i++){ if(i >= n) break; r = cmul(r, z); }
  return r;
}
vec3 shape_newton(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int d = int(P[0] + 0.5);
  float relax = P[1];
  vec2 win = vec2(q.x, q.y) - 0.5;
  vec2 z = win*(4.0/P[2]) + (rnd.xy - 0.5)*0.003;
  float K = P[3];
  float it = K;
  for(int j = 0; j < 80; j++){
    if(float(j) >= K) break;
    vec2 zp = newton_cpow(z, d - 1);
    vec2 f = cmul(zp, z) - vec2(1.0, 0.0);
    vec2 fp = float(d)*zp;
    z = z - relax*cdiv(f, fp);
    if(dot(f, f) < 1.0e-6){ it = float(j); break; }
  }
  float ang = atan(z.y, z.x);
  float k = floor(mod(ang/TAU*float(d) + 0.5 + float(d), float(d)));
  float rootFrac = k/float(d);
  float shade = clamp(it/K, 0.0, 1.0);
  vec3 p = vec3(win.x*2.4, P[4]*(1.0 - shade), win.y*2.4);
  vec3 base = pal(rootFrac, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  col = base * (0.3 + 1.3*(1.0 - shade)) * (0.55 + 0.7*P[5]);
  return p;
}`
});
