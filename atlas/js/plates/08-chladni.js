"use strict";
Atlas.registerPlate({
  id: "chladni",
  name: "Chladni Figures",
  roman: "VIII",
  accent: "#e8d98a",
  tex: "\\cos(n\\pi x)\\cos(m\\pi y)\\;\\pm\\;\\cos(m\\pi x)\\cos(n\\pi y)\\;=\\;0",
  plain: "cos(n\u03c0x)cos(m\u03c0y) \u00b1 cos(m\u03c0x)cos(n\u03c0y) = 0",
  caption: "Sand on a vibrating plate migrates to the curves that do not move \u2014 the nodal lines of a standing-wave eigenmode. Points here brighten exactly where the mode function vanishes, reproducing Chladni's figures of 1787; the RELIEF lever lets you watch the plate itself oscillate around its silent curves. Stepping n and m walks the eigenvalue ladder, and MIX interpolates between the two degenerate combinations.",
  cam: { dist: 3.4, pitch: 0.70, tgtY: 0.0, rot: 0.03 },
  gain: 1.2,
  params: [
    { label: "MODE N",    min: 1,   max: 12,  step: 1,    def: 5    },
    { label: "MODE M",    min: 1,   max: 12,  step: 1,    def: 2    },
    { label: "MIX \u00b1", min: -1,  max: 1,   step: 0.01, def: 1    },
    { label: "SHARPNESS", min: 1,   max: 14,  step: 0.1,  def: 6    },
    { label: "RELIEF",    min: 0,   max: 0.5, step: 0.005,def: 0.12 },
    { label: "PLATE SIZE",min: 1.5, max: 4,   step: 0.01, def: 3.0  }
  ],
  glsl: `
vec3 shape_chladni(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  vec2 xy = q - 0.5;
  float f = cos(P[0]*PI*xy.x)*cos(P[1]*PI*xy.y)
          + P[2]*cos(P[1]*PI*xy.x)*cos(P[0]*PI*xy.y);
  float node = exp(-(f*f)*P[3]*P[3]);    /* sand collects where f = 0 */
  float y = P[4]*f*cos(2.2*uT);          /* the plate actually vibrating */
  vec3 p = vec3(xy.x*P[5], y, xy.y*P[5]);
  vec3 sand = vec3(0.95, 0.90, 0.75);
  vec3 wavec = mix(vec3(0.10, 0.35, 0.55), vec3(0.90, 0.55, 0.25), 0.5 + 0.5*f);
  col = wavec*0.10 + sand*node*1.3;
  return p;
}`
});
