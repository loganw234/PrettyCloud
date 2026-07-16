"use strict";
Atlas.registerPlate({
  id: "domain",
  name: "Domain Coloring",
  roman: "XXI",
  accent: "#c0b0ff",
  tex: "w=f(z):\\quad \\text{height}=\\log|f|,\\quad \\text{hue}=\\arg f",
  plain: "w = f(z):   height = log|f|,   hue = arg f",
  caption: "A complex function has no graph you can draw — its input and output each need a plane. So paint the input: at every point z, the hue names the direction of f(z) and the height is log|f(z)|. Zeros become pits where all colours meet, poles become spires, and the winding of hue around each counts its order. Here are z³−1's three-fold pinwheel, a rational map's zeros and poles, the gamma function's marching poles at the negative integers, and Weierstrass's ℘ with its double poles on a lattice.",
  cam: { dist: 3.4, pitch: 0.5, tgtY: 0.25, rot: 0.03 },
  gain: 0.9,
  params: [
    { label: "FUNCTION",  min: 0,   max: 3,   step: 1,    def: 0   },
    { label: "ZOOM",      min: 0.4, max: 8,   step: 0.05, def: 1   },
    { label: "CENTER RE", min: -2,  max: 2,   step: 0.01, def: 0   },
    { label: "CENTER IM", min: -2,  max: 2,   step: 0.01, def: 0   },
    { label: "RELIEF",    min: 0,   max: 1.2, step: 0.01, def: 0.5 },
    { label: "CONTOURS",  min: 0,   max: 4,   step: 0.01, def: 1.5 }
  ],
  glsl: `
vec2 domain_cexp(vec2 z){ float e = exp(z.x); return e*vec2(cos(z.y), sin(z.y)); }
vec2 domain_clog(vec2 z){ return vec2(log(length(z) + 1.0e-30), atan(z.y, z.x)); }
vec2 domain_csin(vec2 z){ return vec2(sin(z.x)*cosh(z.y), cos(z.x)*sinh(z.y)); }
vec2 domain_cpowc(vec2 b, vec2 e){ return domain_cexp(cmul(e, domain_clog(b))); }
vec2 domain_gamma(vec2 zz){
  bool refl = zz.x < 0.5;
  vec2 z = refl ? (vec2(1.0, 0.0) - zz) : zz;
  z -= vec2(1.0, 0.0);
  vec2 x = vec2(0.99999999999980993, 0.0);
  x += 676.5203681218851     * cinv(z + vec2(1.0, 0.0));
  x += -1259.1392167224028   * cinv(z + vec2(2.0, 0.0));
  x += 771.32342877765313    * cinv(z + vec2(3.0, 0.0));
  x += -176.61502916214059   * cinv(z + vec2(4.0, 0.0));
  x += 12.507343278686905    * cinv(z + vec2(5.0, 0.0));
  x += -0.13857109526572012  * cinv(z + vec2(6.0, 0.0));
  x += 9.9843695780195716e-6 * cinv(z + vec2(7.0, 0.0));
  x += 1.5056327351493116e-7 * cinv(z + vec2(8.0, 0.0));
  vec2 t = z + vec2(7.5, 0.0);
  vec2 res = 2.5066282746310002 * cmul(cmul(domain_cpowc(t, z + vec2(0.5, 0.0)),
                                            domain_cexp(vec2(-t.x, -t.y))), x);
  if(refl){ res = cdiv(vec2(PI, 0.0), cmul(domain_csin(PI*zz), res)); }
  return res;
}
vec2 domain_wp(vec2 z){
  vec2 s = cinv(cmul(z, z));
  for(int m = -2; m <= 2; m++){
    for(int n = -2; n <= 2; n++){
      if(m == 0 && n == 0) continue;
      vec2 w = vec2(float(m), float(n));
      vec2 d = z - w;
      s += cinv(cmul(d, d)) - cinv(cmul(w, w));
    }
  }
  return s;
}
vec2 domain_f(int fn, vec2 z){
  if(fn == 0) return cmul(cmul(z, z), z) - vec2(1.0, 0.0);
  if(fn == 1) return cdiv(cmul(z, z) - vec2(1.0, 0.0), cmul(z, z) + vec2(1.0, 0.0));
  if(fn == 2) return domain_gamma(z);
  return domain_wp(z);
}
vec3 shape_domain(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int fn = int(P[0] + 0.5);
  vec2 win = vec2(q.x, q.y) - 0.5;
  vec2 z = vec2(P[2], P[3]) + win*(6.0/P[1]) + (rnd.xy - 0.5)*0.004;
  vec2 w = domain_f(fn, z);
  float mag = length(w);
  float arg = atan(w.y, w.x);
  float h = clamp(log(mag + 1.0e-4), -4.0, 4.0)*P[4];
  vec3 p = vec3(win.x*2.4, h, win.y*2.4);
  float hue = arg/TAU + 0.5;
  col = pal(fract(hue), vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  float band = 0.5 + 0.5*cos(TAU*log(mag + 1.0e-4)*P[5]);
  col *= 0.4 + 0.95*band;
  return p;
}`
});
