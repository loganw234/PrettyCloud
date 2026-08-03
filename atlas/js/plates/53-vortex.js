"use strict";
Atlas.registerPlate({
  id: "vortex",
  name: "Light with a Twist",
  roman: "LIII",
  accent: "#b9f2a1",
  tex: "u_{p\\ell}\\propto\\Bigl(\\tfrac{\\sqrt{2}\\,r}{w(z)}\\Bigr)^{|\\ell|}L_p^{|\\ell|}\\!\\Bigl(\\tfrac{2r^2}{w^2}\\Bigr)e^{-r^2/w^2}e^{i\\ell\\varphi},\\qquad \\Phi_G=(2p+|\\ell|+1)\\arctan\\!\\frac{z}{z_R}",
  plain: "u_pℓ ∝ (√2 r/w)^|ℓ| · L_p^|ℓ|(2r²/w²) · e^(−r²/w²) · e^(iℓφ),   Φ_G = (2p+|ℓ|+1)·arctan(z/z_R)",
  caption: "Allen and co-workers showed in 1992 that a Laguerre-Gaussian beam carries orbital angular momentum ℓℏ per photon, distinct from polarization's spin. The factor e^{iℓφ} winds the wavefront into |ℓ| intertwined helices, where ℓ CHARGE sets their number and, by its sign, their handedness, and whenever ℓ ≠ 0 it forces a phase singularity on the axis, where the intensity must vanish: a bright annulus threaded by darkness. Brightness estimates the line integral of |u|², sampled through the envelope WAIST sets; hue reads phase, Gouy shift included, and SPIN turns it. SUPERPOSE adds the mirror mode −ℓ for 2|ℓ| petals, or beats p = 0 against p = 1 along Z RANGE. Two percent of the points are dealt onto the axis and come back nearly empty.",
  cam: { dist: 3.1, pitch: 0.25, tgtY: 0.0, rot: 0.05 },
  gain: 0.9,
  params: [
    { label: "ℓ CHARGE", min: -5,   max: 5,    step: 1,     def: 2    },
    { label: "p RADIAL", min: 0,    max: 3,    step: 1,     def: 0    },
    { label: "SUPERPOSE",min: 0,    max: 2,    step: 1,     def: 0    },
    { label: "WAIST",    min: 0.15, max: 0.45, step: 0.005, def: 0.28 },
    { label: "Z RANGE",  min: 0.4,  max: 1.5,  step: 0.01,  def: 1.2  },
    { label: "SPIN",     min: 0,    max: 3,    step: 0.01,  def: 1.0  },
    { label: "GLOW",     min: 0,    max: 1,    step: 0.01,  def: 0.55 }
  ],
  glsl: `
/* wavenumber in display units: the waist sits at the origin and
   z_R = k w0^2 / 2, so the default w0 = 0.28 gives z_R = 0.784 and the
   Z RANGE of 1.2 reaches about one and a half Rayleigh ranges each way. */
const float vortex_K = 20.0;

/* associated Laguerre polynomials, written out — no recurrence needed:
   L_0^a = 1, L_1^a = 1 + a - x, and the quadratic and cubic below.  */
float vortex_lag(int n, float a, float x){
  if(n <= 0) return 1.0;
  if(n == 1) return 1.0 + a - x;
  if(n == 2) return 0.5*x*x - (a + 2.0)*x + 0.5*(a + 1.0)*(a + 2.0);
  return -x*x*x/6.0 + 0.5*(a + 3.0)*x*x
         - 0.5*(a + 2.0)*(a + 3.0)*x
         + (a + 1.0)*(a + 2.0)*(a + 3.0)/6.0;
}
/* the whole radial factor in the reduced variable x = 2 r^2 / w(z)^2,
   since (sqrt(2) r / w)^{|l|} is exactly x^{|l|/2}                     */
float vortex_rad(int n, int L, float x){
  float s = sqrt(max(x, 0.0));
  float t = 1.0;
  for(int i = 0; i < 5; i++){ if(i >= L) break; t *= s; }
  return t * vortex_lag(n, float(L), x) * exp(-0.5*x);
}
/* peak amplitude of that factor, so raising l or p re-lights the mode
   instead of blowing out the exposure. Every maximum for n<=3, L<=5
   sits at x = 5 or below, so a 31-point sweep of [0,6] brackets it to
   within a few percent — and for p = 0 the grid lands on x = |l| exactly. */
float vortex_peak(int n, int L){
  float m = 1.0e-6;
  for(int i = 0; i <= 30; i++) m = max(m, abs(vortex_rad(n, L, 0.2*float(i))));
  return m;
}
vec3 shape_vortex(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int l  = int(floor(P[0] + 0.5));   /* floor rounds correctly both ways */
  l = max(-5, min(5, l));
  int L  = l < 0 ? -l : l;
  int pn = max(0, min(3, int(P[1] + 0.5)));
  int md = max(0, min(2, int(P[2] + 0.5)));

  float w0 = max(0.08, P[3]);
  float zR = 0.5*vortex_K*w0*w0;
  float zp = P[4]*(2.0*rnd.x - 1.0);
  float wz = w0*sqrt(1.0 + (zp/zR)*(zp/zR));

  /* uniform in the cylinder that follows the beam envelope           */
  float envf = 2.6 + 0.4*float(L) + 0.35*float(pn);
  float Rmax = min(envf*wz, 1.45);
  float rr = Rmax*sqrt(q.x);
  float ph = TAU*q.y;
  /* 2% of the points are dealt straight into the thread on the axis,
     so the core is always interrogated however wide the ring gets    */
  float rc = 0.25*wz;
  if(rnd.y < 0.02) rr = rc*sqrt(rnd.z);

  float x    = 2.0*rr*rr/(wz*wz);
  float psi  = atan(zp/zR);                                   /* Gouy   */
  /* k r^2 / 2R(z) in the form that stays regular at the waist, where
     the radius of curvature R(z) itself runs off to infinity          */
  float curv = 0.5*vortex_K*rr*rr*zp/(zp*zp + zR*zR);
  float tw   = uT*(2.0*P[5]);
  float inten, phase;

  if(md == 1){                    /* LG(p, l) + LG(p, -l): 2|l| petals */
    float A  = vortex_rad(pn, L, x)/vortex_peak(pn, L);
    float a2 = A*cos(float(l)*ph + 0.15*P[5]*uT);   /* slight detuning */
    inten = a2*a2;
    phase = vortex_K*zp + curv - float(2*pn + L + 1)*psi - tw;
    if(a2 < 0.0) phase += PI;
  } else if(md == 2){             /* LG(0, l) + LG(1, l): a Gouy beat  */
    float pk = vortex_peak(0, L) + vortex_peak(1, L);
    float A0 = vortex_rad(0, L, x)/pk;
    float A1 = vortex_rad(1, L, x)/pk;
    float ux = A0 + A1*cos(2.0*psi);   /* the two Gouy phases differ   */
    float uy = -A1*sin(2.0*psi);       /* by exactly 2 arctan(z/z_R)   */
    inten = ux*ux + uy*uy;
    float ex = (abs(ux) + abs(uy) > 1.0e-9) ? atan(uy, ux) : 0.0;
    phase = float(l)*ph + vortex_K*zp + curv - float(L + 1)*psi - tw + ex;
  } else {                        /* the pure mode                     */
    float A = vortex_rad(pn, L, x)/vortex_peak(pn, L);
    inten = A*A;
    phase = float(l)*ph + vortex_K*zp + curv - float(2*pn + L + 1)*psi - tw;
    if(A < 0.0) phase += PI;      /* radial nodes are pi phase jumps   */
  }

  /* the sampling cylinder flares with the beam, so points thin out as
     1/Rmax^2; undo that and the accumulated brightness is the line
     integral of the true intensity rather than of the point count.
     dens is the density of the two samplers combined, so the core
     probe sharpens the estimate on the axis without biasing it.      */
  float cw = Rmax/(envf*wz);
  float dens = 0.98 + (rr < rc ? 0.02*Rmax*Rmax/(rc*rc) : 0.0);
  inten = clamp(inten, 0.0, 1.0)*cw*cw/dens;
  if(inten < 2.0e-4){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

  vec3 hue = pal(fract(phase/TAU), vec3(0.5), vec3(0.5),
                 vec3(1.0), vec3(0.0, 0.33, 0.67));
  col = hue*inten*(0.45 + 0.9*P[6]);
  return vec3(zp, rr*cos(ph), rr*sin(ph));
}`
});
