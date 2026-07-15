"use strict";
Atlas.registerPlate({
  id: "qjulia",
  name: "A Quaternion Julia Set",
  roman: "XII",
  accent: "#ff8f7a",
  tex: "q_{n+1}=q_n^{2}+c,\\qquad q,\\,c\\in\\mathbb{H},\\qquad J_c=\\partial\\{q_0: |q_n|\\ \\text{bounded}\\}",
  plain: "q\u2099\u208a\u2081 = q\u2099\u00b2 + c,   q, c \u2208 \u210d (quaternions)",
  caption: "The Julia set of z\u00b2 + c, computed in the quaternions and sliced back into three dimensions. Every point is a random sample of the slice: orbits that escape at once are discarded, late escapers trace the luminous boundary shell, and prisoners fill the dim interior. Steer the four components of c to deform the set continuously \u2014 most of parameter space is dust, and the interesting sets live near its shore.",
  cam: { dist: 3.4, pitch: 0.25, tgtY: 0.0, rot: 0.06 },
  gain: 0.55,
  params: [
    { label: "C \u00b7 1",  min: -1, max: 1, step: 0.005, def: -0.20 },
    { label: "C \u00b7 i",  min: -1, max: 1, step: 0.005, def:  0.60 },
    { label: "C \u00b7 j",  min: -1, max: 1, step: 0.005, def:  0.20 },
    { label: "C \u00b7 k",  min: -1, max: 1, step: 0.005, def:  0.20 },
    { label: "SLICE w",    min: -1, max: 1, step: 0.005, def:  0.0  },
    { label: "ITERATIONS", min: 6,  max: 16,step: 1,     def:  11   },
    { label: "SHELL CUT",  min: 0,  max: 0.9, step: 0.01,def:  0.45 }
  ],
  glsl: `
vec3 shape_qjulia(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  /* uniform random sample of a ball in the 3D slice */
  float ct = 1.0 - 2.0*q.x;
  float st = sqrt(max(0.0, 1.0 - ct*ct));
  float ph = TAU*q.y;
  float rad = 1.35*pow(rnd.x, 0.33333);
  vec3 xyz = vec3(st*cos(ph), ct, st*sin(ph))*rad;
  /* quaternion (a; b,c,d): a = zq.x scalar part */
  vec4 zq = vec4(xyz, P[4]);
  vec4 cc = vec4(P[0], P[1], P[2], P[3]);
  float K = P[5];
  float esc = -1.0;
  for(int j = 0; j < 16; j++){
    if(float(j) >= K) break;
    zq = vec4(zq.x*zq.x - dot(zq.yzw, zq.yzw), 2.0*zq.x*zq.yzw) + cc;
    if(dot(zq, zq) > 16.0){ esc = float(j); break; }
  }
  if(esc >= 0.0 && esc < P[6]*K){
    /* escaped fast: far outside the set — discard off-frustum */
    col = vec3(0.0);
    return vec3(0.0, -999.0, 0.0);
  }
  float glow = (esc < 0.0) ? 0.35 : 1.5;           /* interior dim, shell bright */
  float hue  = (esc < 0.0) ? rad*0.45 : esc/K;
  col = pal(hue*0.6 + 0.12,
            vec3(0.42, 0.30, 0.50), vec3(0.45, 0.35, 0.40),
            vec3(1.0, 0.90, 0.70), vec3(0.78, 0.52, 0.18)) * glow;
  return xyz * 0.95;
}`
});
