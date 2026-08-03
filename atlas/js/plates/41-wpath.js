"use strict";
Atlas.registerPlate({
  id: "wpath",
  name: "Monsters of Analysis",
  roman: "XLI",
  accent: "#d8c8a8",
  tex: "W(x)=\\sum_{n=0}^{N}a^{n}\\cos(b^{n}\\pi x)\\quad T(x)=\\sum 2^{-n}\\,\\mathrm{dist}(2^{n}x,\\mathbb{Z})\\quad R(x)=\\sum\\frac{\\sin(\\pi n^{2}x)}{\\pi n^{2}}",
  plain: "W = Σ aⁿ cos(bⁿπx),  T = Σ 2⁻ⁿ dist(2ⁿx, ℤ),  R = Σ sin(πn²x)/πn²",
  caption: "In 1872 Weierstrass presented the Berlin Academy with a function continuous everywhere yet differentiable nowhere. Depth is truncation N: the back wall is one cosine; each slice forward adds a term, and roughness arrives scale by scale until the front face is the monster itself. Brightness is the graph's occupation measure: steep strokes spread their points thin and burn faintest. Colour tracks the newest term, the latest wrinkle aglow. Once ab > 1 the graph has box dimension 2 + log a/log b, steered by AMPLITUDE and FREQ; FUNCTION swaps in Takagi's blancmange (1901) or Riemann's sum sin(πn²x)/πn², differentiable, Gerver proved, exactly at rationals with odd numerator and denominator; ZOOM descends into self-affine detail.",
  cam: { dist: 3.4, pitch: 0.35, tgtY: 0.0, rot: 0.03 },
  gain: 0.95,
  params: [
    { label: "FUNCTION",  min: 0,    max: 2,    step: 1,     def: 0    },
    { label: "TERMS",     min: 1,    max: 24,   step: 1,     def: 18   },
    { label: "AMPLITUDE", min: 0.3,  max: 0.95, step: 0.01,  def: 0.5  },
    { label: "FREQ",      min: 2,    max: 9,    step: 1,     def: 7    },
    { label: "ZOOM",      min: 0,    max: 2.5,  step: 0.01,  def: 0    },
    { label: "CENTER X",  min: -1,   max: 1,    step: 0.001, def: 0    },
    { label: "HEIGHT",    min: 0.2,  max: 1.8,  step: 0.01,  def: 1.0  },
    { label: "GLOW",      min: 0,    max: 1,    step: 0.01,  def: 0.6  }
  ],
  glsl: `
vec3 shape_wpath(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int fsel = int(P[0] + 0.5);          /* 0 Weierstrass, 1 Takagi, 2 Riemann */
  float a = P[2];
  float b = P[3];                       /* integer-valued frequency lever */
  float halfw = pow(10.0, -P[4]);       /* sample window half-width 10^-ZOOM */
  float x = P[5] + 0.05*halfw*sin(0.16*uT)   /* gentle pan, scaled to window */
          + (q.x - 0.5)*2.0*halfw;
  float nf = 1.0 + q.y*(P[1] - 1.0);    /* fractional truncation N, depth axis */

  /* Phase kept in TURNS: t_0 = frac(x/2) (full-precision x, then halved),
     t_{n+1} = frac(b t_n) with integer b, so cos(b^n pi x) = cos(TAU t_n)
     and b^n itself is never formed. Takagi runs the same recurrence with
     b = 2 and t_0 = frac(x), where dist(2^n x, Z) = min(t_n, 1 - t_n). */
  float t   = (fsel == 1) ? fract(x) : fract(0.5*x);
  float bb  = (fsel == 1) ? 2.0 : b;
  float amp = 1.0;                      /* a^n, resp. 2^-n */
  float s   = 0.0;                      /* the partial sum f_N(x) */
  float mc  = 0.0;                      /* running mean, recenters Takagi */
  float g   = 0.0;                      /* |newest term| / its envelope */
  for(int i = 0; i < 24; i++){
    float w = clamp(nf - float(i), 0.0, 1.0);   /* newest term fades in */
    if(w <= 0.0) break;
    float term; float rel;
    if(fsel == 0){
      float c = cos(TAU*t);             /* = cos(b^n pi x) */
      term = amp*c;   rel = abs(c);
    } else if(fsel == 1){
      float dz = min(t, 1.0 - t);       /* dist(2^n x, Z), t already in turns */
      term = amp*dz;  rel = 2.0*dz;
      mc += 0.25*amp*w;                 /* mean of this term over a period */
    } else {
      float m = float(i + 1);
      float sn = sin(PI*m*m*x);         /* direct: |arg| < 3.8e3 for n <= 24 */
      term = sn/(PI*m*m);  rel = abs(sn);
    }
    s += w*term;
    g  = mix(g, rel, w);
    amp *= (fsel == 1) ? 0.5 : a;
    t = fract(bb*t);                    /* integer-b phase advance in turns */
  }
  /* per-function vertical normalizer: sum a^n <= 1/(1-a); max T = 2/3;
     |R| <= pi/6 */
  float vsc = (fsel == 0) ? (1.0 - a) : ((fsel == 1) ? 1.4 : 1.8);
  vec3 p = vec3((q.x - 0.5)*2.6, P[6]*vsc*(s - mc), (q.y - 0.5)*1.6);
  col = pal(0.55 - 0.45*g + 0.05*q.y,
            vec3(0.50, 0.45, 0.38), vec3(0.42, 0.36, 0.28),
            vec3(1.0, 1.0, 1.0), vec3(0.00, 0.06, 0.18));
  col *= 0.30 + 0.25*g + P[7]*(0.30 + 1.05*g);
  return p;
}`
});
