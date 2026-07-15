"use strict";
/* ═══════════════════════════════════════════════════════════════════
   ATLAS REGISTRY
   Plates register themselves here. Each plate contributes:
     - metadata (name, roman numeral, accent, formula, caption, camera)
     - up to 8 "levers" (params) mapped to P[0..7] in its shader
     - a GLSL function:  vec3 shape_<id>(vec2 q, vec4 rnd, uint seed,
                                         float P[8], out vec3 col)
   The full vertex shader is assembled at boot by concatenating every
   plate's GLSL and generating the dispatcher. Adding a plate = adding
   one file to js/plates/ and one <script> tag to index.html.
   ═══════════════════════════════════════════════════════════════════ */
globalThis.Atlas = {
  plates: [],

  registerPlate(p) {
    p.index = this.plates.length;
    p.params = p.params || [];
    if (p.params.length > 8) throw new Error(p.id + ": max 8 params");
    this.plates.push(p);
  },

  GLSL: {}, /* filled by glsl-lib.js */

  buildVertexShader() {
    const shapes = this.plates.map(p => p.glsl).join("\n");
    const dispatch = this.plates
      .map((p, i) => `  if(m == ${i}) return shape_${p.id}(q, rnd, seed, P, col);`)
      .join("\n");
    return (
      this.GLSL.vertHeader +
      "\n" + shapes + "\n" +
      "vec3 shape(int m, vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){\n" +
      dispatch + "\n" +
      "  col = vec3(0.0); return vec3(0.0);\n}\n" +
      this.GLSL.vertMain
    );
  }
};
