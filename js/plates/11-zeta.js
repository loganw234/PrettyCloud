"use strict";
Atlas.registerPlate({
  id: "zeta",
  name: "The Critical Line",
  roman: "XI",
  accent: "#c8b8ff",
  tex: "\\zeta\\!\\left(\\tfrac12+it\\right)=\\sum_{n=1}^{\\infty} n^{-1/2}\\,e^{-\\,it\\ln n}",
  plain: "\u03b6(\u00bd+it) = \u03a3 n^{\u2212\u00bd} e^{\u2212it\u00b7ln n}",
  caption: "Partial sums of the Riemann zeta function along the critical line, drawn as filaments: each strand is the walk 1 + 2\u207b\u02e2 + 3\u207b\u02e2 + \u22ef at one height t, spiraling toward its limit. Where a strand's end pinches onto the central axis, \u03b6(\u00bd+it) = 0 \u2014 the first zeros live at t \u2248 14.13, 21.02, 25.01. The Riemann Hypothesis is the claim that this line is the only place they ever occur. Slide HEIGHT to climb the line.",
  cam: { dist: 3.6, pitch: 0.15, tgtY: 0.0, rot: 0.05 },
  gain: 0.8,
  params: [
    { label: "HEIGHT t",  min: 2,   max: 120, step: 0.1,  def: 21   },
    { label: "SPAN \u0394t", min: 5, max: 80,  step: 0.5,  def: 30   },
    { label: "TERMS",     min: 8,   max: 64,  step: 1,    def: 48   },
    { label: "SCALE",     min: 0.2, max: 1.2, step: 0.01, def: 0.55 },
    { label: "COLUMN",    min: 1,   max: 4,   step: 0.05, def: 2.4  }
  ],
  glsl: `
vec3 shape_zeta(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float t  = P[0] + (q.y - 0.5)*P[1];    /* height on the critical line */
  float kf = 1.0 + q.x*(P[2] - 1.0);     /* how many terms of the walk  */
  vec2 S = vec2(0.0);
  for(int nn = 1; nn <= 64; nn++){
    float fn = float(nn);
    if(fn > kf + 1.0) break;
    float w = clamp(kf - fn + 1.0, 0.0, 1.0);
    float amp = inversesqrt(fn);
    float ang = t*log(fn);
    S += w*amp*vec2(cos(ang), -sin(ang));
  }
  vec3 p = vec3((S.x - 1.2)*P[3], (q.y - 0.5)*P[4], S.y*P[3]);
  col = pal(q.x*0.7, vec3(0.42, 0.40, 0.55), vec3(0.40, 0.38, 0.42),
            vec3(1.0, 0.95, 0.85), vec3(0.62, 0.45, 0.20));
  col *= 0.35 + 1.25*pow(q.x, 3.0);      /* the walk's endpoint glows */
  return p;
}`
});
