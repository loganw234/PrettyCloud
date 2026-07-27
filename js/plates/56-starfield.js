"use strict";
Atlas.registerPlate({
  id: "starfield",
  name: "The Sky at Nine-Tenths c",
  roman: "LVI",
  accent: "#8fa8ff",
  tex: "\\cos\\theta' = \\dfrac{\\cos\\theta+\\beta}{1+\\beta\\cos\\theta},\\qquad \\delta=\\gamma\\,(1+\\beta\\cos\\theta),\\qquad T'=\\delta\\,T,\\qquad I_{\\mathrm{bol}}\\propto\\delta^{4}",
  plain: "cos θ′ = (cos θ + β)/(1 + β cos θ),   δ = γ(1 + β cos θ),   T′ = δT,   I_bol ∝ δ⁴",
  caption: "Fly at SPEED = β and the sky folds forward: aberration, cos θ′ = (cos θ + β)/(1 + β cos θ), pulls half the celestial sphere into a cone of half-angle arccos β — 26 degrees at β = 0.9. GRID sends the rest-frame graticule through the same map, so the crowding becomes geometry. Each star is a blackbody, Doppler-shifted to δT with δ = γ(1 + β cos θ) and beamed, its bolometric intensity going as δ⁴ — which the accumulated brightness estimates, held by a soft knee. TEMP BIAS favours cool dwarfs; CMB adds the 2.725 K shell, the dipole your speedometer cannot hide.",
  cam: { dist: 0.5, pitch: 0.05, tgtY: 0.0, rot: 0.02 },
  gain: 0.95,
  params: [
    { label: "SPEED",      min: 0,    max: 0.99, step: 0.001, def: 0.9  },
    { label: "GRID",       min: 0,    max: 1,    step: 1,     def: 1    },
    { label: "CMB",        min: 0,    max: 1,    step: 1,     def: 1    },
    { label: "STAR COUNT", min: 1000, max: 8000, step: 100,   def: 4000 },
    { label: "TEMP BIAS",  min: 0,    max: 1,    step: 0.01,  def: 0.65 },
    { label: "GLOW",       min: 0,    max: 1,    step: 0.01,  def: 0.5  }
  ],
  glsl: `
/* ---- blackbody colour, 1000..40000 K -------------------------------
   Helland-style piecewise fits with every joint smoothstepped, then
   raised to the 1.5 power to sit in the roughly-linear space the
   accumulator works in.  Never negative, monotone in hue:
   3000 K -> (1.00, 0.58, 0.28), 6500 K -> (1.00, 1.00, 0.98),
   15000 K -> (0.60, 0.72, 1.00), 40000 K -> (0.46, 0.62, 1.00).   */
vec3 starfield_bb(float T){
  float t  = clamp(T, 1000.0, 40000.0) * 0.01;          /* 10 .. 400 */
  float rh = 329.698727446 * pow(max(t - 60.0, 1.0), -0.1332047592) * (1.0/255.0);
  float r  = mix(1.0, rh, smoothstep(64.0, 78.0, t));
  float gc = (99.4708025861 * log(max(t, 1.0)) - 161.1195681661) * (1.0/255.0);
  float gh = 288.1221695283 * pow(max(t - 60.0, 1.0), -0.0755148492) * (1.0/255.0);
  float g  = mix(gc, gh, smoothstep(58.0, 74.0, t));
  float bc = (138.5177312231 * log(max(t - 10.0, 1.0)) - 305.0447927307) * (1.0/255.0);
  bc *= smoothstep(18.0, 25.0, t);
  float b  = mix(bc, 1.0, smoothstep(60.0, 78.0, t));
  vec3 c = clamp(vec3(r, g, b), 0.0, 1.0);
  return c * sqrt(c);
}

/* dim magma ramp for the microwave shell */
vec3 starfield_magma(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.06, 0.03, 0.16), vec3(0.42, 0.09, 0.36), smoothstep(0.00, 0.35, t));
  c = mix(c, vec3(0.85, 0.28, 0.20), smoothstep(0.30, 0.68, t));
  c = mix(c, vec3(1.00, 0.78, 0.42), smoothstep(0.62, 1.00, t));
  return c;
}

/* slow yaw of the ship relative to the rest-frame sky (the flight axis
   stays +z; the sky drifts past it) */
vec3 starfield_yaw(vec3 d){
  float a = 0.30 + 0.02*uT;
  float c = cos(a), s = sin(a);
  return vec3(c*d.x + s*d.z, d.y, -s*d.x + c*d.z);
}

/* relativistic aberration, motion along +z.  mu' = (mu + beta)/(1 + beta mu):
   mu = 0, beta = 0.9 -> mu' = 0.9, i.e. the rest-frame hemisphere is squeezed
   into a cone of half-angle arccos(beta) = 25.8 deg about the flight
   direction.  Denominator >= 1 - beta > 0 for every legal beta. */
vec3 starfield_ab(vec3 d, float beta){
  /* flight axis is -z so the beamed forward sky faces the plate's home
     camera (which looks toward -z); mu is measured against the flight axis */
  float mu  = clamp(-d.z, -1.0, 1.0);
  float den = max(1.0 + beta*mu, 1.0e-4);
  float mup = clamp((mu + beta)/den, -1.0, 1.0);
  float sp  = sqrt(max(1.0 - mup*mup, 0.0));
  vec2  tp  = d.xy;
  float lt  = length(tp);
  vec2  un  = mix(vec2(1.0, 0.0), tp/max(lt, 1.0e-7), step(1.0e-7, lt));
  return vec3(un*sp, -mup);
}

void starfield_basis(vec3 d, out vec3 t1, out vec3 t2){
  vec3 rf = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), step(0.9, abs(d.z)));
  t1 = normalize(cross(d, rf) + vec3(1.0e-9));
  t2 = cross(d, t1);
}

vec3 shape_starfield(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  float beta = clamp(P[0], 0.0, 0.995);
  float gam  = 1.0/sqrt(max(1.0 - beta*beta, 1.0e-6));
  float glow = 0.35 + 0.85*clamp(P[5], 0.0, 1.0);
  float R    = 1.30;

  /* one hash splits the point budget between the three populations */
  float fGrid = step(0.5, P[1]) * 0.25;
  float fCmb  = step(0.5, P[2]) * 0.20;
  float gsel  = u2f(hashu(seed ^ 0x9E3779B9u));

  if(gsel < fGrid){
    /* THE GRATICULE. Twelve meridians and five parallels of the REST-frame
       sphere, sampled uniformly in arclength, then pushed through exactly
       the same aberration map as the stars.  Per-point emission is constant
       along each curve, so the visible pile-up toward +z is pure geometry. */
    uint gh0 = hashu(seed + 0x2545F491u);
    uint gh1 = hashu(gh0);
    float th; float lo; float w;
    if(u2f(gh0) < 0.5){
      lo = floor(u2f(gh1)*12.0) * (TAU/12.0);
      th = mix(0.03*PI, 0.97*PI, q.x);      /* stop short of the poles */
      w  = 1.0;
    } else {
      th = (floor(u2f(gh1)*5.0) + 1.0) * (PI/6.0);   /* 30..150 deg */
      lo = q.x * TAU;
      w  = 0.60*sin(th);                    /* equalise linear density */
    }
    vec3 d  = vec3(sin(th)*cos(lo), sin(th)*sin(lo), cos(th));
    vec3 dp = starfield_ab(starfield_yaw(d), beta);
    vec3 t1; vec3 t2; starfield_basis(dp, t1, t2);
    float ja = TAU*rnd.x;
    float jr = 0.0022*sqrt(max(rnd.y, 0.0));
    vec3 pos = normalize(dp + (t1*cos(ja) + t2*sin(ja))*jr + vec3(1.0e-9));
    col = vec3(0.42, 0.60, 1.00) * (0.060 * w * glow);
    return pos * R;
  }

  if(gsel < fGrid + fCmb){
    /* THE MICROWAVE SHELL. T'(mu') = 2.725 K times the same delta; at
       beta = 0.00123 this is the 3.36 mK dipole we actually measure. */
    float cz = 2.0*q.x - 1.0;
    float sz = sqrt(max(1.0 - cz*cz, 0.0));
    float ph = TAU*q.y;
    vec3  dr = starfield_yaw(vec3(sz*cos(ph), sz*sin(ph), cz));
    float mu  = clamp(-dr.z, -1.0, 1.0);           /* against the -z flight axis */
    float dop = gam*(1.0 + beta*mu);
    vec3  dp  = starfield_ab(dr, beta);
    float Tp  = 2.725*dop;
    float tt  = clamp((Tp - 1.4)/9.0, 0.0, 1.0);
    col = starfield_magma(tt) * ((0.030 + 0.075*tt) * glow);
    return dp * (R*1.06);
  }

  /* THE STARS. Each point is assigned to one catalogue entry; the entry's
     direction, temperature and absolute magnitude are hashed from its index,
     so every point that lands on a star agrees about that star. */
  int  nst = int(clamp(P[3], 1000.0, 8000.0) + 0.5);
  uint si  = hashu(seed) % uint(nst);
  uint s1  = hashu(si*2654435761u + 101u);
  uint s2  = hashu(s1);
  uint s3  = hashu(s2);
  uint s4  = hashu(s3);
  float a1 = u2f(s1), a2 = u2f(s2), a3 = u2f(s3), a4 = u2f(s4);

  float cz = 2.0*a1 - 1.0;                 /* uniform on the sphere */
  float sz = sqrt(max(1.0 - cz*cz, 0.0));
  float ph = TAU*a2;
  vec3  dr = starfield_yaw(vec3(sz*cos(ph), sz*sin(ph), cz));

  float mu  = clamp(-dr.z, -1.0, 1.0);     /* rest-frame cos(theta) vs -z flight axis */
  float dop = gam*(1.0 + beta*mu);         /* = 1/(gam(1 - beta mu')) */
  vec3  dp  = starfield_ab(dr, beta);

  /* temperature: 2500..12000 K, TEMP BIAS bends the draw toward M dwarfs */
  float ex  = mix(1.0, 4.0, clamp(P[4], 0.0, 1.0));
  float T   = 2500.0 + 9500.0*pow(max(a3, 1.0e-4), ex);
  float lum = pow(10.0, -0.4*(5.0*a4 - 1.0));   /* absolute magnitude -1..4 */

  /* beaming: I_bol scales as delta^4.  At beta = 0.99 straight ahead
     delta = sqrt(1.99/0.01) = sqrt(199), so delta^4 = 199^2, near 4e4:
     a soft knee is mandatory. */
  float dd = dop*dop;
  float d4 = dd*dd;
  float br = d4*lum;
  float cap = 6.0;
  float bs  = br/(1.0 + br/cap);

  /* bright stars also spread wider, the way a bright star's image swells on
     a saturating detector: this drains the forward cluster's peak density
     without touching the total energy laid down per star */
  vec3 t1; vec3 t2; starfield_basis(dp, t1, t2);
  float sig = 0.0068*(1.0 + 0.9*sqrt(clamp(bs/cap, 0.0, 1.0)));
  float jr  = min(sig*sqrt(max(-2.0*log(max(1.0 - q.x, 1.0e-6)), 0.0)), 4.0*sig);
  float ja  = TAU*q.y;
  vec3 pos = normalize(dp + (t1*cos(ja) + t2*sin(ja))*jr + vec3(1.0e-9));

  col = starfield_bb(dop*T) * (0.22 * bs * glow);
  return pos * R;
}`
});
