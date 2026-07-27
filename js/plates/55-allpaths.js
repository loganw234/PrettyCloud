"use strict";
Atlas.registerPlate({
  id: "allpaths",
  name: "The Sum Over Paths",
  roman: "LV",
  accent: "#9effdf",
  tex: "\\mathcal{A}=\\!\\!\\sum_{\\text{paths}}\\!\\! e^{\\,ikL(x)},\\qquad L(x)=|AX|+n\\,|XB|,\\qquad \\frac{dL}{dx}=0",
  plain: "A = Σ_paths e^{ikL(x)},   L(x) = |AX| + n·|XB|,   dL/dx = 0",
  caption: "Feynman's answer to why light goes straight: it does not — it takes every path, and they conspire. Each point lies on one two-segment route from source to detector via the surface, and the surface is sampled uniformly, so brightness here is nothing but path-sampling density. The physics is the hue: optical phase k(|AX| + n|XB|), wrapped to turns and scaled by PHASE ZOOM. Where that phase is stationary — Fermat's condition, dL/dx = 0 — a whole neighbourhood of paths shares one colour and adds; elsewhere the hue races and the paths cancel. Only the SPIRAL inset adds the phasors for real, coiling tight wherever they cancel and running straight where they do not. MODE gives Hero's equal angles, Snell's N RATIO, and — with paths deleted by STRIP PERIOD and DUTY — a grating, where censoring the cancelling paths lights fresh calm bands away from the specular one: the diffraction orders.",
  cam: { dist: 2.9, pitch: 0.85, tgtY: 0.0, rot: 0.02 },
  gain: 0.9,
  params: [
    { label: "MODE",         min: 0,    max: 2,   step: 1,     def: 0    },
    { label: "PHASE ZOOM",   min: 1,    max: 18,  step: 0.05,  def: 10   },
    { label: "N RATIO",      min: 1,    max: 2,   step: 0.01,  def: 1.5  },
    { label: "STRIP PERIOD", min: 0.02, max: 0.5, step: 0.005, def: 0.12 },
    { label: "DUTY",         min: 0.05, max: 1,   step: 0.01,  def: 0.45 },
    { label: "SPIRAL",       min: 0,    max: 1,   step: 1,     def: 1    },
    { label: "GLOW",         min: 0,    max: 1,   step: 0.01,  def: 0.55 }
  ],
  glsl: `
/* optical path length of the two-segment route A -> (x,0) -> B; the medium
   below the surface carries index n (n = 1 for the mirror modes) */
float allpaths_opl(vec2 A, vec2 B, float x, float n){
  vec2 X = vec2(x, 0.0);
  return length(X - A) + n*length(X - B);
}
/* GRATING mode deletes most of the surface: only the strips survive.
   fract() = x - floor(x) in GLSL, so negative x is handled correctly.
   Adjacent strips differ in phase by k*L'(x)*per turns, so wherever that is a
   whole number m every survivor carries the same hue and a fresh calm band
   opens away from the specular one: per*|L'| = m/k is exactly the grating
   equation d|sin th_m - sin th_i| = m*lambda with lambda = 1/k. At the default
   k = 10, per = 0.12 that asks for |L'| = 0.833, which the m = +-1 orders meet
   near x = +0.77 and x = -0.71 -- both well inside the mirror, flanking the
   specular band at x = 0.12; m = +-2 falls just off its ends. */
bool allpaths_alive(float x, float per, float duty, int md){
  if(md != 2) return true;
  return fract(x/per) < duty;
}
/* Exact fraction of [x0,x1] that survives the strips. The antiderivative of
   the square wave is F(u) = floor(u)*duty + min(fract(u), duty) in units of
   the period, so the phasor quadrature integrates the SAME censored surface
   the paths are drawn from, with no beating of the strips against the grid. */
float allpaths_cov(float x0, float x1, float per, float duty, int md){
  if(md != 2) return 1.0;
  float u0 = x0/per, u1 = x1/per;
  float F0 = floor(u0)*duty + min(fract(u0), duty);
  float F1 = floor(u1)*duty + min(fract(u1), duty);
  return clamp(per*(F1 - F0)/max(x1 - x0, 1.0e-6), 0.0, 1.0);
}
vec3 shape_allpaths(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int md      = int(P[0] + 0.5);          /* 0 mirror, 1 refraction, 2 grating */
  float kk    = P[1];                     /* PHASE ZOOM = waves per unit length */
  float nn    = (md == 1) ? max(P[2], 1.0) : 1.0;
  float per   = max(P[3], 0.02);
  float duty  = clamp(P[4], 0.02, 1.0);
  bool  spir  = (P[5] > 0.5);
  float glow  = 0.30 + 0.85*P[6];

  const float H     = 1.3;    /* the surface spans scene x in [-H, H] */
  const float ZOFF  = -0.15;  /* scene y = 0 lands on this world z */
  const float SPZ   = 0.92;   /* world z of the phasor inset's centre */
  const int   STEPS = 320;    /* phasor quadrature over the SAME x sampling */
  float dxs = 2.0*H/float(STEPS);

  /* The scene is drawn in a plane and laid flat into world xz (scene y grows
     toward -z) with a thin y jitter, the usual flat-plate convention here. */
  vec2 A = vec2(-0.8, 0.75);
  float bx = 0.8 + 0.06*cos(0.21*uT);     /* slow, small orbit of the detector. */
  float by = 0.55 + 0.06*sin(0.21*uT);    /* |grad_B L| = 1, so a 0.06 wander is
                                             0.6 turns at default k: the calm band
                                             drifts a little and its colour sweeps
                                             right through, and the spiral turns
                                             with it. Period ~30 s. */
  vec2 B = vec2(bx, (md == 1) ? -by : by);

  /* three voices: the paths, a dim rendering of the surface itself,
     and the running phasor sum */
  float g = u2f(hashu(seed ^ 0x5bf03635u));
  bool doPh   = spir && (g < 0.12);
  bool doSurf = (!doPh) && (g >= 0.12) && (g < 0.145);

  if(doSurf){
    float xs = mix(-H, H, q.x);
    if(!allpaths_alive(xs, per, duty, md)){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
    col = vec3(0.20, 0.24, 0.26)*glow*0.30;
    return vec3(xs, (rnd.x - 0.5)*0.024, ZOFF);
  }

  if(doPh){
    /* Running sum of exp(i*2pi*phase) over the surface, in the same uniform
       x quadrature the paths are drawn from, truncated at this point's own x.
       One loop yields both the partial sum (Sa, Sb bracket the M-th phasor)
       and the total, which centres the figure. Phase advances well under a
       quarter turn per step at default levers, so the coils are resolved;
       they coarsen at the rim only for the largest PHASE ZOOM and N RATIO. */
    int M = int(q.x*float(STEPS));
    if(M > STEPS - 1) M = STEPS - 1;
    if(M < 0) M = 0;

    vec2 S = vec2(0.0), Sa = vec2(0.0), Sb = vec2(0.0);
    float covM = 0.0, phM = 0.0;
    for(int j = 0; j < STEPS; j++){
      float x0 = -H + float(j)*dxs;
      float cv = allpaths_cov(x0, x0 + dxs, per, duty, md);
      float ph = fract(kk*allpaths_opl(A, B, x0 + 0.5*dxs, nn));
      if(j == M){ Sa = S; covM = cv; phM = ph; }
      S += cv*vec2(cos(TAU*ph), sin(TAU*ph));
      if(j == M) Sb = S;
    }
    if(covM <= 0.0){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

    /* q.y walks the M-th phasor head to tail, so the curve is drawn at
       uniform arc length, exactly as Plate XLII draws its curlicues */
    vec2 w = (mix(Sa, Sb, q.y) - 0.5*S)*(1.1/(float(STEPS)/3.0));
    float r = length(w);
    w *= inversesqrt(1.0 + (r/0.55)*(r/0.55));   /* soft clamp, no division by 0 */

    /* Heavily trimmed, and it has to be: 12% of the points land on a CURVE
       roughly a thousand pixels long, against 88% spread over the fan's whole
       area -- some thirty times the density per pixel. Untrimmed the inset
       would clip to a solid blob and the one thing it is for, coil versus
       straight run, would burn away. Only its SHAPE carries the amplitude. */
    col = pal(phM, vec3(0.48, 0.52, 0.50), vec3(0.42, 0.40, 0.44),
              vec3(1.0, 1.0, 1.0), vec3(0.15, 0.42, 0.68))*glow*0.055;
    return vec3(w.x, (rnd.x - 0.5)*0.020, SPZ + w.y);
  }

  /* ONE PATH. q.x picks the surface point across the whole surface -- not the
     specular one -- and q.y walks the bent polyline at uniform arc length. */
  float xs = mix(-H, H, q.x);
  if(!allpaths_alive(xs, per, duty, md)){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  vec2 X = vec2(xs, 0.0);
  float d1 = length(X - A);
  float d2 = length(X - B);
  float tt = q.y*(d1 + d2);
  vec2 sp = (tt < d1) ? mix(A, X, tt/max(d1, 1.0e-5))
                      : mix(X, B, (tt - d1)/max(d2, 1.0e-5));

  /* hue = total optical phase in turns. Near the stationary point dL/dx = 0,
     so a whole neighbourhood of paths shares one colour: equal angles for the
     mirror, sin i = n sin t for the interface. */
  float th = fract(kk*(d1 + nn*d2));
  col = pal(th, vec3(0.48, 0.52, 0.50), vec3(0.42, 0.40, 0.44),
            vec3(1.0, 1.0, 1.0), vec3(0.15, 0.42, 0.68))*glow;
  return vec3(sp.x, (rnd.x - 0.5)*0.016, ZOFF - sp.y);
}`
});
