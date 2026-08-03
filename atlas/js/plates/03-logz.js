"use strict";
Atlas.registerPlate({
  id: "logz",
  name: "The Riemann Surface of log z",
  roman: "III",
  accent: "#a3adff",
  tex: "\\log z \\;=\\; \\ln|z| \\;+\\; i\\bigl(\\arg z + 2\\pi n\\bigr),\\qquad n\\in\\mathbb{Z}",
  plain: "log z = ln|z| + i(arg z + 2\u03c0n),  n \u2208 \u2124",
  caption: "The complex logarithm refuses to be a function: circle the origin once and its value climbs by 2\u03c0i, forever. Stacking every answer yields this helicoid, whose glowing graticule is the conformal image of the w-plane grid. The surface rotates inside \u2102\u00b2, trading height between Im\u2009log\u2009z and Re\u2009log\u2009z; hue repeats each turn while height does not \u2014 that is monodromy.",
  cam: { dist: 3.3, pitch: 0.34, tgtY: 0.0, rot: 0.05 },
  gain: 1.15,
  params: [
    { label: "SHEETS",        min: 1,    max: 8,   step: 1,    def: 5    },
    { label: "\u2102\u00b2 ROTATION", min: 0, max: 0.6, step: 0.005, def: 0.22 },
    { label: "GRATICULE",     min: 0,    max: 3,   step: 0.01, def: 1.0  },
    { label: "INNER RADIUS",  min: 0.02, max: 0.4, step: 0.005,def: 0.07 },
    { label: "OUTER RADIUS",  min: 0.6,  max: 2.0, step: 0.01, def: 1.45 },
    { label: "HEIGHT",        min: 0.2,  max: 2.0, step: 0.01, def: 1.0  }
  ],
  glsl: `
vec3 shape_logz(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  /* area-uniform sampling of the annulus, spread over P[0] sheets */
  float rho = sqrt(mix(P[3]*P[3], P[4]*P[4], q.x));
  float th  = (q.y - 0.5) * TAU * P[0];
  float re  = log(rho);
  float im  = th;
  float beta = P[1]*uT;
  float y = (cos(beta)*0.115*im + sin(beta)*0.55*re) * P[5];
  vec3 p = vec3(rho*cos(th), y, rho*sin(th)) * 0.95;
  /* conformal image of the w-plane grid */
  float gx = abs(fract(re*2.2*P[2]) - 0.5);
  float gy = abs(fract(im*0.7*P[2]) - 0.5);
  float line = smoothstep(0.12, 0.02, min(gx, gy));
  col = pal(fract(th/TAU), vec3(0.48), vec3(0.42), vec3(1.0), vec3(0.02, 0.36, 0.70));
  col = col*0.30 + vec3(0.90, 0.92, 1.0)*line*0.95;
  return p;
}`
});
