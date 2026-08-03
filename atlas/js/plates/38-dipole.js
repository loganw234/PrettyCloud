"use strict";
Atlas.registerPlate({
  id: "dipole",
  name: "How Light Leaves an Antenna",
  roman: "XXXVIII",
  accent: "#90c8ff",
  tex: "F(\\rho,\\theta)=\\sin^{2}\\!\\theta\\,\\Bigl(\\frac{\\cos(\\rho-t)}{\\rho}+\\sin(\\rho-t)\\Bigr)=c",
  plain: "F(ρ,θ) = sin²θ · (cos(ρ−t)/ρ + sin(ρ−t)) = c",
  caption: "Hertz drew these detaching loops in 1889. In a meridian plane the field lines of an oscillating dipole are level curves of a single flux function. Each point is sampled uniformly in radius and angle across an annulus and Newton-slid along the gradient onto one of CONTOURS hashed levels, so a line's brightness estimates the area draining onto it; where the gradient nearly vanishes, whole swaths land on one line and the pinch-off lights up by itself. Every half-cycle the quasi-static near-field loops pinch, detach, and sail outward at WAVE SPEED as the 1/r far field, dark along the dipole axis. SPREAD 3D revolves the plane into nested shells. The detachment is the radiation.",
  cam: { dist: 3.3, pitch: 0.15, tgtY: 0.0, rot: 0.05 },
  gain: 0.9,
  params: [
    { label: "RANGE",        min: 4,  max: 14, step: 0.1,  def: 9   },
    { label: "CONTOURS",     min: 4,  max: 24, step: 1,    def: 12  },
    { label: "NEWTON STEPS", min: 1,  max: 4,  step: 1,    def: 3   },
    { label: "SPREAD 3D",    min: 0,  max: 1,  step: 0.01, def: 1.0 },
    { label: "WAVE SPEED",   min: 0,  max: 3,  step: 0.01, def: 1.2 },
    { label: "GLOW",         min: 0,  max: 1,  step: 0.01, def: 0.5 }
  ],
  glsl: `
/* Exact flux function of the oscillating (Hertzian) dipole and its
   gradient, in dimensionless rho = kr, tau = rho - t.  Returns
   vec3(F, dF/drho, dF/dtheta).  Caller guarantees rho >= 0.35. */
vec3 dipole_Fg(float rho, float th, float t){
  float ta = rho - t;
  float sn = sin(th), cs = cos(th);
  float s2 = sn*sn;
  float ct = cos(ta), st = sin(ta);
  float ir = 1.0/rho;
  float base = ct*ir + st;
  return vec3(s2*base,
              s2*(-st*ir - ct*ir*ir + ct),
              2.0*sn*cs*base);
}
vec3 shape_dipole(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float rng = max(P[0], 2.0);
  float t   = uT * P[4];

  /* uniform sample of the meridian annulus */
  float rho = mix(0.6, rng, q.x);
  float th  = mix(0.05, PI - 0.05, q.y);
  if(abs(sin(th)) < 0.05){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

  /* hashed ladder of contour levels in [-0.9, 0.9]; c = 0 exactly is the
     degenerate axis/node set, so an exact-zero rung is nudged half a rung */
  float nC = max(floor(P[1] + 0.5), 1.0);
  float fj = min(floor(rnd.w * nC), nC - 1.0);
  float cj = -0.9 + 1.8*(fj + 0.5)/nC;
  if(abs(cj) < 1.0e-4) cj = 0.9/nC;

  /* Newton projection of the scalar constraint F = cj along grad F */
  vec3 fg = vec3(0.0);
  for(int it = 0; it < 4; it++){
    if(float(it) >= P[2]) break;
    fg = dipole_Fg(rho, th, t);
    float den = fg.y*fg.y + fg.z*fg.z + 1.0e-6;
    float stp = (fg.x - cj)/den;
    rho -= stp*fg.y;
    th  -= stp*fg.z;
    rho = clamp(rho, 0.35, rng + 0.8);
  }
  fg = dipole_Fg(rho, th, t);
  if(abs(fg.x - cj) > 0.02){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  float snth = sin(th);
  if(abs(snth) < 0.05){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  if(rho < 0.5 || rho > rng){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

  /* revolve about the dipole axis (world y); a hashed half-turn shows both
     sides of the meridian at SPREAD 3D = 0, and is measure-neutral at 1 */
  float az  = rnd.z * TAU * P[3];
  float mir = ((hashu(seed ^ 0x9E3779B9u) & 1u) == 0u) ? 1.0 : -1.0;
  float s   = 1.4/rng;
  float rs  = rho*snth*mir*s;
  vec3 world = vec3(rs*cos(az), rho*cos(th)*s, rs*sin(az));

  /* sign of the level in two complementary hues; |grad F| heats the
     near zone where the loops are being made */
  float gm   = length(fg.yz);
  float heat = 1.0 - exp(-0.8*gm);
  vec3 hue = (cj > 0.0) ? vec3(0.32, 0.58, 1.0) : vec3(1.0, 0.60, 0.30);
  col = hue * (0.55 + 0.75*heat);
  col = mix(col, vec3(1.0, 0.97, 0.90), 0.30*heat*heat);
  col *= 0.55 + 0.9*P[5];
  return world;
}`
});
