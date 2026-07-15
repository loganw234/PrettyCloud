"use strict";
Atlas.registerPlate({
  id: "gibbs",
  name: "The Gibbs Phenomenon",
  roman: "IX",
  accent: "#7fb4ff",
  tex: "S_N(x)=\\sum_{k=1}^{N} b_k\\,\\sin kx,\\qquad \\lim_{N\\to\\infty}\\,\\max S_N \\;\\approx\\; 1.0895\\,\\cdot f(0^{+})",
  plain: "S\u2099(x) = \u03a3 b\u2096 sin(kx);  overshoot \u2192 8.95% forever",
  caption: "Truncate a Fourier series and it converges everywhere \u2014 except that near every jump it overshoots by the same stubborn 9%, no matter how many harmonics you add. Depth is the harmonic count N, so the whole surface is convergence itself; the hot ridges flanking each discontinuity are the Gibbs phenomenon refusing to die, only narrowing. The TYPE lever morphs the target from square wave to sawtooth.",
  cam: { dist: 3.4, pitch: 0.35, tgtY: 0.0, rot: 0.03 },
  gain: 1.1,
  params: [
    { label: "HARMONICS",  min: 1,   max: 64, step: 1,    def: 24  },
    { label: "SQUARE\u2194SAW", min: 0, max: 1, step: 0.01, def: 0   },
    { label: "PHASE SPEED",min: 0,   max: 2,  step: 0.01, def: 0.6 },
    { label: "DEPTH AXIS", min: 0.5, max: 4,  step: 0.01, def: 2.6 },
    { label: "AMPLITUDE",  min: 0.2, max: 1.6,step: 0.01, def: 0.9 }
  ],
  glsl: `
vec3 shape_gibbs(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float x  = (q.x - 0.5)*TAU*1.05;
  float nf = 1.0 + q.y*(P[0] - 1.0);     /* fractional harmonic count */
  float ph = P[2]*uT;
  float xi = mod(x - ph + PI, TAU) - PI; /* wrapped argument */
  const float A = 0.75;
  float s = 0.0;
  for(int k = 1; k <= 64; k++){
    float fk = float(k);
    if(fk > nf + 1.0) break;
    float w = clamp(nf - fk + 1.0, 0.0, 1.0);   /* fade last harmonic in */
    float odd = (fract(fk*0.5) > 0.25) ? 1.0 : 0.0;
    float sq  = odd * (4.0*A/PI) / fk;                    /* square wave  */
    float sw  = (2.0*A/PI) * ((odd > 0.5) ? 1.0 : -1.0) / fk; /* sawtooth */
    s += w * mix(sq, sw, P[1]) * sin(fk*xi);
  }
  /* the limit function, for measuring the overshoot */
  float lim = mix(A*sign(sin(xi)), A*xi/PI, P[1]);
  float dev = abs(s - lim);
  float y = P[4]*0.65*s;
  vec3 p = vec3(x*0.42, y, (q.y - 0.5)*P[3]*0.8);
  col = mix(vec3(0.10, 0.26, 0.50), vec3(0.55, 0.75, 1.0), 0.5 + 0.55*s);
  col = col*0.55 + vec3(1.0, 0.42, 0.12)*smoothstep(0.03, 0.28, dev)*1.5;
  return p;
}`
});
