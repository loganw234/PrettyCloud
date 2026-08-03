"use strict";
Atlas.registerPlate({
  id: "halo",
  name: "The Ice Halo",
  roman: "LI",
  accent: "#c9ecf5",
  tex: "D=i_1+i_2-A,\\quad r_1+r_2=A,\\qquad D_{\\min}=2\\arcsin\\!\\left(n\\sin\\tfrac{A}{2}\\right)-A",
  plain: "D = i₁ + i₂ − A,   r₁ + r₂ = A,   D_min = 2·arcsin(n·sin(A/2)) − A",
  caption: "Sunlight through hexagonal ice, one crystal at a time: refract in at one face, out at another, record where the ray lands on the sky. Nothing draws a ring. Deviation is stationary at its minimum: 21.84 degrees through the 60-degree FACE PAIR at n = 1.31, 45.7 through the 90-degree one, so exits crowd there, and brightness, the density of arrivals, ignites a halo. Nothing can deviate by less than that minimum, so the sky just inside the ring is swept empty. That is the darkening you actually see; total internal reflection closes the far end instead, cutting the outer skirt off near 43.5 degrees. DISPERSION puts red innermost, reversing the rainbow's order. ORIENTATION sets the form: tumbling crystals give circles, plates with small WOBBLE give sundogs at SUN ALT, columns give tangent arcs. GLOW sets the exposure.",
  cam: { dist: 2.7, pitch: 0.15, tgtY: 0.2, rot: 0.03 },
  gain: 0.95,
  params: [
    { label: "ORIENTATION", min: 0, max: 2,  step: 1,    def: 0   },
    { label: "FACE PAIR",   min: 0, max: 2,  step: 1,    def: 2   },
    { label: "WOBBLE",      min: 0, max: 15, step: 0.1,  def: 2   },
    { label: "SUN ALT",     min: 0, max: 40, step: 0.5,  def: 20  },
    { label: "DISPERSION",  min: 0, max: 4,  step: 0.01, def: 1   },
    { label: "GLOW",        min: 0, max: 1,  step: 0.01, def: 0.5 }
  ],
  glsl: `
/* compact spectral ramp, t = 0 (400 nm, violet) .. 1 (700 nm, red).
   Sums and products of smoothsteps only, so no channel can go negative. */
vec3 halo_spec(float t){
  t = clamp(t, 0.0, 1.0);
  float r = smoothstep(0.42, 0.64, t) + 0.26*(1.0 - smoothstep(0.0, 0.20, t));
  float g = smoothstep(0.12, 0.38, t)*(1.0 - smoothstep(0.62, 0.90, t));
  float b = 1.0 - smoothstep(0.24, 0.48, t);
  return vec3(r, g, b)*(0.60 + 0.40*smoothstep(0.0, 0.12, t));
}

/* refractive index of ice: Cauchy fit n = 1.3006667 + 2613.34/lam^2 through
   the anchors n(400) = 1.317 and n(700) = 1.306. DISPERSION scales the
   spread about 1.31; the clamp keeps n > 1 for every lever setting. */
float halo_ice(float lam, float dsp){
  float n = 1.3006667 + 2613.34/max(lam*lam, 1.0);
  return max(1.31 + (n - 1.31)*dsp, 1.02);
}

/* unit vector -> orthonormal pair spanning its perpendicular plane */
void halo_basis(vec3 nv, out vec3 a, out vec3 b){
  vec3 tv = (abs(nv.z) < 0.9) ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  a = normalize(cross(nv, tv) + vec3(1.0e-9));
  b = cross(nv, a);
}

/* one standard normal deviate, Box-Muller from two hashed uniforms */
float halo_gauss(uint hh){
  float u1 = max(u2f(hashu(hh)), 1.0e-7);
  float u2 = u2f(hashu(hh ^ 0x9e3779b9u));
  return sqrt(-2.0*log(u1))*cos(TAU*u2);
}

/* vector Snell. d = propagation direction, Nf = face normal in either sense
   (flipped internally so it opposes d), eta = n_from/n_to.
   ok = 0.0 signals total internal reflection: the ray never leaves this face. */
vec3 halo_snell(vec3 d, vec3 Nf, float eta, out float ok){
  vec3 N = (dot(Nf, d) > 0.0) ? -Nf : Nf;
  float c1 = -dot(N, d);
  float k  = 1.0 - eta*eta*(1.0 - c1*c1);
  ok = (k < 0.0) ? 0.0 : 1.0;
  float c2 = sqrt(max(k, 0.0));
  return eta*d + (eta*c1 - c2)*N;
}

vec3 shape_halo(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int omode  = int(P[0] + 0.5);        /* ORIENTATION */
  int fmode  = int(P[1] + 0.5);        /* FACE PAIR   */
  float wob  = P[2];                   /* WOBBLE, degrees */
  float alt  = radians(clamp(P[3], 0.0, 89.0));
  float dsp  = P[4];
  float glow = P[5];

  /* Sun frame: y is up, the sun sits toward -z at elevation SUN ALT. */
  vec3 sdir = vec3(0.0, sin(alt), -cos(alt));   /* observer -> sun */
  vec3 s    = -sdir;                            /* light propagation */

  uint h0 = hashu(seed ^ 0x5a10bcd1u);

  /* dim sun marker, scenery only: 1.5% of the points spread over a disc 1.2 deg
     across -- deliberately wider than the sun's true 0.53 so it stays faint */
  if(u2f(h0) < 0.015){
    vec3 ua; vec3 ub;
    halo_basis(sdir, ua, ub);
    float rr = radians(0.6)*sqrt(q.x);
    float ap = TAU*q.y;
    vec3 dsun = normalize(sdir + (ua*cos(ap) + ub*sin(ap))*tan(rr) + vec3(1.0e-9));
    col = vec3(0.022, 0.021, 0.017)*(0.5 + glow);
    return 1.3*dsun;
  }

  uint h1 = hashu(h0);
  uint h2 = hashu(h1);
  uint h3 = hashu(h2);
  uint h4 = hashu(h3);
  uint h5 = hashu(h4);
  uint h6 = hashu(h5);

  /* c-axis of the crystal (the prism axis) per ORIENTATION.
     0: uniform on the sphere x uniform roll = Haar measure on SO(3).
     1: plate, c vertical with a gaussian WOBBLE tilt.
     2: column, c horizontal at a random azimuth, same wobble. */
  vec3 cax;
  if(omode == 0){
    float z  = 2.0*u2f(h1) - 1.0;
    float az = TAU*u2f(h2);
    float rr = sqrt(max(1.0 - z*z, 0.0));
    cax = vec3(rr*cos(az), z, rr*sin(az));
  } else {
    vec3 base;
    if(omode == 1){
      base = vec3(0.0, 1.0, 0.0);
    } else {
      float ha = TAU*u2f(h3);
      base = vec3(cos(ha), 0.0, sin(ha));
    }
    vec3 wa; vec3 wb;
    halo_basis(base, wa, wb);
    float tl = clamp(radians(wob)*halo_gauss(h1 ^ 0x2545f491u), -0.6, 0.6);
    float wz = TAU*u2f(h2);
    cax = normalize(base*cos(tl) + (wa*cos(wz) + wb*sin(wz))*sin(tl) + vec3(1.0e-9));
  }

  /* Side (prism) faces are parallel to the c-axis: their normals lie in the
     perpendicular plane, 60 deg apart. Basal faces have normals +-c.
     Alternate side faces meet at apex angle A = 60; a side face and a basal
     face meet at A = 90. The roll psi comes from the stratified q.x, which
     is the coordinate the deviation folds along. */
  vec3 e1; vec3 e2;
  halo_basis(cax, e1, e2);
  float psi = TAU*q.x;
  vec3 f0 = e1*cos(psi) + e2*sin(psi);
  vec3 f2 = e1*cos(psi + 2.09439510) + e2*sin(psi + 2.09439510);

  int use90;
  if(fmode == 0){ use90 = 0; }
  else if(fmode == 1){ use90 = 1; }
  else { use90 = (u2f(h4) < 0.30) ? 1 : 0; }

  vec3 F1 = f0;
  vec3 F2 = f2;
  if(use90 == 1){ F2 = cax*((u2f(h5) < 0.5) ? 1.0 : -1.0); }
  /* entry/exit faces are not interchangeable for the 90 pair (basal-in and
     basal-out are different arcs), so swap them half the time */
  if(u2f(h6) < 0.5){ vec3 sw = F1; F1 = F2; F2 = sw; }

  /* Negating both normals names the diametrically opposite pair of faces on
     the same crystal, which is an equally valid pair; use it so that face 1
     always faces the sun. Both are outward normals throughout. */
  if(dot(s, F1) > 0.0){ F1 = -F1; F2 = -F2; }
  if(dot(s, F1) > -1.0e-4){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

  float lt  = q.y;                          /* 0 violet .. 1 red */
  float lam = mix(400.0, 700.0, lt);
  float n   = halo_ice(lam, dsp);

  float ok1; float ok2;
  vec3 t1 = halo_snell(s, F1, 1.0/n, ok1);  /* into the ice */
  if(ok1 < 0.5){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  /* the refracted ray must actually run toward face 2 */
  if(dot(t1, F2) <= 1.0e-4){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  vec3 t2 = halo_snell(t1, F2, n, ok2);     /* out again, or trapped */
  if(ok2 < 0.5){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

  /* the eye looks back along the outgoing ray; undeviated light returns the
     sun itself, and the halo is the pile-up at stationary deviation. The ring's
     inner edge is that minimum -- no ray reaches inside it. The TIR discards
     above trim the other end: for the 60 pair the deviation branch runs
     21.84 .. 43.46 deg, for the 90 pair 45.73 .. 57.80. */
  vec3 sky = -normalize(t2 + vec3(1.0e-9));

  float w = -dot(s, F1);                    /* projected area of the entry face */
  col = halo_spec(lt)*(0.35 + 0.85*glow)*(0.35 + 0.90*w);
  return 1.3*sky;
}`
});
