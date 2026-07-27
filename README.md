# Atlas of Mathematical Forms

A WebGL2 point-cloud atlas. Every plate is a mathematical object rendered as
up to 2^27 = 134,217,728 points, synthesized entirely in the vertex shader
from `gl_VertexID` — the project contains no vertex buffers at all. Points
are additively accumulated into a floating-point framebuffer and tonemapped,
so **brightness is a Monte-Carlo density estimate of each object's measure**.

Open `index.html` directly in a browser (no server or build step needed),
or use the prebuilt single file at `build/atlas-bundled.html`.

## The plates

Fifty-six in all, spanning topology, chaos, number theory, quantum mechanics, general
relativity, ergodic theory, Lie theory, hyperbolic geometry, catastrophe theory — and a
"Cabinet of Light": eight plates of wave, ray and relativistic optics (plates XLIX–LVI).
Every parameter on the right is live, and `R` randomizes the current plate's levers.

![Contact sheet of all 56 plates, each labelled with its roman numeral and title](docs/screenshots/atlas.png)

Seven of them full size:

![Plate I — the Hopf Fibration: linked fiber circles over S², hue naming the base point](docs/screenshots/hopf-fibration.png)

![Plate XVI — Minimal Surfaces: a gyroid, sampled through a block of unit cells and Newton-projected onto the level set](docs/screenshots/minimal-surfaces.png)

![Plate XXVII — One-Sided Surfaces: a Klein bottle, with the doubled density along its self-intersection showing as a bright crease](docs/screenshots/one-sided-surfaces.png)

![Plate XXXVII — The Photon Sphere: Schwarzschild null geodesics; near-critical photons wind many times around r = 3M, so the photon ring ignites purely because brightness measures winding angle](docs/screenshots/photon-sphere.png)

![Plate XXXVIII — How Light Leaves an Antenna: E-field lines of an oscillating dipole from the exact flux function, near-field loops pinching off and sailing outward as radiation](docs/screenshots/dipole-field-lines.png)

![Plate XLIV — The Shape of E8: all 240 roots in the Coxeter plane, eight concentric rings of thirty, with the 60-degree edge web sampled root by root](docs/screenshots/e8-coxeter-plane.png)

![Plate LVI — The Sky at Nine-Tenths c: the celestial sphere seen from inside at beta = 0.9, aberration crowding the blueshifted, beamed stars into the direction of flight](docs/screenshots/relativistic-starfield.png)

## Structure

```
index.html            markup + ordered <script> tags
css/atlas.css         museum-plate styling
js/core/registry.js   Atlas namespace, plate registration, shader assembly
js/core/glsl-lib.js   shared GLSL (vertex main, tonemap, trails)
js/core/renderer.js   GL state, per-pair shader cache, accumulation, PNG export
shader-bisect.html    diagnostic: times shader compilation per plate subset
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

Create `js/plates/49-yourthing.js` and add one `<script>` tag to
`index.html` (before the core engine scripts). That's the whole process.

```js
Atlas.registerPlate({
  id: "yourthing",            // unique; becomes shape_yourthing in GLSL
  name: "Your Thing",
  roman: "XLIX",
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
- Point shaders are compiled **per morph pair**, never as one ubershader.
  Windows Chrome routes GLSL through D3D's HLSL compiler, whose cost grows
  super-quadratically with program size — one shader holding all 48 early
  plates took 92 s to compile, and past ~50 plates ANGLE's ~100 s watchdog
  kills the context outright. A 2-plate program links in well under a
  second, compiles asynchronously (`KHR_parallel_shader_compile`) while the
  previous plate keeps rendering, and is cached (LRU, plus Chrome's own
  disk cache). `shader-bisect.html` measures this on your machine.
- DENSITY is a ceiling, not a fixed count: rendering starts at 2^20 and a
  governor climbs one power per half-second while the frame rate holds
  above ~57 fps, retreating below ~42. First paint is immediate on any
  GPU; a desktop GPU (the project was aimed at an RTX 5060 Ti) reaches
  2^23 in about two seconds and holds 60 fps on most plates. 2^27 points
  is real work — expect ~8 GB/s of raster traffic at the top of the lever.
