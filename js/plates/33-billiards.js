"use strict";
Atlas.registerPlate({
  id: "billiards",
  name: "Billiards, Tamed and Wild",
  roman: "XXXIII",
  accent: "#8fe0d0",
  tex: "v' = v - 2(v\\cdot n)\\,n,\\qquad \\frac{1}{T}\\int_0^{T} f(\\varphi_t x)\\,dt \\;\\longrightarrow\\; \\frac{1}{|Q|}\\int_Q f\\,dA",
  plain: "v′ = v − 2(v·n)n,   (1/T)∫₀ᵀ f(φₜx)dt → (1/|Q|)∫_Q f dA",
  caption: "A free particle bounces specularly inside a table; TABLE chooses its universe. Circle and ellipse are integrable: a conserved quantity pins every chord tangent to a caustic — an inner ring, or a confocal ellipse or hyperbola according as the chord misses or crosses the segment between the foci — so no orbit ever fills the table, and the caustics ignite as density piles onto them. The Bunimovich stadium and Sinai's square-with-disk are proven ergodic (Bunimovich 1974–79, Sinai 1970): a generic orbit fills the table, and brightness — literally the orbit family's time average — goes flat. Colour names the conserved quantity, or the launch angle; push AIM toward tangency for whispering-gallery orbits.",
  cam: { dist: 3.0, pitch: 0.9, tgtY: 0.0, rot: 0.03 },
  gain: 0.85,
  params: [
    { label: "TABLE",        min: 0, max: 3,    step: 1,     def: 0    },
    { label: "BOUNCES",      min: 1, max: 40,   step: 1,     def: 26   },
    { label: "ECCENTRICITY", min: 0, max: 1,    step: 0.01,  def: 0.55 },
    { label: "AIM",          min: 0, max: 1,    step: 0.01,  def: 0.32 },
    { label: "SPREAD",       min: 0, max: 1,    step: 0.01,  def: 0.18 },
    { label: "LIFT",         min: 0, max: 0.05, step: 0.001, def: 0    },
    { label: "GLOW",         min: 0, max: 1,    step: 0.01,  def: 0.5  }
  ],
  glsl: `
/* table geometry, shared by start / intersection / hue so they agree */
vec2 billiards_ab(float ecc){ return vec2(1.25, mix(1.18, 0.45, ecc)); }     /* ellipse a, b   */
vec2 billiards_stad(float ecc){ return vec2(0.62, mix(0.06, 0.88, ecc)); }   /* stadium r, L   */
vec2 billiards_sinai(float ecc){ return vec2(1.12, mix(0.15, 0.95, ecc)); }  /* sinai s, rho   */

/* smallest positive ray-boundary intersection; nrm = inward normal at hit.
   Returns -1.0 if nothing was hit (degenerate ray -> caller hides point). */
float billiards_hit(int tb, float ecc, vec2 ro, vec2 rd, out vec2 nrm){
  nrm = vec2(0.0, 1.0);
  float EPS = 1.0e-4;
  if(tb == 0){                               /* circle: far root of the quadratic */
    float R = 1.15;
    float b = dot(ro, rd);
    float disc = max(0.0, b*b - dot(ro, ro) + R*R);
    float t = -b + sqrt(disc);
    vec2 h = ro + rd*t;
    nrm = -h/R;
    return t;
  }
  if(tb == 1){                               /* ellipse: scale to unit circle */
    vec2 ab = billiards_ab(ecc);
    vec2 os = ro/ab;
    vec2 ds = rd/ab;
    float A = dot(ds, ds) + 1.0e-12;
    float B = dot(os, ds);
    float C = dot(os, os) - 1.0;
    float disc = max(0.0, B*B - A*C);
    float t = (-B + sqrt(disc))/A;
    vec2 h = ro + rd*t;
    nrm = -normalize(h/(ab*ab) + vec2(1.0e-9));  /* -grad(x2/a2+y2/b2) */
    return t;
  }
  if(tb == 2){                               /* Bunimovich stadium: 2 walls + 2 caps */
    vec2 rl = billiards_stad(ecc);
    float r = rl.x, L = rl.y;
    float best = 1.0e9;
    /* walls take any t > 0: self-hits are impossible (reflection flips the
       direction component toward the wall, and each test is direction-gated),
       and an EPS floor would reject genuine junction hits and leak the ray. */
    if(rd.y > 1.0e-7){
      float t = (r - ro.y)/rd.y;
      if(t > 0.0 && t < best && abs(ro.x + rd.x*t) <= L + 1.0e-6){ best = t; nrm = vec2(0.0, -1.0); }
    }
    if(rd.y < -1.0e-7){
      float t = (-r - ro.y)/rd.y;
      if(t > 0.0 && t < best && abs(ro.x + rd.x*t) <= L + 1.0e-6){ best = t; nrm = vec2(0.0, 1.0); }
    }
    for(int side = 0; side < 2; side++){
      float cx = side == 0 ? L : -L;
      vec2 oc = ro - vec2(cx, 0.0);
      float B = dot(oc, rd);
      float C = dot(oc, oc) - r*r;
      float disc = B*B - C;
      if(disc > 0.0){
        float sq = sqrt(disc);
        float t1 = -B - sq;
        float t2 = -B + sq;
        float hx1 = ro.x + rd.x*t1;
        float hx2 = ro.x + rd.x*t2;
        /* t > 0, not EPS: after a cap bounce the nudged origin sits strictly
           inside the cap circle, so t1 < 0 and t2 is a genuine next hit */
        bool v1 = t1 > 0.0 && (side == 0 ? hx1 >= L - 1.0e-6 : hx1 <= -L + 1.0e-6);
        bool v2 = t2 > 0.0 && (side == 0 ? hx2 >= L - 1.0e-6 : hx2 <= -L + 1.0e-6);
        float t = v1 ? t1 : (v2 ? t2 : -1.0);
        if(t > 0.0 && t < best){
          best = t;
          vec2 h = ro + rd*t;
          nrm = (vec2(cx, 0.0) - h)/r;       /* cap is concave inward */
        }
      }
    }
    return best < 1.0e8 ? best : -1.0;
  }
  /* tb == 3: Sinai table, square with a dispersing disk in the middle */
  vec2 sr = billiards_sinai(ecc);
  float s = sr.x, rho = sr.y;
  float best = 1.0e9;
  /* t > 0, not EPS: a corner hit needs the second wall within ~1e-5, and the
     direction gate already forbids re-hitting the wall just bounced from */
  if(rd.x >  1.0e-7){ float t = ( s - ro.x)/rd.x; if(t > 0.0 && t < best){ best = t; nrm = vec2(-1.0, 0.0); } }
  if(rd.x < -1.0e-7){ float t = (-s - ro.x)/rd.x; if(t > 0.0 && t < best){ best = t; nrm = vec2( 1.0, 0.0); } }
  if(rd.y >  1.0e-7){ float t = ( s - ro.y)/rd.y; if(t > 0.0 && t < best){ best = t; nrm = vec2(0.0, -1.0); } }
  if(rd.y < -1.0e-7){ float t = (-s - ro.y)/rd.y; if(t > 0.0 && t < best){ best = t; nrm = vec2(0.0,  1.0); } }
  float B = dot(ro, rd);
  float C = dot(ro, ro) - rho*rho;
  float disc = B*B - C;
  if(disc > 0.0){                            /* disk seen from outside: near root */
    float t1 = -B - sqrt(disc);
    if(t1 > EPS && t1 < best){ best = t1; nrm = (ro + rd*t1)/rho; }
  }
  return best < 1.0e8 ? best : -1.0;
}

/* boundary point at perimeter fraction u, with its inward normal */
vec2 billiards_start(int tb, float ecc, float u, out vec2 nrm){
  if(tb == 0){
    float a = u*TAU;
    vec2 c = vec2(cos(a), sin(a));
    nrm = -c;
    return 1.15*c;
  }
  if(tb == 1){
    vec2 ab = billiards_ab(ecc);
    float ph = u*TAU;
    vec2 h = vec2(ab.x*cos(ph), ab.y*sin(ph));
    nrm = -normalize(h/(ab*ab) + vec2(1.0e-9));
    return h;
  }
  if(tb == 2){
    vec2 rl = billiards_stad(ecc);
    float r = rl.x, L = rl.y;
    float per = 4.0*L + TAU*r;
    float sarc = u*per;
    if(sarc < 2.0*L){ nrm = vec2(0.0, -1.0); return vec2(sarc - L,  r); }
    sarc -= 2.0*L;
    if(sarc < 2.0*L){ nrm = vec2(0.0,  1.0); return vec2(L - sarc, -r); }
    sarc -= 2.0*L;
    if(sarc < PI*r){
      float a = 0.5*PI - sarc/r;             /* right cap, +90 deg down to -90 deg */
      vec2 rad = vec2(cos(a), sin(a));
      nrm = -rad;
      return vec2(L, 0.0) + r*rad;
    }
    sarc -= PI*r;
    float a = 0.5*PI + sarc/r;               /* left cap, +90 deg up to +270 deg  */
    vec2 rad = vec2(cos(a), sin(a));
    nrm = -rad;
    return vec2(-L, 0.0) + r*rad;
  }
  vec2 sr = billiards_sinai(ecc);
  float s = sr.x;
  float sarc = u*8.0*s;
  if(sarc < 2.0*s){ nrm = vec2(0.0, -1.0); return vec2(sarc - s,  s); }
  sarc -= 2.0*s;
  if(sarc < 2.0*s){ nrm = vec2(-1.0, 0.0); return vec2( s, s - sarc); }
  sarc -= 2.0*s;
  if(sarc < 2.0*s){ nrm = vec2(0.0,  1.0); return vec2(s - sarc, -s); }
  sarc -= 2.0*s;
  nrm = vec2(1.0, 0.0);
  return vec2(-s, sarc - s);
}

vec3 shape_billiards(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int tb = int(P[0] + 0.5);
  int Nb = int(P[1] + 0.5);
  if(Nb < 1){ Nb = 1; }
  float ecc = P[2];

  /* initial condition: boundary point (q.x) + inward launch direction */
  vec2 nrm;
  vec2 o0 = billiards_start(tb, ecc, q.x, nrm);
  float psi0 = mix(0.045, 0.5, P[3])*PI;                 /* AIM: tangent .. normal */
  float psi = clamp(psi0 + (rnd.z - 0.5)*P[4]*PI, 0.035, PI - 0.035);
  float sgn = (hashu(seed ^ 0x51ed270bu) & 1u) == 0u ? -1.0 : 1.0;
  vec2 tv = vec2(-nrm.y, nrm.x);
  vec2 dir = sgn*cos(psi)*tv + sin(psi)*nrm;             /* unit by construction */

  /* hue: the conserved quantity where one exists, launch angle otherwise */
  float hval;
  if(tb == 0){
    hval = abs(cos(psi));                                /* |L| = caustic radius / R */
  } else if(tb == 1){
    vec2 ab = billiards_ab(ecc);
    float cf = sqrt(max(ab.x*ab.x - ab.y*ab.y, 0.0));
    vec2 r1 = o0 - vec2(cf, 0.0);
    vec2 r2 = o0 + vec2(cf, 0.0);
    float L1 = r1.x*dir.y - r1.y*dir.x;                  /* angular momenta about foci */
    float L2 = r2.x*dir.y - r2.y*dir.x;
    hval = 0.5 + 0.5*tanh(2.0*L1*L2);                    /* sign splits ellipse/hyperbola caustics */
  } else {
    hval = psi/PI;
  }

  /* walk the orbit; deposit the point on chord kk at fraction q.y */
  int kk = int(hashu(seed ^ 0x7f4a7c15u) % uint(Nb));
  vec2 pt = o0;
  vec2 ro = o0 + nrm*1.0e-5;                             /* nudge off the wall */
  float acc = 0.0;
  float tlen = 0.0;
  bool ok = false;
  for(int j = 0; j < 40; j++){
    if(j >= Nb){ break; }
    vec2 nh;
    float t = billiards_hit(tb, ecc, ro, dir, nh);
    if(t <= 0.0 || t > 4.0){ break; }                    /* miss / degenerate: give up */
    if(j == kk){
      tlen = t;
      acc += t*q.y;
      pt = ro + dir*(t*q.y);
      ok = true;
      break;
    }
    ro += dir*t;
    acc += t;
    dir = dir - 2.0*dot(dir, nh)*nh;                     /* specular reflection */
    dir = normalize(dir + vec2(1.0e-9, 0.0));            /* renormalize each bounce */
    ro += nh*1.0e-5;
  }
  if(!ok || abs(pt.x) > 1.6 || abs(pt.y) > 1.6){        /* lost or leaked: hide */
    col = vec3(0.0); return vec3(0.0, -999.0, 0.0);
  }

  float yy = (float(kk) - 0.5*float(Nb - 1))*P[5];       /* LIFT: bounce index as strata */
  vec3 p = vec3(pt.x, yy, pt.y);                         /* table lies in the xz-plane */

  col = pal(hval*0.75 + 0.06,
            vec3(0.46, 0.52, 0.50), vec3(0.38, 0.38, 0.36),
            vec3(0.90, 0.85, 0.70), vec3(0.12, 0.36, 0.55));
  col *= clamp(tlen*0.75, 0.05, 2.0);                    /* weight by chord length -> time average */
  col *= 1.0 + 0.22*cos(2.6*acc - 1.3*uT);               /* faint pulse riding the unit-speed flow */
  col *= 0.35 + 0.85*P[6];
  return p;
}`
});
