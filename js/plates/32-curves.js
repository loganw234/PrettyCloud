"use strict";
Atlas.registerPlate({
  id: "curves",
  name: "Roulettes & Knots",
  roman: "XXXII",
  accent: "#c8a0ff",
  tex: "\\text{harmonograph},\\ \\text{hypotrochoid},\\ \\text{Lissajous},\\ (p,q)\\text{-torus knot}",
  plain: "harmonograph · hypotrochoid · Lissajous · (p,q) torus knot",
  caption: "A closing gallery of curves that draw themselves. A harmonograph hangs a pen from decaying pendulums and lets their beats interfere; a spirograph rolls one circle inside another; a Lissajous figure listens to two tones at once; a torus knot winds p times one way and q the other and cannot be untied. Each is a single point swept by a parameter, given a little thickness so it reads as a filament in space, and brightness follows the pace — bright where the curve lingers, faint where it hurries. Every knob is a frequency; almost any setting hides something worth keeping.",
  cam: { dist: 3.2, pitch: 0.25, tgtY: 0.0, rot: 0.06 },
  gain: 0.85,
  params: [
    { label: "MODE",     min: 0, max: 3,   step: 1,    def: 3   },
    { label: "FREQ A / r",min: 1,max: 5,   step: 0.01, def: 3   },
    { label: "FREQ B / p",min: 1,max: 5,   step: 0.01, def: 2   },
    { label: "FREQ C / q",min: 1,max: 5,   step: 0.01, def: 3   },
    { label: "TUBE",     min: 0, max: 0.1, step: 0.002,def: 0.03 },
    { label: "SCALE",    min: 0.5,max: 1.6,step: 0.01, def: 1.0 },
    { label: "GLOW",     min: 0, max: 1,   step: 0.01, def: 0.6 }
  ],
  glsl: `
vec3 shape_curves(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int mode = int(P[0] + 0.5);
  vec3 c;
  if(mode == 0){                        /* 3D damped harmonograph */
    float d = P[1]*0.02;
    float t = TAU*q.x*6.0;
    c = vec3(sin(P[1]*t)*exp(-d*t), sin(P[2]*t + 1.0)*exp(-d*t), cos(P[3]*t + 2.0)*exp(-d*t));
  } else if(mode == 1){                 /* hypotrochoid (spirograph) */
    float R = 1.0, r = P[1]*0.15 + 0.15, dd = P[2]*0.4;
    float t = TAU*q.x*12.0;
    float k = (R - r)/r;
    c = vec3((R - r)*cos(t) + dd*cos(k*t), (R - r)*sin(t) - dd*sin(k*t), 0.0)*0.9;
  } else if(mode == 2){                 /* 3D Lissajous */
    float t = TAU*q.x;
    c = vec3(sin(P[1]*t), sin(P[2]*t + PI*0.5), sin(P[3]*t + 1.0));
  } else {                              /* (p,q) torus knot */
    float t = TAU*q.x;
    float pp = P[2], qq = P[3], R = 1.0, rr = 0.42;
    c = vec3((R + rr*cos(qq*t))*cos(pp*t), rr*sin(qq*t), (R + rr*cos(qq*t))*sin(pp*t))*0.9;
  }
  c += (rnd.xyz - 0.5)*P[4];
  vec3 p = c*P[5];
  col = pal(q.x*0.8 + 0.05, vec3(0.5, 0.45, 0.5), vec3(0.5, 0.45, 0.45),
            vec3(1.0, 0.9, 0.85), vec3(0.1, 0.3, 0.5));
  col *= 0.5 + 0.7*P[6];
  return p;
}`
});
