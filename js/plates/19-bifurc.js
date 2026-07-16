"use strict";
Atlas.registerPlate({
  id: "bifurc",
  name: "The Feigenbaum Tree",
  roman: "XIX",
  accent: "#ff9e7a",
  tex: "x_{n+1}=r\\,x_n(1-x_n),\\qquad \\lambda=\\lim_{N\\to\\infty}\\tfrac1N\\sum_{n}\\ln|r(1-2x_n)|",
  plain: "xₙ₊₁ = r xₙ(1−xₙ),   λ = ⟨ ln|r(1−2xₙ)| ⟩",
  caption: "Turn one dial, r, and watch a fixed point split in two, then four, then eight — period doubling accelerating by Feigenbaum's universal ratio until, at r ≈ 3.5699, order dissolves into chaos. The horizontal axis is r; the vertical is where the map's orbit lands, so brightness is the invariant density — the bright chaotic bands with their square-root edges, threaded by white windows of returning order. Depth and colour read the Lyapunov exponent: cool where the map forgets perturbations, warm where it amplifies them.",
  cam: { dist: 3.3, pitch: 0.18, tgtY: 0.0, rot: 0.03 },
  gain: 0.75,
  params: [
    { label: "BURN-IN",   min: 100, max: 500, step: 1,    def: 300 },
    { label: "r MIN",     min: 2.5, max: 4.0, step: 0.001,def: 2.8 },
    { label: "r MAX",     min: 2.5, max: 4.0, step: 0.001,def: 4.0 },
    { label: "λ RELIEF",  min: 0,   max: 1.2, step: 0.01, def: 0.5 },
    { label: "MAP",       min: 0,   max: 2,   step: 1,    def: 0   },
    { label: "GLOW",      min: 0,   max: 1,   step: 0.01, def: 0.6 }
  ],
  glsl: `
vec3 shape_bifurc(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mt = int(P[4] + 0.5);
  float r = mix(P[1], P[2], q.x);
  float x = 0.2 + 0.6*rnd.x;
  float burn = P[0];
  float extra = floor(rnd.y*60.0);
  float total = burn + extra;
  float lyap = 0.0, cnt = 0.0;
  for(int j = 0; j < 600; j++){
    if(float(j) >= total) break;
    float d;
    if(mt == 0){ d = r*(1.0 - 2.0*x); x = r*x*(1.0 - x); }
    else if(mt == 1){ float rs = r*0.25; d = rs*PI*cos(PI*x); x = rs*sin(PI*x); }
    else { float mu = r*0.5; if(x < 0.5){ d = mu; x = mu*x; } else { d = -mu; x = mu*(1.0 - x); } }
    if(float(j) >= burn){ lyap += log(abs(d) + 1.0e-9); cnt += 1.0; }
  }
  float lam = lyap/max(cnt, 1.0);
  float p_z = P[3]*clamp(lam, -1.0, 1.0);
  vec3 p = vec3((q.x - 0.5)*2.6, (x - 0.5)*2.2, p_z);
  col = mix(vec3(0.3, 0.6, 1.0), vec3(1.0, 0.5, 0.2), smoothstep(-0.12, 0.12, lam));
  col *= 0.4 + 0.9*P[5];
  return p;
}`
});
