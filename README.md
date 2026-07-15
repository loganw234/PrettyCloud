# Atlas of Mathematical Forms

A WebGL2 point-cloud atlas. Every plate is a mathematical object rendered as
up to 2^27 = 134,217,728 points, synthesized entirely in the vertex shader
from `gl_VertexID` — the project contains no vertex buffers at all. Points
are additively accumulated into a floating-point framebuffer and tonemapped,
so **brightness is a Monte-Carlo density estimate of each object's measure**.

Open `index.html` directly in a browser (no server or build step needed),
or use the prebuilt single file at `build/atlas-bundled.html`.

## Structure

```
index.html            markup + ordered <script> tags
css/atlas.css         museum-plate styling
js/core/registry.js   Atlas namespace, plate registration, shader assembly
js/core/glsl-lib.js   shared GLSL (vertex main, tonemap, trails)
js/core/renderer.js   GL state, ping-pong accumulation, grading, PNG export
js/core/camera.js     orbit camera with inertia
js/core/ui.js         placard, lever racks, telemetry, keyboard
js/core/main.js       state machine + frame loop
js/plates/NN-*.js     one file per plate
build.py              bundles everything into build/atlas-bundled.html
```

Plain script tags and a `globalThis.Atlas` namespace are used instead of ES
modules deliberately: modules are blocked on the `file://` protocol, and
this way the page works straight off the disk.

## Adding a plate

Create `js/plates/13-yourthing.js` and add one `<script>` tag to
`index.html` (before the core engine scripts). That's the whole process.

```js
Atlas.registerPlate({
  id: "yourthing",            // unique; becomes shape_yourthing in GLSL
  name: "Your Thing",
  roman: "XIII",
  accent: "#88ccff",          // UI accent while this plate is active
  tex: "e^{i\\pi}+1=0",      // KaTeX for the placard
  plain: "e^ipi + 1 = 0",     // fallback if KaTeX fails to load
  caption: "One paragraph of honest mathematics.",
  cam: { dist: 3.4, pitch: 0.3, tgtY: 0, rot: 0.05 },  // camera home
  gain: 1.0,                  // brightness trim for this plate
  params: [                   // up to 8 levers -> P[0..7]
    { label: "KNOB", min: 0, max: 1, step: 0.01, def: 0.5 },
  ],
  glsl: `
vec3 shape_yourthing(vec2 q, vec4 rnd, uint seed, float P[8], out vec3 col){
  // q    : R2 low-discrepancy point in [0,1)^2  (your parameter space)
  // rnd  : four hashed uniforms per point
  // seed : a per-point uint, feed it to hashu() for more randomness
  // P    : this plate's lever values
  // col  : output color (pre-tonemap; magnitudes ~0.2-1.5 work well)
  col = vec3(1.0);
  return vec3(q - 0.5, 0.0);  // position in world space, roughly [-1.5,1.5]^3
}`
});
```

Helpers available inside plate GLSL: `pal()` (IQ cosine palettes),
`hashu()` (PCG-style uint hash), `u2f()` (uint -> [0,1) float), `PI`, `TAU`,
and the sim-time uniform `uT`. If a plate needs its own helper function,
prefix it with the plate id to avoid collisions (see `ifs_vertex` in
plate VII). To hide a point, return `vec3(0.0, -999.0, 0.0)` — it gets
clipped (see plate XII).

## Performance notes

- The R2 sequence is computed in exact 32-bit fixed point
  (`u2f(ia * 3242174889u)`); a float `fract(i*phi)` loses mantissa past
  ~16M indices and the cloud collapses onto stripes.
- Point intensity scales as `(W·H)/N`, so total energy — and therefore
  perceived brightness — is invariant under the DENSITY lever.
- TRAILS multiplies steady-state energy by `1/(1-persistence)`; intensity
  is scaled down to compensate, so the slider changes character, not
  exposure.
- Accumulation is RGBA16F (half-float). At extreme exposure × density the
  brightest pixels can saturate 16F; back off EXPOSURE before DENSITY.
- 2^27 points is real work: expect ~8 GB/s of raster traffic. A desktop GPU
  (the project was aimed at an RTX 5060 Ti) holds 60 fps on most plates;
  integrated GPUs should stay at or below 2^23.
