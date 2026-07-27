"use strict";
Atlas.registerPlate({
  id: "wavecat",
  name: "Wave Catastrophes",
  roman: "L",
  accent: "#ffc287",
  tex: "I(s)\\propto\\mathrm{Ai}^{2}(s),\\quad \\mathrm{Ai}(x)=c_{1}f(x)-c_{2}g(x);\\qquad P(X,Y)=\\int_{-\\infty}^{\\infty}\\!e^{\\,i\\left(t^{4}+Xt^{2}+Yt\\right)}\\,dt",
  plain: "I(s) ∝ Ai²(s),  Ai(x) = c₁f(x) − c₂g(x);   P(X,Y) = ∫ e^{i(t⁴ + Xt² + Yt)} dt",
  caption: "Ray optics makes a caustic infinitely bright; the wave field does not. Across a fold the intensity is Airy's function squared: fringes on the lit side, exponential darkness beyond, and the brightest fringe sitting a little inside the geometrical caustic itself, which is drawn here as a dim slate wire. FRINGE SCALE sets how much of the Airy coordinate is packed into that band. The first two forms are the fold and the cusp — A₂ and A₃, the foot of the same ADE ladder Plate XLVIII climbs — given back the wavelength that catastrophe theory throws away: FORM 1 is Pearcey's cusp integral, quadratured per point at QUALITY steps, with the cusp curve threaded through it. FORM 2 dresses Plate XXXIX's rainbow with the function Airy built for it in 1838: DROP SIZE widens the supernumeraries as drops grow finer, though the spacing here is exaggerated and coarse drops smear it away. Brightness is the intensity itself.",
  cam: { dist: 3.0, pitch: 0.5, tgtY: 0.0, rot: 0.03 },
  gain: 0.95,
  params: [
    { label: "FORM",         min: 0,   max: 2,   step: 1,    def: 0    },
    { label: "FRINGE SCALE", min: 0.3, max: 3,   step: 0.01, def: 1.0  },
    { label: "DROP SIZE",    min: 0.15, max: 3,  step: 0.01, def: 0.4  },
    { label: "QUALITY",      min: 96,  max: 256, step: 8,    def: 160  },
    { label: "TINT",         min: 0,   max: 1,   step: 0.01, def: 0.85 },
    { label: "GLOW",         min: 0,   max: 1,   step: 0.01, def: 0.5  }
  ],
  glsl: `
/* Ai(x) by its power series, Ai = c1*f - c2*g, with
     f: a0 = 1, a_(k+1) = a_k * x^3/((3k+2)(3k+3))     -> f = 1 + x^3/6 + ...
     g: b0 = x, b_(k+1) = b_k * x^3/((3k+3)(3k+4))     -> g = x + x^4/12 + ...
     c1 = Ai(0)  = 3^(-2/3)/Gamma(2/3) = 0.3550280539
     c2 = -Ai'(0)= 3^(-1/3)/Gamma(1/3) = 0.2588194038
   Hand check at x = -2.338 (the first zero): f -> -0.36898, g -> -0.50645,
   c1*f - c2*g = -0.13100 + 0.13108 = 8e-5. Good.
   The series is used only on -7 < x < 3. Beyond that it is not the truncation
   that fails but float32: the largest interior term reaches ~2e4 at x = -7 and
   an order of magnitude more at x = -8, so cancelling down to |Ai| ~ 0.05 eats
   the mantissa. The asymptotics take over instead, with their first correction
   term (5/72z, harmless since the branch is only entered for z > 3.4), blended
   over -7 < x < -6, where the asymptotic's own leading error (the 385/10368 z^-2
   term it drops) is only ~1e-4 -- far below a visible seam:
     x -> -inf : Ai ~ [sin(w) - (5/72z)cos(w)]/(sqrt(pi)|x|^(1/4)),
                 z = (2/3)|x|^(3/2),  w = z + pi/4
     x -> +inf : Ai ~ exp(-z)[1 - 5/72z]/(2 sqrt(pi) x^(1/4))                 */
float wavecat_airy(float x){
  float ax = max(abs(x), 1.0e-8);
  float z  = 0.66666667*pow(ax, 1.5);
  float am = 1.0/(1.77245385*pow(ax, 0.25));
  float cq = 5.0/(72.0*max(z, 1.0e-3));
  if(x >  3.0) return 0.5*am*exp(-min(z, 60.0))*(1.0 - cq);
  if(x < -7.0) return am*(sin(z + 0.25*PI) - cq*cos(z + 0.25*PI));
  float x3 = x*x*x;
  float f = 1.0, af = 1.0;
  float g = x,   bg = x;
  for(int k = 0; k < 24; k++){
    float kf = float(k);
    af *= x3/((3.0*kf + 2.0)*(3.0*kf + 3.0)); f += af;
    bg *= x3/((3.0*kf + 3.0)*(3.0*kf + 4.0)); g += bg;
  }
  float ser = 0.3550280539*f - 0.2588194038*g;
  if(x > -6.0) return ser;
  return mix(ser, am*(sin(z + 0.25*PI) - cq*cos(z + 0.25*PI)), -x - 6.0);
}

/* t = 0 (400 nm) .. 1 (700 nm); sums of smoothsteps, never negative */
vec3 wavecat_wl2rgb(float t){
  t = clamp(t, 0.0, 1.0);
  float r = smoothstep(0.42, 0.66, t) + 0.26*(1.0 - smoothstep(0.0, 0.20, t));
  float g = smoothstep(0.12, 0.40, t)*(1.0 - smoothstep(0.58, 0.90, t));
  float b = 1.0 - smoothstep(0.24, 0.52, t);
  return vec3(r, g, b);
}

vec3 shape_wavecat(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int   form = int(P[0] + 0.5);
  float fs   = P[1];
  float drop = max(P[2], 0.05);
  float tint = clamp(P[4], 0.0, 1.0);
  float gl   = 0.35 + 0.85*P[5];
  vec3  warm = vec3(1.00, 0.76, 0.53);

  /* the sampled window across the caustic, in Airy units: negative s is the
     illuminated (two-ray) side, positive s the dark side. Ai^2 peaks at
     s = -1.01879 with Ai = 0.53566, so 0.28693 normalizes the main lobe to 1. */
  float sMin = -(3.0 + 7.0*fs);
  float sMax =  1.0 + 2.0*fs;

  if(form == 1){
    /* -- THE CUSP (A3).  P(X,Y) = int exp(i(t^4 + X t^2 + Y t)) dt by direct
       midpoint quadrature per point. The stationary points solve
       4t^3 + 2Xt + Y = 0 and collide when 12t^2 + 2X = 0, i.e. X = -6t^2,
       Y = 8t^3: that parametrization is drawn as a wire rather than
       eliminating t. Truncation T is tied to the step count so the fastest
       phase advance 8T^4/N stays near 2.2 rad -- below Nyquist -- and the
       window exp(-(t/T)^8) removes the truncation ringing. Raise QUALITY
       when FRINGE SCALE is high; the far corners then need larger |t|. */
    float ps = 0.65 + 0.35*fs;                 /* window scale 0.755 .. 1.70 */
    float sz = 1.30/(4.75*ps);
    float sy = 1.30/(6.50*ps);
    float X, Y;
    if(u2f(hashu(seed ^ 0x9e37u)) < 0.03){
      float t = mix(-1.15, 1.15, q.x);
      X = -6.0*t*t;
      Y =  8.0*t*t*t;
      col = vec3(0.62, 0.78, 1.00)*0.055*gl;
    } else {
      X = mix(-6.5, 3.0, q.x)*ps;
      Y = mix(-6.5, 6.5, q.y)*ps;
      int   NS = clamp(int(P[3] + 0.5), 8, 256);
      float fN = float(NS);
      float T  = clamp(pow(0.275*fN, 0.25), 2.0, 3.2);
      float dt = 2.0*T/fN;
      float T2 = T*T;
      float sr = 0.0, si = 0.0;
      for(int it = 0; it < 256; it++){
        if(it >= NS) break;
        float t  = -T + (float(it) + 0.5)*dt;
        float t2 = t*t;
        float ph = t2*t2 + X*t2 + Y*t;
        float r4 = (t2/T2)*(t2/T2);
        float wn = exp(-r4*r4);                /* (t/T)^8 */
        sr += wn*cos(ph);
        si += wn*sin(ph);
      }
      sr *= dt; si *= dt;
      float Ip = (sr*sr + si*si)/3.29;         /* |P(0,0)|^2 = 4*Gamma(5/4)^2 = 3.2863 */
      /* the field's one hot spot is the cusp focus, |P| = 2.647 at X = -2.195,
         Y = 0, i.e. Ip = 2.13 raw; this holds the peak near 1.08 so this form's
         brightest point stays inside budget even at GLOW = 1 */
      Ip = Ip/(1.0 + 0.46*Ip);
      col = mix(vec3(0.85, 0.50, 0.26), vec3(1.02, 0.86, 0.66), clamp(Ip, 0.0, 1.0))
            *Ip*gl*1.05;
    }
    /* the field fills exactly +-1.30 in both axes; the wire is parametrized in
       (X,Y) rather than in q, so it is the only thing this clip ever cuts --
       it stops the cusp arms at the frame instead of past the sampled field */
    vec3 wp = vec3(Y*sy, 0.0, (X + 1.75*ps)*sz);
    if(abs(wp.x) > 1.305 || abs(wp.z) > 1.305){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
    return wp;
  }

  if(form == 2){
    /* -- THE RAINBOW, DRESSED.  Descartes' k = 1 bow: b_R^2 = (4-n^2)/3, and
       theta_R = pi - D = 4t - 2i with sin i = b_R, sin t = b_R/n. At the mean
       index 1.3375 that is 0.72306 rad = 41.43 deg; the Cauchy fit
       n = 1.3247 + 3088.5/lambda^2 spreads it from 0.70694 (400 nm, 40.51 deg)
       to 0.73949 (700 nm, 42.37 deg), a 1.86 deg bow. Rays exist only inside
       theta_R -- the deviation D is stationary there, a minimum -- so the
       Airy variable s = (theta - theta_R)/w is negative there: the
       supernumeraries lie inside the primary, Alexander's band outside.
       The angular width w scales as (lambda/a)^(2/3) -- fine drops, wide
       fringes. The radial direction is magnified to fit the frame, so the
       fringe-to-colour ratio is honest but the angles are not. */
    float lt  = rnd.x;
    float lam = mix(400.0, 700.0, lt);
    float nr  = 1.3247 + 3088.5/(lam*lam);
    float bR  = sqrt(max((4.0 - nr*nr)/3.0, 1.0e-6));
    float i0  = asin(clamp(bR,      0.0, 0.999999));
    float t0  = asin(clamp(bR/nr,   0.0, 0.999999));
    float thR = 4.0*t0 - 2.0*i0;
    float wRf = 0.0044*pow(1.0/drop, 0.66666667);
    float cw  = pow(lam/600.0, 0.66666667);   /* 0.763 (400nm) .. 1.108 (700nm) */
    float wA  = wRf*cw;
    float s   = mix(sMin, sMax, q.y);
    float th  = thR + s*wA;
    float lo  = 0.70694 + sMin*wRf*1.12;
    float hi  = 0.73949 + sMax*wRf*1.12;
    float M   = 0.84/max(hi - lo, 1.0e-3);
    float rho = 0.97 + M*(th - 0.5*(lo + hi));
    float phi = mix(-1.05, 1.05, q.x);
    float ai  = wavecat_airy(s);
    float I2  = ai*ai/0.28693;
    float p0  = 1.0*sin(0.22*uT);
    float swp = 0.30*exp(-(phi - p0)*(phi - p0)/0.03);
    /* two measure factors, both needed for brightness to stay an intensity.
       rho: sampling is uniform in (phi, rho), so density per unit area carries
       a 1/rho. cw: each wavelength is sampled uniformly in its own s, so it is
       smeared over a radial band of width proportional to wA = wRf*cw. Red's
       band is 1.45x wider than violet's, so uniform-in-s sampling thins it by
       exactly that factor; cw puts it back, or the bow reads too blue. */
    col = mix(warm, wavecat_wl2rgb(lt), tint)*I2*rho*cw*0.66*gl*(1.0 + swp);
    vec3 wp = vec3(rho*sin(phi), (rnd.y - 0.5)*0.05, rho*cos(phi) - 0.83);
    if(any(greaterThan(abs(wp), vec3(1.48)))){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
    return wp;
  }

  /* -- THE FOLD (A2).  A shallow arc C(u) = (1.2u, 0.42u^2) stands in for the
     caustic; the light lies on its concave side. Points are laid on the normal
     offset C(u) + n N(u), uniformly in the Airy coordinate s = -n/nsc, and
     weighted by Ai(s)^2 -- so the geometrical line (slate wire) is NOT the
     brightest place: the main lobe sits at s = -1.019, a little inside it.
     The offset map has Jacobian |C'|(1 - kappa n) with kappa = 1.008/|C'|^3
     <= 0.583, radius of curvature 1.71 > the 0.95 the offset ever reaches, so
     it never folds; the factor is carried so brightness stays a density. */
  float u  = mix(-1.0, 1.0, q.x);
  vec2  C  = vec2(1.20*u, 0.42*u*u);
  vec2  dC = vec2(1.20, 0.84*u);
  float sp = length(dC);
  vec2  nv = vec2(-dC.y, dC.x)/max(sp, 1.0e-6);   /* +z at u = 0: concave side */
  float kp = 1.008/(sp*sp*sp);
  bool  wr = (u2f(hashu(seed ^ 0x5eedu)) < 0.02);
  float s  = wr ? 0.0 : mix(sMin, sMax, q.y);
  float nn = -s*(0.95/(3.0 + 7.0*fs));
  float ai = wavecat_airy(s);
  float I0 = ai*ai/0.28693;
  float jc = sp*max(1.0 - kp*nn, 0.04);
  float u0 = 1.05*sin(0.22*uT);
  float sw = 0.30*exp(-(u - u0)*(u - u0)/0.03);
  vec3  tn = wr ? vec3(0.42, 0.58, 0.88) : warm;
  col = tn*(wr ? 0.10 : I0*jc*0.66)*gl*(1.0 + sw);
  vec2 pl = C + nn*nv;
  vec3 wp = vec3(pl.x*0.95, (rnd.x - 0.5)*0.05, (pl.y - 0.46)*0.95);
  if(any(greaterThan(abs(wp), vec3(1.48)))){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  return wp;
}`
});
