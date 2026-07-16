"use strict";
Atlas.registerPlate({
  id: "orbital",
  name: "Hydrogen Orbitals",
  roman: "XV",
  accent: "#9fd0ff",
  tex: "\\psi_{n\\ell m}(r,\\theta,\\phi)=R_{n\\ell}(r)\\,Y_\\ell^{m}(\\theta,\\phi),\\qquad \\rho=|\\psi_{n\\ell m}|^2",
  plain: "ψₙₗₘ = Rₙₗ(r)·Yₗᵐ(θ,φ),   ρ = |ψₙₗₘ|²",
  caption: "The electron, seen honestly — not as a dot on an orbit but as a probability density. Each point is a genuine sample drawn from |ψ|²: the radius is importance-sampled from the Rₙₗ envelope so the accepted cloud is the exact quantum distribution, radial nodes and all. Where the wavefunction vanishes, the cloud goes dark — the spherical shells of the s-states, the pinched waists of the p's and d's. Warm and cool lobes carry the sign of ψ. Dial n, ℓ, m by hand; the whole periodic table of shapes is in there.",
  cam: { dist: 3.0, pitch: 0.24, tgtY: 0.0, rot: 0.05 },
  gain: 1.0,
  params: [
    { label: "n (shell)",  min: 1, max: 4,   step: 1,    def: 3   },
    { label: "ℓ (subshell)",min: 0, max: 3,  step: 1,    def: 2   },
    { label: "m",          min: -3,max: 3,   step: 1,    def: 0   },
    { label: "SIZE",       min: 0.02,max: 0.12,step: 0.001,def: 0.055 },
    { label: "DENSITY",    min: 0.2,max: 4,  step: 0.02, def: 1.6 },
    { label: "GLOW",       min: 0, max: 1,   step: 0.01, def: 0.6 }
  ],
  glsl: `
float orbital_L(int n, int l, float x){    /* associated Laguerre L_{n-l-1}^{2l+1}(x) */
  float a = float(2*l + 1);
  int p = n - l - 1;
  if(p <= 0) return 1.0;
  float Lkm1 = 1.0;
  float Lk = 1.0 + a - x;
  float L = Lk;
  for(int k = 1; k < 3; k++){
    if(k >= p) break;
    float Lkp1 = ((2.0*float(k) + 1.0 + a - x)*Lk - (float(k) + a)*Lkm1)/(float(k) + 1.0);
    Lkm1 = Lk; Lk = Lkp1; L = Lkp1;
  }
  return L;
}
float orbital_Ylm(int l, int m, float ct, float st, float phi){
  int am = m < 0 ? -m : m;
  float az = (m > 0) ? cos(float(am)*phi) : (m < 0 ? sin(float(am)*phi) : 1.0);
  float Pl;
  if(l == 0) Pl = 1.0;
  else if(l == 1) Pl = (am == 0) ? ct : st;
  else if(l == 2) Pl = (am == 0) ? (1.5*ct*ct - 0.5) : (am == 1 ? st*ct : st*st);
  else Pl = (am == 0) ? (ct*(2.5*ct*ct - 1.5))
          : (am == 1 ? st*(5.0*ct*ct - 1.0)
          : (am == 2 ? st*st*ct : st*st*st));
  return Pl*az;
}
vec3 shape_orbital(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int n = int(P[0] + 0.5); n = max(1, min(4, n));
  int l = int(P[1] + 0.5); l = max(0, min(n - 1, l));
  int m = int(floor(P[2] + (P[2] < 0.0 ? -0.5 : 0.5))); m = max(-l, min(l, m));
  float ct = 1.0 - 2.0*q.x;
  float st = sqrt(max(0.0, 1.0 - ct*ct));
  float ph = TAU*q.y;
  vec3 dir = vec3(st*cos(ph), ct, st*sin(ph));
  /* radius ~ Gamma(2l+3, n/2): exactly the R_nl envelope r^{2l+2} e^{-2r/n} */
  int kG = 2*l + 3;
  float r = 0.0; uint h = seed;
  for(int i = 0; i < 9; i++){ if(i >= kG) break; h = hashu(h); r += -log(max(1.0e-6, u2f(h))); }
  r *= float(n)*0.5;
  float x = 2.0*r/float(n);
  float amp = orbital_L(n, l, x) * orbital_Ylm(l, m, ct, st, ph);
  if(rnd.w > amp*amp*P[4]){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  vec3 p = dir * r * P[3];
  col = mix(vec3(0.25, 0.55, 1.0), vec3(1.0, 0.52, 0.20), step(0.0, amp))
      * (0.35 + 0.9*P[5]);
  return p;
}`
});
