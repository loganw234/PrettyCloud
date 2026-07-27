"use strict";
Atlas.registerPlate({
  id: "rainbow",
  name: "The Rainbow, Derived",
  roman: "XXXIX",
  accent: "#ffd8b0",
  tex: "D_k=2(i-t)+k(\\pi-2t),\\qquad \\sin i=b=n(\\lambda)\\,\\sin t",
  plain: "Dₖ = 2(i−t) + k(π−2t),   sin i = b = n(λ)·sin t",
  caption: "Sunlight strikes a spherical raindrop: every ray refracts in, bounces k times, refracts out, and lands at its deviation angle — nothing else is computed. Where dD/db = 0 the exits stall and rays pile up; since brightness is ray density, the bow ignites on its own at 42 degrees from the antisolar point, red outside, with a colour-reversed secondary near 51 degrees (ORDERS counts the bounces) and Alexander's dark band between, where no one- or two-bounce ray can go. FRESNEL charges each interface its honest energy toll, so the secondary is fainter. MODE opens the droplet. Descartes ran this argument in 1637; only the supernumerary arcs, creatures of wave optics, escape the counting.",
  cam: { dist: 2.6, pitch: 0.1, tgtY: 0.0, rot: 0.03 },
  gain: 1.0,
  params: [
    { label: "MODE",       min: 0, max: 1, step: 1,    def: 0   },
    { label: "ORDERS",     min: 1, max: 4, step: 1,    def: 2   },
    { label: "DISPERSION", min: 0, max: 3, step: 0.01, def: 1   },
    { label: "SUN WIDTH",  min: 0, max: 3, step: 0.01, def: 1   },
    { label: "FRESNEL",    min: 0, max: 1, step: 0.01, def: 1   },
    { label: "GLOW",       min: 0, max: 1, step: 0.01, def: 0.5 }
  ],
  glsl: `
/* spectral colour, t = 0 (400nm violet) .. 1 (700nm red); each channel is a
   product/sum of smoothsteps, so it is never negative and sums near-neutral */
vec3 rainbow_wl2rgb(float t){
  t = clamp(t, 0.0, 1.0);
  float r = smoothstep(0.40, 0.62, t) + 0.30*(1.0 - smoothstep(0.02, 0.22, t));
  float g = smoothstep(0.10, 0.36, t)*(1.0 - smoothstep(0.60, 0.88, t));
  float b = 1.0 - smoothstep(0.26, 0.50, t);
  return vec3(r, g, b)*(0.62 + 0.38*smoothstep(0.0, 0.10, t));
}
vec3 shape_rainbow(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode   = int(P[0] + 0.5);
  float M    = P[1] - 0.001;          /* ORDERS */
  float dsp  = P[2];
  float sunw = P[3];
  float fres = P[4];
  float glow = P[5];

  float b = q.x;                       /* impact parameter, sin i = b */
  uint hs = hashu(seed ^ 2654435769u);
  float lt = (mode == 0) ? q.y : u2f(hs);   /* q.y is the arc-param in mode 1 */
  float lam = mix(400.0, 700.0, lt);        /* wavelength, nm */

  /* Cauchy fit n = 1.3247 + 3088.5/lam^2: n(400) = 1.3440, n(700) = 1.3310.
     DISPERSION scales the spread about the mean index 1.3375. */
  float n = 1.3247 + 3088.5/(lam*lam);
  n = max(1.3375 + (n - 1.3375)*dsp, 1.05);

  float i  = asin(clamp(b, 0.0, 0.999999));
  float st = clamp(b/n, 0.0, 1.0);
  float t  = asin(st);
  float ci = sqrt(max(1.0 - b*b, 1.0e-8));
  float ct = sqrt(max(1.0 - st*st, 1.0e-8));

  /* internal-reflection count: importance-sample low k, then divide by the
     pick probability so brightness stays an unbiased estimate across orders */
  float u = rnd.w;
  int k = 1 + int(u*u*M);
  if(k > 4) k = 4;
  float kf = float(k);
  float psel = max(sqrt(min(kf/M, 1.0)) - sqrt((kf - 1.0)/M), 1.0e-4);

  /* Fresnel, unpolarized: s and p tracked separately through transmit-in,
     k internal bounces, transmit-out, then averaged. Denominators never
     vanish (n > 1 keeps ct > 0 even as ci -> 0), guarded anyway. */
  float rs = (ci - n*ct)/max(ci + n*ct, 1.0e-6); rs = clamp(rs*rs, 1.0e-7, 1.0);
  float rp = (n*ci - ct)/max(n*ci + ct, 1.0e-6); rp = clamp(rp*rp, 1.0e-7, 1.0);
  float ts = 1.0 - rs;
  float tp = 1.0 - rp;

  float D = 2.0*(i - t) + kf*(PI - 2.0*t);    /* total deviation */

  if(mode == 0){
    /* THE SKY. Antisolar axis = +z; viewing angle folds D into [0,PI].
       Check: b = 0.86, n = 1.333, k = 1 -> D = 2.407 rad = 137.9 deg,
       tv = 42.1 deg; k = 2 stationary point folds to ~50.4 deg. */
    float wf = 0.5*(ts*ts*pow(rs, kf) + tp*tp*pow(rp, kf));
    float w = mix(1.0, 9.0*wf, fres)*b/psel;  /* b = annulus measure b db */
    float tv = abs(mod(D, TAU) - PI);
    uint hA = hashu(hs);
    uint hB = hashu(hA);
    float gj = u2f(hA) + u2f(hB) - 1.0;       /* triangular jitter in [-1,1] */
    tv = clamp(tv + gj*0.008727*sunw, 0.0, PI);   /* sun disc, ~0.5 deg */
    float al = rnd.z*TAU;
    col = rainbow_wl2rgb(lt)*w*(0.35 + 0.85*glow);
    return 1.25*vec3(sin(tv)*cos(al), sin(tv)*sin(al), cos(tv));
  }

  /* THE DROPLET. Unit circle, beam along +x at height b; entry point at
     angle a0 = PI - i, each internal chord advances the contact point by
     -(PI - 2t), and the chord from vertex m has direction angle
     (t - i) - m(PI - 2t), so the exit ray leaves along (cos D, -sin D). */
  float a0 = PI - i;
  float ca = PI - 2.0*t;
  int nseg = k + 3;                    /* beam + (k+1) chords + exit ray */
  int sIdx = int(rnd.z*float(nseg)*0.99999);
  if(sIdx > k + 2) sIdx = k + 2;
  vec2 A; vec2 B;
  float es; float ep;                  /* light left in each polarization */
  if(sIdx == 0){
    B = vec2(cos(a0), sin(a0));
    A = B - vec2(0.7, 0.0);
    es = 1.0; ep = 1.0;
  } else if(sIdx <= k + 1){
    float m0 = float(sIdx - 1);
    A = vec2(cos(a0 - m0*ca), sin(a0 - m0*ca));
    B = vec2(cos(a0 - (m0 + 1.0)*ca), sin(a0 - (m0 + 1.0)*ca));
    es = ts*pow(rs, m0); ep = tp*pow(rp, m0);
  } else {
    A = vec2(cos(a0 - (kf + 1.0)*ca), sin(a0 - (kf + 1.0)*ca));
    B = A + 0.95*vec2(cos(D), -sin(D));
    es = ts*ts*pow(rs, kf); ep = tp*tp*pow(rp, kf);
  }
  float segLen = length(B - A);
  vec2 pos2 = mix(A, B, q.y);
  float w = mix(1.0, 0.5*(es + ep), fres)*clamp(segLen, 0.05, 2.0)*0.9;
  /* Descartes' sweep: one lit pencil of rays drifts through b and visibly
     stalls where dD/db = 0 -- the only intrinsic motion this figure has */
  float b0 = 0.5 + 0.45*sin(0.3*uT);
  w *= 1.0 + 0.7*exp(-(b - b0)*(b - b0)/0.0009);
  col = rainbow_wl2rgb(lt)*w*(0.35 + 0.85*glow);
  return vec3(0.72*pos2.x, 0.72*pos2.y, 0.0);
}`
});
