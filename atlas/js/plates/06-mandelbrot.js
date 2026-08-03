"use strict";
Atlas.registerPlate({
  id: "mand",
  name: "The Mandelbrot Set",
  roman: "VI",
  accent: "#ffc069",
  tex: "z_{n+1}=z_n^{2}+c,\\qquad \\nu \\;=\\; n+1-\\log_2\\ln|z_n|\\;\\;\\text{(smooth escape time)}",
  plain: "z\u2099\u208a\u2081 = z\u2099\u00b2 + c,   \u03bd = n + 1 \u2212 log\u2082 ln|z\u2099|",
  caption: "Iterate z\u00b2 + c and ask one question of every point c in the plane: does the orbit escape? The answer, graded by the smooth escape time \u03bd, is raised into relief \u2014 spires climb where orbits linger near the boundary, and the glowing mesa is the set itself, where they never leave. Each point samples c at random, so the infinitely intricate boundary anti-aliases itself. Zoom and pan live in the levers; raise ITERATIONS as you go deeper.",
  cam: { dist: 3.4, pitch: 0.52, tgtY: 0.30, rot: 0.03 },
  gain: 0.9,
  params: [
    { label: "ITERATIONS", min: 16,   max: 120, step: 1,     def: 60    },
    { label: "ZOOM",       min: 1,    max: 60,  step: 0.1,   def: 1     },
    { label: "CENTER RE",  min: -2.2, max: 0.8, step: 0.001, def: -0.70 },
    { label: "CENTER IM",  min: -1.2, max: 1.2, step: 0.001, def: 0.0   },
    { label: "HEIGHT",     min: 0,    max: 1.6, step: 0.01,  def: 0.8   },
    { label: "PALETTE CYCLE", min: 0, max: 3,   step: 0.01,  def: 0.9   }
  ],
  glsl: `
vec3 shape_mand(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float K = P[0];
  /* sample c at random inside the current window: stochastic AA */
  vec2 win = vec2(mix(-1.55, 1.55, q.x), (q.y - 0.5)*2.6) + (rnd.xy - 0.5)*0.002;
  vec2 c = vec2(P[2], P[3]) + win / P[1];
  vec2 z = vec2(0.0);
  float m2 = 0.0;
  float n = K;
  for(int j = 0; j < 120; j++){
    if(float(j) >= K) break;
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    m2 = dot(z, z);
    if(m2 > 40.0){ n = float(j); break; }
  }
  float hgt;
  if(n >= K){
    hgt = P[4];
    col = vec3(0.60, 0.16, 0.05)*0.5;
  } else {
    float nu = n + 1.0 - log2(max(1.0, 0.5*log(m2)));
    float x = clamp(nu/K, 0.0, 1.0);
    hgt = P[4]*pow(x, 2.0);
    col = pal(fract(P[5]*x + 0.02*uT),
              vec3(0.50, 0.33, 0.20), vec3(0.50, 0.38, 0.30),
              vec3(1.0), vec3(0.00, 0.12, 0.30));
    col *= 0.22 + 1.15*x;
  }
  /* plot in the window frame so the view stays put while zooming */
  return vec3(win.x*0.72, hgt, win.y*0.72);
}`
});
