"use strict";
Atlas.registerPlate({
  id: "rmt",
  name: "Spectra of Random Matrices",
  roman: "XXII",
  accent: "#a0e0d0",
  tex: "\\rho_{\\text{sc}}(x)=\\tfrac{2}{\\pi}\\sqrt{1-x^2},\\qquad \\text{Ginibre: }|\\lambda|^2\\stackrel{d}{=}\\tfrac1N\\,\\Gamma(k)",
  plain: "Wigner: ρ(x) = (2/π)√(1−x²);   Ginibre: |λ|² ~ Γ(k)/N",
  caption: "Fill a large matrix with random numbers and its eigenvalues, astonishingly, obey a law. A symmetric matrix gives Wigner's semicircle; a matrix with no symmetry at all gives Ginibre's uniform disk with its razor circular edge; a covariance matrix gives Marchenko–Pastur. None of these is simulated by diagonalizing — each ensemble is drawn from its exact finite-N law (Ginibre by Kostlan's theorem, the others by their inverse spectral CDF), so brightness is the limiting spectral measure itself.",
  cam: { dist: 3.2, pitch: 0.42, tgtY: 0.0, rot: 0.03 },
  gain: 0.8,
  params: [
    { label: "ENSEMBLE",  min: 0,  max: 2,   step: 1,    def: 0   },
    { label: "SIZE N",    min: 8,  max: 100, step: 1,    def: 60  },
    { label: "MP ASPECT", min: 0.05,max: 1,  step: 0.01, def: 0.4 },
    { label: "SCALE",     min: 0.6,max: 1.6, step: 0.01, def: 1.1 },
    { label: "HEIGHT",    min: 0,  max: 1.5, step: 0.01, def: 0.8 },
    { label: "GLOW",      min: 0,  max: 1,   step: 0.01, def: 0.6 }
  ],
  glsl: `
vec3 shape_rmt(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int ens = int(P[0] + 0.5);
  float scl = P[3];
  vec3 p; float shade;
  if(ens == 0){                       /* Ginibre circular law (Kostlan) */
    int N = int(P[1]); N = max(4, min(100, N));
    uint h = hashu(seed);
    int k = 1 + int(u2f(h)*float(N));
    float s = 0.0;
    for(int i = 0; i < 100; i++){ if(i >= k) break; h = hashu(h); s += -log(max(1.0e-6, u2f(h))); }
    float rad = sqrt(s/float(N));
    float th = TAU*q.x;
    p = vec3(rad*cos(th)*scl, (rnd.z - 0.5)*0.03, rad*sin(th)*scl);
    shade = rad;
  } else if(ens == 1){                /* Wigner semicircle */
    float x = 2.0*q.x - 1.0;
    float rho = (2.0/PI)*sqrt(max(0.0, 1.0 - x*x));
    p = vec3(x*1.35*scl, (q.y - 0.5)*2.0*rho*P[4], (rnd.z - 0.5)*0.04);
    shade = rho;
  } else {                            /* Marchenko-Pastur */
    float g = clamp(P[2], 0.05, 1.0);
    float sg = sqrt(g);
    float lm = (1.0 - sg)*(1.0 - sg), lp = (1.0 + sg)*(1.0 + sg);
    float x = mix(lm, lp, q.x);
    float rho = sqrt(max(0.0, (lp - x)*(x - lm)))/(TAU*g*max(x, 1.0e-3));
    p = vec3((x - 0.5*(lp + lm))*0.9*scl, (q.y - 0.5)*2.0*rho*P[4], (rnd.z - 0.5)*0.04);
    shade = rho;
  }
  col = pal(clamp(shade, 0.0, 1.0)*0.7 + 0.1, vec3(0.5, 0.45, 0.5), vec3(0.5, 0.45, 0.45),
            vec3(1.0, 0.95, 0.9), vec3(0.1, 0.25, 0.5));
  col *= 0.45 + 0.85*P[5];
  return p;
}`
});
