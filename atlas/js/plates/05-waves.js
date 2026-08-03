"use strict";
Atlas.registerPlate({
  id: "wave",
  name: "Interference",
  roman: "V",
  accent: "#7fe8dc",
  tex: "\\psi(\\mathbf{x},t)=\\sum_{j}\\frac{A}{c+r_j}\\,\\sin\\!\\bigl(\\kappa_j r_j-\\omega_j t\\bigr),\\qquad \\omega=\\kappa^{\\,p}",
  plain: "\u03c8(x,t) = \u03a3 A/(c+r\u2c7c) \u00b7 sin(\u03ba\u2c7cr\u2c7c \u2212 \u03c9\u2c7ct),   \u03c9 = \u03ba\u1d56",
  caption: "Point sources, nothing more. Crests meet crests, troughs annihilate crests, and the superposition principle writes its interference fringes across the whole surface. The DISPERSION lever is the exponent in \u03c9 = \u03ba\u1d56: at p = \u00bd you have deep-water gravity waves where long waves outrun short ones; at p = 1 every wavelength travels together, like light in vacuum.",
  cam: { dist: 3.7, pitch: 0.55, tgtY: 0.0, rot: 0.04 },
  gain: 1.35,
  params: [
    { label: "SOURCES",    min: 1,    max: 6,   step: 1,     def: 3    },
    { label: "WAVENUMBER", min: 2,    max: 16,  step: 0.05,  def: 7    },
    { label: "AMPLITUDE",  min: 0,    max: 0.3, step: 0.005, def: 0.12 },
    { label: "DISPERSION", min: 0.05, max: 1,   step: 0.01,  def: 0.5  },
    { label: "SOURCE RING",min: 0,    max: 1.8, step: 0.01,  def: 1.05 },
    { label: "DAMPING",    min: 0.1,  max: 2,   step: 0.01,  def: 0.55 }
  ],
  glsl: `
vec3 shape_wave(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  vec2 xz = (q - 0.5) * 3.6;
  float h = 0.0;
  for(int j = 0; j < 6; j++){
    if(float(j) >= P[0]) break;
    float fa = float(j)*TAU/max(P[0], 1.0) + 0.10*uT;
    vec2 src = P[4]*vec2(cos(fa), sin(fa));
    float r = length(xz - src);
    float k = P[1] + 3.0*float(j);
    h += P[2]/(P[5] + r) * sin(k*r - 2.2*pow(k, P[3])*uT);
  }
  vec3 p = vec3(xz.x, h*1.05, xz.y);
  float hn = clamp(h*4.5, -1.0, 1.0);
  col = mix(vec3(0.03, 0.30, 0.46), vec3(0.80, 0.97, 1.0), hn*0.5 + 0.5);
  col *= 0.35 + 0.9*abs(hn);
  return p;
}`
});
