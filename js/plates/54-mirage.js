"use strict";
Atlas.registerPlate({
  id: "mirage",
  name: "Mirage",
  roman: "LIV",
  accent: "#f5d9a0",
  tex: "n(y)\\cos\\alpha = C,\\qquad n_{\\text{fish}}=\\frac{n_{0}}{1+r^{2}/a^{2}},\\qquad n_{\\text{Lun}}=\\sqrt{2-r^{2}/a^{2}}",
  plain: "n(y)·cos α = C     n = n₀/(1 + r²/a²)     n = √(2 − r²/a²)",
  caption: "Stratified air conserves n(y)·cos α along a ray — Snell's law, continuous — so light bends toward higher index. Hot ground has the lowest index: a downgoing ray turns and climbs, and the fold where rays cross is the inverted image. The water on a hot road is the sky. Real contrasts near 10⁻⁴ are invisible: EXAGGERATE inflates them, and the vertical is stretched. LAYER HEIGHT, OBJECT HEIGHT and FAN set the pencil. MODE ducts rays inside an inversion layer — the Fata Morgana stack — or gives two exact lenses: Maxwell's 1854 fisheye, every ray a circle and every point imaged perfectly onto its conjugate, and Luneburg's 1944 √(2−r²/a²), focusing any parallel bundle on the opposite rim and flown as a radar reflector still. Brightness is ray density; the caustics ignite unaided.",
  cam: { dist: 3.0, pitch: 0.75, tgtY: 0.0, rot: 0.02 },
  gain: 0.9,
  params: [
    { label: "MODE",          min: 0,     max: 3,    step: 1,     def: 0     },
    { label: "EXAGGERATE",    min: 0.005, max: 0.08, step: 0.001, def: 0.035 },
    { label: "OBJECT HEIGHT", min: 0.05,  max: 1.0,  step: 0.01,  def: 0.38  },
    { label: "FAN",           min: 0.02,  max: 0.40, step: 0.005, def: 0.16  },
    { label: "LAYER HEIGHT",  min: 0.05,  max: 0.35, step: 0.005, def: 0.10  },
    { label: "GLOW",          min: 0,     max: 1,    step: 0.01,  def: 0.5   }
  ],
  glsl: `
/* refractive index and its vertical derivative.
   md 0: n = 1 + dn*(1 - exp(-y/h))          hot ground, n smallest at y = 0
   md 1: n = 1 + dn*exp(-((y - yc)/h)^2)     inversion layer centred on yc  */
vec2 mirage_prof(int md, float y, float dn, float h, float yc){
  if(md == 0){
    float ea = exp(-max(y, 0.0)/h);
    return vec2(1.0 + dn*(1.0 - ea), dn*ea/h);
  }
  float s = (y - yc)/h;
  float eb = exp(-min(s*s, 40.0));
  return vec2(1.0 + dn*eb, -2.0*s*dn*eb/h);
}

/* One ray of a horizontally stratified medium, stepped in x.
   The Snell invariant C = n(y)*cos(alpha) is conserved, so with
   p = n(y)*sin(alpha) one has p^2 = n^2 - C^2, dy/dx = p/C and
   dp/dx = n*n'(y)/C.  Leapfrog carries the SIGN of p -- the vertical
   direction -- while everywhere the ray is admissible (n >= C) the
   MAGNITUDE is re-projected onto the exact invariant, so |p| never
   drifts and the turning point n = C, total reflection off the hot
   layer, is the one place the vertical direction flips.  Should a step
   land in the forbidden band n < C the sign is set outright, up the
   index gradient, which is the direction back out; near a turn the
   step in y shrinks like the step in p, so the reversal resolves in
   one or two steps and the ray cannot burrow into n < C.
   Returns (x, y, alive).                                              */
vec3 mirage_trace(int md, float y0, float a0, float dn, float h,
                  float yc, float dx, int k){
  float x = -1.3;
  float y = y0;
  vec2 nd = mirage_prof(md, y, dn, h, yc);
  float C = max(nd.x*cos(a0), 1.0e-3);
  float p = nd.x*sin(a0);
  float alive = 1.0;
  for(int j = 0; j < 240; j++){
    if(j >= k) break;
    y += 0.5*dx*p/C;
    nd = mirage_prof(md, y, dn, h, yc);
    p += dx*nd.x*nd.y/C;
    float d2 = nd.x*nd.x - C*C;
    if(d2 > 0.0){ p = (p < 0.0 ? -1.0 : 1.0)*sqrt(d2); }
    else        { p = (nd.y < 0.0 ? -1.0 : 1.0)*abs(p); }   /* turned */
    y += 0.5*dx*p/C;
    x += dx;
    if(y <= 0.0 || y > 0.60){ alive = 0.0; break; }  /* absorbed, or off scene */
  }
  return vec3(x, y, alive);
}

vec3 shape_mirage(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int   md   = clamp(int(P[0] + 0.5), 0, 3);
  float dn   = max(P[1], 1.0e-4);        /* EXAGGERATE; the real thing ~1e-4 */
  float objh = P[2];
  float fan  = P[3];
  float h    = max(P[4], 0.03);          /* held off zero: steps must resolve it */
  float glow = 0.35 + 0.85*P[5];
  float jit  = (rnd.z - 0.5)*0.014;      /* the sheet is given a thickness */
  float vs   = 3.2;                      /* vertical stretch, as in any mirage figure */
  float aF   = 0.62;                     /* Maxwell fisheye scale a */
  float aL   = 0.72;                     /* Luneburg radius a */

  /* two per cent of the points are scenery: the ground line, or the rim */
  if(rnd.w < 0.02){
    vec3 sp;
    if(md < 2){
      sp = vec3(-1.32 + 2.64*q.x, jit, 0.6);
    } else {
      float aa = (md == 2) ? aF : aL;
      float th = TAU*q.x;
      sp = vec3(aa*cos(th), jit, -aa*sin(th));
    }
    col = vec3(0.028, 0.030, 0.038)*glow;
    return sp;
  }

  vec2 pos = vec2(0.0);     /* figure coordinates, y already display-oriented */
  float ct = 0.5;           /* colour parameter */
  float w  = 1.0;           /* weight */
  bool alive = true;

  if(md < 2){
    /* ---- MIRAGE.  A bar of sources at x = -1.3 and a fan of elevations.
       MODE 0 aims mostly downward: rays shallower than the local critical
       angle turn on the hot layer and climb again, and where neighbouring
       rays cross, the fold, the inverted image forms.  MODE 1 puts the
       bar inside an inversion layer and launches symmetrically, so rays
       are trapped and oscillate -- the Fata Morgana stack.              */
    float yc   = 0.30;
    float bar  = 0.42*objh;
    float hn   = rnd.x;                              /* point of the object */
    float y0   = (md == 0) ? (0.08 + bar*hn) : (yc + bar*(hn - 0.5));
    float a0   = (md == 0) ? fan*(1.35*q.x - 1.0) : fan*(2.0*q.x - 1.0);
    float dx   = 2.6/240.0;
    int   k    = int(q.y*239.0);                     /* uniform along the ray */
    vec3 r = mirage_trace(md, y0, a0, dn, h, yc, dx, k);
    alive = (r.z > 0.5);
    pos = vec2(r.x, r.y*vs - 0.6);
    ct  = 0.12 + 0.72*hn;
    /* one element of the bar is lit brighter and walks it, so the erect
       and the inverted image are seen to travel in opposite directions */
    float hl = 0.5 + 0.45*sin(0.22*uT);
    w = 0.62*(1.0 + 0.8*exp(-(hn - hl)*(hn - hl)*180.0));
  } else if(md == 2){
    /* ---- MAXWELL FISHEYE, n = n0/(1 + r^2/a^2).  Every ray is a circle,
       and every ray leaving A returns to the conjugate point
       A' = -A*a^2/|A|^2  (hand check: A = (a/2, 0) gives A' = (-2a, 0)).
       The rays from A are therefore exactly the pencil of circles through
       A and A': centres run along the perpendicular bisector of AA', one
       circle per launch angle, closed form with nothing integrated.  Such
       a circle does meet r = a at antipodal points -- its radical line
       with r = a collapses to a line through the origin as soon as
       |A||A'| = a^2 with A' antiparallel to A.                          */
    float sr = clamp(0.28 + 0.32*objh, 0.28, 0.60);   /* |A| */
    float ph = 0.12*uT;                               /* the source drifts */
    vec2 A = sr*vec2(cos(ph), sin(ph));
    vec2 B = -A*(aF*aF/max(sr*sr, 1.0e-6));
    vec2 M = 0.5*(A + B);
    vec2 dd = normalize(B - A + vec2(1.0e-12, 1.0e-12));
    vec2 uu = vec2(-dd.y, dd.x);
    float hb = 0.5*length(B - A);
    float psi = (q.x - 0.5)*PI*0.82;                  /* launch angle at A */
    float tc = hb*tan(psi);
    vec2 cc = M + tc*uu;
    float R = sqrt(hb*hb + tc*tc);
    float th = TAU*q.y;                               /* uniform in arc length */
    vec2 pp = cc + R*vec2(cos(th), sin(th));
    if(dot(pp, pp) > 2.1) alive = false;
    pos = pp;
    ct  = 0.10 + 0.80*(0.5 + psi/PI);
    w   = 0.62;
  } else {
    /* ---- LUNEBURG LENS, n = sqrt(2 - r^2/a^2) for r <= a, 1 outside.
       Writing dr/dtau = T, dT/dtau = grad(n^2/2) = -r/a^2 inside and 0
       outside keeps |T| = n and makes the interior an exact 2D harmonic
       oscillator: r(tau) = r0*cos(tau/a) + a*T0*sin(tau/a).  A ray
       entering the rim along d arrives at a*d after tau = a*pi/2 -- the
       same rim point for EVERY impact parameter, which is the whole
       point of the lens.  The straight run up to the rim is done
       analytically (circle intersection); leapfrog does the rest, and is
       exact again once the ray is outside, where the force vanishes.
       n is continuous at r = a, so there is no refraction to apply.   */
    float ph = 0.25*uT;                    /* the bundle swings; the focus rides */
    vec2 dd = vec2(cos(ph), sin(ph));
    vec2 uu = vec2(-dd.y, dd.x);
    float b = (2.0*q.x - 1.0)*aL*0.985;    /* impact parameter */
    float rin = sqrt(max(aL*aL - b*b, 1.0e-8));
    float lin = 1.30 - rin;                /* straight run to the rim */
    float tin = aL*PI*0.5 + 0.62;          /* through the lens, then onward */
    float dtau = tin/200.0;
    float tt = q.y*(lin + tin);
    vec2 pp;
    if(tt < lin){
      pp = (-1.30)*dd + b*uu + tt*dd;
    } else {
      pp = (-rin)*dd + b*uu;               /* on the rim: |pp| = a exactly */
      vec2 TT = dd;                        /* |T| = n = 1 there */
      int k = int((tt - lin)/dtau);
      for(int j = 0; j < 200; j++){
        if(j >= k) break;
        pp += 0.5*dtau*TT;
        if(dot(pp, pp) < aL*aL) TT -= (dtau/(aL*aL))*pp;
        pp += 0.5*dtau*TT;
      }
    }
    if(dot(pp, pp) > 2.25) alive = false;
    pos = pp;
    ct  = 0.10 + 0.80*(0.5 + 0.5*b/aL);
    w   = 0.62;
  }

  if(!alive || any(isnan(pos)) || any(isinf(pos))){
    col = vec3(0.0);
    return vec3(0.0, -999.0, 0.0);
  }
  col = pal(ct, vec3(0.72, 0.60, 0.46), vec3(0.28, 0.26, 0.30),
            vec3(1.0, 0.95, 0.85), vec3(0.02, 0.18, 0.42)) * (w*glow);
  return vec3(pos.x, jit, -pos.y);
}`
});
