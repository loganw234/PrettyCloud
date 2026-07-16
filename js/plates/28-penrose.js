"use strict";
Atlas.registerPlate({
  id: "penrose",
  name: "Cut and Project",
  roman: "XXVIII",
  accent: "#e0c890",
  tex: "\\Lambda=\\{\\pi_\\parallel(\\mathbf n):\\ \\mathbf n\\in\\mathbb Z^k,\\ \\pi_\\perp(\\mathbf n)\\in W\\}",
  plain: "Λ = { π∥(n) : n ∈ ℤᵏ, π⊥(n) ∈ window }",
  caption: "Order without repetition. Take a periodic lattice in a higher-dimensional space, tilt it, and project its points down into the plane — but keep only those whose shadow in the hidden directions lands inside a window. The survivors form a quasicrystal: fivefold, eightfold, any forbidden symmetry you like, patterned everywhere yet never once repeating. This is exactly rejection sampling, which is exactly what this atlas does with light, so the pattern condenses naturally. The hidden coordinate can be lifted into the third dimension to reveal the slice the plane was cut from.",
  cam: { dist: 3.2, pitch: 0.32, tgtY: 0.0, rot: 0.04 },
  gain: 0.75,
  params: [
    { label: "SYMMETRY",  min: 5, max: 12, step: 1,    def: 5   },
    { label: "WINDOW",    min: 0.6,max: 3,  step: 0.02, def: 1.6 },
    { label: "LATTICE M", min: 2, max: 5,   step: 1,    def: 3   },
    { label: "SCALE",     min: 0.4,max: 1.6, step: 0.01,def: 1.0 },
    { label: "3D LIFT",   min: 0, max: 1.2, step: 0.01, def: 0.0 },
    { label: "GLOW",      min: 0, max: 1,   step: 0.01, def: 0.6 }
  ],
  glsl: `
vec3 shape_penrose(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int fold = int(P[0] + 0.5); fold = max(4, min(12, fold));
  float foldf = float(fold);
  float win = P[1];
  float M = P[2];
  uint h = seed;
  vec2 phys = vec2(0.0), intr = vec2(0.0);
  for(int k = 0; k < 12; k++){
    if(k >= fold) break;
    h = hashu(h);
    float nk = floor(u2f(h)*(2.0*M + 1.0)) - M;
    float a = TAU*float(k)/foldf;
    float b = 2.0*TAU*float(k)/foldf;      /* conjugate winding -> internal space */
    phys += nk*vec2(cos(a), sin(a));
    intr += nk*vec2(cos(b), sin(b));
  }
  if(dot(intr, intr) > win*win){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  vec3 p = vec3(phys*P[3]*0.16, length(intr)*P[4]);
  col = pal(atan(intr.y, intr.x)/TAU + 0.5, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  col *= 0.5 + 0.7*P[5];
  return p;
}`
});
