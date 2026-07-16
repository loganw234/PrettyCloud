"use strict";
Atlas.registerPlate({
  id: "invjulia",
  name: "The Julia Set, Run Backwards",
  roman: "XXIII",
  accent: "#ff8fbf",
  tex: "z\\;\\mapsto\\;\\pm\\sqrt{z-c}\\quad(\\text{random sign}),\\qquad J_c=\\overline{\\{\\text{backward orbit}\\}}",
  plain: "z ↦ ±√(z−c)  (random branch),   Jc = closure of the backward orbit",
  caption: "The Julia set of z²+c is where forward orbits are chaotic — impossible to hit by iterating forwards. But run the map backwards: each point has two preimages, ±√(z−c), and choosing between them at random is a chaos game whose attractor is exactly the Julia set. A few steps and every point lands on it, no matter where it started. Steer c across the plane and the set breathes — connected dendrites and rabbits while c sits inside the Mandelbrot set, exploding into dust the moment it leaves.",
  cam: { dist: 3.2, pitch: 0.28, tgtY: 0.0, rot: 0.05 },
  gain: 0.7,
  params: [
    { label: "C · RE",      min: -1, max: 1,   step: 0.005,def: -0.40 },
    { label: "C · IM",      min: -1, max: 1,   step: 0.005,def:  0.60 },
    { label: "ITERATIONS",  min: 8,  max: 60,  step: 1,    def: 40   },
    { label: "SCALE",       min: 0.6,max: 1.6, step: 0.01, def: 1.1  },
    { label: "SPHERE ↔ FLAT",min: 0, max: 1,   step: 0.01, def: 0.0  },
    { label: "GLOW",        min: 0,  max: 1,   step: 0.01, def: 0.6  }
  ],
  glsl: `
vec3 shape_invjulia(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  vec2 c = vec2(P[0], P[1]);
  vec2 z = (rnd.xy - 0.5)*2.0;
  uint h = seed;
  float br = 0.0;
  for(int j = 0; j < 60; j++){
    if(float(j) >= P[2]) break;
    z = csqrt(z - c);
    h = hashu(h);
    if(u2f(h) < 0.5) z = -z;
    br = u2f(h);
  }
  vec3 flat3 = vec3(z*P[3], 0.0);
  float dd = dot(z, z);
  vec3 sph = vec3(2.0*z.x, 2.0*z.y, dd - 1.0)/(dd + 1.0) * (P[3]*1.1);
  vec3 p = mix(flat3, sph, clamp(P[4], 0.0, 1.0));
  col = pal(atan(z.y, z.x)/TAU + 0.5, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  col *= 0.5 + 0.65*P[5];
  return p;
}`
});
