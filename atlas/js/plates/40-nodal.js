"use strict";
Atlas.registerPlate({
  id: "nodal",
  name: "The Random Wave",
  roman: "XL",
  accent: "#a8d8ff",
  tex: "\\psi(\\mathbf{x})=\\sum_{j=1}^{M}\\cos\\!\\bigl(k\\,\\mathbf{n}_j\\!\\cdot\\mathbf{x}+\\varphi_j\\bigr),\\qquad \\psi=0",
  plain: "ψ(x) = Σⱼ cos(k nⱼ·x + φⱼ),   ψ = 0",
  caption: "Berry's random-wave model (1977): a high-energy eigenfunction of a classically chaotic cavity should look, statistically, like an isotropic superposition of plane waves sharing a single wavenumber. WAVES M cosines, their directions and phases dealt out by WAVE SEED, are summed, and each point is Newton-projected onto the silent set ψ = 0, so the cloud condenses into a Monte-Carlo portrait of the nodal set: lines in the disk, surfaces in the ball, as DIMENSION selects. It is the wild counterpart of Plate VIII's tidy separable figures. WAVENUMBER k fixes the wavelength, SLAB CUT shears the ball open, and drifting phases keep the foam seething.",
  cam: { dist: 3.2, pitch: 0.3, tgtY: 0.0, rot: 0.05 },
  gain: 0.9,
  params: [
    { label: "DIMENSION",    min: 2, max: 3,  step: 1,    def: 3   },
    { label: "WAVES M",      min: 4, max: 24, step: 1,    def: 12  },
    { label: "WAVENUMBER k", min: 6, max: 24, step: 0.1,  def: 14  },
    { label: "WAVE SEED",    min: 0, max: 30, step: 1,    def: 7   },
    { label: "NEWTON STEPS", min: 1, max: 4,  step: 1,    def: 3   },
    { label: "SLAB CUT",     min: 0, max: 1,  step: 0.01, def: 0.0 },
    { label: "GLOW",         min: 0, max: 1,  step: 0.01, def: 0.5 }
  ],
  glsl: `
/* psi and grad psi in one pass. Directions and phases are hashed only
   from the seed lever and j, so every point sees the same ensemble. */
vec4 nodal_field(vec3 p, int M, float k, int dim, uint sbase){
  float f = 0.0;
  vec3 g = vec3(0.0);
  for(int j = 0; j < 24; j++){
    if(j >= M) break;
    uint h1 = hashu(sbase + uint(j));
    uint h2 = hashu(h1);
    uint h3 = hashu(h2);
    uint h4 = hashu(h3);
    vec3 n;
    if(dim == 2){
      float a = TAU*u2f(h1);
      n = vec3(cos(a), 0.0, sin(a));           /* isotropic in the plane */
    } else {
      float cz = 2.0*u2f(h2) - 1.0;            /* uniform on the sphere  */
      float sz = sqrt(max(0.0, 1.0 - cz*cz));
      float az = TAU*u2f(h1);
      n = vec3(sz*cos(az), sz*sin(az), cz);
    }
    float ph = TAU*u2f(h3) + uT*(0.05 + 0.1*u2f(h4));  /* slow seethe */
    float arg = k*dot(n, p) + ph;
    f += cos(arg);
    g -= k*sin(arg)*n;                         /* grad cos = -k sin * n  */
  }
  return vec4(g, f);
}
vec3 shape_nodal(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int dim = int(P[0] + 0.5);
  int M   = int(P[1] + 0.5);
  float k = P[2];
  uint sbase = uint(P[3] + 0.5)*1000u + 77u;
  vec3 p;
  if(dim == 2){                                /* uniform in the disk    */
    float r  = 1.3*sqrt(q.x);
    float th = TAU*q.y;
    p = vec3(r*cos(th), 0.0, r*sin(th));
  } else {                                     /* uniform in the ball    */
    float cz = 2.0*q.y - 1.0;
    float sz = sqrt(max(0.0, 1.0 - cz*cz));
    float az = TAU*q.x;
    float rr = 1.3*pow(max(rnd.x, 1.0e-6), 0.3333333);
    p = rr*vec3(sz*cos(az), cz, sz*sin(az));
  }
  for(int it = 0; it < 4; it++){
    if(float(it) >= P[4]) break;
    vec4 fg = nodal_field(p, M, k, dim, sbase);
    vec3 gr = fg.xyz;
    vec3 stp = fg.w*gr/(dot(gr, gr) + 1.0e-3);
    float sl = length(stp);
    float cap = 1.6/k;                         /* never jump past a sheet */
    if(sl > cap) stp *= cap/sl;
    p -= stp;
    if(dim == 2) p.y = 0.0;
  }
  vec4 fg = nodal_field(p, M, k, dim, sbase);
  float nrmf = inversesqrt(0.5*float(M));      /* psi in RMS units       */
  float fn = fg.w*nrmf;
  float lim = (dim == 2) ? length(p.xz) : length(p);
  if(abs(fn) > 0.6/k || lim > 1.3){            /* unconverged, or outside window */
    col = vec3(0.0);
    return vec3(0.0, -999.0, 0.0);
  }
  float glow = 0.45 + 0.75*P[6];
  if(dim == 2){
    float gm = length(fg.xyz)*nrmf/k;          /* |grad|, O(1) units     */
    float t = clamp(gm*0.9, 0.0, 1.0);
    col = mix(vec3(0.07, 0.16, 0.30), vec3(0.85, 0.95, 1.15), t)*glow;
    return p;
  }
  if(p.z > (0.5 - P[5])*2.9){                  /* slab cut, 3D only      */
    col = vec3(0.0);
    return vec3(0.0, -999.0, 0.0);
  }
  vec3 nrm = normalize(fg.xyz + vec3(1.0e-6));
  col = (0.28 + 0.72*abs(nrm))*vec3(0.72, 0.86, 1.08)*glow;
  return p;
}`
});
