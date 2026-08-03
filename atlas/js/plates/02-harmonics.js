"use strict";
Atlas.registerPlate({
  id: "harm",
  name: "Spherical Harmonics",
  roman: "II",
  accent: "#ffb066",
  tex: "\\nabla^2_{S^2}\\,Y_\\ell^{m} \\;=\\; -\\,\\ell(\\ell+1)\\,Y_\\ell^{m},\\qquad f=\\textstyle\\sum_k w_k(t)\\,Y_{\\ell_k}^{m_k}",
  plain: "\u2207\u00b2 Y\u2097\u1d50 = \u2212\u2113(\u2113+1) Y\u2097\u1d50,   f = \u03a3 w\u2096(t) Y\u2097\u1d50",
  caption: "The vibrational modes of a sphere: eigenfunctions of the Laplacian, and the angular shapes of every atomic orbital. Warm lobes are positive amplitude, cold lobes negative, and the radius is drawn by the function itself. The four weight levers steer the superposition by hand; DRIFT lets it wander on its own.",
  cam: { dist: 3.0, pitch: 0.28, tgtY: 0.0, rot: 0.06 },
  gain: 1.1,
  params: [
    { label: "WEIGHT Y\u2082\u2070", min: -1.2, max: 1.2,  step: 0.01, def: 1.0  },
    { label: "WEIGHT Y\u2083\u00b2", min: -1.2, max: 1.2,  step: 0.01, def: 0.7  },
    { label: "WEIGHT Y\u2084\u00b3", min: -1.2, max: 1.2,  step: 0.01, def: 0.6  },
    { label: "WEIGHT Y\u2085\u2075", min: -1.2, max: 1.2,  step: 0.01, def: 0.5  },
    { label: "DRIFT",              min: 0,    max: 1,    step: 0.01, def: 0.6  },
    { label: "AMPLITUDE",          min: 0,    max: 1.2,  step: 0.01, def: 0.62 },
    { label: "SHELL FUZZ",         min: 0,    max: 0.35, step: 0.005,def: 0.05 }
  ],
  glsl: `
vec3 shape_harm(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float ct = 1.0 - 2.0*q.x;              /* uniform on the sphere */
  float st = sqrt(max(0.0, 1.0 - ct*ct));
  float ph = TAU * q.y;
  vec3 dir = vec3(st*cos(ph), ct, st*sin(ph));
  float s2 = st*st;
  float Y20 = 0.5*(3.0*ct*ct - 1.0);
  float Y32 = 2.2 * s2*ct*cos(2.0*ph);
  float Y43 = 3.4 * s2*st*ct*cos(3.0*ph);
  float Y55 = 4.2 * s2*s2*st*cos(5.0*ph);
  float w0 = P[0] + P[4]*cos(0.19*uT);
  float w1 = P[1] + P[4]*cos(0.23*uT + 2.1);
  float w2 = P[2] + P[4]*cos(0.17*uT + 4.2);
  float w3 = P[3] + P[4]*cos(0.13*uT + 1.1);
  float f = 0.30*(w0*Y20 + w1*Y32 + w2*Y43 + w3*Y55);
  float r = 0.58 + P[5]*f;
  r *= 1.0 + P[6]*(rnd.y - 0.5);
  vec3 p = dir * max(r, 0.03) * 1.05;
  col = mix(vec3(0.22, 0.58, 1.0), vec3(1.0, 0.55, 0.20), step(0.0, f))
      * (0.20 + 1.6*abs(f));
  return p;
}`
});
