"use strict";
Atlas.registerPlate({
  id: "arnold",
  name: "Arnold Tongues",
  roman: "XXXIV",
  accent: "#ffb0c8",
  tex: "\\theta_{n+1}=\\theta_n+\\Omega+\\tfrac{K}{2\\pi}\\sin 2\\pi\\theta_n,\\qquad \\rho=\\lim_{n\\to\\infty}\\tfrac{\\theta_n-\\theta_0}{n}",
  plain: "θₙ₊₁ = θₙ + Ω + (K/2π) sin 2πθₙ,   ρ = lim (θₙ − θ₀)/n",
  caption: "Kick a rotor periodically and it may surrender its frequency. The circle map's winding number ρ, the mean advance per kick, locks onto each rational p/q inside a tongue fanning out from Ω=p/q on the K=0 axis, tongues interleaved in Farey order, opening with width of order K^q. Each point is one orbit iterated past its transient; the surface plots ρ−Ω, coloured by the locked denominator, grey-blue where no small rational claims the orbit. MODE 1 fixes K at K MAX and draws the devil's staircase: Ω is sampled uniformly, so the light each tread carries is the measure of its locking interval, and at K=1 the treads carry all the light.",
  cam: { dist: 3.0, pitch: 0.5, tgtY: 0.0, rot: 0.04 },
  gain: 0.8,
  params: [
    { label: "MODE",        min: 0,   max: 1,    step: 1,     def: 0    },
    { label: "K MAX",       min: 0,   max: 1.2,  step: 0.005, def: 1.0  },
    { label: "STEPS",       min: 50,  max: 336,  step: 1,     def: 200  },
    { label: "HEIGHT",      min: 0,   max: 2,    step: 0.01,  def: 1.0  },
    { label: "TONGUE TINT", min: 0,   max: 1,    step: 0.01,  def: 0.85 },
    { label: "GLOW",        min: 0,   max: 1,    step: 0.01,  def: 0.6  }
  ],
  glsl: `
vec3 shape_arnold(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode = int(P[0] + 0.5);
  float Kmax = P[1];
  int steps = int(P[2] + 0.5);
  float H = P[3];
  float tint = P[4];
  float glow = P[5];

  float Om = q.x;                          /* drive frequency, in turns */
  float K = (mode == 0) ? q.y*Kmax : Kmax; /* coupling: plane in mode 0, slice in mode 1 */

  float th = rnd.x;      /* IC-independent winding for K<1; averages sheets above */
  float acc = 0.0;       /* unwrapped winding: plain sum of O(1) increments */
  int total = 64 + steps;
  for(int j = 0; j < 400; j++){
    if(j >= total) break;
    float d = Om + (K/TAU)*sin(TAU*th);
    if(j >= 64) acc += d;                  /* discard 64 transient kicks */
    th = fract(th + d);                    /* th wrapped to [0,1), so TAU*th stays well-conditioned */
  }
  float fsteps = max(float(steps), 1.0);   /* P[2] >= 50 by contract; guard the divide anyway */
  float rho = acc/fsteps;

  /* nearest rational p/q, lowest denominator first (Farey classification) */
  float tol = 1.2/fsteps;                  /* just above the estimator's <1/N error on a locked orbit;
                                              at default STEPS, tight enough that the golden mean
                                              is not tinted as 5/8 */
  int bq = 0;
  for(int qi = 1; qi <= 8; qi++){
    float fq = float(qi);
    float pr = floor(rho*fq + 0.5);
    if(abs(rho - pr/fq) < tol){ bq = qi; break; }
  }

  if(bq > 0){
    vec3 tc = pal(float(bq)*0.125, vec3(0.62, 0.45, 0.52), vec3(0.38, 0.32, 0.38),
                  vec3(1.0, 1.0, 1.0), vec3(0.0, 0.28, 0.6));
    col = mix(vec3(0.8, 0.76, 0.8), tc, clamp(tint, 0.0, 1.0));
  } else {
    col = vec3(0.22, 0.28, 0.42);          /* quasiperiodic: dim grey-blue */
  }
  col *= 0.4 + 0.9*glow;

  if(mode == 0){
    return vec3((Om - 0.5)*2.4, (rho - Om)*H*4.0, (q.y - 0.5)*2.4);
  }
  return vec3((Om - 0.5)*2.6, (rho - 0.5)*H*1.8, (rnd.z - 0.5)*0.06);
}`
});
