"use strict";
Atlas.registerPlate({
  id: "diffract",
  name: "Diffraction, Grain by Grain",
  roman: "XLIX",
  accent: "#9fd4ff",
  tex: "I(\\theta)\\propto\\operatorname{sinc}^{2}\\!\\left(\\frac{\\pi a\\sin\\theta}{\\lambda}\\right)\\left[\\frac{\\sin\\!\\left(N\\pi d\\sin\\theta/\\lambda\\right)}{N\\sin\\!\\left(\\pi d\\sin\\theta/\\lambda\\right)}\\right]^{2},\\qquad I_{\\mathrm{Airy}}=\\left[\\frac{2J_{1}(x)}{x}\\right]^{2}",
  plain: "I(θ) ∝ sinc²(πa·sinθ/λ) · [sin(Nπd·sinθ/λ) / (N·sin(πd·sinθ/λ))]²,   Airy: [2J₁(x)/x]²",
  caption: "Each point is one photon landing on the screen with probability equal to the diffracted intensity, so brightness here is the Born rule: |amplitude|² estimated by counting arrivals. G. I. Taylor's feeble-light exposures of 1909 found the fringes just as sharp when the photons arrived one at a time. APERTURE runs from one slit to two, to a grating of N SLITS, to a round hole of radius SLIT WIDTH whose first dark Airy ring is Rayleigh's sin θ = 1.22 λ/D; those four are Fraunhofer, the far field. The fifth is Fresnel's near field: an opaque disk, with Poisson's absurdity at the centre of its shadow, as bright as the open beam, exactly as the Academy's commission found in 1819. FRESNEL N counts the zones the disk covers. SLIT WIDTH and SPACING are in wavelengths, so WAVELENGTH only recolours; its default 633 nm is the helium-neon line at 632.8. Raise TRAILS and the fringes assemble grain by grain.",
  cam: { dist: 2.5, pitch: 0.12, tgtY: 0.0, rot: 0.04 },
  gain: 0.95,
  params: [
    { label: "APERTURE",   min: 0,   max: 4,   step: 1,    def: 1   },
    { label: "SLIT WIDTH", min: 1,   max: 12,  step: 0.1,  def: 4   },
    { label: "SPACING",    min: 2,   max: 30,  step: 0.1,  def: 12  },
    { label: "N SLITS",    min: 2,   max: 8,   step: 1,    def: 5   },
    { label: "WAVELENGTH", min: 400, max: 700, step: 1,    def: 633 },
    { label: "FRESNEL N",  min: 0.5, max: 4,   step: 0.05, def: 2   },
    { label: "GLOW",       min: 0,   max: 1,   step: 0.01, def: 0.5 }
  ],
  glsl: `
/* spectral tint, 400 nm (violet) .. 700 nm (red). Each channel is a sum or
   product of smoothsteps, so it never goes negative; the result is then
   normalised and mixed toward white so WAVELENGTH changes hue, not exposure. */
vec3 diffract_wl2rgb(float lam){
  float t = clamp((lam - 400.0)/300.0, 0.0, 1.0);
  float r = smoothstep(0.42, 0.65, t) + 0.28*(1.0 - smoothstep(0.0, 0.20, t));
  float g = smoothstep(0.12, 0.38, t)*(1.0 - smoothstep(0.58, 0.86, t));
  float b = 1.0 - smoothstep(0.24, 0.50, t);
  vec3 c = vec3(r, g, b);
  c /= max(max(c.r, max(c.g, c.b)), 0.30);
  return mix(vec3(1.0), c, 0.85);
}

/* sinc^2 with the removable singularity handled: (sin x)/x -> 1 at x = 0 */
float diffract_sinc2(float x){
  float d = (abs(x) < 1.0e-3) ? 1.0 : x;    /* divisor is never zero, so even a
                                               compiler that evaluates both arms
                                               of the select cannot make a NaN */
  float s = (abs(x) < 1.0e-3) ? (1.0 - x*x/6.0) : sin(x)/d;
  return s*s;
}

/* N-slit array factor [sin(N psi)/(N sin psi)]^2 with psi = pi d sin(theta)/lambda.
   Where sin psi = 0 numerator and denominator vanish together and the limit is
   exactly 1 -- those are the principal maxima at d sin(theta) = m lambda, so the
   guard returns 1 rather than dividing. This factor already IS the interference
   term: at N = 2 it collapses to cos^2(psi), the textbook double slit, and no
   extra cosine is applied on top of it.
   psi is folded into [-pi/2, pi/2] first. The factor has period pi exactly --
   psi -> psi + pi flips the sign of both sines and the ratio is squared -- so
   the fold changes nothing mathematically; it is here because at SPACING 30 the
   raw argument N*psi reaches 226 radians, and GLSL ES only specifies sin() to
   2^-11 inside [-pi, pi]. After the fold the largest argument is 8*(pi/2), so
   the 1e-4 guard sits far above any argument-reduction error rather than
   alongside it. */
float diffract_af(float N, float psi){
  float p  = psi - PI*floor(psi/PI + 0.5);
  float sp = sin(p);
  if(abs(sp) < 1.0e-4) return 1.0;
  float r = sin(N*p)/(N*sp);
  return r*r;
}

/* J0: eleven-term power series below x = 5 (term ratio -y/(k+1)^2, y = x^2/4;
   the last term is 7e-6 there), Hankel asymptotic above, carried to the first
   correction: J0 ~ sqrt(2/(pi x))[cos(chi) + sin(chi)/(8x)], chi = x - pi/4.
   The leading term on its own is 4 percent low right at the join, which would
   put a visible step into the Arago integrand below; with the 1/(8x) term the
   worst absolute error over 5 <= x <= 95 is 6e-4 and the step at the join is
   under 0.4 percent. Checked against a series/Hankel reference. */
float diffract_J0(float x){
  float ax = abs(x);
  if(ax < 5.0){
    float y = 0.25*ax*ax;
    float term = 1.0;
    float s = 1.0;
    for(int k = 0; k < 10; k++){
      float kf = float(k) + 1.0;
      term = -term*y/(kf*kf);
      s += term;
    }
    return s;
  }
  float chi = ax - 0.25*PI;
  return sqrt(2.0/(PI*ax))*(cos(chi) + sin(chi)/(8.0*ax));
}

/* J1: eleven-term series below x = 8 built from term(k+1) = -term(k)*(x^2/4)
   /((k+1)(k+2)) starting at x/2, and above it the Hankel asymptotic carried to
   the first correction, J1 ~ sqrt(2/(pi x))[cos(chi) - 3 sin(chi)/(8x)] with
   chi = x - 3pi/4. Verified against the first zero: the series returns
   J1(3.83171) = -2e-6, and that zero is what fixes the first dark Airy ring.
   The series is the weaker branch by the time it reaches x = 8 (1.4 percent);
   the corrected asymptotic holds 4e-4 absolute out to x = 22.6, which is the
   largest argument SLIT WIDTH 12 can reach, where the bare leading term was
   9e-3 out and filled the outer dark rings in. J1 is odd, so the sign is
   restored at the end. */
float diffract_J1(float x){
  float ax = abs(x);
  float r;
  if(ax < 8.0){
    float y = 0.25*ax*ax;
    float term = 0.5*ax;
    r = term;
    for(int k = 0; k < 10; k++){
      float kf = float(k);
      term = -term*y/((kf + 1.0)*(kf + 2.0));
      r += term;
    }
  } else {
    float chi = ax - 0.75*PI;
    r = sqrt(2.0/(PI*ax))*(cos(chi) - 3.0*sin(chi)/(8.0*ax));
  }
  return (x < 0.0) ? -r : r;
}

/* POISSON-ARAGO. Fresnel field behind an opaque disk of radius A, at screen
   radius w, written in the disk's own units: sigma = rho/A, W = w/A, and the
   Fresnel number NF = A^2/(lambda z), so kappa A^2/2 = pi NF and kappa A w
   = 2 pi NF W. Substituting t = sigma^2 (rho drho = (A^2/2) dt) makes the
   quadratic phase exactly linear in t, which matters: the midpoint rule's
   leading error against a linear phase is then a single global scale factor
   (1 - (pi NF dt)^2/24) rather than a distortion.
   The outer limit is set by a fixed phase budget PHI rather than a fixed
   radius. A zone is pi of phase here -- the disk edge sits at pi NF, which is
   what makes NF the zone count -- so the beam always reaches PHI/pi = 19 zones
   past the rim however small NF is, and the step is a constant 0.375 rad of
   phase, advanced by one complex rotation per step instead of a sin/cos.
   The illuminating beam is apodized by g = (1 - s^4)^2, s = (t-1)/(T-1): g and
   g' both vanish at the outer limit, so the truncation does not ring, while
   g(1) = 1 leaves the disk edge untouched.
   Check on axis: W = 0 makes J0 = 1 and integration by parts collapses the
   integral to its lower endpoint, |E| = g(1)/(2 pi NF) -- exactly the
   unobstructed amplitude. So the normalisation below must return I(0) = 1,
   and it does, to 0.4 percent for every NF in range: the spot at the centre
   of the shadow really is as bright as the open beam. */
float diffract_arago(float W, float NF){
  const float PHI = 60.0;                  /* total phase across the beam */
  float T   = 1.0 + PHI/(PI*NF);           /* (rho_max/A)^2 */
  float dt  = (T - 1.0)/160.0;
  float dph = PHI/160.0;                   /* = PI*NF*dt by construction */
  vec2 rot = vec2(cos(dph), sin(dph));
  float p0 = PI*NF*(1.0 + 0.5*dt);
  vec2 ph  = vec2(cos(p0), sin(p0));
  vec2 E = vec2(0.0);
  for(int j = 0; j < 160; j++){
    float t   = 1.0 + (float(j) + 0.5)*dt;
    float sfr = (t - 1.0)/(T - 1.0);
    float s4  = sfr*sfr; s4 = s4*s4;
    float g   = 1.0 - s4; g = g*g;
    float al  = TAU*NF*W*sqrt(max(t, 1.0e-6));
    E += (g*diffract_J0(al))*ph;
    ph = cmul(ph, rot);
  }
  E *= 0.5*dt;
  float amp = length(E)*TAU*NF;
  return amp*amp;
}

vec3 shape_diffract(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int   ap   = int(P[0] + 0.5);
  float aw   = max(P[1], 0.05);            /* slit width a, in wavelengths */
  float dsp  = max(P[2], 0.05);            /* slit spacing d, in wavelengths */
  float NS   = max(float(int(P[3] + 0.5)), 2.0);
  float NF   = max(P[5], 0.05);
  float glow = P[6];
  float lift = 0.35 + 0.9*glow;
  vec3 tint  = diffract_wl2rgb(P[4]);

  /* Fresh photons every frame. A Cranley-Patterson rotation of the R2 point
     keeps the low-discrepancy stratification exactly but decorrelates one
     frame from the next, so TRAILS integrates independent arrivals instead of
     relighting the same ones -- that is what makes the pattern assemble. */
  uint fh = hashu(uint(mod(max(uT, 0.0)*997.0, 16777216.0)) + 0x9e3779b9u);
  vec2 qs = fract(q + vec2(u2f(fh), u2f(hashu(fh))));

  /* ---- the aperture plane at z = -1: scenery, four percent of the points,
     kept dim because it is decoration and not part of the measure ---- */
  if(rnd.z < 0.04){
    col = vec3(0.09, 0.12, 0.17)*lift;
    if(ap >= 3){
      float ang = qs.y*TAU;
      float rad = (ap == 3) ? 0.30*(0.99 + 0.02*qs.x)   /* rim of the hole */
                            : 0.30*sqrt(qs.x);          /* the opaque disk */
      return vec3(rad*cos(ang), rad*sin(ang), -1.0);
    }
    float bx  = (qs.x - 0.5)*1.9;
    float nn  = (ap == 0) ? 1.0 : ((ap == 1) ? 2.0 : NS);
    float pit = 1.5/nn;
    float hw  = (ap == 0) ? clamp(0.02*aw, 0.03, 0.28)
                          : 0.5*pit*clamp(aw/dsp, 0.05, 0.6);
    float jf  = floor(bx/pit + 0.5*(nn - 1.0) + 0.5);
    float ctr = (jf - 0.5*(nn - 1.0))*pit;
    if(jf >= 0.0 && jf <= nn - 1.0 && abs(bx - ctr) < hw){
      col = vec3(0.0); return vec3(0.0, -999.0, 0.0);   /* an opening: no bar */
    }
    return vec3(bx, (qs.y - 0.5)*0.34, -1.0);
  }

  float L    = 1.30;      /* half-window on the screen, world units */
  float umax = 0.30;      /* sin(theta) at the edge of that window */

  /* ---- circular aperture and opaque disk: the screen pattern is 2D ---- */
  if(ap >= 3){
    /* the Arago spot narrows as 1/NF: the lower-endpoint term makes |E| follow
       J0(2 pi NF W), so the first null sits near W = 0.383/NF, i.e. 0.33/NF in
       world units (the minimum is shallow but lands at W = 0.19 against 0.191
       predicted at NF = 2, and 0.095 against 0.096 at NF = 4; the fit loosens
       below NF = 1, where the clamp has taken over anyway) -- so the Gaussian
       branch tracks it */
    float sg = (ap == 4) ? clamp(0.33/NF, 0.06, 0.50) : 0.26;
    float rad;
    if(rnd.x < 0.7) rad = L*sqrt(qs.x);                       /* uniform disk */
    else            rad = sg*sqrt(-2.0*log(max(qs.x, 1.0e-7)));/* Rayleigh */
    if(rad > L){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
    /* divide by the FULL mixture density, not one branch, or the wings lie */
    float pdf = 0.7/(PI*L*L) + 0.3*exp(-0.5*rad*rad/(sg*sg))/(TAU*sg*sg);
    float inten; float K;
    if(ap == 3){
      /* x = k R sin(theta) with R = aw wavelengths, i.e. D = 2 aw: the first
         dark ring lands at x = 3.83171, sin(theta) = 1.22 lambda/D */
      float x  = TAU*aw*umax*(rad/L);
      float xs = max(x, 1.0e-6);
      float rj = 2.0*diffract_J1(xs)/xs;
      inten = (x < 1.0e-3) ? 1.0 : rj*rj;
      K = 0.95;
    } else {
      inten = diffract_arago(1.5*rad/L, NF);
      K = 0.45;
    }
    float ang = qs.y*TAU;
    col = tint*(inten/max(pdf, 1.0e-6))*K*lift;
    return vec3(rad*cos(ang), rad*sin(ang), 0.6);
  }

  /* ---- one slit, two slits, a grating: the pattern spreads along x ---- */
  float sg = 0.22;
  float s;
  if(rnd.x < 0.7) s = (qs.x - 0.5)*2.0*L;
  else            s = sg*sqrt(-2.0*log(max(qs.x, 1.0e-7)))*cos(TAU*rnd.y);
  if(abs(s) > L){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  float pdf = 0.7/(2.0*L) + 0.3*exp(-0.5*s*s/(sg*sg))/(sg*sqrt(TAU));
  float u = umax*s/L;                              /* u = sin(theta) */
  float inten = diffract_sinc2(PI*aw*u);           /* the single-slit envelope */
  if(ap == 1) inten *= diffract_af(2.0, PI*dsp*u); /* double slit = N = 2 */
  if(ap == 2) inten *= diffract_af(NS,  PI*dsp*u);
  col = tint*(inten/max(pdf, 1.0e-6))*0.28*lift;
  return vec3(s, (qs.y - 0.5)*0.95, 0.6);
}`
});
