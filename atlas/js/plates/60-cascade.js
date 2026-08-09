"use strict";
Atlas.registerPlate({
  id: "cascade",
  name: "The Turbulent Cascade",
  roman: "LX",
  accent: "#e0a56f",
  tex: "E(k)\\ \\propto\\ \\varepsilon^{2/3}\\,k^{-5/3}",
  plain: "E(k) ∝ ε^⅔ k^(−5/3)   (Kolmogorov 1941)",
  caption: "Stir a fluid and the energy you put in does not stay at the size you stirred: whirls shed smaller whirls, which shed smaller still, energy cascading down the scales until viscosity finally collects it - and in between, Kolmogorov's five-thirds law holds with an evenness almost nothing in nature matches. This plate is that in-between, made visible: ink advected through a velocity field built octave by octave at the cascade's own amplitudes, every scale carrying its lawful share. There is no largest eddy that matters and no smallest you will reach. Fourth of the Mk2 series, and the one whose subject is the series' own design law: equal structure per octave, by physics rather than by construction.",
  cam: { dist: 3.0, pitch: 0.3, tgtY: 0.0, rot: 0.0 },
  gain: 0.5,
  params: [
    { label: "OCTAVES",      min: 3,   max: 12,  step: 1,    def: 9    },
    { label: "SLOPE",        min: 0.2, max: 0.55,step: 0.005,def: 0.333},
    { label: "STIR",         min: 0.2, max: 2.0, step: 0.01, def: 1.0  },
    { label: "STREAM STEPS", min: 2,   max: 12,  step: 1,    def: 7    },
    { label: "INTERMITTENCY",min: 0,   max: 1,   step: 0.01, def: 0.35 },
    { label: "SLAB Z",       min: 0,   max: 0.4, step: 0.005,def: 0.08 },
    { label: "INK",          min: 0,   max: 1,   step: 0.01, def: 0.55 }
  ],
  glsl: `
// hashed lattice gradients: value noise cheap enough to stack a
// dozen octaves per streamline step
float vnoise_cascade(vec2 p, uint oc){
  vec2 i = floor(p), f = p - i;
  vec2 w = f * f * (3.0 - 2.0 * f);
  uint bx = uint(int(i.x) & 1023), by = uint(int(i.y) & 1023);
  uint h00 = hashu(oc ^ hashu(bx * 374761393u + by * 668265263u));
  uint h10 = hashu(oc ^ hashu((bx + 1u) * 374761393u + by * 668265263u));
  uint h01 = hashu(oc ^ hashu(bx * 374761393u + (by + 1u) * 668265263u));
  uint h11 = hashu(oc ^ hashu((bx + 1u) * 374761393u + (by + 1u) * 668265263u));
  float a = mix(u2f(h00), u2f(h10), w.x);
  float b = mix(u2f(h01), u2f(h11), w.x);
  return mix(a, b, w.y) - 0.5;
}

vec3 shape_cascade(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // A parcel of ink: seeded anywhere, advected a few steps through
  // the summed cascade, deposited along its path. The octave that
  // dominates each parcel's look is drawn uniformly, so the record's
  // zoom always finds an eddy being resolved at its own scale.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 951274213u));
  pt = hashu(pt ^ floatBitsToUint(rnd.w));

  int   octs  = int(P[0] + 0.5);
  float slope = P[1];
  int   steps = int(P[3] + 0.5);

  // seed position: uniform over the stirred square
  pt = hashu(pt);
  vec2 p = vec2(u2f(pt), u2f(hashu(pt))) * 2.4 - 1.2;
  pt = hashu(hashu(pt));

  // the parcel's focus octave - equal budget per scale
  pt = hashu(pt);
  int focus = int(u2f(pt) * float(octs));

  // intermittency: a multiplicative gate per octave, the roughness
  // real dissipation fields carry beyond K41
  float gate = 1.0;
  uint ga = hashu(pt ^ 88888881u);
  for(int o = 0; o < 12; o++){
    if(o >= focus) break;
    ga = hashu(ga);
    gate *= mix(1.0, 0.35 + 1.3 * u2f(ga), P[4]);
  }

  float h = 0.0;
  vec2 trail = p;
  float dt = 0.16 / float(steps);
  for(int s = 0; s < 12; s++){
    if(s >= steps) break;
    // curl of the summed field: finite-difference on stacked noise,
    // amplitudes k^-slope per octave, focus octave emphasized
    vec2 v = vec2(0.0);
    float freq = 2.0, amp = 1.0;
    for(int o = 0; o < 12; o++){
      if(o >= octs) break;
      float e = 0.02 / freq;
      uint oc = uint(o * 101 + 17);
      float n1 = vnoise_cascade((trail + vec2(0.0, e)) * freq, oc);
      float n2 = vnoise_cascade((trail - vec2(0.0, e)) * freq, oc);
      float n3 = vnoise_cascade((trail + vec2(e, 0.0)) * freq, oc);
      float n4 = vnoise_cascade((trail - vec2(e, 0.0)) * freq, oc);
      float boost = (o == focus) ? 2.2 : 1.0;
      v += amp * boost * vec2(n1 - n2, n4 - n3) / (2.0 * e);
      h += amp * boost * (n1 + n2 + n3 + n4) * 0.25;
      freq *= 2.0;
      amp  *= pow(0.5, 1.0 - slope) * 0.62;
    }
    trail += normalize(v + vec2(1.0e-6)) * dt * P[2] * gate;
  }

  pt = hashu(pt);
  float along = u2f(pt);
  vec2 seat = mix(p, trail, along);
  float z = (rnd.y - 0.5) * P[5] * (0.4 + 0.6 * gate);
  float lv = float(focus) / max(float(octs - 1), 1.0);
  col = pal(0.08 + 0.5 * lv + 0.12 * h,
            vec3(0.5, 0.42, 0.36), vec3(0.5, 0.4, 0.35),
            vec3(1.0, 0.85, 0.6), vec3(0.0, 0.2, 0.5))
        * (0.35 + 1.3 * gate * (0.5 + P[6]));
  return vec3(seat.x, seat.y, z);
}`
});
