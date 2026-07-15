"use strict";
/* ═══════════════════════════════════════════════════════════════════
   UI — the placard, the lever racks, telemetry, keyboard.
   Plate levers are generated from each plate's params[] declaration;
   values live in Atlas.values[plateIndex] (Float32Array(8)) and are
   read by the render loop every frame.
   ═══════════════════════════════════════════════════════════════════ */
Atlas.UI = (function () {
  const $ = id => document.getElementById(id);
  let hooks = {};      /* { setMode(i), togglePause(), exportPNG() } */
  let reduceMotion = false;

  /* per-plate lever values */
  function initValues() {
    Atlas.values = Atlas.plates.map(p => {
      const a = new Float32Array(8);
      p.params.forEach((prm, k) => a[k] = prm.def);
      return a;
    });
  }

  function fmtVal(v, step) {
    return step >= 1 ? String(Math.round(v)) : (+v).toFixed(2);
  }
  function fmtInt(n) { return n.toLocaleString("en-US"); }

  /* ————— plate lever rack ————— */
  function buildPlatePanel(i) {
    const p = Atlas.plates[i];
    const box = $("plateParams");
    box.innerHTML = "";
    p.params.forEach((prm, k) => {
      const label = document.createElement("label");
      label.className = "ctl";
      const lbl = document.createElement("span");
      lbl.className = "lbl";
      const em = document.createElement("em");
      em.textContent = fmtVal(Atlas.values[i][k], prm.step);
      lbl.append(prm.label, em);
      const input = document.createElement("input");
      input.type = "range";
      input.min = prm.min; input.max = prm.max; input.step = prm.step;
      input.value = Atlas.values[i][k];
      input.addEventListener("input", () => {
        Atlas.values[i][k] = +input.value;
        em.textContent = fmtVal(+input.value, prm.step);
      });
      label.append(lbl, input);
      box.appendChild(label);
    });
  }
  function snap(v, prm) {
    const s = Math.round((v - prm.min) / prm.step) * prm.step + prm.min;
    return Math.min(prm.max, Math.max(prm.min, s));
  }
  function randomizePlate(i) {
    const p = Atlas.plates[i];
    p.params.forEach((prm, k) => {
      Atlas.values[i][k] = snap(prm.min + Math.random() * (prm.max - prm.min), prm);
    });
    buildPlatePanel(i);
  }
  function resetPlate(i) {
    const p = Atlas.plates[i];
    p.params.forEach((prm, k) => { Atlas.values[i][k] = prm.def; });
    buildPlatePanel(i);
  }

  /* ————— placard text ————— */
  function renderFormula(m) {
    const el = $("formula");
    if (window.katex) {
      try {
        katex.render(m.tex, el, { throwOnError: false, displayMode: false });
        return;
      } catch (e) { /* fall through */ }
    }
    el.textContent = m.plain;
  }
  function applyPlateText(i) {
    const m = Atlas.plates[i];
    $("title").textContent = m.name;
    $("plateRoman").textContent = "PLATE " + m.roman;
    $("plateOf").textContent = "/ " + Atlas.plates[Atlas.plates.length - 1].roman;
    $("caption").textContent = m.caption;
    renderFormula(m);
    document.documentElement.style.setProperty("--accent", m.accent);
    [...$("dots").children].forEach((d, k) => d.classList.toggle("on", k === i));
    buildPlatePanel(i);
  }
  function swapPlateText(i) {
    const els = [$("title"), $("formula"), $("caption")];
    els.forEach(e => e.classList.add("swap-out"));
    setTimeout(() => {
      applyPlateText(i);
      els.forEach(e => e.classList.remove("swap-out"));
    }, reduceMotion ? 0 : 450);
  }

  /* ————— global render rack ————— */
  function buildGlobalPanel(S) {
    const defs = [
      { key: "densExp", label: "DENSITY", min: 20, max: 27, step: 1, def: 23,
        fmt: v => "2^" + v,
        set: v => { S.N = 1 << v; $("densWarn").classList.toggle("show", v >= 26); } },
      { key: "ptSize",  label: "POINT SIZE", min: 0.5, max: 4,   step: 0.05, def: 1.15,
        set: v => S.ptSize = v },
      { key: "expoLog", label: "EXPOSURE",   min: -1,  max: 1.3, step: 0.01, def: 0,
        fmt: v => "\u00d7" + Math.pow(10, v).toFixed(2),
        set: v => S.exposure = Math.pow(10, v) },
      { key: "gamma",   label: "GAMMA",      min: 0.5, max: 1.6, step: 0.01, def: 0.82,
        set: v => S.gamma = v },
      { key: "hue",     label: "HUE SHIFT",  min: 0,   max: 360, step: 1,    def: 0,
        fmt: v => v + "\u00b0", set: v => S.hue = v },
      { key: "sat",     label: "SATURATION", min: 0,   max: 2,   step: 0.01, def: 1,
        set: v => S.sat = v },
      { key: "persist", label: "TRAILS",     min: 0,   max: 0.97,step: 0.01, def: 0,
        set: v => S.persist = v },
      { key: "flow",    label: "FLOW",       min: 0,   max: 2.5, step: 0.01, def: 1,
        set: v => S.flow = v },
      { key: "fov",     label: "LENS FOV",   min: 35,  max: 110, step: 1,    def: 52,
        fmt: v => v + "\u00b0", set: v => S.fovDeg = v },
      { key: "spin",    label: "AUTO SPIN",  min: -2,  max: 2,   step: 0.01, def: 1,
        set: v => S.spinMul = v }
    ];
    const box = $("globalParams");
    defs.forEach(d => {
      const label = document.createElement("label");
      label.className = "ctl";
      const lbl = document.createElement("span");
      lbl.className = "lbl";
      const em = document.createElement("em");
      const show = v => {
        if (d.key === "densExp") em.innerHTML = "2<sup>" + v + "</sup> \u00b7 " + fmtInt(1 << v);
        else em.textContent = d.fmt ? d.fmt(+v) : fmtVal(+v, d.step);
      };
      lbl.append(d.label, em);
      const input = document.createElement("input");
      input.type = "range";
      input.min = d.min; input.max = d.max; input.step = d.step; input.value = d.def;
      input.addEventListener("input", () => { d.set(+input.value); show(+input.value); });
      d.set(d.def); show(d.def);
      label.append(lbl, input);
      box.appendChild(label);
    });
  }

  /* ————— telemetry ————— */
  function sci(n) {
    if (!isFinite(n) || n <= 0) return "\u2013";
    const e = Math.floor(Math.log10(n));
    const m = (n / Math.pow(10, e)).toFixed(1);
    const sup = String(e).split("").map(c => "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079"[+c] || c).join("");
    return m + "\u00d710" + sup;
  }

  return {
    reduceMotion: () => reduceMotion,

    init(S, h) {
      hooks = h;
      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      initValues();

      /* plate dots */
      Atlas.plates.forEach((m, i) => {
        const b = document.createElement("button");
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", "Plate " + m.roman + " \u2014 " + m.name);
        b.addEventListener("click", () => hooks.setMode(i));
        $("dots").appendChild(b);
      });
      $("prev").addEventListener("click", () => hooks.setMode(S.modeB - 1));
      $("next").addEventListener("click", () => hooks.setMode(S.modeB + 1));
      $("rand").addEventListener("click", () => randomizePlate(S.modeB));
      $("resetP").addEventListener("click", () => resetPlate(S.modeB));
      $("pause").addEventListener("click", () => hooks.togglePause());
      $("shot").addEventListener("click", () => hooks.exportPNG());

      buildGlobalPanel(S);
      applyPlateText(0);

      /* collapse racks by default on small screens */
      if (window.matchMedia("(max-width: 860px)").matches) {
        $("panelPlate").removeAttribute("open");
        $("panelRender").removeAttribute("open");
      }

      window.addEventListener("keydown", e => {
        const a = document.activeElement;
        if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;
        if (e.key === "ArrowRight") hooks.setMode(S.modeB + 1);
        else if (e.key === "ArrowLeft") hooks.setMode(S.modeB - 1);
        else if (e.key === " ") { e.preventDefault(); hooks.togglePause(); }
        else if (e.key === "h" || e.key === "H") document.body.classList.toggle("ui-hidden");
        else if (e.key === "r" || e.key === "R") randomizePlate(S.modeB);
        else if (e.key === "s" || e.key === "S") hooks.exportPNG();
      });
    },

    swapPlateText,
    setPauseLabel(paused) {
      $("pause").innerHTML = paused ? "RESUME &nbsp;\u25b6" : "PAUSE &nbsp;\u258e\u258e";
    },
    setGpuLine(t) { $("gpuLine").textContent = t; },
    setStats(fps, pps) {
      $("fps").textContent = fps.toFixed(0);
      $("pps").textContent = sci(pps);
    },
    showLost() { $("lost").classList.add("show"); }
  };
})();
