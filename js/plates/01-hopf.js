"use strict";
Atlas.registerPlate({
  id: "hopf",
  name: "The Hopf Fibration",
  roman: "I",
  accent: "#8fd0ff",
  tex: "h:\\;S^3\\!\\to S^2,\\qquad h(z_1,z_2)=\\bigl(2\\,z_1\\bar z_2,\\;|z_1|^2-|z_2|^2\\bigr),\\qquad h^{-1}(p)\\cong S^1",
  plain: "h : S\u00b3 \u2192 S\u00b2,   h(z\u2081,z\u2082) = (2z\u2081z\u0304\u2082, |z\u2081|\u00b2\u2212|z\u2082|\u00b2),   h\u207b\u00b9(p) \u2245 S\u00b9",
  caption: "Four-dimensional space, flattened. Each closed curve is the complete preimage of one point of an ordinary sphere under the Hopf map \u2014 and any two of these circles, chosen anywhere, are linked exactly once. Hue names the base point on S\u00b2; the churn is a rigid rotation of the 3-sphere carrying fibers through the projection pole.",
  cam: { dist: 3.5, pitch: 0.32, tgtY: 0.0, rot: 0.05 },
  gain: 1.0,
  params: [
    { label: "BAND LOBES",   min: 0,    max: 6,   step: 1,    def: 2    },
    { label: "BAND SWING",   min: 0,    max: 1.4, step: 0.01, def: 0.92 },
    { label: "4D SPIN XW",   min: -0.4, max: 0.4, step: 0.005,def: 0.11 },
    { label: "4D SPIN YZ",   min: -0.4, max: 0.4, step: 0.005,def: 0.07 },
    { label: "SCALE",        min: 0.15, max: 0.6, step: 0.005,def: 0.36 }
  ],
  glsl: `
vec3 shape_hopf(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float s   = q.y;                       /* position along base curve on S2 */
  float a   = TAU * q.x;                 /* position along the fiber circle */
  float phi = TAU * s;
  float theta = 0.5*PI + P[1]*sin(P[0]*phi + 0.23*uT);
  float ch = cos(0.5*theta), sh = sin(0.5*theta);
  vec4 p4 = vec4(ch*cos(a), ch*sin(a), sh*cos(a+phi), sh*sin(a+phi));
  /* rigid double rotation of S3 */
  float r1 = P[2]*uT, r2 = P[3]*uT;
  float c1 = cos(r1), s1 = sin(r1), c2 = cos(r2), s2 = sin(r2);
  p4 = vec4( c1*p4.x - s1*p4.w,
             c2*p4.y - s2*p4.z,
             s2*p4.y + c2*p4.z,
             s1*p4.x + c1*p4.w );
  /* stereographic projection S3 -> R3 */
  float d = max(1.0 - p4.w, 0.035);
  vec3 p = (p4.xyz / d) * P[4];
  col = pal(s, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  col *= 0.8 + 0.4*rnd.x;
  return p;
}`
});
