"use strict";
Atlas.registerPlate({
  id: "relativity",
  name: "The Photon Sphere",
  roman: "XXXVII",
  accent: "#ff9a70",
  tex: "\\frac{d^{2}u}{d\\varphi^{2}} = -u + 3u^{2},\\qquad u=\\frac{GM}{c^{2}r},\\qquad b_{c}=3\\sqrt{3}\\,\\frac{GM}{c^{2}}",
  plain: "d²u/dφ² = −u + 3u²,   u = GM/(c²r),   b_c = 3√3 GM/c²",
  caption: "Parallel light falls past a black hole, each ray integrating the exact null geodesic equation. Distant rays bend by Einstein's 4GM/c²b — the 1.75 arcseconds Eddington measured at the solar limb in 1919. Approaching the critical impact parameter b_c = 3√3 GM/c², they wind ever longer around the unstable circular orbit at r = 3GM/c², then escape pale gold or plunge ember red. Each point is one instant of one ray, laid down uniformly in orbital angle, so brightness measures the winding angle light spends at each radius: the photon sphere ignites by density alone. PLANE 3D fans the orbit planes into the shell whose apparent diameter, 2√27 GM/c², the Event Horizon Telescope resolved around M87*.",
  cam: { dist: 3.2, pitch: 0.35, tgtY: 0.0, rot: 0.04 },
  gain: 0.9,
  params: [
    { label: "BEAM CENTER", min: 1,    max: 8,    step: 0.01,  def: 4.75  },
    { label: "BEAM WIDTH",  min: 0.05, max: 5,    step: 0.01,  def: 4.25  },
    { label: "STEPS",       min: 60,   max: 360,  step: 1,     def: 220   },
    { label: "PLANE 3D",    min: 0,    max: 1,    step: 0.01,  def: 0.15  },
    { label: "SCALE",       min: 0.02, max: 0.09, step: 0.001, def: 0.045 },
    { label: "GLOW",        min: 0,    max: 1,    step: 0.01,  def: 0.5   }
  ],
  glsl: `
float relativity_acc(float u){ return 3.0*u*u - u; }   /* u'' in GM=c=1 units */
vec3 shape_relativity(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  /* Schwarzschild null geodesic: horizon r=2, photon sphere r=3,
     critical impact parameter b_c = 3*sqrt(3) ~ 5.196.  Each point is
     one RK4 step count along one ray of a parallel beam. */
  float b = P[0] + (q.x*2.0 - 1.0)*P[1];      /* impact parameter across the beam */
  b = max(b, 0.05);
  float u = 1.0/30.0;                          /* straight-line approach at r0 = 30 */
  float phi = asin(clamp(b*u, -1.0, 1.0));
  float w = cos(phi)/b;                        /* du/dphi */
  int k = int(q.y*P[2]);                       /* emit at a uniform step along the ray */
  float dphi = 0.03;
  bool dead = false;
  for(int j = 0; j < 360; j++){
    if(j >= k) break;
    float k1u = w;                  float k1w = relativity_acc(u);
    float au = u + 0.5*dphi*k1u;    float aw = w + 0.5*dphi*k1w;
    float k2u = aw;                 float k2w = relativity_acc(au);
    float bu = u + 0.5*dphi*k2u;    float bw = w + 0.5*dphi*k2w;
    float k3u = bw;                 float k3w = relativity_acc(bu);
    float cu = u + dphi*k3u;        float cw = w + dphi*k3w;
    float k4u = cw;                 float k4w = relativity_acc(cu);
    u   += dphi/6.0*(k1u + 2.0*k2u + 2.0*k3u + k4u);
    w   += dphi/6.0*(k1w + 2.0*k2w + 2.0*k3w + k4w);
    phi += dphi;
    if(u > 0.47){ dead = true; break; }                  /* about to cross the horizon */
    if(w < 0.0 && u < 0.0285714){ dead = true; break; }  /* r > 35 past perihelion: escaped */
  }
  if(dead){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  float r = 1.0/max(u, 1.0e-4);
  vec2 pl = vec2(cos(phi), sin(phi))*(r*P[4]);
  float psi = (rnd.z - 0.5)*TAU*P[3];          /* orbit-plane tilt about the beam axis */
  vec3 p = vec3(pl.x, pl.y*cos(psi), pl.y*sin(psi));
  float t = clamp((b - 5.1961524)*0.30, -1.0, 1.0)*0.5 + 0.5;
  col = pal(t, vec3(0.95, 0.575, 0.35), vec3(0.10, 0.275, 0.20),
            vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5));
  col *= (0.35 + 0.85*P[5]) * (0.86 + 0.14*sin(5.0*phi - 2.5*uT));
  return p;
}`
});
