"use strict";
/* ═══════════════════════════════════════════════════════════════════
   SHARED GLSL
   Every point is synthesized in the vertex shader from gl_VertexID —
   no vertex buffers exist anywhere in this project. The low-
   discrepancy R2 sequence is computed in exact 32-bit fixed point,
   because plain float fract(i*phi) runs out of mantissa past ~16M
   indices and the cloud would collapse onto stripes.
   ═══════════════════════════════════════════════════════════════════ */

Atlas.GLSL.vertHeader = `#version 300 es
precision highp float;
precision highp int;

uniform mat4  uVP;
uniform float uT;
uniform float uMorph;
uniform int   uModeA;
uniform int   uModeB;
uniform float uPt;
uniform float uIntensity;
uniform float uGainA;
uniform float uGainB;
uniform float uPA[8];   /* levers of plate A */
uniform float uPB[8];   /* levers of plate B */

out vec3 vCol;

const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){
  return a + b*cos(TAU*(c*t + d));
}
uint hashu(uint x){
  x ^= x >> 16; x *= 0x7feb352du;
  x ^= x >> 15; x *= 0x846ca68bu;
  x ^= x >> 16; return x;
}
float u2f(uint x){ return float(x) * 2.3283064365386963e-10; }
`;

Atlas.GLSL.vertMain = `
void main(){
  uint ia = uint(gl_VertexID);
  /* R2 low-discrepancy point in exact fixed point */
  vec2 q = vec2(u2f(ia * 3242174889u), u2f(ia * 2447445414u));
  uint h1 = hashu(ia);
  uint h2 = hashu(h1);
  uint h3 = hashu(h2);
  uint h4 = hashu(h3);
  vec4 rnd = vec4(u2f(h1), u2f(h2), u2f(h3), u2f(h4));

  float PA[8]; float PB[8];
  for(int i = 0; i < 8; i++){ PA[i] = uPA[i]; PB[i] = uPB[i]; }

  vec3 col;
  vec3 p = shape(uModeA, q, rnd, h4, PA, col);
  float g = uGainA;
  if(uMorph > 0.0005){
    vec3 colB;
    vec3 pB = shape(uModeB, q, rnd, h4, PB, colB);
    float m = smoothstep(0.0, 1.0, clamp(uMorph*1.4 - rnd.w*0.4, 0.0, 1.0));
    p   = mix(p, pB, m);
    col = mix(col, colB, m);
    g   = mix(uGainA, uGainB, m);
  }
  gl_Position  = uVP * vec4(p, 1.0);
  gl_PointSize = uPt;
  vCol = col * (uIntensity * g);
}`;

Atlas.GLSL.pointFrag = `#version 300 es
precision highp float;
in vec3 vCol;
out vec4 o;
void main(){ o = vec4(vCol, 1.0); }`;

Atlas.GLSL.quadVert = `#version 300 es
out vec2 vUv;
void main(){
  vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = v;
  gl_Position = vec4(v*2.0 - 1.0, 0.0, 1.0);
}`;

/* Tonemap + color grade: exposure -> hue rotate -> saturation ->
   gamma -> vignette -> dither. Brightness in = accumulated density. */
Atlas.GLSL.tonemapFrag = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uExp;
uniform float uGamma;
uniform float uSat;
uniform mat3  uHueM;
in vec2 vUv;
out vec4 o;
void main(){
  vec3 h = texture(uTex, vUv).rgb;
  vec3 c = 1.0 - exp(-h * uExp);
  c = uHueM * c;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(lum), c, uSat);
  c = pow(max(c, vec3(0.0)), vec3(uGamma));
  float d2 = dot(vUv - 0.5, vUv - 0.5);
  float vig = 1.0 - 0.55*d2;
  c *= vig;
  c += vec3(0.012, 0.013, 0.026) * vig;
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) / 255.0;
  o = vec4(c, 1.0);
}`;

/* Persistence: copy previous accumulation, decayed. Points are then
   added on top, so the trail is itself part of the measure. */
Atlas.GLSL.fadeFrag = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uPersist;
in vec2 vUv;
out vec4 o;
void main(){ o = texture(uTex, vUv) * uPersist; }`;
