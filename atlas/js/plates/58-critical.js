"use strict";
Atlas.registerPlate({
  id: "critical",
  name: "The Critical Point",
  roman: "LVIII",
  accent: "#7ad9c0",
  tex: "M_{n+1}:\\ \\text{keep each of }b^2\\text{ cells w.p. }p,\\qquad \\dim M_\\infty = 2+\\log_b p",
  plain: "keep each of b² cells with probability p;  dim M∞ = 2 + log_b p",
  caption: "Water at the boiling point is neither liquid nor steam; a magnet at the Curie point can no longer decide. At a critical point the correlation length diverges, and structure stops having a size: clusters nest inside clusters at every scale, identically, forever - the only place in physics where infinite detail is a theorem rather than a flourish. This plate grows Mandelbrot's fractal percolation, the cleanest laboratory of that idea: each cell divides and its children survive by the toss of a weighted coin, and the dial that weights the coin walks the plate through its phase transition - dust below, a spanning lace at the threshold, solid above. The second of the Mk2 series, built for the accumulated renders: a subject with more depth than any frame that will ever hold it.",
  cam: { dist: 3.0, pitch: 0.34, tgtY: 0.0, rot: 0.0 },
  gain: 0.5,
  params: [
    { label: "OCCUPANCY p", min: 0.55, max: 0.98, step: 0.005, def: 0.76 },
    { label: "SUBDIV b",    min: 2,    max: 4,    step: 1,     def: 3    },
    { label: "DEPTH",       min: 4,    max: 22,   step: 1,     def: 14   },
    { label: "CLUSTER TINT",min: 0,    max: 1,    step: 0.01,  def: 0.55 },
    { label: "SLAB Z",      min: 0,    max: 0.5,  step: 0.01,  def: 0.10 },
    { label: "HULL BIAS",   min: 0,    max: 1,    step: 0.01,  def: 0.35 }
  ],
  glsl: `
vec3 shape_critical(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // Fractal percolation, sampled: the retained-cell hierarchy is
  // addressed by hash, so every point sees the same realization and
  // the accumulation is one object. Depth is drawn uniformly - equal
  // sample budget per octave, the Mk2 series' design law.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 362437u));
  pt = hashu(pt ^ floatBitsToUint(rnd.w));

  int b    = int(P[1] + 0.5);
  int maxD = int(P[2] + 0.5);
  pt = hashu(pt);
  // biased toward depth: the coarse levels are honest flat washes
  // over their whole cells, and equal light there fogs the lace -
  // every level still receives samples, the deep just receives more
  int d = int(pow(u2f(pt), 0.65) * float(maxD));

  vec2  cell  = vec2(0.0);
  float scale = 1.0;
  uint  addr  = 2166136261u;
  uint  lineage = addr;
  int   reached = 0;
  for(int l = 0; l < 22; l++){
    if(l >= d) break;
    // the point tries a few children; occupancy is addressed, so a
    // child is kept or void identically for everyone
    bool moved = false;
    for(int k = 0; k < 6; k++){
      pt = hashu(pt);
      int cx = int(u2f(pt) * float(b));
      pt = hashu(pt);
      int cy = int(u2f(pt) * float(b));
      uint caddr = hashu(addr ^ uint(cy * 97 + cx + 1));
      if(u2f(caddr) < P[0]){
        cell  += (vec2(float(cx), float(cy)) + 0.0) * scale / float(b)
                 - vec2(scale * 0.5 * (1.0 - 1.0/float(b)));
        scale /= float(b);
        addr   = caddr;
        lineage = hashu(lineage ^ caddr);
        moved  = true;
        reached += 1;
        break;
      }
    }
    if(!moved) break;      // the cluster dies here; deposit on its dust
  }

  // seat inside the surviving cell; hull bias pushes light toward the
  // cell's rim, where the cluster boundary lives
  vec2 j = vec2(rnd.x, rnd.y) - 0.5;
  float rim = max(abs(j.x), abs(j.y)) * 2.0;
  if(u2f(hashu(pt ^ 77u)) < P[5] && rim < 0.62){
    j *= 0.92 / max(rim, 1.0e-3);
  }
  vec2 seat = cell + j * scale;
  // the slab's thickness follows the cell: fine structure lies flat,
  // so depth parallax cannot smear the lace it took levels to reach
  float z = ((u2f(hashu(lineage ^ 39916801u)) - 0.5)
             + (rnd.z - 0.5) * 0.3) * P[4] * (0.25 + 3.0 * scale);

  float lv = float(reached) / max(P[2], 1.0);
  float tint = u2f(hashu(lineage)) * P[3];
  col = pal(0.32 + tint * 0.5 + lv * 0.12,
            vec3(0.45, 0.5, 0.47), vec3(0.42, 0.5, 0.45),
            vec3(0.9, 1.0, 0.85), vec3(0.15, 0.42, 0.6))
        * (0.12 + 1.9 * lv * lv);
  return vec3(seat.x * 1.9, seat.y * 1.9, z);
}`
});
