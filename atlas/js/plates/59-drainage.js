"use strict";
Atlas.registerPlate({
  id: "drainage",
  name: "The Drainage Basin",
  roman: "LIX",
  accent: "#6fb3e0",
  tex: "L \\sim A^{h},\\quad h\\approx 0.57\\qquad (\\text{Hack's law})",
  plain: "L ∼ A^h,  h ≈ 0.57   (Hack's law: stream length vs basin area)",
  caption: "Rain has no plan, and yet every landscape drains through the same architecture: rivulets feed creeks feed rivers, junction by junction, with scaling laws so stable they hold from a hillside gully to the Amazon - stream lengths growing as basin area to Hack's exponent, tributary counts falling in Horton's ratios. This basin grows by those laws, each stream an addressed walk that meanders as it descends, each junction handing its water down an order. The trunk river runs the plate; everything else exists to find it. Third of the Mk2 series: at any magnification there is a smaller tributary still finding its way downhill.",
  cam: { dist: 3.0, pitch: 0.2, tgtY: 0.0, rot: 0.0 },
  gain: 0.55,
  params: [
    { label: "DEPTH",        min: 4,   max: 22,  step: 1,    def: 15   },
    { label: "JUNCTION DEG", min: 30,  max: 85,  step: 1,    def: 58   },
    { label: "LENGTH RATIO", min: 0.4, max: 0.62,step: 0.005,def: 0.52 },
    { label: "MEANDER",      min: 0,   max: 1,   step: 0.01, def: 0.55 },
    { label: "RELIEF",       min: 0,   max: 0.4, step: 0.005,def: 0.12 },
    { label: "SPAN",         min: 1.2, max: 3.2, step: 0.05, def: 2.8  },
    { label: "FLOW GLOW",    min: 0,   max: 1,   step: 0.01, def: 0.5  },
    { label: "KEEL",         min: 0,   max: 1,   step: 0.01, def: 0    }
  ],
  glsl: `
vec3 shape_drainage(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // The basin is addressed like the breakdown's tree: every stream's
  // geometry hashes from its address, every point walks one tributary
  // path, and depth is drawn uniformly so each order of stream gets
  // the same sample budget - a gully resolves like the river does.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 668265263u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  float span   = P[5];
  float lratio = P[2];
  float angRad = P[1] * 0.0174533;
  int   maxD   = int(P[0] + 0.5);
  pt = hashu(pt);
  int d = int(u2f(pt) * float(maxD));

  // the trunk river: 24 addressed reaches meandering seaward
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
    float w = (u2f(taddr) - 0.5) * 2.2 * P[3];
    float c = cos(w * 0.30), s = sin(w * 0.30);
    dir = vec2(dir.x * c - dir.y * s, dir.x * s + dir.y * c);
    dir = normalize(mix(dir, vec2(1.0, 0.0), 0.30));
    pos += dir * segLen;
  }
  float yBase = pos.y;

  // tributaries climb the orders: each level a smaller stream
  // joining steeply, meandering more (small streams wander; big
  // rivers are kept straight by their own discharge)
  float len   = segLen * 0.9;
  float width = 0.010;
  uint  addr  = hashu(taddr ^ 19349663u);
  int   lived = 0;
  for(int l = 0; l < 22; l++){
    if(l >= d) break;
    pt = hashu(pt);
    float side = (u2f(pt) < 0.5) ? -1.0 : 1.0;
    addr = hashu(addr ^ ((side < 0.0) ? 83492791u : 297121507u));
    float jitter = (u2f(addr) - 0.5) * 0.55;
    float a = side * angRad * (1.0 + jitter);
    float c = cos(a), s = sin(a);
    dir = vec2(dir.x * c - dir.y * s, dir.x * s + dir.y * c);
    // upstream meander grows as the stream shrinks
    uint ma = hashu(addr ^ 4256249u);
    float mw = (u2f(ma) - 0.5) * P[3] * (0.4 + 0.08 * float(l));
    float mc = cos(mw), ms = sin(mw);
    dir = vec2(dir.x * mc - dir.y * ms, dir.x * ms + dir.y * mc);
    len   *= lratio + 0.5 * (1.0 - lratio) * u2f(hashu(ma));
    width *= 0.60;
    pos   += dir * len;
    lived += 1;
  }

  pt = hashu(pt);
  float t = u2f(pt);
  vec2 seat = pos - dir * len * (1.0 - t);
  float wLocal = width * mix(1.1, 0.6, t);
  float u = 2.0 * rnd.z - 1.0;
  float bank = sign(u) * pow(abs(u), 0.35) * 0.5;
  seat += vec2(-dir.y, dir.x) * (bank + (rnd.w - 0.5) * 0.3) * wLocal;
  float yRef = (lived == 0) ? (pos.y - dir.y * len * (1.0 - t))
                            : yBase;
  seat.y -= P[7] * yRef;
  // relief: headwaters sit high, the trunk lies in its valley
  float lv = float(lived) / max(P[0], 1.0);
  float z = lv * P[4] + (rnd.y - 0.5) * wLocal * 2.0;

  float order = 1.0 - lv;
  col = pal(0.55 + 0.18 * lv,
            vec3(0.40, 0.46, 0.50), vec3(0.45, 0.42, 0.38),
            vec3(0.9, 0.8, 1.0), vec3(0.52, 0.30, 0.15))
        * (0.45 + 1.5 * order * order + P[6] * lv * 0.9);
  return vec3(seat.x, seat.y * 0.92, z);
}`
});
