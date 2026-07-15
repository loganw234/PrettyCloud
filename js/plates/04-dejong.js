"use strict";
Atlas.registerPlate({
  id: "jong",
  name: "A Strange Attractor",
  roman: "IV",
  accent: "#ff9ed0",
  tex: "x_{n+1}=\\sin(a\\,y_n)-\\cos(b\\,x_n),\\qquad y_{n+1}=\\sin(c\\,x_n)-\\cos(d\\,y_n)",
  plain: "x\u2099\u208a\u2081 = sin(ay\u2099) \u2212 cos(bx\u2099),   y\u2099\u208a\u2081 = sin(cx\u2099) \u2212 cos(dy\u2099)",
  caption: "Millions of independent trajectories of the same two-line map (Peter de Jong's), each plotted after a handful of iterations. They forget their origins and condense onto the attractor: brightness is the invariant measure itself, a Monte-Carlo estimate that sharpens with every added point. Depth is a Takens delay-embedding; color is local speed. Steer a, b, c, d by hand \u2014 almost every setting hides a different creature.",
  cam: { dist: 3.0, pitch: 0.22, tgtY: 0.0, rot: 0.04 },
  gain: 0.55,
  params: [
    { label: "A",          min: -2.8, max: 2.8, step: 0.005, def:  1.40 },
    { label: "B",          min: -2.8, max: 2.8, step: 0.005, def: -2.30 },
    { label: "C",          min: -2.8, max: 2.8, step: 0.005, def:  2.40 },
    { label: "D",          min: -2.8, max: 2.8, step: 0.005, def: -2.10 },
    { label: "DRIFT",      min: 0,    max: 1,   step: 0.01,  def: 0.4  },
    { label: "ITERATIONS", min: 4,    max: 24,  step: 1,     def: 14   },
    { label: "DEPTH",      min: 0,    max: 0.8, step: 0.01,  def: 0.31 }
  ],
  glsl: `
vec3 shape_jong(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  vec2 pt  = vec2(rnd.x, rnd.y)*4.0 - 2.0;   /* hashed initial condition */
  vec2 ptp = pt;
  float a = P[0] + 0.52*P[4]*sin(0.041*uT);
  float b = P[1] + 0.37*P[4]*sin(0.033*uT + 1.4);
  float c = P[2] + 0.36*P[4]*sin(0.037*uT + 2.9);
  float d = P[3] + 0.41*P[4]*sin(0.029*uT + 4.2);
  for(int j = 0; j < 24; j++){
    if(float(j) >= P[5]) break;
    ptp = pt;
    pt  = vec2(sin(a*pt.y) - cos(b*pt.x),
               sin(c*pt.x) - cos(d*pt.y));
  }
  float sp = length(pt - ptp);
  col = pal(clamp(sp*0.30, 0.0, 1.0),
            vec3(0.46, 0.34, 0.55), vec3(0.44, 0.33, 0.40),
            vec3(1.0, 0.95, 0.80), vec3(0.65, 0.40, 0.10));
  /* third axis: Takens delay coordinate */
  return vec3(pt.x*0.62, pt.y*0.62, ptp.x*P[6]);
}`
});
