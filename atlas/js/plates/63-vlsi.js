"use strict";
Atlas.registerPlate({
  id: "vlsi",
  name: "Very Large Scale Integration",
  roman: "LXIII",
  accent: "#f0b448",
  tex: "R\\to R'\\sqcup R'',\\ \\ \\partial\\in 5760\\,\\mathbb{Z}\\,\\mathrm{nm},\\quad \\tau'=M[\\tau,h(a)],\\quad F\\subset\\mathbb{Z}^2\\,\\mathrm{nm}",
  plain: "R → R′ ⊔ R″, cuts on 5760·ℤ nm;  τ′ = M[τ, h(addr)];  every feature an integer-nm rectangle",
  caption: "In 1959 Jean Hoerni flattened the transistor into a drawing and Robert Noyce saw that the drawing could carry its own wiring; ever since, a computer is a photograph, stepped onto silicon as rectangles on an integer grid. This plate draws such a die the Mk2 way, addressed and never stored: a pad ring, a cache, and a floor of logic recursively cut from one 10.32 mm square, every cut, bus, cell, gate and contact hashed from its address on a lattice of whole nanometres, the way a mask database keeps them. It is the first plate whose subject is not mathematics but a made thing - nothing here is a theorem, and the fidelity is to a craft. MAGNIFY rides the same addresses downward, and because the lattice is integer arithmetic the window stays exact where float32 would have dissolved; the recursion bottoms where the process does, at a gate 180 nanometres long. Seventh of the Mk2 series: a portrait of the object every other plate has been running on.",
  cam: { dist: 3.0, pitch: 0.30, tgtY: 0.0, rot: 0.0 },
  gain: 0.5,
  params: [
    { label: "DEPTH",        min: 2,    max: 16,   step: 1,    def: 16   },
    { label: "MAGNIFY",      min: 0,    max: 14,   step: 0.25, def: 0    },
    { label: "MASK SET",     min: 1,    max: 64,   step: 1,    def: 7    },
    { label: "CACHE",        min: 0.15, max: 0.55, step: 0.01, def: 0.30 },
    { label: "METAL LAYERS", min: 3,    max: 6,    step: 1,    def: 5    },
    { label: "UTILIZATION",  min: 0.40, max: 0.98, step: 0.01, def: 0.82 },
    { label: "STAIN",        min: 0,    max: 1,    step: 0.01, def: 0.35 },
    { label: "FILL",         min: 0,    max: 1,    step: 0.01, def: 0.55 }
  ],
  glsl: `
// ───── the process: every constant is a whole number of nanometres ────
// D3D's shader compiler grows superlinearly with flattened program
// size (measured here: time ~ size^2.6, thirty seconds for the naive
// writing of this plate against the breakdown's 0.2). So the furniture
// vocabulary is built like the die is: one track engine, one fill, one
// ring, one dot, and every branch below only fills in parameters.
const int VROW  = 5760;      // standard-cell row pitch
const int VSITE = 720;       // poly gate pitch
const int VDIE  = 10321920;  // the die edge, 10.32 mm
const int VPADB = 184320;    // pad-ring band, 32 rows deep
const int VCTR  = 5160960;   // die centre

float vlsi_u(inout uint s){ s = hashu(s); return u2f(s); }

// false colour by layer, the way a die shot's interference stains them
vec3 vlsi_lay(int m){
  if(m == 0)  return vec3(0.95, 0.50, 0.10);   // poly
  if(m == 1)  return vec3(1.00, 0.72, 0.22);   // metal 1
  if(m == 2)  return vec3(0.35, 0.90, 0.38);   // metal 2
  if(m == 3)  return vec3(0.16, 0.72, 0.62);   // metal 3
  if(m == 4)  return vec3(0.82, 0.16, 0.22);   // metal 4
  if(m == 5)  return vec3(0.45, 0.58, 1.00);   // metal 5
  if(m == 6)  return vec3(1.00, 0.85, 0.45);   // bond pad
  if(m == 7)  return vec3(0.55, 0.16, 0.12);   // diffusion
  if(m == 8)  return vec3(1.00, 0.88, 0.55);   // contact
  if(m == 9)  return vec3(0.10, 0.16, 0.42);   // field and well
  if(m == 10) return vec3(0.35, 0.09, 0.12);   // array field
  return vec3(0.65, 0.42, 0.12);               // cell field
}

// STAIN turns the whole dielectric stack: a hue rotation about grey
vec3 vlsi_stain(vec3 c, float a){
  float cs = cos(a), sn = sin(a);
  vec3 k = vec3(0.57735027);
  return c * cs + cross(k, c) * sn + k * dot(k, c) * (1.0 - cs);
}

// pick a visible side of a rectangle's outline, band width wnm inward
bool vlsi_ringp(ivec2 lo, ivec2 hi, int wnm, inout uint s, ivec4 win,
                out bool horiz, out int a0, out int a1, out int cc){
  horiz = true; a0 = 0; a1 = 0; cc = 0;
  int side = int(vlsi_u(s) * 4.0);
  for(int k = 0; k < 4; k++){
    int sd = (side + k) & 3;
    bool hz = (sd < 2);
    int ec = (sd == 0) ? lo.y : (sd == 1) ? hi.y : (sd == 2) ? lo.x : hi.x;
    int bc = ec + ((sd == 0 || sd == 2) ? wnm : -wnm) / 2;
    if(hz  && (bc < win.y || bc > win.w)) continue;
    if(!hz && (bc < win.x || bc > win.z)) continue;
    horiz = hz; cc = bc;
    a0 = hz ? lo.x : lo.y;
    a1 = hz ? hi.x : hi.y;
    return true;
  }
  return false;
}

// fold a (along, across-from-edge) frame onto one of the four sides
ivec2 vlsi_smap(int s, int al, int ac){
  if(s == 0) return ivec2(al, ac);
  if(s == 1) return ivec2(al, VDIE - ac);
  if(s == 2) return ivec2(ac, al);
  return ivec2(VDIE - ac, al);
}

vec3 shape_vlsi(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // The die is addressed, never stored: every cut, bus, cell and
  // contact hashes from its address alone, so all points agree on the
  // figure and any pass schedule converges to the same limit image.
  // The point's own stream only chooses a path down and a seat.
  uint pt = hashu(seed ^ hashu(floatBitsToUint(q.x))
                       ^ hashu(floatBitsToUint(q.y) * 668265263u));
  pt = hashu(pt ^ floatBitsToUint(rnd.x));

  int   maxD   = int(P[0] + 0.5);
  float mag    = exp2(P[1]);
  uint  maskNo = uint(P[2] + 0.5);
  float cacheF = P[3];
  int   metals = int(P[4] + 0.5);
  float util   = P[5];
  float stain  = (P[6] - 0.35) * 2.6;
  float fillL  = P[7];

  // MAGNIFY is a window on the lattice, held in integers. The descent
  // only walks nodes the window can see, so a deep dive spends its
  // whole budget inside the frame instead of on the die it left.
  int hw = int(float(VCTR) / mag);
  ivec4 win = ivec4(VCTR - hw, VCTR - hw, VCTR + hw, VCTR + hw);
  float km = mag * 2.5189112e-7;      // plate units per nm, times mag

  // depth drawn with the series' budget law, leaning deeper as the
  // window dives - the coarse furniture has left the frame by then
  pt = hashu(pt);
  float bias = mix(0.72, 0.20, clamp(P[1] / 14.0, 0.0, 1.0));
  int d = int(pow(u2f(pt), bias) * float(maxD));

  // furniture requests: branches only fill these in; each engine runs
  // once, at the tail
  int fmode = 0;                 // 0 cull, 1 wire, 2 fill, 3 dot, 4 seated, 5 tracks
  bool fhz = true; int fa0 = 0, fa1 = 0, fcc = 0, fw = 0;
  ivec2 flo = ivec2(0), fhi = ivec2(0);
  ivec2 fct = ivec2(0);
  ivec2 fa = ivec2(0);
  vec2  fo = vec2(0.0);
  int   lay = 1;
  float glow = 1.0;
  uint  tex = pt;
  // the track engine: tN parallel runs at tPitch, occupancy addressed
  // from tSalt, optional trimmed runs, a via share at the run ends
  int tBase = 0, tPitch = 1, tN = 1, tR0 = 0, tR1 = 0, tW = 0;
  int tLayA = 2, tLayB = 2, tTrim = 0;
  float tOcc = 1.0, tVia = 0.0;
  uint tSalt = 0u;

  if(d == 0){
    // ───── the die itself: seal, fiducials, the mask corner ─────
    float u = vlsi_u(pt);
    if(u < 0.52){
      bool outer = u < 0.38;
      ivec2 inset = ivec2(outer ? 46080 : 69120);
      if(vlsi_ringp(inset, ivec2(VDIE) - inset, outer ? 11520 : 5760, pt, win, fhz, fa0, fa1, fcc)){
        fmode = 1; fw = outer ? 11520 : 5760;
      }
      lay = outer ? min(4, metals) : 1; glow = outer ? 1.1 : 1.0;
    } else if(u < 0.68){
      // the stepper's alignment crosses, one per corner
      int cnr = int(vlsi_u(pt) * 4.0);
      ivec2 cc2 = ivec2((cnr == 1 || cnr == 3) ? VDIE - 115200 : 115200,
                        (cnr >= 2) ? VDIE - 115200 : 115200);
      fhz = vlsi_u(pt) < 0.5;
      int m0 = fhz ? cc2.x : cc2.y;
      fmode = 5; tBase = fhz ? cc2.y : cc2.x; tN = 1;
      tR0 = m0 - 17280; tR1 = m0 + 17280; tW = 5760;
      tLayA = 0; tLayB = 0; tSalt = uint(cnr);
      glow = 1.2;
    } else {
      // the mask signs its corner in contact dots: P C 6 3
      int g = int(vlsi_u(pt) * 4.0);
      uint bm = g == 0 ? 0x1e8fa10u : g == 1 ? 0xf8420fu
              : g == 2 ? 0xe87a2eu  : 0x1e0b83eu;
      int gx0 = VDIE - 246240 + g * 50400;
      for(int k = 0; k < 5; k++){
        int bx = int(vlsi_u(pt) * 5.0);
        int by = int(vlsi_u(pt) * 5.0);
        if(((bm >> uint(24 - (by * 5 + bx))) & 1u) == 1u){
          fmode = 3; fct = ivec2(gx0 + bx * 7200, 5040 + (4 - by) * 7200);
          fw = 2520;
          break;
        }
      }
      lay = 8; glow = 1.3;
    }
  } else if(d == 1){
    // ───── the pad ring: 85 pads a side, ESD teeth, ring buses ─────
    int sd2 = int(vlsi_u(pt) * 4.0);
    float u = vlsi_u(pt);
    pt = hashu(pt);
    int k = int(u2f(pt) * 85.0);
    int pc = 322560 + k * 115200;
    if(u < 0.34){
      ivec2 p0 = vlsi_smap(sd2, pc - 34560, 57600);
      ivec2 p1 = vlsi_smap(sd2, pc + 34560, 126720);
      fmode = 2; flo = min(p0, p1); fhi = max(p0, p1);
      lay = 6; glow = 1.35; tex = hashu(uint(sd2 * 97 + k));
    } else if(u < 0.50){
      ivec2 p0 = vlsi_smap(sd2, pc - 40320, 51840);
      ivec2 p1 = vlsi_smap(sd2, pc + 40320, 132480);
      if(vlsi_ringp(min(p0, p1), max(p0, p1), 5760, pt, win, fhz, fa0, fa1, fcc)){
        fmode = 1; fw = 5760;
      }
      lay = min(5, metals);
    } else if(u < 0.76){
      // the ESD farm behind each pad: a comb of contacts
      pt = hashu(pt);
      int gi = int(u2f(pt) * 16.0);
      pt = hashu(pt);
      int gj = int(u2f(pt) * 8.0);
      fmode = 3;
      fct = vlsi_smap(sd2, pc - 23040 + gi * 2880 + 1440, 138240 + gj * 2880 + 1440);
      fw = 1080;
      lay = 8; glow = 1.1;
    } else {
      // three supply rings run the whole side behind the pads
      ivec2 a2 = vlsi_smap(sd2, 0, 162720);
      fmode = 5; fhz = sd2 < 2;
      tBase = fhz ? a2.y : a2.x;
      tPitch = (sd2 == 0 || sd2 == 2) ? 8640 : -8640;
      tN = 3; tR0 = 230400; tR1 = VDIE - 230400; tW = 2880;
      tLayA = min(5, metals); tLayB = min(4, metals);
      tSalt = uint(sd2 * 31); glow = 1.1;
    }
  } else {
    // ───── the floorplan: guillotine cuts on the row lattice ─────
    int budget = d - 2;
    ivec2 lo = ivec2(VPADB), hi = ivec2(VDIE - VPADB);
    uint fp = hashu(2166136261u ^ (maskNo * 2654435761u));
    int typ = 0;              // 0 mixed  1 cache band  2 sram cluster
    int lvl = 0;              // 3 rows  4 datapath  5 sram  6 analog  7 channel
    bool stopHere = false, dead = false;
    bool cutY = false; int cc = 0; int chw = 0;
    // no returns inside this loop: an early exit unrolled fourteen
    // times threads its predicate through everything downstream and
    // multiplies the D3D compile again - a break and a flag do not
    for(int l = 0; l < 14; l++){
      int w = hi.x - lo.x, h = hi.y - lo.y;
      int longSide = max(w, h);
      // does the grammar bottom out here?
      if(typ == 2){
        if(longSide <= 192 * VROW){ typ = 5; break; }
      } else if(typ == 0){
        uint la = hashu(fp ^ 0x51ed270bu);
        if(longSide <= 48 * VROW){
          float tu = u2f(la);
          typ = tu < 0.56 ? 3 : tu < 0.72 ? 4 : tu < 0.84 ? 5
              : tu < 0.90 ? 6 : 7;
          break;
        }
        if(longSide <= 144 * VROW && u2f(hashu(la)) < 0.09){
          typ = u2f(hashu(la ^ 3u)) < 0.6 ? 5 : 6;   // a hard macro, early
          break;
        }
      }
      // this node's cut is part of its identity: addressed, snapped to
      // the row lattice, computed before the budget is consulted so a
      // stopped point can light the channel the cut carries
      uint ca = hashu(fp ^ 0xc2b2ae3du);
      if(lvl == 0){
        cutY = true;                     // the cache rides the top
        cc = hi.y - int(cacheF * float(h));
      } else if(typ == 1){
        cutY = false;                    // the spine splits the halves
        cc = (lo.x + hi.x) / 2;
      } else {
        cutY = (h > w) || (h == w && u2f(ca) < 0.5);
        float f = 0.34 + 0.32 * u2f(hashu(ca));
        cc = (cutY ? lo.y : lo.x) + int(f * float(cutY ? h : w));
      }
      cc = (cc / VROW) * VROW;
      chw = VROW * (lvl == 0 ? 4 : lvl == 1 ? 3 : lvl <= 3 ? 2 : 1);
      int e0 = cutY ? lo.y : lo.x, e1 = cutY ? hi.y : hi.x;
      cc = clamp(cc, e0 + 12 * VROW + chw, e1 - 12 * VROW - chw);
      if(lvl >= budget){ stopHere = true; break; }
      // descend one side, weighted by what the window can see
      int a1 = cc - chw, b0 = cc + chw;
      int w0 = cutY ? win.y : win.x, w1 = cutY ? win.w : win.z;
      int la2 = max(0, min(a1, w1) - max(e0, w0));
      int lb2 = max(0, min(e1, w1) - max(b0, w0));
      if(la2 + lb2 == 0){ dead = true; break; }
      pt = hashu(pt);
      bool sideA = float(la2) > u2f(pt) * float(la2 + lb2);
      if(cutY){ if(sideA) hi.y = a1; else lo.y = b0; }
      else    { if(sideA) hi.x = a1; else lo.x = b0; }
      int ntyp = typ;
      if(lvl == 0) ntyp = sideA ? 0 : 1;
      if(typ == 1) ntyp = 2;
      typ = ntyp;
      fp = hashu(fp ^ (sideA ? 0x9e3779b9u : 0x7f4a7c15u));
      lvl += 1;
    }

    int w = hi.x - lo.x, h = hi.y - lo.y;
    int r = stopHere ? -1 : min(budget - lvl, 6);
    float uF = vlsi_u(pt);
    float tintW = mix(0.12, 0.40, fillL);

    if(dead){
      /* the window sees neither child: fmode stays 0 and the tail culls */
    } else if(stopHere ? (uF < tintW) : (r == 0 && uF < mix(0.30, 0.62, fillL))){
      // a field tint: how the block photographs from above
      fmode = 2; flo = lo; fhi = hi;
      lay = (typ == 2 || typ == 1 || typ == 5) ? 10
          : (typ == 6) ? 9
          : (u2f(hashu(fp ^ 0x85ebca6bu)) < 0.30 && typ == 0) ? 9 : 11;
      glow = 0.24 + 0.40 * fillL;
      tex = hashu(fp ^ 0xa511e9b3u);
    } else if(stopHere ? (uF < tintW + 0.12) : (r == 0)){
      // the block's own ring: power at the interior nodes, a thin
      // boundary at the leaves
      ivec2 inset = ivec2(stopHere ? VROW : 0);
      if(vlsi_ringp(lo + inset, hi - inset, stopHere ? 2880 : 1440, pt, win, fhz, fa0, fa1, fcc)){
        fmode = 1; fw = stopHere ? 2880 : 1440;
      }
      lay = stopHere ? min(5, metals) : (typ == 5 ? 3 : 1);
      glow = stopHere ? 1.05 : 0.9;
    } else if(stopHere && uF < tintW + 0.20){
      // the clock's limb: centre toward a child centre, the hierarchy
      // distributing its own heartbeat
      ivec2 pc2 = (lo + hi) / 2;
      int t0 = cutY ? lo.y : lo.x, t1 = cutY ? hi.y : hi.x;
      int tgt = (vlsi_u(pt) < 0.5) ? (t0 + cc - chw) / 2 : (cc + chw + t1) / 2;
      int c0 = cutY ? pc2.y : pc2.x;
      fmode = 5; fhz = !cutY; tN = 1;
      tBase = cutY ? pc2.x : pc2.y;
      tR0 = min(c0, tgt); tR1 = max(c0, tgt); tW = 1440;
      tLayA = min(5, metals); tLayB = tLayA; tSalt = fp ^ 77u;
      glow = 1.35;
    } else if(stopHere){
      // the wiring channel the cut carries: track counts written as
      // constant divisions so no integer-divide emulation is emitted
      int pitch = (lvl <= 1) ? 11520 : (lvl <= 3) ? 5760 : 1440;
      fmode = 5; fhz = cutY;
      tPitch = pitch;
      tN = (lvl <= 1) ? (2 * chw) / 11520 : (lvl <= 3) ? (2 * chw) / 5760 : (2 * chw) / 1440;
      tBase = cc - chw + pitch / 2;
      tR0 = cutY ? lo.x : lo.y; tR1 = cutY ? hi.x : hi.y;
      tW = pitch / 2;
      tLayA = (lvl <= 1) ? min(5, metals) : (lvl <= 3) ? min(4, metals) : 2;
      tLayB = (lvl <= 3) ? tLayA : 3;
      tOcc = util * 0.92; tTrim = 1; tVia = 0.14; tSalt = fp;
    } else if(typ == 3 || typ == 4){
      // ───── rows of standard cells; a datapath repeats a slice ────
      bool dp = (typ == 4);
      if(r == 1){
        if(uF < 0.58){
          // the supply rails: one bright line per row edge
          fmode = 5; fhz = true; tBase = lo.y; tPitch = VROW;
          tN = h / VROW + 1; tR0 = lo.x; tR1 = hi.x; tW = 720;
          tLayA = 1; tLayB = 1; tSalt = fp ^ 0x1a2b3c4du;
          glow = 1.3;
        } else {
          // the n-well: the top half of every other row
          pt = hashu(pt);
          int rr = int(u2f(pt) * float(h / VROW));
          int y0 = lo.y + rr * VROW + (((rr & 1) == 0) ? 2880 : 0);
          fmode = 2; flo = ivec2(lo.x, y0); fhi = ivec2(hi.x, y0 + 2880);
          lay = 9; glow = 0.14 + 0.26 * fillL;
        }
      } else if(r == 2){
        // over-the-cell routing: most of what a die shot shows
        bool vert = uF < (dp ? 0.80 : 0.55);
        fmode = 5; fhz = !vert;
        tBase = (vert ? lo.x : lo.y) + 720; tPitch = 1440;
        tN = (vert ? w : h) / 1440;
        tR0 = vert ? lo.y : lo.x; tR1 = vert ? hi.y : hi.x;
        tW = 720;
        tLayA = vert ? 2 : 3; tLayB = tLayA;
        tOcc = util * (vert ? (dp ? 0.95 : 0.60) : 0.45);
        tTrim = (dp && vert) ? 0 : 1; tVia = 0.12;
        tSalt = fp ^ (vert ? 40503u : 69061u);
        glow = (dp && vert) ? 1.15 : 1.0;
      } else if(r >= 3){
        // the device layer: gates, diffusion, straps and contacts share
        // one stage, so surplus depth pools its light down here. a
        // datapath hashes by position within the slice, so all slices
        // place the same cell - the regularity is honest
        pt = hashu(pt);
        int rr = int(u2f(pt) * float(h / VROW));
        pt = hashu(pt);
        int sl = int(u2f(pt) * float(w / VROW));
        uint ca2 = hashu(fp ^ (uint(dp ? (sl & 3) : sl) * 83492791u)
                            ^ (uint(rr) * 297121507u));
        int x0 = lo.x + sl * VROW;
        int y0 = lo.y + rr * VROW;
        if(u2f(ca2) > util * 0.94){
          fmode = 2; flo = ivec2(x0, y0); fhi = ivec2(x0 + VROW, y0 + VROW);
          lay = 11; glow = 0.10 + 0.18 * fillL;   // a filler cell
        } else {
          int ws = (2 + int(u2f(hashu(ca2 ^ 2u)) * 3.0)) * 1440;
          float uc = vlsi_u(pt);
          if(uc < 0.34){
            // the gates, with poly contacts at their feet
            fmode = 5; fhz = false; tBase = x0 + 360; tPitch = VSITE;
            tN = ws / VSITE; tR0 = y0 + 480; tR1 = y0 + 5280; tW = 180;
            tLayA = 0; tLayB = 0; tVia = 0.22; tSalt = ca2;
            glow = 1.05;
          } else if(uc < 0.56){
            bool nside = vlsi_u(pt) < 0.5;
            fmode = 2;
            flo = ivec2(x0 + 240, y0 + (nside ? 1080 : 3240));
            fhi = ivec2(x0 + ws - 240, y0 + (nside ? 2520 : 4680));
            lay = 7; glow = 0.55;
          } else {
            // metal-1 straps at the transistor rows, contacts at
            // their ends - the lattice's last word
            fmode = 5; fhz = true; tBase = y0 + 1800; tPitch = 2160;
            tN = 2; tR0 = x0 + 240; tR1 = x0 + ws - 240; tW = 270;
            tLayA = 1; tLayB = 1; tVia = 0.34; tSalt = ca2 ^ 91u;
          }
        }
      }
    } else if(typ == 5){
      // ───── sram: banks, bitlines, then the mirrored bitcell ─────
      // bank counts are powers of two so the bank width is a shift:
      // D3D has no integer divide, and a variable divisor becomes a
      // long emulation sequence at every use
      int bxs = (w >= 9953280) ? 3 : (w >= 4976640) ? 2 : (w >= 2488320) ? 1 : 0;
      int bys = (h >= 9953280) ? 3 : (h >= 4976640) ? 2 : (h >= 2488320) ? 1 : 0;
      int bx = 1 << bxs, by = 1 << bys;
      int bw = w >> bxs, bh = h >> bys;
      pt = hashu(pt);
      int bi = int(u2f(pt) * float(bx));
      pt = hashu(pt);
      int bj = int(u2f(pt) * float(by));
      ivec2 blo = lo + ivec2(bi * bw, bj * bh);
      ivec2 bhi = blo + ivec2(bw, bh);
      int ay = blo.y + 3 * VROW;
      uint ba = hashu(fp ^ (uint(bj * 8 + bi) * 2246822519u));
      if(r == 1){
        if(uF < 0.34){
          // the sense band along the bank's foot
          fmode = 2; flo = blo; fhi = ivec2(bhi.x, ay);
          lay = 11; glow = 0.5; tex = hashu(ba ^ 5u);
        } else if(uF < 0.62){
          // the decoder spine up the middle: short wordline stubs
          int sx = (blo.x + bhi.x) / 2;
          fmode = 5; fhz = true; tBase = ay + 720; tPitch = 1440;
          tN = (bh - 3 * VROW) / 1440;
          tR0 = sx - 2 * VROW; tR1 = sx + 2 * VROW; tW = 480;
          tLayA = 0; tLayB = 0; tSalt = ba ^ 13u;
          glow = 0.9;
        } else {
          if(vlsi_ringp(blo, bhi, 1440, pt, win, fhz, fa0, fa1, fcc)){
            fmode = 1; fw = 1440;
          }
          lay = 2;
        }
      } else if(r == 2){
        // bitlines run the array; wordlines cross beneath them
        bool bl = uF < 0.60;
        fmode = 5; fhz = !bl;
        tBase = bl ? blo.x + 1200 : ay + 960;
        tPitch = bl ? 2400 : 1920;
        tN = bl ? bw / 2400 : (bhi.y - ay) / 1920;
        tR0 = bl ? ay : blo.x; tR1 = bl ? bhi.y : bhi.x;
        tW = bl ? 300 : 240;
        tLayA = bl ? 2 : 0; tLayB = tLayA;
        tSalt = ba ^ (bl ? 3u : 7u);
        glow = bl ? 1.05 : 0.55;
      } else if(r >= 3){
        // the bitcell, 2400 by 1920, mirrored with its neighbours
        // exactly as the mask mirrors them
        pt = hashu(pt);
        int ci = int(u2f(pt) * float((bhi.x - blo.x) / 2400));
        pt = hashu(pt);
        int cj = int(u2f(pt) * float((bhi.y - ay) / 1920));
        ivec2 cl0 = ivec2(blo.x + ci * 2400, ay + cj * 1920);
        bool mx = (ci & 1) == 1, my = (cj & 1) == 1;
        float uc = vlsi_u(pt);
        if(uc < 0.30){
          // the gate pair: mirroring swaps the two lines, which is
          // the same pair, so the set needs no flip
          fmode = 5; fhz = true; tPitch = 960; tN = 2;
          tBase = cl0.y + 480;
          tR0 = cl0.x + 240; tR1 = cl0.x + 2160; tW = 180;
          tLayA = 0; tLayB = 0; tSalt = hashu(ba ^ uint(ci * 73 + cj));
        } else if(uc < 0.60){
          int lx = (vlsi_u(pt) < 0.5) ? 480 : 1500;
          if(mx) lx = 1980 - lx;
          fmode = 2;
          flo = ivec2(cl0.x + lx, cl0.y + 240);
          fhi = ivec2(cl0.x + lx + 420, cl0.y + 1680);
          lay = 7; glow = 0.6;
        } else {
          int cx2 = (vlsi_u(pt) < 0.5) ? 690 : 1710;
          int cy2 = (vlsi_u(pt) < 0.5) ? 480 : 1440;
          if(mx) cx2 = 2400 - cx2;
          if(my) cy2 = 1920 - cy2;
          fmode = 3; fct = cl0 + ivec2(cx2, cy2); fw = 180;
          lay = 8; glow = 1.3;
        }
      }
    } else if(typ == 6 && r >= 1){
      // ───── analog: the inductor, its capacitor, wide fingers ────
      ivec2 c2 = (lo + hi) / 2;
      int ro = (min(w, h) * 9) / 25;
      if(uF < 0.48){
        // four octagonal turns spiralling inward: the one place on
        // the die that is not axis-aligned
        float th = vlsi_u(pt) * 25.13274;
        float k8 = cos(mod(th, 0.7853982) - 0.3926991);
        float rr2 = (float(ro) - th * float(ro) * 0.0223) / k8;
        float v2 = 2.0 * rnd.z - 1.0;
        rr2 += (sign(v2) * pow(abs(v2), 0.35) * 0.5 + (rnd.w - 0.5) * 0.3)
               * float(ro) * 0.045;
        fmode = 4; fa = c2; fo = vec2(rr2 * cos(th), rr2 * sin(th));
        lay = min(5, metals); glow = 1.15;
        tex = hashu(fp ^ uint(th * 8.0));
      } else if(uF < 0.72){
        // the capacitor: a plate of plates
        ivec2 q0 = c2 + ivec2(2 * VROW);
        int cs = (min(hi.x - q0.x, hi.y - q0.y) - VROW) / 8;
        if(cs > 0){
          pt = hashu(pt);
          int gi = int(u2f(pt) * 8.0);
          pt = hashu(pt);
          int gj = int(u2f(pt) * 8.0);
          fmode = 2;
          flo = q0 + ivec2(gi * cs, gj * cs);
          fhi = flo + ivec2((cs * 3) / 5);
          lay = min(4, metals); glow = 0.9;
        }
      } else {
        // wide transistors: poly fingers combed over one diffusion
        ivec2 f0 = lo + ivec2(2 * VROW);
        int fw2 = w / 2 - 3 * VROW;
        int fh2 = h / 2 - 3 * VROW;
        if(fw2 > VSITE * 4 && fh2 > VROW){
          if(vlsi_u(pt) < 0.4){
            fmode = 2; flo = f0; fhi = f0 + ivec2(fw2, fh2);
            lay = 7; glow = 0.5;
          } else {
            fmode = 5; fhz = false; tBase = f0.x + VSITE;
            tPitch = 2 * VSITE; tN = fw2 / (2 * VSITE);
            tR0 = f0.y - 720; tR1 = f0.y + fh2 + 720; tW = 240;
            tLayA = 0; tLayB = 0; tSalt = fp ^ 29u;
            glow = 1.05;
          }
        }
      }
    } else if(typ == 7 && r >= 1){
      // ───── a routing channel wide enough to be its own block ────
      bool vert = h > w;
      fmode = 5; fhz = !vert;
      tBase = (vert ? lo.x : lo.y) + 720; tPitch = 1440;
      tN = (vert ? w : h) / 1440;
      tR0 = vert ? lo.y : lo.x; tR1 = vert ? hi.y : hi.x;
      tW = 720; tLayA = 2; tLayB = 3;
      tOcc = util * 0.85; tTrim = 1; tVia = 0.12; tSalt = fp;
    }
  }

  // ───── the engines: each primitive has one call site ─────
  if(fmode == 5){
    // pick an occupied track, trim its run, maybe seat on a via
    bool got = false; uint ta = tSalt; int j = 0;
    for(int k2 = 0; k2 < 4; k2++){
      pt = hashu(pt);
      j = int(u2f(pt) * float(tN));
      ta = hashu(tSalt ^ (uint(j) * 2654435761u));
      if(u2f(ta) < tOcc){ got = true; break; }
    }
    if(got){
      fcc = tBase + j * tPitch;
      fa0 = tR0; fa1 = tR1;
      if(tTrim == 1){
        float q0 = u2f(hashu(ta ^ 5u)), q1 = u2f(hashu(ta ^ 9u));
        int rl = fa1 - fa0;
        fa0 += (int(q0 * 0.5 * float(rl)) / VROW) * VROW;
        int r1b = fa1 - (int(q1 * 0.5 * float(rl)) / VROW) * VROW;
        fa1 = max(r1b, fa0 + VROW);
      }
      lay = ((j & 1) == 0) ? tLayA : tLayB;
      tex = hashu(ta);
      float uvia = vlsi_u(pt);
      if(uvia < tVia){
        fmode = 3; fw = tW;
        fct = fhz ? ivec2(uvia < tVia * 0.5 ? fa0 : fa1, fcc)
                  : ivec2(fcc, uvia < tVia * 0.5 ? fa0 : fa1);
        lay = 8; glow *= 1.2;
      } else {
        fmode = 1; fw = tW;
      }
    } else fmode = 0;
  }

  bool hit = false;
  if(fmode == 1){
    // a wire: run clipped to the window, transverse seat bank-weighted
    int c0 = fhz ? win.x : win.y;
    int c1 = fhz ? win.z : win.w;
    fa0 = max(fa0, c0); fa1 = min(fa1, c1);
    if(fa1 > fa0){
      int ax = fa0 + int(vlsi_u(pt) * float(fa1 - fa0));
      float v = 2.0 * rnd.z - 1.0;
      float bank = sign(v) * pow(abs(v), 0.35) * 0.5;
      float across = (bank + (rnd.w - 0.5) * 0.30) * float(fw);
      fa = fhz ? ivec2(ax, fcc) : ivec2(fcc, ax);
      fo = fhz ? vec2(0.0, across) : vec2(across, 0.0);
      hit = true;
    }
  } else if(fmode == 2){
    // a fill: uniform in the rectangle, clipped to the window first
    flo = max(flo, win.xy); fhi = min(fhi, win.zw);
    if(fhi.x > flo.x && fhi.y > flo.y){
      fa = flo;
      fo = vec2(vlsi_u(pt) * float(fhi.x - flo.x),
                vlsi_u(pt) * float(fhi.y - flo.y));
      hit = true;
    }
  } else if(fmode == 3){
    // a contact or via: a small square, filled edge to edge
    if(fct.x > win.x - fw && fct.x < win.z + fw &&
       fct.y > win.y - fw && fct.y < win.w + fw){
      fa = fct;
      fo = (vec2(rnd.z, rnd.w) - 0.5) * float(2 * fw) * 0.92;
      hit = true;
    }
  } else if(fmode == 4){
    hit = true;                    // seated inline (the inductor)
  }

  if(!hit){ col = vec3(0.0); return vec3(0.0, -20000.0, 0.0); }

  // exact to the nanometre at any magnification: the integer offset
  // from centre is taken before the only conversion to float
  vec2 seat = (vec2(fa - ivec2(VCTR)) + fo) * km;

  // the stack has height: each layer floats a little above the last,
  // so the die reads flat from afar and grows relief as the window dives
  float zl = min(6.0e-6 * mag, 0.045);
  float zi = (lay == 0) ? 0.5 : (lay <= 6) ? float(lay)
           : (lay == 7) ? 0.0 : (lay == 8) ? 0.8 : -0.6;
  float z = (zi - 2.2) * zl + (rnd.y - 0.5) * zl * 0.6;

  float brt = 0.72 + 0.56 * u2f(hashu(tex));
  col = max(vlsi_stain(vlsi_lay(lay), stain) * (glow * brt), vec3(0.0));
  return vec3(seat.x, seat.y, z);
}`
});
