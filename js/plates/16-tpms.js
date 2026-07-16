"use strict";
Atlas.registerPlate({
  id: "tpms",
  name: "Minimal Surfaces",
  roman: "XVI",
  accent: "#b6e08f",
  tex: "\\text{Gyroid: }\\;\\sin x\\cos y+\\sin y\\cos z+\\sin z\\cos x=c",
  plain: "Gyroid:  sin x cos y + sin y cos z + sin z cos x = c",
  caption: "A surface that tiles space, curving everywhere yet flat on average — mean curvature zero at every point. These triply-periodic minimal surfaces are what soap films, block copolymers and butterfly-wing photonic crystals settle into. Points are sampled through a block of unit cells and then Newton-projected straight onto the level set, so almost none are wasted and brightness traces the surface's own area. The LEVEL dial thickens or opens the labyrinth; SLAB CUT shears the block away so you can see inside the weave. Colour is the surface normal.",
  cam: { dist: 3.2, pitch: 0.28, tgtY: 0.0, rot: 0.05 },
  gain: 0.85,
  params: [
    { label: "SURFACE",     min: 0, max: 3,   step: 1,    def: 0   },
    { label: "LEVEL c",     min: -1.3,max: 1.3,step: 0.01,def: 0.0 },
    { label: "CELLS",       min: 1, max: 4,   step: 1,    def: 2   },
    { label: "NEWTON STEPS",min: 1, max: 4,   step: 1,    def: 3   },
    { label: "SLAB CUT",    min: 0, max: 1,   step: 0.01, def: 0.0 },
    { label: "GLOW",        min: 0, max: 1,   step: 0.01, def: 0.5 }
  ],
  glsl: `
float tpms_F(int s, vec3 p, float level){
  float x = p.x, y = p.y, z = p.z, v;
  if(s == 0) v = sin(x)*cos(y) + sin(y)*cos(z) + sin(z)*cos(x);   /* gyroid */
  else if(s == 1) v = cos(x) + cos(y) + cos(z);                   /* Schwarz P */
  else if(s == 2) v = cos(x)*cos(y)*cos(z) - sin(x)*sin(y)*sin(z);/* Schwarz D */
  else v = 3.0*(cos(x) + cos(y) + cos(z)) + 4.0*cos(x)*cos(y)*cos(z); /* Neovius */
  return v - level;
}
vec3 tpms_grad(int s, vec3 p, float level){
  float e = 0.012;
  return vec3(tpms_F(s, p + vec3(e,0,0), level) - tpms_F(s, p - vec3(e,0,0), level),
              tpms_F(s, p + vec3(0,e,0), level) - tpms_F(s, p - vec3(0,e,0), level),
              tpms_F(s, p + vec3(0,0,e), level) - tpms_F(s, p - vec3(0,0,e), level))/(2.0*e);
}
vec3 shape_tpms(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int s = int(P[0] + 0.5);
  float level = P[1];
  float cells = P[2];
  vec3 p = (vec3(q.x, q.y, rnd.x) - 0.5) * (TAU*cells);
  for(int it = 0; it < 4; it++){
    if(float(it) >= P[3]) break;
    float f = tpms_F(s, p, level);
    vec3 g = tpms_grad(s, p, level);
    p -= f*g/(dot(g, g) + 1.0e-4);
  }
  if(abs(tpms_F(s, p, level)) > 0.08){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  float scl = 2.6/(TAU*cells);
  vec3 world = p*scl;
  if(world.z > (0.5 - P[4])*5.2){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }  /* slab cut */
  vec3 nrm = normalize(tpms_grad(s, p, level) + 1.0e-5);
  col = (0.30 + 0.70*abs(nrm)) * (0.55 + 0.7*P[5]);
  return world;
}`
});
