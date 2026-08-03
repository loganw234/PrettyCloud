"use strict";
Atlas.registerPlate({
  id: "lyap",
  name: "Lyapunov's Garden",
  roman: "XXXV",
  accent: "#c0e068",
  tex: "x_{n+1}=r_n x_n(1-x_n),\\quad r_n\\in\\{a,b\\},\\qquad \\lambda=\\tfrac1N\\sum_{n}\\ln|r_n(1-2x_n)|",
  plain: "xₙ₊₁ = rₙxₙ(1−xₙ),  rₙ ∈ {a,b},   λ = ⟨ ln|rₙ(1−2xₙ)| ⟩",
  caption: "Drive the logistic map with two growth rates a and b taken in turns, the rhythm set by SEQUENCE. At each point (a, b) the Lyapunov exponent λ averages ln|rₙ(1−2xₙ)| over STEPS iterations: where alternation tames the map, λ < 0, and the swallow-shaped bays of stability rise as gold hills of height −λ, scaled by HEIGHT; the chaotic sea lies low, blue and dim. Every point is one uniform sample of the parameter square: density adds no structure here; the sculpture is the graph of λ. Along the diagonal a = b runs the cascade of Plate XIX. Markus charted these in 1989; Dewdney's 1991 column made them famous.",
  cam: { dist: 3.4, pitch: 0.55, tgtY: 0.25, rot: 0.03 },
  gain: 0.9,
  params: [
    { label: "SEQUENCE", min: 0,   max: 5,   step: 1,     def: 0    },
    { label: "STEPS",    min: 60,  max: 384, step: 1,     def: 250  },
    { label: "HEIGHT",   min: 0,   max: 1.5, step: 0.01,  def: 1.0  },
    { label: "A MIN",    min: 2.4, max: 3.2, step: 0.001, def: 2.4  },
    { label: "WINDOW",   min: 0.4, max: 1.6, step: 0.001, def: 1.6  },
    { label: "TINT",     min: 0,   max: 1,   step: 0.01,  def: 0.5  },
    { label: "GLOW",     min: 0,   max: 1,   step: 0.01,  def: 0.6  }
  ],
  glsl: `
vec3 shape_lyap(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int sq = int(P[0] + 0.5);
  /* forcing period: AB | AAB ABB | AABB AAAB ABBB */
  int per;
  if(sq == 0) per = 2; else if(sq <= 2) per = 3; else per = 4;
  /* (a,b) window: A MIN pans, WINDOW zooms; clamp so the map stays in [0,1] */
  float aLo  = P[3];
  float span = min(P[4], 4.0 - aLo);
  vec2 ab = vec2(aLo) + (q + (rnd.xy - 0.5)*0.0015) * span;
  float a = clamp(ab.x, 2.4, 4.0);
  float b = clamp(ab.y, 2.4, 4.0);

  float x = 0.25 + 0.5*rnd.z;
  float total = 40.0 + P[1];      /* 40 transient + STEPS charted */
  float lam = 0.0;
  float cnt = 0.0;
  for(int j = 0; j < 424; j++){
    if(float(j) >= total) break;
    int m = j - (j/per)*per;      /* step index mod period */
    bool useA;
    if(sq == 0)      useA = (m == 0);   /* AB   */
    else if(sq == 1) useA = (m < 2);    /* AAB  */
    else if(sq == 2) useA = (m == 0);   /* ABB  */
    else if(sq == 3) useA = (m < 2);    /* AABB */
    else if(sq == 4) useA = (m < 3);    /* AAAB */
    else             useA = (m == 0);   /* ABBB */
    float r = useA ? a : b;
    if(j >= 40){
      lam += log(max(abs(r*(1.0 - 2.0*x)), 1.0e-12));
      cnt += 1.0;
    }
    x = r*x*(1.0 - x);
    x = clamp(x, 1.0e-6, 1.0 - 1.0e-6);
  }
  lam = clamp(lam/max(cnt, 1.0), -4.0, 4.0);

  float u = (a - aLo)/max(span, 1.0e-6);
  float v = (b - aLo)/max(span, 1.0e-6);
  float relief = clamp(-lam, -1.0, 2.5);
  vec3 p = vec3((u - 0.5)*2.4, relief*P[2]*0.4, (v - 0.5)*2.4);

  /* stable bays: warm gold-green graded by -lambda; chaotic sea: cold dim blue */
  float s = 1.0 - smoothstep(-0.06, 0.06, lam);
  float t = clamp(-lam*0.4, 0.0, 1.0);
  vec3 warm = pal(0.15 + 0.35*t + 0.3*(P[5] - 0.5),
                  vec3(0.46, 0.50, 0.16), vec3(0.36, 0.42, 0.12),
                  vec3(1.0, 1.0, 1.0), vec3(0.54, 0.50, 0.0));
  warm *= 0.55 + 0.75*t;
  vec3 cold = vec3(0.09, 0.14, 0.30)*(1.0 - 0.4*clamp(lam*0.8, 0.0, 1.0));
  col = mix(cold, warm, s);
  col *= 0.4 + 0.9*P[6];
  return p;
}`
});
