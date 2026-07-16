"use strict";
Atlas.registerPlate({
  id: "stoch",
  name: "The Bell Curve, Assembled",
  roman: "XXXI",
  accent: "#9fc0ff",
  tex: "S_N=\\sum_{i=1}^N X_i\\ \\xrightarrow{\\ d\\ }\\ \\mathcal N(0,N),\\qquad \\text{unless }X_i\\ \\text{is heavy-tailed}",
  plain: "Sₙ = ΣXᵢ → Normal(0, N)   — unless the steps are heavy-tailed",
  caption: "Add enough small independent shoves and the total is Gaussian, no matter what the shoves looked like — the central limit theorem, the reason the bell curve is everywhere. Watch it build: each point is a partial sum after some number of coin flips, stacked by row, and the density at the bottom is the binomial collapsing onto the Normal. Bias the coin to lean it; switch to a Cauchy step and the theorem fails outright — the tails never tame and no bell forms. In walk mode the same increments trace Brownian and Lévy paths in space.",
  cam: { dist: 3.2, pitch: 0.3, tgtY: 0.0, rot: 0.03 },
  gain: 0.8,
  params: [
    { label: "MODE",        min: 0, max: 1,   step: 1,    def: 0   },
    { label: "ROWS / STEPS",min: 10,max: 200, step: 1,    def: 120 },
    { label: "BIAS / α",    min: 0, max: 1,   step: 0.01, def: 0.5 },
    { label: "LAW",         min: 0, max: 2,   step: 1,    def: 0   },
    { label: "SCALE",       min: 0.4,max: 1.8,step: 0.01, def: 1.0 },
    { label: "GLOW",        min: 0, max: 1,   step: 0.01, def: 0.6 }
  ],
  glsl: `
vec3 shape_stoch(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode = int(P[0] + 0.5);
  int law = int(P[3] + 0.5);
  if(mode == 0){                        /* Galton pyramid */
    int rows = int(P[1]);
    int rr = int(q.y*float(rows)) + 1;
    uint h = seed; float x = 0.0;
    for(int j = 0; j < 200; j++){
      if(j >= rr) break;
      h = hashu(h); float u = u2f(h);
      float step;
      if(law == 0) step = (u < P[2]) ? 1.0 : -1.0;
      else if(law == 1) step = (u - 0.5)*3.4;
      else step = tan(PI*(u - 0.5))*0.5;          /* Cauchy: breaks CLT */
      x += step;
    }
    vec3 p = vec3(x*P[4]*0.12, (0.5 - q.y)*2.2, 0.0);
    col = pal(q.y*0.6 + 0.1, vec3(0.5, 0.45, 0.5), vec3(0.5, 0.45, 0.45),
              vec3(1.0, 0.95, 0.9), vec3(0.1, 0.25, 0.5));
    col *= 0.5 + 0.7*P[5];
    return p;
  }
  int steps = int(P[1]);
  uint h = seed; vec3 pos = vec3(0.0);
  int target = int(u2f(hashu(seed))*float(steps));
  vec3 endp = vec3(0.0); float td = 0.0;
  for(int j = 0; j < 200; j++){
    if(j >= steps) break;
    h = hashu(h); float u1 = u2f(h);
    h = hashu(h); float u2 = u2f(h);
    h = hashu(h); float u3 = u2f(h);
    vec3 inc;
    if(law == 0){                       /* Brownian: Gaussian increments */
      float g = sqrt(-2.0*log(max(1.0e-6, u1)));
      inc = vec3(g*cos(TAU*u2), g*sin(TAU*u2), sqrt(-2.0*log(max(1.0e-6, u3)))*cos(TAU*u1))*0.1;
    } else {                            /* Lévy: heavy-tailed jumps */
      float r = pow(max(1.0e-6, u1), -1.0/max(0.5, P[2] + 0.5))*0.02;
      float ct = 1.0 - 2.0*u2, st = sqrt(max(0.0, 1.0 - ct*ct)), ph = TAU*u3;
      inc = r*vec3(st*cos(ph), ct, st*sin(ph));
    }
    pos += inc;
    if(j == target){ endp = pos; td = float(j); }
  }
  vec3 p = endp*P[4];
  col = pal(td/float(steps)*0.7 + 0.05, vec3(0.45, 0.4, 0.55), vec3(0.4, 0.4, 0.45),
            vec3(1.0, 0.9, 0.85), vec3(0.5, 0.35, 0.15));
  col *= 0.5 + 0.7*P[5];
  return p;
}`
});
