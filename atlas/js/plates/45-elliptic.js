"use strict";
Atlas.registerPlate({
  id: "elliptic",
  name: "Elliptic Curves",
  roman: "XLV",
  accent: "#a0e8e0",
  tex: "y^{2}=x^{3}+ax+b,\\qquad x_{3}=m^{2}-x_{P}-x_{Q},\\qquad \\Delta=-16\\,(4a^{3}+27b^{2})",
  plain: "y² = x³ + ax + b;   x₃ = m² − x_P − x_Q;   Δ = −16(4a³ + 27b²)",
  caption: "A line through two points of the cubic meets it once more; reflect that third point across the x-axis and you have added the two: an associative group law. A marked point P patrols the curve, a CHORDS fraction of the cloud fans chords from P to random partners, and teal beads mark the sums P + Q back on the curve; brightness estimates how often the chords cross a region. Slide A and B across Δ = −16(4a³ + 27b²) = 0 and the curve pinches singular. MODE 1 reads the same equation modulo primes up to P MAX, one curtain per prime; wherever the curve stays smooth mod p, its count hugs p + 1 within Hasse's 2√p. Wiles reached Fermat through these curves.",
  cam: { dist: 3.2, pitch: 0.25, tgtY: 0.0, rot: 0.04 },
  gain: 0.9,
  params: [
    { label: "MODE",   min: 0,   max: 1,  step: 1,    def: 0    },
    { label: "A",      min: -4,  max: 1.5,step: 0.01, def: -2   },
    { label: "B",      min: -2,  max: 3,  step: 0.01, def: 1    },
    { label: "P MAX",  min: 13,  max: 97, step: 1,    def: 61   },
    { label: "CHORDS", min: 0,   max: 1,  step: 0.01, def: 0.35 },
    { label: "WINDOW", min: 1.5, max: 4,  step: 0.01, def: 2.6  },
    { label: "GLOW",   min: 0,   max: 1,  step: 0.01, def: 0.6  }
  ],
  glsl: `
/* right-hand side of the Weierstrass cubic */
float elliptic_rhs(float x, float a, float b){
  return x*x*x + a*x + b;
}
/* nearest x to xr in [-W,W] whose point lies on the real locus and
   inside the square window (rhs in [0,W^2]). Returns (x, +sqrt(rhs));
   a negative y-slot flags failure (no visible locus at all).
   130 steps of W/32 reach past 2W: the whole window from either end. */
vec2 elliptic_locus(float xr, float a, float b, float W){
  float st = W/32.0;
  for(int j = 0; j < 130; j++){
    float off = float((j + 1)/2)*st;
    float x = (j - (j/2)*2 == 0) ? xr + off : xr - off;
    x = clamp(x, -W, W);
    float r = elliptic_rhs(x, a, b);
    if(r >= 0.0 && r <= W*W) return vec2(x, sqrt(r));
  }
  return vec2(0.0, -1.0);
}
/* trial division; d<10 covers everything below 100 */
bool elliptic_isprime(int n){
  if(n < 2) return false;
  for(int d = 2; d < 10; d++){
    if(d*d > n) break;
    if(n - (n/d)*d == 0) return false;
  }
  return true;
}
/* positive mod for possibly-negative v */
int elliptic_pmod(int v, int m){
  int r = v - (v/m)*m;
  return (r < 0) ? r + m : r;
}
vec3 shape_elliptic(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode = int(P[0] + 0.5);
  float A = P[1];
  float B = P[2];
  float glow = 0.35 + 0.85*P[6];

  if(mode == 0){
    /* ── chords over R: the group law drawn live ── */
    float W = P[5];
    float s = 1.15/W;

    /* marked point P: triangle sweep of the window, clamped onto the
       locus; the y-sign flips each traversal so P loops the curve */
    float t   = uT*0.1;
    float tri = abs(2.0*fract(t) - 1.0);
    vec2  Pc  = elliptic_locus(mix(-W, W, tri), A, B, W);
    float sgn = (fract(t) < 0.5) ? 1.0 : -1.0;
    float xP  = Pc.x;
    float yP  = sgn*Pc.y;
    bool  okP = Pc.y >= 0.0;

    if(rnd.x < P[4]){
      /* chord pencil: hash-pick a partner Q on the visible curve */
      if(!okP){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
      uint h = hashu(seed ^ 0x51ed270bu);
      float xQ = 0.0;
      float yQ = -1.0;
      for(int j = 0; j < 8; j++){
        float xc = mix(-W, W, u2f(h));
        float rc = elliptic_rhs(xc, A, B);
        if(rc >= 0.0 && rc <= W*W){ xQ = xc; yQ = sqrt(rc); break; }
        h = hashu(h);
      }
      if(yQ < 0.0){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
      h = hashu(h + 0x9e3779b9u);
      if(u2f(h) < 0.5) yQ = -yQ;

      /* slope: secant through P,Q; tangent when they coincide; hidden
         when vertical at a 2-torsion point (the sum is at infinity) */
      float m = 0.0;
      float dx = xQ - xP;
      if(abs(dx) > 1.0e-4){
        m = (yQ - yP)/dx;
      } else if(abs(yP) > 1.0e-4){
        m = (3.0*xP*xP + A)/(2.0*yP);
      } else { col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

      float x3 = m*m - xP - xQ;          /* third intersection        */
      float y3 = m*(x3 - xP) + yP;

      if(rnd.y < 0.14){
        /* sum bead: P+Q = (x3,-y3), the third hit reflected */
        vec2 sm = vec2(x3, -y3) + (rnd.zw - 0.5)*0.05;
        if(abs(sm.x) > W || abs(sm.y) > W){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
        col = vec3(0.63, 0.95, 0.90)*1.5*glow;
        return vec3(sm.x*s, (u2f(hashu(h)) - 0.5)*0.03, sm.y*s);
      }
      /* the chord itself, spanning P, Q and the third hit, overshot
         slightly; clipped hard to the window box */
      float lo = min(x3, min(xP, xQ));
      float hi = max(x3, max(xP, xQ));
      float pad = 0.06*(hi - lo) + 0.02;
      float xl = mix(lo - pad, hi + pad, q.y);
      float yl = m*(xl - xP) + yP;
      if(abs(xl) > W || abs(yl) > W){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
      col = vec3(0.10, 0.17, 0.26)*0.85*glow;
      return vec3(xl*s, (rnd.w - 0.5)*0.03, yl*s);
    }

    if(rnd.y < 0.006){
      /* the marked point itself */
      if(!okP){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
      vec2 jj = (rnd.zw - 0.5)*0.08;
      col = vec3(1.25, 1.05, 0.70)*1.2*glow;
      return vec3((xP + jj.x)*s,
                  (u2f(hashu(seed ^ 0x3ac5b1d7u)) - 0.5)*0.02,
                  (yP + jj.y)*s);
    }

    /* the curve as filament: uniform in x, weighted toward constant
       energy per arc length (capped at the vertical tangents) */
    float x = mix(-W, W, q.x);
    float r = elliptic_rhs(x, A, B);
    if(r < 0.0){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
    float y = sqrt(r);
    if(y > W){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
    if(rnd.z < 0.5) y = -y;
    float dydx = (3.0*x*x + A)/(2.0*max(abs(y), 1.0e-3));
    float wt = clamp(sqrt(1.0 + dydx*dydx), 1.0, 3.0);
    col = vec3(1.00, 0.72, 0.40)*0.40*wt*glow;
    return vec3(x*s, (rnd.w - 0.5)*0.025, y*s);
  }

  /* ── curtains over F_p: the same equation through prime lenses ── */
  float PM = P[3];
  int Ai = int(floor(A + 0.5));
  int Bi = int(floor(B + 0.5));

  /* q.y strata pick a curtain; walk down to the prime at or below
     (largest gap under 100 is 8 wide, so 12 steps always suffice) */
  int p = 5 + int(q.y*(PM - 4.0));
  p = min(p, int(PM + 0.5));
  for(int j = 0; j < 12; j++){
    if(elliptic_isprime(p)) break;
    p = p - 1;
  }
  if(!elliptic_isprime(p)) p = 5;

  int xi = int(q.x*float(p));
  if(xi > p - 1) xi = p - 1;
  int x2 = elliptic_pmod(xi*xi, p);            /* reduce, then multiply */
  int rh = elliptic_pmod(x2*xi + Ai*xi + Bi, p);

  /* y with y^2 = rh (mod p): scan the low half, mirror for the rest */
  int yf = -1;
  for(int yy = 0; yy < 49; yy++){
    if(yy + yy > p) break;
    if(elliptic_pmod(yy*yy, p) == rh){ yf = yy; break; }
  }
  if(yf < 0){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  int ys = yf;
  if(yf > 0 && rnd.z < 0.5) ys = p - yf;

  float fp = float(p);
  float ty = (fp - 5.0)/max(PM - 5.0, 1.0);
  vec3 pos = vec3((float(xi)/fp - 0.5)*2.2,
                  (ty - 0.5)*1.6,
                  (float(ys)/fp - 0.5)*2.2);
  pos += (vec3(rnd.w, rnd.y, rnd.x) - 0.5)*0.018;
  col = pal(ty*0.8 + 0.05, vec3(0.45, 0.55, 0.55), vec3(0.40, 0.35, 0.35),
            vec3(1.0), vec3(0.60, 0.35, 0.25));
  col *= 0.9*glow;
  return pos;
}`
});
