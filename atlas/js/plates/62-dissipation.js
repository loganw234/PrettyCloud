"use strict";
Atlas.registerPlate({
  id: "dissipation",
  name: "The Dissipation Field",
  roman: "LXII",
  accent: "#e08fb8",
  tex: "\\varepsilon_{n+1} = \\varepsilon_n \\cdot W,\\quad \\langle W\\rangle \\approx e^{-\\lambda^2/4},\\ \\operatorname{Var}\\log W \\approx \\tfrac12\\lambda^2",
  plain: "ε ← ε · W per octave,  ⟨W⟩ ≈ e^(−λ²/4),  Var(log W) ≈ λ²/2   (multiplicative cascade)",
  caption: "Where turbulence actually spends its energy is nothing like even: dissipation clots into sheets and strands, calm for miles then violent in a filament - and the classical model of that roughness is the multiplicative cascade, each octave multiplying the last by a random weight of mean one. Repeat, and the field's unevenness compounds without limit: a measure that is almost nowhere large and yet holds almost everything, singular in the limit at every point that matters. This plate runs the cascade down its octaves with the weights' variance on a dial - smooth rain at zero, at full a storm concentrated on threads. Sixth of the Mk2 series, and the living renders' natural companion: its structure is not shapes but statistics, and statistics never run out.",
  cam: { dist: 3.0, pitch: 0.4, tgtY: 0.0, rot: 0.0 },
  gain: 0.5,
  params: [
    { label: "LAMBDA",     min: 0,   max: 1.2, step: 0.01, def: 0.55 },
    { label: "SUBDIV b",   min: 2,   max: 4,   step: 1,    def: 2    },
    { label: "DEPTH",      min: 6,   max: 22,  step: 1,    def: 16   },
    { label: "STRETCH",    min: 0,   max: 0.8, step: 0.01, def: 0.35 },
    { label: "SLAB Z",     min: 0,   max: 0.4, step: 0.005,def: 0.06 },
    { label: "EMBER",      min: 0,   max: 1,   step: 0.01, def: 0.5  }
  ],
  glsl: `
vec3 shape_dissipation(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // The cascade, walked: descend the b-ary cells multiplying an
  // addressed lognormal-ish weight per level. Every cell exists -
  // the measure has full support - but the walked product decides
  // how brightly this parcel burns, and at depth the bright threads
  // are vanishingly rare and carry nearly everything. Depth is drawn
  // uniformly: the statistics are the structure, at every octave.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 217645177u));
  pt = hashu(pt ^ floatBitsToUint(rnd.w));

  int b    = int(P[1] + 0.5);
  int maxD = int(P[2] + 0.5);
  pt = hashu(pt);
  int d = int(u2f(pt) * float(maxD));

  vec2  cell  = vec2(0.0);
  float scale = 1.0;
  uint  addr  = 2166136261u;
  float logw  = 0.0;
  float aniso = 0.0;
  for(int l = 0; l < 22; l++){
    if(l >= d) break;
    pt = hashu(pt);
    int cx = int(u2f(pt) * float(b));
    pt = hashu(pt);
    int cy = int(u2f(pt) * float(b));
    addr = hashu(addr ^ uint(cy * 89 + cx + 3));
    // weight: log-symmetric around mean one, variance lambda^2 -
    // two hashed uniforms make a passable gaussian
    uint wa = hashu(addr ^ 65537u);
    float g = (u2f(wa) + u2f(hashu(wa)) - 1.0) * 1.73;
    logw += P[0] * g - 0.5 * P[0] * P[0];
    // sheared descent: dissipation sheets stretch along the strain
    uint sa = hashu(addr ^ 262147u);
    aniso += (u2f(sa) - 0.5) * P[3];
    cell  += (vec2(float(cx), float(cy))) * scale / float(b)
             - vec2(scale * 0.5 * (1.0 - 1.0 / float(b)));
    scale /= float(b);
  }

  vec2 j = vec2(rnd.x, rnd.y) - 0.5;
  j.x += j.y * aniso;                    // the shear, accumulated
  vec2 seat = cell + j * scale;
  float w = exp(logw);
  float z = ((u2f(hashu(addr ^ 39916801u)) - 0.5)
             + (rnd.z - 0.5) * 0.3) * P[4] * (0.25 + 3.0 * scale);

  float lv = float(d) / max(P[2], 1.0);
  float heat = clamp(w * 0.35, 0.0, 2.5);
  col = pal(0.05 + 0.35 * clamp(heat, 0.0, 1.2) + 0.1 * lv,
            vec3(0.5, 0.4, 0.38), vec3(0.5, 0.42, 0.4),
            vec3(1.0, 0.8, 0.55), vec3(0.0, 0.15, 0.35))
        * (0.15 + heat * (0.6 + P[5]));
  return vec3(seat.x * 1.9, seat.y * 1.9, z);
}`
});
