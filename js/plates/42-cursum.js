"use strict";
Atlas.registerPlate({
  id: "cursum",
  name: "Curlicues",
  roman: "XLII",
  accent: "#98e8b8",
  tex: "S_N(x)=\\sum_{n=1}^{N}e^{\\,i\\pi x n^{2}},\\qquad\\Bigl|\\sum_{n=1}^{q}e^{2\\pi i\\,p n^{2}/q}\\Bigr|=\\sqrt{q}\\quad(\\gcd(p,q)=1,\\ q\\ \\text{odd})",
  plain: "S_N(x) = Σ e^{iπxn²};   |Σ_{n=1..q} e^{2πipn²/q}| = √q  (gcd(p,q)=1, q odd)",
  caption: "The running sum of e^{iπXn²} walks the plane in unit steps. Its turning rate drifts slowly, so stretches of the walk shadow the Cornu spiral of Fresnel diffraction — these are the curlicues, and Berry and Goldberg showed their spirals-within-spirals hierarchy is orchestrated by the continued fraction of X. At rational X = p/q the terms repeat and the walk becomes one motif stamped over and over; for p/q in lowest terms Gauss computed the complete sum exactly — magnitude √q for odd q. Every step has unit length, so brightness measures time spent: how often the sum revisits a neighbourhood. KIND selects linear, quadratic, or cubic Weyl phases — PHASE adds a linear term to the quadratic — the sums behind Plate XI's Riemann–Siegel formula.",
  cam: { dist: 3.0, pitch: 0.9, tgtY: 0.15, rot: 0.02 },
  gain: 0.9,
  params: [
    { label: "KIND",   min: 0,    max: 3,   step: 1,      def: 0         },
    { label: "X",      min: 0,    max: 1,   step: 0.0005, def: 0.4142135 },
    { label: "PHASE",  min: 0,    max: 1,   step: 0.0005, def: 0         },
    { label: "LENGTH", min: 64,   max: 768, step: 1,      def: 384       },
    { label: "SCALE",  min: 0.3,  max: 3,   step: 0.01,   def: 1.1       },
    { label: "LIFT",   min: 0,    max: 1.2, step: 0.01,   def: 0.4       },
    { label: "GLOW",   min: 0,    max: 1,   step: 0.01,   def: 0.6       }
  ],
  glsl: `
vec3 shape_cursum(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  /* S_N = sum_{n=1..N} exp(i*pi*f(n)). The phase is kept in TURNS
     (theta_n = f(n)/2 mod 1) and advanced by exact finite differences,
     fract()ed every step, so float32 never sees the raw argument
     pi*x*n^2 (~1e6 by n~700, which would eat all the low bits).
     Quadratic f = x n^2, so theta_n = x n^2 / 2:
       theta_1 = x/2;  first increment delta_1 = theta_2 - theta_1 = 3x/2;
       increments grow by the constant second difference x:
       delta_(n+1) = fract(delta_n + x),  theta_(n+1) = fract(theta_n + delta_n).
       Check vs direct: step 1 direction TAU*(x/2) = pi*x*1^2, so
       S_1 = (cos pi x, sin pi x); theta_2 = x/2 + 3x/2 = 2x gives
       direction TAU*2x = pi*x*2^2. Both match e^(i pi x n^2) exactly.
     Cubic f = x n^3, theta_n = x n^3 / 2, constant THIRD difference 3x:
       theta_1 = x/2, d1_1 = (8x-x)/2 = 7x/2, d2_1 = 3x(1+1) = 6x, d3 = 3x.
       Check: theta_2 = x/2 + 7x/2 = 4x = x*2^3/2;
              theta_3 = 4x + (7x/2 + 6x) = 27x/2 = x*3^3/2. */
  int kind = int(P[0] + 0.5);
  float x = P[1];
  float y = P[2];
  float LEN = P[3];
  int N = 1 + int(q.x*(LEN - 1.0));

  float th, d1, d2, d3;
  if(kind == 1){        /* linear f = x n: constant turning, the control circle */
    th = fract(0.5*x); d1 = fract(0.5*x); d2 = 0.0; d3 = 0.0;
  } else if(kind == 2){ /* quadratic + linear f = x n^2 + y n:
                           theta_1 = (x+y)/2, delta_1 = (3x+y)/2, d2 = x */
    th = fract(0.5*(x + y)); d1 = fract(1.5*x + 0.5*y); d2 = fract(x); d3 = 0.0;
  } else if(kind == 3){ /* cubic Weyl f = x n^3 */
    th = fract(0.5*x); d1 = fract(3.5*x); d2 = fract(6.0*x); d3 = fract(3.0*x);
  } else {              /* quadratic f = x n^2 */
    th = fract(0.5*x); d1 = fract(1.5*x); d2 = fract(x); d3 = 0.0;
  }

  vec2 S = vec2(0.0), Sprev = vec2(0.0);
  float dLast = d1;
  for(int n = 1; n <= 768; n++){
    if(n > N) break;
    Sprev = S;
    S += vec2(cos(TAU*th), sin(TAU*th));
    dLast = d1;                     /* local turning rate, turns per step */
    th = fract(th + d1);
    d1 = fract(d1 + d2);
    d2 = fract(d2 + d3);
  }

  /* Filament, not dots: q.y interpolates the N-th unit step between
     S_(N-1) and S_N. Every step has length 1, so the sampling is uniform
     in arc length and density is literally time spent per unit area. */
  vec2 w = mix(Sprev, S, q.y);
  float sc = P[4]/(3.0 + sqrt(LEN));           /* adaptive: |S| ~ sqrt(N) typic. */
  w *= sc;
  float r = length(w);
  w *= inversesqrt(1.0 + (r/1.35)*(r/1.35));   /* soft radial clamp to 1.35,
                                                  direction preserved, no /0 */

  float nf = (float(N - 1) + q.y)/LEN;         /* progress along the walk */
  vec3 p = vec3(w.x, nf*P[5], w.y);

  /* hue bands by the local turning rate: each spiral arm sits at nearly
     constant delta, so arms pick up distinct colors; c = 1 keeps the
     palette continuous across the delta = 0/1 wrap */
  col = pal(dLast, vec3(0.42, 0.55, 0.45), vec3(0.38, 0.36, 0.34),
            vec3(1.0, 1.0, 1.0), vec3(0.35, 0.10, 0.62));
  float u = fract(nf - 0.045*uT);              /* a slow pen-stroke highlight */
  u = min(u, 1.0 - u);
  col *= (0.30 + 0.85*P[6])*(0.85 + 0.5*exp(-300.0*u*u));
  return p;
}`
});
