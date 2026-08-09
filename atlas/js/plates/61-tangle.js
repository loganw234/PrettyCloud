"use strict";
Atlas.registerPlate({
  id: "tangle",
  name: "The Vortex Tangle",
  roman: "LXI",
  accent: "#8fe08f",
  tex: "\\oint \\mathbf{v}\\cdot d\\boldsymbol{\\ell} = \\frac{h}{m}\\,n,\\quad n\\in\\mathbb{Z}",
  plain: "∮ v · dℓ = (h/m) n,  n ∈ ℤ   (quantized circulation)",
  caption: "Below two kelvin, helium stops negotiating: circulation comes only in whole units of h over m, so its turbulence is not a smear of eddies but a literal tangle of discrete vortex lines, each a filament thinner than an atom carrying exactly one quantum of swirl. This plate winds that tangle - every filament a closed loop drawn from its own addressed harmonics, crowding and threading its neighbours, the small loops shed by reconnections outnumbering the large by the tangle's own power law. Fifth of the Mk2 series: the only turbulence whose structure is countable, filament by filament, at any depth the frame can hold.",
  cam: { dist: 3.0, pitch: 0.35, tgtY: 0.0, rot: 0.06 },
  gain: 0.55,
  params: [
    { label: "FILAMENTS",  min: 40,  max: 2000, step: 10,   def: 700  },
    { label: "SIZE LAW",   min: 0.8, max: 2.6,  step: 0.02, def: 1.7  },
    { label: "HARMONICS",  min: 2,   max: 6,    step: 1,    def: 4    },
    { label: "WRITHE",     min: 0,   max: 1,    step: 0.01, def: 0.55 },
    { label: "TANGLE R",   min: 0.4, max: 1.4,  step: 0.01, def: 0.95 },
    { label: "CORE GLOW",  min: 0,   max: 1,    step: 0.01, def: 0.6  },
    { label: "FLATTEN",    min: 0,   max: 1,    step: 0.01, def: 0.25 }
  ],
  glsl: `
vec3 shape_tangle(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // One point, one filament, one seat along it. Loop sizes follow a
  // power law drawn per filament, so the zoom's window always holds
  // loops at its own scale; each loop is a closed Fourier curve
  // whose coefficients hash from the filament's address alone.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 522882781u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  int nf = int(P[0] + 0.5);
  pt = hashu(pt);
  int fid = int(u2f(pt) * float(nf));
  uint fa = hashu(uint(fid) * 2654435761u ^ 40503u);

  // size: power-law between scales, small loops plentiful
  float su = u2f(fa);
  float size = 0.02 + 0.9 * pow(su, P[1]);

  // center inside the tangle ball
  uint ca = hashu(fa ^ 7919u);
  vec3 ctr = (vec3(u2f(ca), u2f(hashu(ca)), u2f(hashu(hashu(ca))))
              - 0.5) * 2.0 * P[4];
  ctr.z *= (1.0 - P[7] * 0.8);

  // the loop: base circle in an addressed plane plus harmonics
  pt = hashu(pt);
  float th = TAU * u2f(pt);
  uint pa = hashu(fa ^ 104729u);
  float a1 = TAU * u2f(pa), a2 = TAU * u2f(hashu(pa));
  vec3 e1 = vec3(cos(a1) * cos(a2), sin(a1) * cos(a2), sin(a2));
  vec3 e2 = normalize(cross(e1, vec3(0.31, 0.71, 0.63)));
  vec3 e3 = cross(e1, e2);
  vec3 p3 = ctr + size * (cos(th) * e2 + sin(th) * e3);
  int nh = int(P[2] + 0.5);
  uint ha = hashu(fa ^ 15485863u);
  float amp = size * 0.45 * P[3];
  for(int k = 2; k < 8; k++){
    if(k >= nh + 2) break;
    ha = hashu(ha);
    float ph = TAU * u2f(ha);
    ha = hashu(ha);
    float wk = amp * (u2f(ha) - 0.3) / float(k * k);
    p3 += wk * (cos(float(k) * th + ph) * e1
              + sin(float(k) * th + ph) * e2);
  }
  p3.z *= (1.0 - P[7] * 0.8);

  // the quantized core: light hugs the line, a breath of halo out
  float rr = pow(abs(2.0 * rnd.z - 1.0), 2.4) * size * 0.06;
  uint na = hashu(pt ^ 32452843u);
  float ra = TAU * u2f(na);
  p3 += rr * (cos(ra) * e1 + sin(ra) * e2);

  float sz = 1.0 - su;
  col = pal(0.30 + 0.35 * su,
            vec3(0.42, 0.5, 0.44), vec3(0.4, 0.5, 0.42),
            vec3(0.85, 1.0, 0.9), vec3(0.2, 0.45, 0.6))
        * (0.4 + 1.6 * sz * sz * (0.5 + P[5]));
  return p3;
}`
});
