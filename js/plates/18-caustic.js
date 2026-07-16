"use strict";
Atlas.registerPlate({
  id: "caustic",
  name: "Caustics",
  roman: "XVIII",
  accent: "#ffe08a",
  tex: "\\text{envelope of }\\{L_s\\}:\\quad F(x,y,s)=0,\\;\\partial_s F=0",
  plain: "envelope of a family of rays: F(x,y,s)=0, ∂F/∂s=0",
  caption: "The bright cusp of light in the bottom of a coffee cup. Nowhere is any single ray special — but where a whole family of rays crowds together, the light piles up, and the envelope ignites on its own. Nothing here computes the caustic curve; each point is just one spot on one ray, and the caustic emerges purely as the density where neighbouring rays overlap. This is the plate's whole thesis in its purest form: brightness is measure. Reflect off a circle for the nephroid and cardioid, slide a ladder for the astroid, draw chords for the rest.",
  cam: { dist: 3.0, pitch: 0.55, tgtY: 0.0, rot: 0.02 },
  gain: 0.8,
  params: [
    { label: "FAMILY",   min: 0, max: 2,   step: 1,    def: 0   },
    { label: "SOURCE",   min: 0, max: 1,   step: 0.01, def: 0.0 },
    { label: "RAY LENGTH",min: 0.3,max: 2.6,step: 0.01,def: 1.6 },
    { label: "SCALE",    min: 0.5,max: 1.6, step: 0.01, def: 1.0 },
    { label: "GLOW",     min: 0, max: 1,   step: 0.01, def: 0.4 }
  ],
  glsl: `
vec3 shape_caustic(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int fam = int(P[0] + 0.5);
  float src = P[1];
  vec2 pos;
  if(fam == 0){                          /* reflection off a circular mirror */
    float theta = mix(0.5, 2.5, q.y)*PI;
    vec2 A = vec2(cos(theta), sin(theta));
    vec2 dpar = vec2(-1.0, 0.0);
    vec2 Src = vec2(-1.0, 0.0);
    vec2 dpt = normalize(A - Src + 1.0e-4);
    vec2 din = normalize(mix(dpar, dpt, src));
    vec2 n = -A;                          /* interior normal */
    vec2 refl = din - 2.0*dot(din, n)*n;
    pos = A + refl*(q.x*P[2]);
  } else if(fam == 1){                    /* trammel of Archimedes -> astroid */
    float b = q.y*PI*0.5 + 0.002;
    pos = mix(vec2(cos(b), 0.0), vec2(0.0, sin(b)), q.x);
  } else {                                /* chords -> cardioid / nephroid */
    float a = q.y*TAU;
    float mf = mix(2.0, 3.0, src);
    pos = mix(vec2(cos(a), sin(a)), vec2(cos(mf*a), sin(mf*a)), q.x);
  }
  vec3 p = vec3(pos.x, pos.y, 0.0)*P[3];
  col = pal(q.y*0.6 + 0.08, vec3(0.5, 0.46, 0.4), vec3(0.5, 0.45, 0.42),
            vec3(1.0, 0.96, 0.85), vec3(0.05, 0.2, 0.42));
  col *= 0.3 + 0.5*P[4];
  return p;
}`
});
