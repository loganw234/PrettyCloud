"use strict";
Atlas.registerPlate({
  id: "nonorient",
  name: "One-Sided Surfaces",
  roman: "XXVII",
  accent: "#8fe0c8",
  tex: "\\text{Klein bottle},\\;\\text{Roman surface }(bc,ca,ab),\\;\\text{cross-cap}",
  plain: "Klein bottle;   Roman surface (bc, ca, ab);   cross-cap",
  caption: "Surfaces with only one side. A Klein bottle has no inside and no outside — its neck passes through its own wall to close up in a way that only truly fits in four dimensions, so in three it must self-intersect. The Roman and cross-cap surfaces are the projective plane forced into our space the same way. The creases where a surface passes through itself show up bright, because two sheets of points pile into the same place: the doubled density is the immersion's scar. CUTAWAY peels the skin back so you can follow the neck inside.",
  cam: { dist: 3.2, pitch: 0.26, tgtY: 0.0, rot: 0.05 },
  gain: 0.85,
  params: [
    { label: "SURFACE",   min: 0, max: 2,   step: 1,    def: 0   },
    { label: "KLEIN R",   min: 2, max: 4,   step: 0.01, def: 3   },
    { label: "CUTAWAY",   min: 0.3,max: 1,  step: 0.01, def: 1   },
    { label: "THICKNESS", min: 0, max: 0.15,step: 0.002,def: 0.03 },
    { label: "GLOW",      min: 0, max: 1,   step: 0.01, def: 0.55 }
  ],
  glsl: `
vec3 shape_nonorient(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  int s = int(P[0] + 0.5);
  if(q.y > P[2]){ col = vec3(0.0); return vec3(0.0, -999.0, 0.0); }  /* cutaway */
  vec3 pos; float shade;
  if(s == 0){                          /* figure-8 Klein bottle */
    float u = TAU*q.x, v = TAU*q.y, uh = u*0.5;
    float t = P[1] + cos(uh)*sin(v) - sin(uh)*sin(2.0*v);
    pos = vec3(t*cos(u), t*sin(u), sin(uh)*sin(v) + cos(uh)*sin(2.0*v))*0.5;
    shade = v/TAU;
  } else if(s == 1){                   /* Roman (Steiner) surface */
    float ct = 1.0 - 2.0*q.x, st = sqrt(max(0.0, 1.0 - ct*ct)), ph = TAU*q.y;
    vec3 d = vec3(st*cos(ph), ct, st*sin(ph));
    pos = vec3(d.x*d.y, d.y*d.z, d.z*d.x)*2.3;
    shade = length(pos);
  } else {                             /* cross-cap */
    float ct = 1.0 - 2.0*q.x, st = sqrt(max(0.0, 1.0 - ct*ct)), ph = TAU*q.y;
    vec3 d = vec3(st*cos(ph), ct, st*sin(ph));
    pos = vec3(2.0*d.x*d.z, 2.0*d.y*d.z, d.x*d.x - d.y*d.y)*1.15;
    shade = d.z*0.5 + 0.5;
  }
  pos += (rnd.xyz - 0.5)*P[3];
  col = pal(shade*0.8 + 0.05, vec3(0.5, 0.45, 0.5), vec3(0.5, 0.45, 0.45),
            vec3(1.0, 0.9, 0.8), vec3(0.1, 0.3, 0.5));
  col *= 0.5 + 0.7*P[4];
  return pos;
}`
});
