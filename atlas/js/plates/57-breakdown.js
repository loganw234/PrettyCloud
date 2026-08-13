"use strict";
Atlas.registerPlate({
  id: "breakdown",
  name: "Dielectric Breakdown",
  roman: "LVII",
  accent: "#b48cff",
  tex: "\\nabla^2\\varphi=0,\\qquad p(\\mathbf{x})\\ \\propto\\ |\\nabla\\varphi|^{\\,\\eta}",
  plain: "∇²φ = 0,   p(x) ∝ |∇φ|^η   (Laplacian growth)",
  caption: "Insulators do not fail gracefully. When the field across them wins, the discharge grows a tree: charge advances where the potential gradient is steepest, every advance sharpens the gradient at its own tip, and the runaway writes a branching figure whose trunk carries limbs, whose limbs carry twigs, and whose twigs carry hair too fine to see - the same law at every size, until the medium itself runs out of smallness. Lichtenberg burned them into resin in 1777; this one grows across the plate with its branches drawn from the breakdown hierarchy, each level thinner by the contraction the physics demands. The first of the Mk2 series: plates with no native scale, made for frames that keep magnifying after every other subject has gone soft.",
  cam: { dist: 3.0, pitch: 0.16, tgtY: 0.0, rot: 0.0 },
  gain: 0.55,
  params: [
    { label: "DEPTH",        min: 4,    max: 22,  step: 1,     def: 16   },
    { label: "BRANCH PROB",  min: 0.35, max: 0.95,step: 0.01,  def: 0.72 },
    { label: "BRANCH ANGLE", min: 12,   max: 80,  step: 1,     def: 38   },
    { label: "CONTRACTION",  min: 0.55, max: 0.86,step: 0.005, def: 0.70 },
    { label: "WANDER",       min: 0,    max: 1,   step: 0.01,  def: 0.4  },
    { label: "TIP GLOW",     min: 0,    max: 1,   step: 0.01,  def: 0.6  },
    { label: "SPAN",         min: 1.2,  max: 3.2, step: 0.05,  def: 2.6  },
    { label: "KEEL",         min: 0,    max: 1,   step: 0.01,  def: 0    }
  ],
  glsl: `
vec3 shape_breakdown(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // The tree is addressed, never stored: every node's geometry hashes
  // from its address alone, so all points agree on the figure and the
  // accumulation is coherent across passes. The point's own stream
  // only chooses a path down and a seat along its final filament.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 747796405u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  float span   = P[6];
  float contr  = P[3];
  float angRad = P[2] * 0.0174533;
  int   maxD   = int(P[0] + 0.5);

  // equal budget per level: the zoom never starves
  pt = hashu(pt);
  int d = int(u2f(pt) * float(maxD));

  // trunk: 24 addressed segments marching +x with hashed wander
  const int NSEG = 24;
  pt = hashu(pt);
  int segTarget = int(u2f(pt) * float(NSEG));
  vec2 pos = vec2(-0.5 * span, 0.0);
  vec2 dir = vec2(1.0, 0.0);
  float segLen = span / float(NSEG);
  uint taddr = 2166136261u;
  for(int i = 0; i < NSEG; i++){
    if(i >= segTarget) break;
    taddr = hashu(taddr ^ (uint(i) * 2654435761u));
    float w = (u2f(taddr) - 0.5) * 1.6 * P[4];
    float c = cos(w * 0.35), s = sin(w * 0.35);
    // a rotation of a unit vector is unit: only the mean-reversion
    // mix needs renormalizing (the first taste of this plate cost
    // 21.6 ms/pass against the bulb's 2 - the census's first find)
    dir = vec2(dir.x * c - dir.y * s, dir.x * s + dir.y * c);
    dir = normalize(mix(dir, vec2(1.0, 0.0), 0.22));   // the field wins
    pos += dir * segLen;
  }

  // KEEL: the trunk's wander is the figure's character and also its
  // vertical drift - a strip one supertile tall cannot hold both. The
  // keel subtracts the walk's own accumulated y, each branch subtree
  // translating rigidly with its attachment, so the channel lies in
  // the strip's band at any scale while every local wiggle survives.
  float yBase = pos.y;
  float len   = segLen;
  float width = 0.012;
  uint  addr  = hashu(taddr ^ 305419896u);
  int   lived = 0;
  for(int l = 0; l < 22; l++){
    if(l >= d) break;
    // does this node branch at all? physics dial: eta shapes how
    // greedily the tips hog the growth
    addr = hashu(addr);
    if(u2f(addr) > P[1]){ break; }          // starved limb: dies here
    // the point walks one child; the child's geometry is addressed
    pt = hashu(pt);
    float side = (u2f(pt) < 0.5) ? -1.0 : 1.0;
    addr = hashu(addr ^ ((side < 0.0) ? 1103515245u : 12345u));
    float jitter = (u2f(hashu(addr)) - 0.5) * 0.7;
    float a = side * angRad * (1.0 + jitter);
    float c = cos(a), s = sin(a);
    // pure rotation, unit in, unit out: drift over 22 levels is
    // ~1e-6, far under a filament's own width
    dir = vec2(dir.x * c - dir.y * s, dir.x * s + dir.y * c);
    len   *= contr;
    width *= 0.62;
    pos   += dir * len;
    lived += 1;
  }

  // seat along the final filament. Current crowds the channel's
  // surface, so the transverse seat is bank-weighted - twin rails
  // instead of an airbrushed capsule - and the width tapers toward
  // the child it feeds, so limbs meet their twigs instead of
  // fading beside them.
  pt = hashu(pt);
  float t = u2f(pt);
  vec2 seat = pos - dir * len * (1.0 - t);
  float wLocal = width * mix(1.15, 0.62, t);
  float u = 2.0 * rnd.z - 1.0;
  float bank = sign(u) * pow(abs(u), 0.30) * 0.5;
  float core = (rnd.w - 0.5) * 0.35;
  seat += vec2(-dir.y, dir.x) * (bank + core) * wLocal;
  float yRef = (lived == 0) ? (pos.y - dir.y * len * (1.0 - t))
                            : yBase;
  seat.y -= P[7] * yRef;
  float z = (rnd.y - 0.5) * wLocal * 2.0;
  // the channel is not uniform: hashed micro-texture along its run
  float tex = 0.7 + 0.6 * u2f(hashu(addr ^ uint(t * 97.0)));

  float lv = float(lived) / max(P[0], 1.0);
  float hot = 1.0 - lv;
  col = pal(0.62 + 0.25 * lv,
            vec3(0.42, 0.36, 0.52), vec3(0.5, 0.45, 0.5),
            vec3(1.0, 0.85, 0.7), vec3(0.05, 0.2, 0.45))
        * (0.5 + 1.6 * hot * hot + P[5] * lv * lv * 1.8) * tex;
  return vec3(seat.x, seat.y * 0.92, z);
}`
});
