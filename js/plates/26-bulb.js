"use strict";
Atlas.registerPlate({
  id: "bulb",
  name: "The Mandelbulb",
  roman: "XXVI",
  accent: "#ff7a6a",
  tex: "\\mathbf{z}\\mapsto \\mathbf{z}^{\\,n}+\\mathbf{c},\\quad (r,\\theta,\\phi)^n=(r^n,\\,n\\theta,\\,n\\phi)",
  plain: "z ↦ zⁿ + c,   with (r,θ,φ)ⁿ = (rⁿ, nθ, nφ)  (spherical power)",
  caption: "There is no true three-dimensional analogue of complex multiplication — but if you invent one by raising spherical coordinates to a power, twisting the angles and stretching the radius, the escape-time set of z⁸+c grows this bulbous, fractally-encrusted planet. Every point is a random probe of space: quick escapers are discarded, the boundary shell blazes, and the trapped interior glows dim. Raise the power to sprout more lobes, or switch to Julia mode and drift the constant c to melt the whole world into new forms.",
  cam: { dist: 3.0, pitch: 0.22, tgtY: 0.0, rot: 0.05 },
  gain: 0.6,
  params: [
    { label: "POWER n",    min: 2,  max: 12, step: 0.05, def: 8    },
    { label: "ITERATIONS", min: 6,  max: 16, step: 1,    def: 10   },
    { label: "SHELL CUT",  min: 0,  max: 0.9,step: 0.01, def: 0.45 },
    { label: "MODE",       min: 0,  max: 1,  step: 1,    def: 0    },
    { label: "JULIA X",    min: -1, max: 1,  step: 0.005,def: 0.2  },
    { label: "JULIA Y",    min: -1, max: 1,  step: 0.005,def: 0.0  },
    { label: "GLOW",       min: 0,  max: 1,  step: 0.01, def: 0.6  }
  ],
  glsl: `
vec3 shape_bulb(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float power = P[0];
  float ct = 1.0 - 2.0*q.x;
  float st = sqrt(max(0.0, 1.0 - ct*ct));
  float ph = TAU*q.y;
  float rad = 1.3*pow(rnd.x, 0.33333);
  vec3 pos = vec3(st*cos(ph), ct, st*sin(ph))*rad;
  int mode = int(P[3] + 0.5);
  vec3 z  = (mode == 0) ? vec3(0.0) : pos;
  vec3 cc = (mode == 0) ? pos : vec3(P[4], P[5], 0.0);
  float K = P[1];
  float esc = -1.0;
  for(int j = 0; j < 16; j++){
    if(float(j) >= K) break;
    float r = length(z);
    if(r > 2.0){ esc = float(j); break; }
    float theta = acos(clamp(z.y/max(r, 1.0e-6), -1.0, 1.0));
    float phi = atan(z.z, z.x);
    float rp = pow(r, power);
    float nt = theta*power, np = phi*power;
    z = rp*vec3(sin(nt)*cos(np), cos(nt), sin(nt)*sin(np)) + cc;
  }
  if(esc >= 0.0 && esc < P[2]*K){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  float glow = (esc < 0.0) ? 0.35 : 1.4;
  float hue  = (esc < 0.0) ? rad*0.4 : esc/K;
  col = pal(hue*0.6 + 0.1, vec3(0.5, 0.4, 0.35), vec3(0.5, 0.4, 0.4),
            vec3(1.0, 0.9, 0.7), vec3(0.1, 0.3, 0.5)) * glow * (0.6 + 0.7*P[6]);
  return pos*0.95;
}`
});
