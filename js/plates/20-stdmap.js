"use strict";
Atlas.registerPlate({
  id: "stdmap",
  name: "The Chirikov Standard Map",
  roman: "XX",
  accent: "#8fb8ff",
  tex: "p_{n+1}=p_n+\\tfrac{K}{2\\pi}\\sin 2\\pi\\theta_n,\\qquad \\theta_{n+1}=\\theta_n+p_{n+1}\\ (\\mathrm{mod}\\ 1)",
  plain: "pₙ₊₁ = pₙ + (K/2π) sin 2πθₙ,   θₙ₊₁ = θₙ + pₙ₊₁ (mod 1)",
  caption: "The simplest window into Hamiltonian chaos: a rotor given a periodic kick. At each kick strength K the phase plane divides itself, and the density does the sorting for free — regular orbits trace razor-thin invariant curves (the surviving KAM tori), while chaotic ones smear into a dim area-filling sea. As K climbs past 0.9716 the last golden torus breaks and the seas merge. A tangent vector carried along each orbit measures the finite-time Lyapunov exponent: cool where motion is ordered, hot where it is mixing.",
  cam: { dist: 3.2, pitch: 0.75, tgtY: 0.0, rot: 0.02 },
  gain: 0.7,
  params: [
    { label: "KICK K",     min: 0,   max: 6,   step: 0.005,def: 0.97 },
    { label: "ITERATIONS", min: 20,  max: 400, step: 1,    def: 220  },
    { label: "TORUS ↔ FLAT",min: 0,  max: 1,   step: 0.01, def: 0.0  },
    { label: "FTLE GAIN",  min: 0.2, max: 3,   step: 0.01, def: 1.0  },
    { label: "GLOW",       min: 0,   max: 1,   step: 0.01, def: 0.55 }
  ],
  glsl: `
vec3 shape_stdmap(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float K = P[0];
  int N = int(P[1]);
  float th = q.x, p = q.y;               /* low-discrepancy IC over phase space */
  vec2 dv = normalize(rnd.xy - 0.5 + vec2(1.0e-3, 7.0e-4));  /* tangent (dθ,dp) */
  float lyap = 0.0;
  for(int j = 0; j < 400; j++){
    if(j >= N) break;
    float c = K*cos(TAU*th);
    float ddp = dv.y + c*dv.x;            /* Jacobian action */
    float ddth = dv.x + ddp;
    dv = vec2(ddth, ddp);
    float nl = length(dv);
    lyap += log(nl + 1.0e-9);
    dv /= nl;
    p = fract(p + (K/TAU)*sin(TAU*th));   /* state update */
    th = fract(th + p);
  }
  float ftle = lyap/float(N);
  vec2 uv = vec2(th, p);
  vec3 flat3 = vec3((uv.x - 0.5)*2.4, (uv.y - 0.5)*2.4, 0.0);
  float a = TAU*uv.x, b = TAU*uv.y, R = 1.2, rr = 0.5;
  vec3 tor = vec3((R + rr*cos(b))*cos(a), rr*sin(b), (R + rr*cos(b))*sin(a));
  vec3 pp = mix(flat3, tor, clamp(P[2], 0.0, 1.0));
  col = mix(vec3(0.3, 0.6, 1.0), vec3(1.0, 0.5, 0.2), smoothstep(0.0, 0.6, ftle*P[3]));
  col *= 0.4 + 0.8*P[4];
  return pp;
}`
});
