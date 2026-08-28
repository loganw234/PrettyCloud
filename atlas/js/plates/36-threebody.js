"use strict";
Atlas.registerPlate({
  id: "threebody",
  name: "The Three-Body Ballet",
  roman: "XXXVI",
  accent: "#ffd070",
  tex: "\\ddot{\\mathbf{x}}_i=\\sum_{j\\ne i}\\frac{\\mathbf{x}_j-\\mathbf{x}_i}{\\lVert\\mathbf{x}_j-\\mathbf{x}_i\\rVert^{3}},\\qquad T=6.32591398",
  plain: "ẍᵢ = Σ_{j≠i} (xⱼ−xᵢ)/‖xⱼ−xᵢ‖³,   T = 6.32591398",
  caption: "Three equal masses under Newtonian gravity, the problem Poincaré showed admits no new conserved quantities to solve it with. Each point carries the exact initial conditions through a Runge–Kutta integration to a random fraction of the period, so brightness is dwell time: the slow arcs of the choreography glow brightest. MODE 0 is the figure-eight, found numerically by Moore in 1993 and proven by Chenciner and Montgomery in 2000, one of the few known stable periodic three-body orbits. MODE 1 is Lagrange's rotating equilateral triangle of 1772, exact but unstable for equal masses: raise PERTURB and the nudge that merely thickens the eight scatters the triangle into escape. TIME LIFT unrolls time upward.",
  cam: { dist: 3.1, pitch: 0.5, tgtY: 0.0, rot: 0.03 },
  gain: 0.85,
  params: [
    { label: "MODE",      min: 0,   max: 1,   step: 1,    def: 0    },
    { label: "STEPS",     min: 60,  max: 320, step: 1,    def: 200  },
    { label: "PERTURB",   min: 0,   max: 2,   step: 0.01, def: 0    },
    { label: "TIME LIFT", min: 0,   max: 1.5, step: 0.01, def: 0    },
    { label: "SCALE",     min: 0.4, max: 1.4, step: 0.01, def: 1.0  },
    { label: "GLOW",      min: 0,   max: 1,   step: 0.01, def: 0.6  }
  ],
  glsl: `
vec2 threebody_fp(vec2 a, vec2 b){
  /* softened pairwise term (b-a)/(|b-a|^2 + eps^2)^(3/2), G = 1, m = 1 */
  vec2 d = b - a;
  float s = dot(d, d) + 1.0e-6;
  return d * (inversesqrt(s) / s);
}
vec3 shape_threebody(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode = int(P[0] + 0.5);
  int nst  = int(P[1] + 0.5);
  float amp = P[2] * 0.01;

  vec2 p1, p2, p3, v1, v2, v3;
  float span;
  if(mode == 0){
    /* Moore's figure-eight choreography: exact ICs, period T = 6.32591398 */
    p1 = vec2(0.97000436, -0.24308753);
    p2 = -p1;
    p3 = vec2(0.0, 0.0);
    v3 = vec2(-0.93240737, -0.86473146);
    v1 = -0.5 * v3;
    v2 = v1;
    span = 6.32591398;
  } else {
    /* Lagrange 1772: equilateral triangle, unit side, radius r = 1/sqrt(3).
       Force balance: |a| = 2 cos(30deg)/1^2 = sqrt(3); centripetal need is
       omega^2 r = omega^2/sqrt(3), so omega^2 = 3, omega = sqrt(3), and each
       speed omega*r = 1. Shown for two turns: span = 2 * 2pi/omega. */
    float rr = 0.5773502692;
    p1 = rr * vec2( 1.0,  0.0          );  v1 = vec2( 0.0,           1.0);
    p2 = rr * vec2(-0.5,  0.8660254038);   v2 = vec2(-0.8660254038, -0.5);
    p3 = rr * vec2(-0.5, -0.8660254038);   v3 = vec2( 0.8660254038, -0.5);
    span = 7.2551974570;
  }

  /* per-point IC perturbation: PERTURB * (uniform - 0.5) * 0.01 on all 12
     state components. amp = 0 leaves every point on the true orbit. */
  p1 += (rnd.xy - 0.5) * amp;
  p2 += (rnd.zw - 0.5) * amp;
  uint hp = hashu(seed ^ 0x51ed270bu);
  vec2 e;
  e.x = u2f(hp) - 0.5; hp = hashu(hp);
  e.y = u2f(hp) - 0.5; hp = hashu(hp);
  p3 += e * amp;
  e.x = u2f(hp) - 0.5; hp = hashu(hp);
  e.y = u2f(hp) - 0.5; hp = hashu(hp);
  v1 += e * amp;
  e.x = u2f(hp) - 0.5; hp = hashu(hp);
  e.y = u2f(hp) - 0.5; hp = hashu(hp);
  v2 += e * amp;
  e.x = u2f(hp) - 0.5; hp = hashu(hp);
  e.y = u2f(hp) - 0.5; hp = hashu(hp);
  v3 += e * amp;

  /* random integration time in [0, span), slowly phase-shifted by uT so the
     ballet runs; h = tstar/N varies per point, N is the constant loop bound */
  float ph = fract(q.x + uT * 0.025);
  float tstar = ph * span;
  float h = tstar / max(float(nst), 1.0);

  for(int j = 0; j < 320; j++){
    if(j >= nst) break;
    /* RK4 on the 12-float state; 3 pairwise forces per stage */
    vec2 fA = threebody_fp(p1, p2);
    vec2 fB = threebody_fp(p2, p3);
    vec2 fC = threebody_fp(p3, p1);
    vec2 a11 = fA - fC; vec2 a21 = fB - fA; vec2 a31 = fC - fB;

    vec2 p1b = p1 + 0.5*h*v1;  vec2 p2b = p2 + 0.5*h*v2;  vec2 p3b = p3 + 0.5*h*v3;
    vec2 v1b = v1 + 0.5*h*a11; vec2 v2b = v2 + 0.5*h*a21; vec2 v3b = v3 + 0.5*h*a31;
    fA = threebody_fp(p1b, p2b); fB = threebody_fp(p2b, p3b); fC = threebody_fp(p3b, p1b);
    vec2 a12 = fA - fC; vec2 a22 = fB - fA; vec2 a32 = fC - fB;

    vec2 p1c = p1 + 0.5*h*v1b;  vec2 p2c = p2 + 0.5*h*v2b;  vec2 p3c = p3 + 0.5*h*v3b;
    vec2 v1c = v1 + 0.5*h*a12;  vec2 v2c = v2 + 0.5*h*a22;  vec2 v3c = v3 + 0.5*h*a32;
    fA = threebody_fp(p1c, p2c); fB = threebody_fp(p2c, p3c); fC = threebody_fp(p3c, p1c);
    vec2 a13 = fA - fC; vec2 a23 = fB - fA; vec2 a33 = fC - fB;

    vec2 p1d = p1 + h*v1c;  vec2 p2d = p2 + h*v2c;  vec2 p3d = p3 + h*v3c;
    vec2 v1d = v1 + h*a13;  vec2 v2d = v2 + h*a23;  vec2 v3d = v3 + h*a33;
    fA = threebody_fp(p1d, p2d); fB = threebody_fp(p2d, p3d); fC = threebody_fp(p3d, p1d);
    vec2 a14 = fA - fC; vec2 a24 = fB - fA; vec2 a34 = fC - fB;

    p1 += h/6.0*(v1 + 2.0*v1b + 2.0*v1c + v1d);
    p2 += h/6.0*(v2 + 2.0*v2b + 2.0*v2c + v2d);
    p3 += h/6.0*(v3 + 2.0*v3b + 2.0*v3c + v3d);
    v1 += h/6.0*(a11 + 2.0*a12 + 2.0*a13 + a14);
    v2 += h/6.0*(a21 + 2.0*a22 + 2.0*a23 + a24);
    v3 += h/6.0*(a31 + 2.0*a32 + 2.0*a33 + a34);
    if(dot(p1, p1) + dot(p2, p2) + dot(p3, p3) > 1.0e6) break;  /* runaway guard */
  }

  /* plot one of the three bodies, chosen by hash */
  uint hb = hashu(seed ^ 0xb5297a4du);
  int body = int(hb % 3u);
  vec2 pw; float sp;
  if(body == 0){ pw = p1; sp = length(v1); }
  else if(body == 1){ pw = p2; sp = length(v2); }
  else { pw = p3; sp = length(v3); }

  if(any(isnan(pw)) || any(isinf(pw)) || dot(pw, pw) > 16.0){
    col = vec3(0.0);
    return vec3(0.0, -999.0, 0.0);      /* escaper: hide */
  }

  float bt = float(body)/3.0 + 0.05*min(sp*0.3, 1.0);
  col = pal(bt, vec3(0.55, 0.45, 0.40), vec3(0.42, 0.35, 0.32),
            vec3(1.0, 1.0, 1.0), vec3(0.02, 0.18, 0.42));
  col *= 0.4 + 0.8*P[5];

  float S = P[4];
  return vec3(pw.x*S, (ph - 0.5)*P[3], pw.y*S);
}`
});
