"use strict";
Atlas.registerPlate({
  id: "swallow",
  name: "The Catastrophe Machines",
  roman: "XLVIII",
  accent: "#f09890",
  tex: "V=x^{4}+ax^{2}+bx,\\;\\{V'=0\\};\\qquad b=-4x^{3}-2ax,\\;\\;c=3x^{4}+ax^{2}",
  plain: "V = x⁴+ax²+bx, {V′=0};   b = −4x³−2ax,  c = 3x⁴+ax²",
  caption: "Thom's list: with at most four control parameters, a smooth potential admits exactly seven elementary catastrophes. FORM shows three. The cusp is the pleated equilibrium sheet of x⁴+ax²+bx — crossing the pleat forces the state to jump between folds, and STABILITY TINT dims the unstable sheet that mediates the jump: hysteresis made visible. The swallowtail is the quartic's double-root set; the elliptic umbilic, a three-cusped pillow. Nothing here traces their ridges — the parametrization's Jacobian collapses on them, so uniform sampling piles density onto the singular edges and the skeleton draws itself: brightness is measure. SECTION cuts down to the classic plane figures, among them the curve of Dalí's last painting.",
  cam: { dist: 3.3, pitch: 0.3, tgtY: 0.0, rot: 0.045 },
  gain: 0.9,
  params: [
    { label: "FORM",           min: 0,   max: 2,   step: 1,    def: 1    },
    { label: "SPREAD",         min: 0.5, max: 1.6, step: 0.01, def: 1.0  },
    { label: "SECTION",        min: 0,   max: 1,   step: 0.01, def: 0.0  },
    { label: "STABILITY TINT", min: 0,   max: 1,   step: 0.01, def: 0.75 },
    { label: "SCALE",          min: 0.5, max: 1.5, step: 0.01, def: 1.0  },
    { label: "GLOW",           min: 0,   max: 1,   step: 0.01, def: 0.5  }
  ],
  glsl: `
vec3 shape_swallow(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int form     = int(P[0] + 0.5);
  float spread = P[1];
  float sect   = P[2];
  float tint   = clamp(P[3], 0.0, 1.0);
  float scl    = P[4];
  float glow   = P[5];

  vec3 world;
  float a;             /* the unfolding depth coordinate swept by SECTION */
  float aMin, aMax;
  float uns;           /* 1.0 on the slate-tinted (degenerate/unstable) sheet */
  float hilite = 0.0;

  if(form == 2){
    /* Elliptic umbilic D4-:  V = x^3 - 3xy^2 + a(x^2+y^2) + bx + cy.
       V_x = 3x^2 - 3y^2 + 2ax + b = 0   ->   b = 3y^2 - 3x^2 - 2ax
       V_y = -6xy + 2ay + c        = 0   ->   c = 6xy - 2ay
       V_xx = 6x + 2a,  V_yy = -6x + 2a,  V_xy = -6y
       det Hess = (6x+2a)(-6x+2a) - 36y^2 = 4a^2 - 36(x^2+y^2)
       det = 0   ->   a = +-3*sqrt(x^2+y^2).   (Signs checked three times.)
       With x = r cos t, y = r sin t the section at fixed a is an exact
       deltoid, b = -3r^2(cos 2t + 2 cos t), c = 3r^2(sin 2t - 2 sin t);
       its speed vanishes at the three cusps, so uniform sampling piles
       density onto the cusp ridges of the pillow by itself. */
    float R  = 0.8*spread;
    float r  = R*sqrt(q.x);          /* area-uniform disk */
    float th = TAU*q.y;
    float x  = r*cos(th), y = r*sin(th);
    float sg = (rnd.z < 0.5) ? -1.0 : 1.0;
    a = sg*3.0*r;
    float b = 3.0*y*y - 3.0*x*x - 2.0*a*x;
    float c = 6.0*x*y - 2.0*a*y;
    world = vec3(b*0.35, a*0.35, c*0.35);
    aMin = -3.0*R; aMax = 3.0*R;
    /* tr Hess = 4a is the eigenvalue surviving on det Hess = 0:
       the two cones of the pillow are tinted by its sign */
    uns = (a < 0.0) ? 1.0 : 0.0;
  } else {
    float x = mix(-1.0, 1.0, q.x)*spread;
    a = mix(-2.0, 1.0, q.y)*spread;
    aMin = -2.0*spread; aMax = spread;
    float b = -4.0*x*x*x - 2.0*a*x;        /* V' = 4x^3 + 2ax + b = 0 */
    if(form == 1){
      /* Swallowtail A4: x is a double root of x^4 + ax^2 + bx + c, so
         b = -4x^3 - 2ax (derivative) and c = 3x^4 + ax^2 (back-substitute).
         The x-tangent of the surface map is (12x^2 + 2a)*(0, ...): the
         Jacobian degenerates exactly on the two cusp ridges, so uniform
         (x,a) sampling brightens the skeleton with no edge detection.
         Extremes at SPREAD 1: b in [-6,6], c in [-1/3,4]; outliers past
         1.45 world units are clamp-hidden below. */
      float c = 3.0*x*x*x*x + a*x*x;
      world = vec3(a*0.55, c*0.45 - 0.3, b*0.22);
      uns = (12.0*x*x + 2.0*a < 0.0) ? 1.0 : 0.0;  /* pocket between ridges */
    } else {
      /* Cusp A3: equilibrium sheet of V = x^4 + ax^2 + bx.
         V'' = 12x^2 + 2a < 0 is the overhanging middle sheet: crossing a
         fold with V'' = 0 forces the state to jump - hysteresis. */
      world = vec3(a*0.55, x*0.8, b*0.28);
      uns = (12.0*x*x + 2.0*a < 0.0) ? 1.0 : 0.0;
      /* Zeeman's machine: the control b sweeps back and forth, and the
         equilibria available at the current control glow gently */
      float bs = 1.1*spread*sin(uT*0.35);
      float dd = (b - bs)/(0.22*spread + 1.0e-3);
      hilite = 0.4*exp(-dd*dd);
    }
  }

  /* SECTION: hide points past a threshold sweeping down the a-axis;
     at 1 a thin slab remains - the classic 2D section (fold pair,
     dovetail curve, three-cusped star) */
  float thresh = mix(aMax, aMin + 0.06*(aMax - aMin), clamp(sect, 0.0, 1.0));
  if(a > thresh){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

  vec3 w = world*scl;
  if(any(greaterThan(abs(w), vec3(1.45)))){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }

  vec3 ivory = vec3(1.02, 0.92, 0.74);   /* stable: warm ivory */
  vec3 slate = vec3(0.26, 0.31, 0.42);   /* unstable: dim slate */
  col = mix(ivory, slate, uns*tint);
  col *= (0.35 + 0.85*glow)*(1.0 + hilite);
  return w;
}`
});
