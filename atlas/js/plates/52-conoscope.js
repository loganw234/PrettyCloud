"use strict";
Atlas.registerPlate({
  id: "conoscope",
  name: "Between Crossed Polarizers",
  roman: "LII",
  accent: "#ee9fd6",
  tex: "I=\\sin^{2}(2\\chi)\\,\\sin^{2}\\!\\Bigl(\\tfrac{\\Gamma}{2}\\Bigr),\\qquad \\Gamma=\\frac{2\\pi d}{\\lambda}\\bigl(n_e(\\theta)-n_o\\bigr),\\qquad \\frac{1}{n_e(\\theta)^{2}}=\\frac{\\cos^{2}\\theta}{n_o^{2}}+\\frac{\\sin^{2}\\theta}{n_e^{2}}",
  plain: "I = sin²(2χ)·sin²(Γ/2),   Γ = (2πd/λ)(nₑ(θ) − nₒ),   1/nₑ(θ)² = cos²θ/nₒ² + sin²θ/nₑ²",
  caption: "Converge polarized light through a crystal plate, cross the analyzer, and the back focal plane fills with a figure that belongs to directions rather than to points. Each point here is one viewing direction carrying one wavelength: the APERTURE cone is sampled direction by direction, and the colour at each is a Monte-Carlo average of sin²(2χ)·sin²(Γ/2) across the visible band. The black Maltese cross is extinction: vibrations aligned with the polarizers, dark whatever the retardation. The rings are loci of equal retardation, counted by THICKNESS, arriving already coloured in white light until MONO returns the sodium figure. TILT walks the melatope off centre; the biaxial CRYSTAL splits the axis in two and AXIAL ANGLE opens the cross into hyperbolic brushes.",
  cam: { dist: 2.8, pitch: 0.35, tgtY: 0.0, rot: 0.03 },
  gain: 1.0,
  params: [
    { label: "CRYSTAL",     min: 0,  max: 2,   step: 1,    def: 0   },
    { label: "THICKNESS",   min: 10, max: 800, step: 5,    def: 55  },
    { label: "TILT",        min: 0,  max: 40,  step: 0.5,  def: 0   },
    { label: "APERTURE",    min: 20, max: 60,  step: 1,    def: 40  },
    { label: "AXIAL ANGLE", min: 0,  max: 90,  step: 1,    def: 40  },
    { label: "MONO",        min: 0,  max: 1,   step: 1,    def: 0   },
    { label: "GLOW",        min: 0,  max: 1,   step: 0.01, def: 0.5 }
  ],
  glsl: `
/* spectral colour, t = 0 at 400 nm .. 1 at 700 nm. Every channel is a sum
   of products of smoothsteps, so it can never go negative; t = 0.63 (the
   589 nm sodium line) lands on a yellow with no blue, as it should. */
vec3 conoscope_spec(float t){
  t = clamp(t, 0.0, 1.0);
  float r = smoothstep(0.42, 0.66, t) + 0.28*(1.0 - smoothstep(0.0, 0.18, t));
  float g = smoothstep(0.12, 0.40, t)*(1.0 - smoothstep(0.58, 0.86, t));
  float b = 1.0 - smoothstep(0.24, 0.52, t);
  return vec3(r, g, b)*(0.60 + 0.40*smoothstep(0.0, 0.12, t));
}

/* rotate a crystal axis about the polarizer direction (lab x) by TILT */
vec3 conoscope_tilt(vec3 a, float c, float s){
  return vec3(a.x, a.y*c - a.z*s, a.y*s + a.z*c);
}

/* Azimuth, in the transverse frame (u1,u2), of the plane containing the
   ray v and the optic axis A. u1 is the polarizer carried out to v, so
   this angle IS chi. At the melatope (v parallel to A) the plane is
   undefined -- but the retardation vanishes there too, so 0 is harmless. */
float conoscope_az(vec3 A, vec3 v, vec3 u1, vec3 u2){
  vec3 e = A - dot(A, v)*v;
  float ex = dot(e, u1);
  float ey = dot(e, u2);
  if(ex*ex + ey*ey < 1.0e-12) return 0.0;
  return atan(ey, ex);
}

/* Uniaxial retardation. ca = cos(theta) to the optic axis; d and lam in
   micrometres. Thin-plate approximation: the obliquity factor 1/cos of
   the path through the plate is dropped, which is standard at conoscopic
   angles. Note n_e(0) = n_o exactly, so the melatope is dark. */
float conoscope_gam(float ca, float nOrd, float nExt, float d, float lam){
  float c2 = clamp(ca*ca, 0.0, 1.0);
  float inv = c2/(nOrd*nOrd) + (1.0 - c2)/(nExt*nExt);
  float ne = 1.0/sqrt(max(inv, 1.0e-9));
  return TAU*d*(ne - nOrd)/max(lam, 1.0e-4);
}

vec3 shape_conoscope(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int   cry  = int(P[0] + 0.5);
  float d    = P[1];                 /* plate thickness, micrometres */
  float tlt  = radians(P[2]);
  float apr  = radians(max(P[3], 1.0));
  float hv   = radians(P[4]*0.5);    /* half the axial angle 2V */
  int   mono = int(P[5] + 0.5);
  float glow = P[6];

  /* one viewing direction: uniform on the disk the aperture cone projects
     to, so equal solid-angle-ish weight across the figure */
  float r   = sqrt(clamp(q.x, 0.0, 1.0));
  float ph  = TAU*q.y;
  float th  = r*apr;
  float sth = sin(th), cth = cos(th);
  float cph = cos(ph), sph = sin(ph);
  vec3 v = vec3(sth*cph, sth*sph, cth);

  float lamNm = (mono == 1) ? 589.0 : mix(400.0, 700.0, rnd.x);
  float lam = lamNm*0.001;                  /* micrometres */
  float lt  = (lamNm - 400.0)/300.0;

  /* Transverse frame at v. The polarizer is NOT merely projected across v:
     the condenser bends each ray inside its own meridian, which parallel-
     transports lab x from the axis out to v -- a rotation about the
     azimuthal tangent, carrying the radial tangent to the meridian tangent
     and fixing the azimuthal one. Transport preserves the angle to the
     meridian, which is exactly what makes chi = phi for the untilted
     figure and keeps all four arms of the cross the same width; bare
     projection skews them by a factor cos(theta). Orthonormal by
     construction, so there is nothing here to normalize or guard. */
  vec3 eth = vec3(cth*cph, cth*sph, -sth);   /* meridian tangent  */
  vec3 eph = vec3(-sph,    cph,      0.0);   /* azimuthal tangent */
  vec3 u1 = cph*eth - sph*eph;               /* polarizer, transported */
  vec3 u2 = sph*eth + cph*eph;               /* analyzer,  transported */

  float ctl = cos(tlt), stl = sin(tlt);
  float gam;
  float chi;

  if(cry == 2){
    /* Biaxial, Biot-Fresnel approximation: two optic axes split by 2V, put
       in the 45-degree plane so the brushes open the classical way.
       Gamma proportional to sin(theta1) sin(theta2); 0.12 is a strong
       biaxial birefringence, aragonite territory (0.155) rather than the
       0.01-0.05 of most rock-formers, picked so the brushes carry a few
       rings at the same THICKNESS that suits calcite. */
    float sv = sin(hv), cv = cos(hv);
    float c45 = 0.70710678;
    vec3 A1 = conoscope_tilt(vec3( sv*c45,  sv*c45, cv), ctl, stl);
    vec3 A2 = conoscope_tilt(vec3(-sv*c45, -sv*c45, cv), ctl, stl);
    float d1 = dot(A1, v), d2 = dot(A2, v);
    float s1 = sqrt(max(1.0 - d1*d1, 0.0));
    float s2 = sqrt(max(1.0 - d2*d2, 0.0));
    gam = TAU*d*0.12*s1*s2/max(lam, 1.0e-4);
    /* Biot-Fresnel: the vibration directions bisect the two axial planes.
       Each azimuth is only defined mod PI, which shifts chi by PI/2 and
       leaves sin^2(2 chi) unchanged, so the bare mean is safe. */
    chi = 0.5*(conoscope_az(A1, v, u1, u2) + conoscope_az(A2, v, u1, u2));
  } else {
    /* 0 = calcite (negative uniaxial), 1 = quartz (positive, and so weakly
       birefringent that it needs a far thicker plate for the same rings) */
    float nOrd = (cry == 1) ? 1.544 : 1.658;
    float nExt = (cry == 1) ? 1.553 : 1.486;
    vec3 A = conoscope_tilt(vec3(0.0, 0.0, 1.0), ctl, stl);
    gam = conoscope_gam(dot(A, v), nOrd, nExt, d, lam);
    chi = conoscope_az(A, v, u1, u2);   /* radial fast axis: chi = azimuth */
  }

  /* crossed polarizers. Ring count at the rim, calcite at the default
     THICKNESS and APERTURE, counted in sodium light: n_e(40 deg) = 1.5800,
     so Gamma/2pi = 55*0.0780/0.589 = 7.3 rings. */
  float sc = sin(2.0*chi);
  float sg = sin(0.5*gam);
  float I = sc*sc*sg*sg;

  float vig = 1.0 - smoothstep(0.86, 1.0, r);

  /* the back focal plane made object: a gentle spherical cap, centred so
     the dish straddles y = 0 (cos 0.78 = 0.710914) */
  float psi = r*0.78;
  float R = 1.35;
  vec3 world = vec3(R*sin(psi)*cph,
                    R*cos(psi) - R*0.5*(1.0 + 0.710914),
                    R*sin(psi)*sph);

  col = conoscope_spec(lt)*(I*vig*(0.55 + 1.15*glow));
  return world;
}`
});
