"use strict";
/* ═══════════════════════════════════════════════════════════════════
   MAIN — owns the state machine and the frame loop.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById("gl");
  const MODES = Atlas.plates;
  const MORPH_SECS = 1.7;

  const S = Atlas.state = {
    N: 1 << 23, ptSize: 1.15, exposure: 1, gamma: 0.82, hue: 0, sat: 1,
    persist: 0, flow: 1, fovDeg: 52, spinMul: 1,
    paused: false, modeA: 0, modeB: 0, morph: 1, simT: 0
  };

  function setMode(i) {
    const n = MODES.length;
    i = ((i % n) + n) % n;
    if (i === S.modeB) return;
    S.modeA = S.modeB;                       /* if mid-flight, snap forward */
    S.modeB = i;
    S.morph = 0;
    Atlas.UI.swapPlateText(i);
  }
  function togglePause() {
    S.paused = !S.paused;
    Atlas.UI.setPauseLabel(S.paused);
  }
  function exportPNG() {
    const roman = MODES[S.modeB].roman.toLowerCase();
    Atlas.Renderer.exportPNG("atlas-plate-" + roman + ".png");
  }

  if (!Atlas.Renderer.init(canvas, () => Atlas.UI.showLost())) {
    document.getElementById("lost").classList.add("show");
    return;
  }
  Atlas.UI.init(S, { setMode, togglePause, exportPNG });
  Atlas.UI.setGpuLine(Atlas.Renderer.gpuName() +
    (Atlas.Renderer.hasFloat() ? " \u00b7 RGBA16F" : " \u00b7 RGBA8"));
  Atlas.Camera.attach(canvas);
  Atlas.Camera.home(MODES[0].cam);
  canvas.addEventListener("dblclick", () => Atlas.Camera.home(MODES[S.modeB].cam));

  let last = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsClock = 0;

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (!S.paused) S.simT += dt * S.flow;
    if (S.morph < 1) {
      S.morph = Math.min(1, S.morph + dt / MORPH_SECS);
      if (S.morph >= 1) S.modeA = S.modeB;
    }

    const home = MODES[S.modeB].cam;
    Atlas.Camera.update(dt, home, S.morph < 1, S.spinMul, Atlas.UI.reduceMotion());

    const { w, h } = Atlas.Renderer.size();
    const vp = Atlas.Camera.matrix(w / h, S.fovDeg * Math.PI / 180);

    /* brightness ∝ intensity·N/pixels stays constant as levers move;
       trails multiply steady-state energy by 1/(1−persist), so scale down */
    const base = Math.min(0.5, S.exposure * 0.35 * (w * h) / S.N);
    const intensity = base * (1 - S.persist * 0.92);

    Atlas.Renderer.render({
      vp, simT: S.simT,
      morph: S.morph >= 1 ? 0 : S.morph,
      modeA: S.modeA, modeB: S.modeB,
      N: S.N, ptSize: S.ptSize * Math.min(window.devicePixelRatio || 1, 1.5),
      intensity,
      gainA: MODES[S.modeA].gain, gainB: MODES[S.modeB].gain,
      PA: Atlas.values[S.modeA], PB: Atlas.values[S.modeB],
      persist: S.persist,
      exposure: 1.0,          /* exposure already folded into intensity */
      gamma: S.gamma, hue: S.hue, sat: S.sat
    });

    fpsAcc += dt; fpsN++; fpsClock += dt;
    if (fpsClock > 0.5) {
      const fps = fpsN / fpsAcc;
      Atlas.UI.setStats(fps, S.N * fps);
      fpsAcc = 0; fpsN = 0; fpsClock = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
