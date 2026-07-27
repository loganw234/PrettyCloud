"use strict";
Atlas.registerPlate({
  id: "e8",
  name: "The Shape of E8",
  roman: "XLIV",
  accent: "#d4b8ff",
  tex: "\\Phi(E_8)=\\{\\pm e_i\\pm e_j\\}_{i<j}\\;\\cup\\;\\bigl\\{\\tfrac{1}{2}(\\pm1,\\dots,\\pm1)\\bigr\\}_{\\#(-)\\ \\text{even}},\\qquad|\\Phi|=240,\\quad h=30",
  plain: "Φ(E₈) = {±eᵢ±eⱼ, i<j} ∪ {½(±1,…,±1), # of − even};  |Φ| = 240,  h = 30",
  caption: "The 240 roots of E8 — 112 integer, 128 half-integer, all the same length — decoded one per point and flattened onto the Coxeter plane, where they fall into eight concentric rings of thirty: the figure Peter McMullen drew by hand and John Stembridge computed in 2007. The same vectors are how spheres touch in the densest packing in eight dimensions. MODE 1 traces the 6720 edges joining each root to its 56 nearest neighbours; every root receives equal samples, so the bright heart of the figure is purely projected edges crowding. Depth comes from a second eigenplane, swung by 4D TURN: the object never moves; our shadow of it does.",
  cam: { dist: 3.0, pitch: 0.1, tgtY: 0.0, rot: 0.03 },
  gain: 0.8,
  params: [
    { label: "MODE",     min: 0,   max: 2,   step: 1,    def: 2    },
    { label: "4D TURN",  min: 0,   max: 1,   step: 0.01, def: 0.15 },
    { label: "Z DEPTH",  min: 0,   max: 1,   step: 0.01, def: 0.35 },
    { label: "RING HUE", min: 0,   max: 1,   step: 0.01, def: 0.55 },
    { label: "SCALE",    min: 0.6, max: 1.3, step: 0.01, def: 1.15 },
    { label: "GLOW",     min: 0,   max: 1,   step: 0.01, def: 0.6  }
  ],
  glsl: `
/* Coxeter-plane basis for E8, precomputed by diagonalizing the Coxeter
   element: u1/u2 span the Petrie eigenplane (exponent 1, the famous
   30-fold picture), u3/u4 span the exponent-7 eigenplane used for depth.
   Coordinates 0-3 live in the "a" vec4, coordinates 4-7 in the "b". */
const vec4 e8_u1a = vec4(0.0, 0.11911770, 0.19273649, 0.21763887);
const vec4 e8_u1b = vec4(0.19273649, 0.11911770, 0.0, 0.92193306);
const vec4 e8_u2a = vec4(-0.09689907, -0.46350566, -0.23693033, 0.0);
const vec4 e8_u2b = vec4(0.23693033, 0.46350566, 0.66982357, 0.0);
const vec4 e8_u3a = vec4(0.0, 0.38336132, -0.23693033, -0.74996791);
const vec4 e8_u3b = vec4(-0.23693033, 0.38336132, 0.0, 0.17704341);
const vec4 e8_u4a = vec4(-0.15941060, 0.11911770, 0.56978596, 0.0);
const vec4 e8_u4b = vec4(-0.56978596, -0.11911770, 0.54488358, 0.0);

void e8_set(int idx, float val, inout vec4 a, inout vec4 b){
  if(idx == 0) a.x = val; else if(idx == 1) a.y = val;
  else if(idx == 2) a.z = val; else if(idx == 3) a.w = val;
  else if(idx == 4) b.x = val; else if(idx == 5) b.y = val;
  else if(idx == 6) b.z = val; else b.w = val;
}

/* Decode root index 0..239 into 8 coordinates (ra = 0-3, rb = 4-7). */
void e8_root(int r, out vec4 ra, out vec4 rb){
  ra = vec4(0.0); rb = vec4(0.0);
  if(r < 112){
    /* integer roots: +-e_i +- e_j, i<j. 28 pairs x 4 signs.
       m = r/4 in 0..27 -> (i,j) by the subtract idiom:
       i = 0 covers 7 pairs (j = 1..7), i = 1 covers 6, ... i = 6 covers 1.
       m = 0 -> (0,1); m = 27 -> (6,7). Every m < 28 breaks inside. */
    int m = r / 4;
    int ii = 0;
    int jj = 1;
    for(int i = 0; i < 7; i++){
      int cnt = 7 - i;
      if(m < cnt){ ii = i; jj = i + 1 + m; break; }
      m -= cnt;
    }
    e8_set(ii, ((r & 1) != 0) ? -1.0 : 1.0, ra, rb);
    e8_set(jj, ((r & 2) != 0) ? -1.0 : 1.0, ra, rb);
  } else {
    /* half-integer roots: (+-1/2)^8 with an even number of minus signs.
       s = r-112 in 0..127 gives 7 free sign bits for coords 0..6; the
       sign of coord 7 is the parity of those bits (shift loop - ES 3.00
       has no bitCount), which makes the total minus count even. */
    uint s = uint(r - 112);
    uint par = 0u;
    uint t = s;
    for(int k = 0; k < 7; k++){ par = par ^ (t & 1u); t = t >> 1u; }
    ra = vec4(((s &  1u) != 0u) ? -0.5 : 0.5,
              ((s &  2u) != 0u) ? -0.5 : 0.5,
              ((s &  4u) != 0u) ? -0.5 : 0.5,
              ((s &  8u) != 0u) ? -0.5 : 0.5);
    rb = vec4(((s & 16u) != 0u) ? -0.5 : 0.5,
              ((s & 32u) != 0u) ? -0.5 : 0.5,
              ((s & 64u) != 0u) ? -0.5 : 0.5,
              (par == 1u)       ? -0.5 : 0.5);
  }
}

vec3 shape_e8(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode = int(P[0] + 0.5);
  uint h = hashu(seed);
  int r = int(h % 240u);
  vec4 ra, rb;
  e8_root(r, ra, rb);

  bool edge = (mode == 1);
  if(mode == 2){ h = hashu(h); edge = (h & 1u) != 0u; }

  /* Petrie projection of root A - all vec4 dots, zero dynamic indexing */
  float ax = dot(e8_u1a, ra) + dot(e8_u1b, rb);
  float ay = dot(e8_u2a, ra) + dot(e8_u2b, rb);

  /* nearest of the 8 exact ring radii names the ring */
  float rr = sqrt(ax*ax + ay*ay);
  float ring = 0.0;
  float bd = abs(rr - 0.238235);
  float dd = abs(rr - 0.385473); if(dd < bd){ bd = dd; ring = 1.0; }
  dd = abs(rr - 0.473861); if(dd < bd){ bd = dd; ring = 2.0; }
  dd = abs(rr - 0.572925); if(dd < bd){ bd = dd; ring = 3.0; }
  dd = abs(rr - 0.704294); if(dd < bd){ bd = dd; ring = 4.0; }
  dd = abs(rr - 0.766723); if(dd < bd){ bd = dd; ring = 5.0; }
  dd = abs(rr - 0.927011); if(dd < bd){ bd = dd; ring = 6.0; }
  dd = abs(rr - 1.139572); if(dd < bd){ bd = dd; ring = 7.0; }

  /* depth breathes through the second eigenplane; the xy silhouette
     keeps its 30-fold symmetry no matter what uT does */
  float cw = cos(uT * P[1]);
  float sw = sin(uT * P[1]);

  vec3 p;
  if(edge){
    /* neighbor search: candidates from a fresh hash chain, accept when
       <A,B> = 1 (56 of 240 qualify, ~23% per try; miss chance after 24
       tries is ~0.2%) - on total failure, hide this point */
    vec4 ba = vec4(0.0);
    vec4 bb = vec4(0.0);
    bool found = false;
    for(int t = 0; t < 24; t++){
      h = hashu(h);
      vec4 ca, cb;
      e8_root(int(h % 240u), ca, cb);
      float ip = dot(ra, ca) + dot(rb, cb);
      if(ip > 0.5 && ip < 1.5){ ba = ca; bb = cb; found = true; break; }
    }
    if(!found){
      col = vec3(0.0);
      return vec3(0.0, -999.0, 0.0);
    }
    /* the projection is linear, so mixing in 8D before projecting
       samples the projected segment uniformly in q.y */
    vec4 ma = mix(ra, ba, q.y);
    vec4 mb = mix(rb, bb, q.y);
    float x = dot(e8_u1a, ma) + dot(e8_u1b, mb);
    float y = dot(e8_u2a, ma) + dot(e8_u2b, mb);
    float z = (cw*(dot(e8_u3a, ma) + dot(e8_u3b, mb))
             + sw*(dot(e8_u4a, ma) + dot(e8_u4b, mb))) * P[2];
    p = vec3(x, y, z) + (rnd.xyz - 0.5)*0.006;
  } else {
    /* orb: tight uniform ball around the projected root */
    float z = (cw*(dot(e8_u3a, ra) + dot(e8_u3b, rb))
             + sw*(dot(e8_u4a, ra) + dot(e8_u4b, rb))) * P[2];
    float ct = 1.0 - 2.0*q.x;
    float st = sqrt(max(0.0, 1.0 - ct*ct));
    float ph = TAU*q.y;
    float ob = 0.024*pow(rnd.x + 1e-6, 0.33333);
    p = vec3(ax, ay, z) + vec3(st*cos(ph), ct, st*sin(ph))*ob;
  }
  p *= P[4];

  col = pal(ring*0.125 + P[3], vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
  col *= (0.30 + 0.95*P[5])*(0.85 + 0.3*rnd.w);
  return p;
}`
});
