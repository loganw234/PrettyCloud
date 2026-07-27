"use strict";
Atlas.registerPlate({
  id: "ford",
  name: "Ford Circles",
  roman: "XLIII",
  accent: "#f0e090",
  tex: "C\\!\\left(\\tfrac{p}{q}\\right):\\ \\text{radius }\\tfrac{1}{2q^{2}},\\qquad C\\!\\left(\\tfrac{p}{q}\\right)\\ \\text{tangent to}\\ C\\!\\left(\\tfrac{r}{s}\\right)\\iff|ps-qr|=1",
  plain: "C(p/q): radius 1/(2q²) — tangent to C(r/s) ⇔ |ps−qr| = 1",
  caption: "Above every reduced fraction p/q hangs a circle of radius 1/(2q²), tangent to the number line at p/q. No two circles overlap; two are tangent exactly when |ps − qr| = 1, precisely when the fractions are Farey neighbours, and between any tangent pair the mediant (p+r)/(q+s) hangs a circle kissing both, forever. Brightness is a counting measure on the rationals: at WEIGHT zero every fraction with denominator up to Q MAX carries equal light, so a region glows in proportion to how many rationals it holds. MODE launches a flight down the Stern–Brocot tree, which lists every positive rational exactly once; TREE DEPTH prolongs the dive toward the line these horocycles all touch.",
  cam: { dist: 2.9, pitch: 0.2, tgtY: 0.25, rot: 0.03 },
  gain: 0.8,
  params: [
    { label: "MODE",       min: 0,   max: 1,   step: 1,    def: 0   },
    { label: "Q MAX",      min: 12,  max: 80,  step: 1,    def: 40  },
    { label: "WEIGHT",     min: 0,   max: 1,   step: 0.01, def: 0.5 },
    { label: "TREE DEPTH", min: 2,   max: 24,  step: 1,    def: 12  },
    { label: "X SCALE",    min: 0.6, max: 2,   step: 0.01, def: 1.3 },
    { label: "LIFT",       min: 0,   max: 1.2, step: 0.01, def: 0   },
    { label: "GLOW",       min: 0,   max: 1,   step: 0.01, def: 0.6 }
  ],
  glsl: `
int ford_gcd(int a, int b){
  for(int i = 0; i < 14; i++){      /* 14 Euclid steps cover all q <= 80 */
    if(b == 0) break;
    int t = a - (a/b)*b;
    a = b; b = t;
  }
  return a;
}
vec3 shape_ford(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode = int(P[0] + 0.5);
  float QM = P[1];
  float xs = P[4]*2.0;              /* isotropic map: x in [0,1] -> [-P4, P4] */
  float lift = P[5]*0.32;
  float glow = 0.5 + 0.7*P[6];
  if(mode == 0){
    /* pick a denominator with importance bias toward small q, then a
       numerator; rejection on gcd keeps only reduced fractions */
    float u = pow(rnd.x, 2.2);
    int qd = 1 + int(u*(QM - 0.001));
    int pd = int(rnd.y*(float(qd) + 1.0));
    if(pd > qd) pd = qd;
    if(ford_gcd(pd, qd) > 1){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
    float qf = float(qd);
    float r = 0.5/(qf*qf);          /* center height == radius: exact tangency */
    float fx = float(pd)/qf;
    float a = q.x*TAU;
    float px = fx + r*sin(a);
    float py = r*(1.0 - cos(a));    /* touches y = 0 exactly at a = 0 */
    /* exact compensation of the sampler: nq = per-fraction hit probability */
    float s = 0.45454545;
    float pq = pow(qf/QM, s) - pow(max((qf - 1.0)/QM, 1e-9), s);
    float nq = max(pq/(qf + 1.0), 1e-7);
    float q0 = sqrt(QM);
    float n0 = (pow(q0/QM, s) - pow(max((q0 - 1.0)/QM, 1e-9), s))/(q0 + 1.0);
    float ratio = n0/nq;
    float wC = min(ratio, 32.0);                  /* equal light per circle     */
    float wA = min(ratio*q0*q0/(qf*qf), 32.0);    /* equal light per arc length */
    float w = mix(wC, wA, P[2]);
    vec3 p = vec3((px - 0.5)*xs, py*xs, lift*log(qf));
    col = pal(log2(qf)*0.16, vec3(0.55, 0.48, 0.40), vec3(0.35, 0.33, 0.30),
              vec3(1.0, 0.9, 0.7), vec3(0.0, 0.15, 0.35));
    /* horocycle glint: a brightness wave circulating around each circle */
    col *= w*glow*(1.0 + 0.25*sin(a - uT*(0.4 + 0.08*min(qf, 25.0))));
    return p;
  }
  /* MODE 1: Stern-Brocot flight. Descend by hashed mediant steps from the
     neighbours 0/1, 1/1; draw the segment joining two successive circle-tops */
  int D = int(P[3] + 0.5);
  D = max(2, min(24, D));
  uint bits = hashu(seed);
  int kSel = int(u2f(hashu(seed ^ 0x51ed270bu))*float(D - 1));
  kSel = min(kSel, D - 2);
  int pl = 0; int ql = 1;
  int pr = 1; int qr = 1;
  int pA = 1; int qA = 2;
  int pB = 1; int qB = 2;
  for(int j = 0; j < 24; j++){
    if(j >= D) break;
    int pm = pl + pr;
    int qm = ql + qr;
    if(j == kSel){ pA = pm; qA = qm; }
    if(j == kSel + 1){ pB = pm; qB = qm; }
    if(((bits >> uint(j)) & 1u) == 0u){ pr = pm; qr = qm; }
    else { pl = pm; ql = qm; }
  }
  float t = q.x;
  float qAf = float(qA);
  float qBf = float(qB);
  float xA = float(pA)/qAf;
  float xB = float(pB)/qBf;
  vec3 A = vec3((xA - 0.5)*xs, xs/(qAf*qAf), lift*log(qAf));
  vec3 B = vec3((xB - 0.5)*xs, xs/(qBf*qBf), lift*log(qBf));
  vec3 p = mix(A, B, t);
  float hq = mix(qAf, qBf, t);
  col = pal(log2(hq)*0.16, vec3(0.55, 0.48, 0.40), vec3(0.35, 0.33, 0.30),
            vec3(1.0, 0.9, 0.7), vec3(0.0, 0.15, 0.35));
  col *= glow*(0.65 + 0.35*sin(TAU*t - uT*1.1 + float(kSel)*1.7));
  return p;
}`
});
