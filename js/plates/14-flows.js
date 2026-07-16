"use strict";
Atlas.registerPlate({
  id: "flows",
  name: "Strange Attractors of Flow",
  roman: "XIV",
  accent: "#7ad9c4",
  tex: "\\dot{\\mathbf{x}} = \\mathbf{f}(\\mathbf{x}),\\qquad \\text{Lorenz: }\\dot x=\\sigma(y-x),\\;\\dot y=x(\\rho-z)-y,\\;\\dot z=xy-\\beta z",
  plain: "ẋ = f(x)   (Lorenz: ẋ=σ(y−x), ẏ=x(ρ−z)−y, ż=xy−βz)",
  caption: "Continuous-time chaos. A cloud of initial conditions is integrated forward by Runge–Kutta; each forgets where it began and settles onto the attractor, so brightness is the SRB measure — the long-run fraction of time the flow spends in each region. One dial walks a whole zoo: Lorenz's butterfly, Rössler's scroll, the Aizawa torus-knot, Thomas's cyclic lattice, Halvorsen's braid, Chua's double scroll. Colour reads local speed; the bright cores are where the flow lingers.",
  cam: { dist: 3.4, pitch: 0.20, tgtY: 0.0, rot: 0.05 },
  gain: 0.55,
  params: [
    { label: "SYSTEM",   min: 0,     max: 5,    step: 1,     def: 0    },
    { label: "STEPS",    min: 40,    max: 380,  step: 1,     def: 170  },
    { label: "dt",       min: 0.002, max: 0.02, step: 0.0005,def: 0.008 },
    { label: "SPREAD",   min: 0,     max: 1,    step: 0.01,  def: 0.7  },
    { label: "PARAM",    min: 0,     max: 1,    step: 0.005, def: 0.5  },
    { label: "SPEED HUE",min: 0,     max: 3,    step: 0.01,  def: 1.0  }
  ],
  glsl: `
vec3 flows_deriv(int sys, vec3 s, float prm){
  float x = s.x, y = s.y, z = s.z;
  if(sys == 0){                       /* Lorenz */
    float rho = mix(20.0, 40.0, prm);
    return vec3(10.0*(y - x), x*(rho - z) - y, x*y - 2.6666667*z);
  } else if(sys == 1){                /* Rössler */
    float cc = mix(4.0, 9.0, prm);
    return vec3(-y - z, x + 0.2*y, 0.2 + z*(x - cc));
  } else if(sys == 2){                /* Aizawa */
    float a=0.95, b=0.7, c=0.6, d=3.5, e=0.25, f=0.1;
    return vec3((z - b)*x - d*y, d*x + (z - b)*y,
                c + a*z - z*z*z/3.0 - (x*x + y*y)*(1.0 + e*z) + f*z*x*x*x);
  } else if(sys == 3){                /* Thomas */
    float b = mix(0.10, 0.21, prm);
    return vec3(sin(y) - b*x, sin(z) - b*y, sin(x) - b*z);
  } else if(sys == 4){                /* Halvorsen */
    float a = mix(1.4, 1.9, prm);
    return vec3(-a*x - 4.0*y - 4.0*z - y*y,
                -a*y - 4.0*z - 4.0*x - z*z,
                -a*z - 4.0*x - 4.0*y - x*x);
  }                                   /* Chua double scroll */
  float m0 = -1.143, m1 = -0.714;
  float hx = m1*x + 0.5*(m0 - m1)*(abs(x + 1.0) - abs(x - 1.0));
  float alpha = mix(9.0, 16.0, prm);
  return vec3(alpha*(y - x - hx), x - y + z, -28.0*y);
}
vec3 shape_flows(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int sys = int(P[0] + 0.5);
  float dt = P[2], prm = P[4];
  float icS, outS; vec3 outC;
  if(sys == 0){ icS = 24.0; outS = 0.042; outC = vec3(0.0, 0.0, 25.0); }
  else if(sys == 1){ icS = 10.0; outS = 0.075; outC = vec3(0.0, 0.0, 3.0); }
  else if(sys == 2){ icS = 1.4;  outS = 0.90;  outC = vec3(0.0); }
  else if(sys == 3){ icS = 7.0;  outS = 0.28;  outC = vec3(0.0); }
  else if(sys == 4){ icS = 3.0;  outS = 0.13;  outC = vec3(0.0); }
  else { icS = 3.0; outS = 0.20; outC = vec3(0.0); }
  vec3 s = (vec3(rnd.x, rnd.y, rnd.z) - 0.5)*icS + outC*0.5;
  float steps = P[1]*(0.45 + 0.55*rnd.w*P[3]);  /* randomize total time */
  vec3 prev = s;
  for(int j = 0; j < 380; j++){
    if(float(j) >= steps) break;
    vec3 k1 = flows_deriv(sys, s, prm);
    vec3 k2 = flows_deriv(sys, s + 0.5*dt*k1, prm);
    vec3 k3 = flows_deriv(sys, s + 0.5*dt*k2, prm);
    vec3 k4 = flows_deriv(sys, s + dt*k3, prm);
    prev = s;
    s += dt/6.0*(k1 + 2.0*k2 + 2.0*k3 + k4);
    if(dot(s, s) > 1.0e6) break;      /* divergence guard */
  }
  if(any(isnan(s)) || any(isinf(s))){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  float sp = length(s - prev)/max(dt, 1.0e-4);
  vec3 p = (s - outC)*outS;
  p = vec3(p.x, p.z, p.y);            /* z upright for the camera */
  col = pal(clamp(sp*0.05*P[5], 0.0, 1.0)*0.8 + 0.05,
            vec3(0.42, 0.42, 0.55), vec3(0.40, 0.40, 0.45),
            vec3(1.0, 0.95, 0.85), vec3(0.55, 0.40, 0.20));
  return p;
}`
});
