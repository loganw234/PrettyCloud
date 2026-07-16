"use strict";
Atlas.registerPlate({
  id: "primes",
  name: "The Prime Spirals",
  roman: "XXIX",
  accent: "#ffd08a",
  tex: "n\\mapsto(\\sqrt n,\\,2\\pi\\sqrt n),\\qquad a+bi\\ \\text{prime in }\\mathbb Z[i]",
  plain: "Sacks: n ↦ (√n, 2π√n);   Gaussian primes a+bi in ℤ[i]",
  caption: "Lay the whole numbers down a spiral and light only the primes. Ulam noticed the lamps fall on diagonals; on Sacks's square-root spiral those diagonals become sweeping curves, each the trace of a prime-rich quadratic like n²+n+41. The primes are not random — they are forbidden from being periodic and yet riddled with structure, and here that structure is simply visible. Switch to the Gaussian integers and the one-dimensional mystery opens into a fourfold constellation of primes in the complex lattice.",
  cam: { dist: 3.4, pitch: 0.7, tgtY: 0.0, rot: 0.04 },
  gain: 0.9,
  params: [
    { label: "MODE",       min: 0, max: 2,     step: 1,   def: 0     },
    { label: "EXTENT N",   min: 1000,max: 40000,step: 100,def: 20000 },
    { label: "SCALE",      min: 0.5,max: 1.8,  step: 0.01,def: 1.0   },
    { label: "COLOR CYCLE",min: 0, max: 3,     step: 0.01,def: 1.0   },
    { label: "GLOW",       min: 0, max: 1,     step: 0.01,def: 0.7   }
  ],
  glsl: `
bool primes_isPrime(int n){
  if(n < 2) return false;
  if(n < 4) return true;
  if((n - (n/2)*2) == 0) return false;
  for(int d = 3; d < 320; d += 2){
    if(d*d > n) break;
    if(n - (n/d)*d == 0) return false;
  }
  return true;
}
vec3 shape_primes(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode = int(P[0] + 0.5);
  float N = P[1];
  if(mode < 2){
    float n = floor(q.x*N) + 2.0;
    if(!primes_isPrime(int(n))){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
    float r = sqrt(n);
    float a = (mode == 0) ? TAU*sqrt(n) : n*2.39996323;   /* Sacks vs Vogel */
    vec2 pos = r*vec2(cos(a), sin(a))*P[2]*0.06;
    vec3 p = vec3(pos.x, 0.0, pos.y);
    col = pal(fract(sqrt(n)*0.1*P[3]) + 0.1, vec3(0.5, 0.45, 0.4), vec3(0.5, 0.45, 0.45),
              vec3(1.0, 0.95, 0.85), vec3(0.1, 0.3, 0.5));
    col *= 0.5 + 0.7*P[4];
    return p;
  }
  float Mx = sqrt(N);
  int a = int(floor(q.x*2.0*Mx) - Mx);
  int b = int(floor(q.y*2.0*Mx) - Mx);
  int norm = a*a + b*b;
  bool gp;
  if(a == 0 || b == 0){
    int mm = (a == 0) ? (b < 0 ? -b : b) : (a < 0 ? -a : a);
    gp = primes_isPrime(mm) && ((mm - (mm/4)*4) == 3);
  } else {
    gp = primes_isPrime(norm);
  }
  if(!gp){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }
  vec3 p = vec3(float(a), 0.0, float(b))*P[2]*0.05;
  col = pal(fract(float(norm)*0.01*P[3]) + 0.1, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  col *= 0.5 + 0.7*P[4];
  return p;
}`
});
