"use strict";
Atlas.registerPlate({
  id: "buddha",
  name: "The Buddhabrot",
  roman: "XIII",
  accent: "#ffcf8f",
  tex: "\\rho(w)\\;\\propto\\!\\!\\sum_{c:\\,\\text{escapes}}\\;\\#\\{n:\\,z_n(c)=w\\},\\qquad z_{n+1}=z_n^2+c",
  plain: "ρ(w) ∝ # of escaping orbits zₙ₊₁ = zₙ² + c that visit w",
  caption: "Not the Mandelbrot set but its ghost. Take every point c whose orbit escapes, and record where those orbits wandered before they left. Each point here is one uniformly-chosen stop along one escaping trajectory — reservoir-sampled in a single pass — so brightness is exactly the density of visitation, the measure the escaping dynamics leave behind. The prisoners (the set itself) are invisible; only the paths of the free show. MIN ESCAPE hollows out the quick escapers to reveal the deep filaments.",
  cam: { dist: 3.2, pitch: 0.62, tgtY: 0.0, rot: 0.02 },
  gain: 0.7,
  params: [
    { label: "ITERATIONS",   min: 20, max: 400, step: 1,    def: 200 },
    { label: "MIN ESCAPE",   min: 0,  max: 80,  step: 1,    def: 3   },
    { label: "SCALE",        min: 0.3,max: 1.4, step: 0.01, def: 0.72 },
    { label: "3D LIFT",      min: 0,  max: 1.2, step: 0.01, def: 0.0 },
    { label: "PALETTE CYCLE",min: 0,  max: 2,   step: 0.01, def: 0.8 }
  ],
  glsl: `
vec3 shape_buddha(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float K = P[0];
  float minEsc = P[1];
  /* sample c across the classic window, jittered for anti-aliasing */
  vec2 c = vec2(mix(-2.1, 0.9, q.x), mix(-1.35, 1.35, q.y)) + (rnd.xy - 0.5)*0.004;
  /* analytic interior cull: main cardioid + period-2 bulb never escape */
  float xq = c.x - 0.25;
  float qb = xq*xq + c.y*c.y;
  if(qb*(qb + xq) < 0.25*c.y*c.y ||
     (c.x + 1.0)*(c.x + 1.0) + c.y*c.y < 0.0625){
    col = vec3(0.0); return vec3(0.0, -999.0, 0.0);
  }
  vec2 z = vec2(0.0), keep = c;
  uint h = seed;
  float esc = -1.0;
  for(int j = 0; j < 400; j++){
    if(float(j) >= K) break;
    z = cmul(z, z) + c;
    h = hashu(h);
    if(u2f(h) < 1.0/float(j + 1)) keep = z;   /* reservoir: one visited pt */
    if(dot(z, z) > 16.0){ esc = float(j); break; }
  }
  if(esc < 0.0 || esc < minEsc){       /* keep only slow-escaping orbits */
    col = vec3(0.0); return vec3(0.0, -999.0, 0.0);
  }
  float t = clamp(esc/K, 0.0, 1.0);
  float s = P[2];
  vec3 p = vec3((keep.x + 0.5)*s, P[3]*(t - 0.3), keep.y*s);
  col = pal(0.5 + P[4]*t, vec3(0.5, 0.42, 0.38), vec3(0.5, 0.46, 0.5),
            vec3(1.0), vec3(0.0, 0.18, 0.36));
  col *= 0.45 + 1.0*t;
  return p;
}`
});
