"use strict";
/* ═══════════════════════════════════════════════════════════════════
   RENDERER
   Pass 1  fade   : previous accumulation × persistence  (trails)
   Pass 2  points : N procedural points, additive blend into RGBA16F
   Pass 3  tonemap: 1 − exp(−x·E), hue rotate, saturation, gamma,
                    vignette, dither → screen
   Brightness therefore remains a density estimate of the measure;
   persistence just extends the estimate through time.
   ═══════════════════════════════════════════════════════════════════ */
Atlas.Renderer = (function () {
  let gl, canvas, hasFloat = false;
  let progPts, progTm, progFade;
  let U = {}, Utm = {}, Ufade = {};
  let vao;
  let accum = [null, null], accumTex = [null, null], cur = 0;
  let fbW = 0, fbH = 0;
  let renderScale = 1;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(s) + "\n--- in ---\n" + src.slice(0, 400));
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  function makeTargets(w, h) {
    for (let i = 0; i < 2; i++) {
      if (accum[i]) { gl.deleteFramebuffer(accum[i]); gl.deleteTexture(accumTex[i]); }
      accumTex[i] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, accumTex[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texStorage2D(gl.TEXTURE_2D, 1, hasFloat ? gl.RGBA16F : gl.RGBA8, w, h);
      accum[i] = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, accum[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                              gl.TEXTURE_2D, accumTex[i], 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    fbW = w; fbH = h;
  }

  function ensureSize() {
    const w = Math.max(2, Math.round(canvas.clientWidth * renderScale));
    const h = Math.max(2, Math.round(canvas.clientHeight * renderScale));
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w; canvas.height = h;
      makeTargets(w, h);
    }
  }

  function hueMatrix(deg) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    /* YIQ hue rotation, row-major (uploaded with transpose=true) */
    return new Float32Array([
      0.299 + 0.701 * c + 0.168 * s, 0.587 - 0.587 * c + 0.330 * s, 0.114 - 0.114 * c - 0.497 * s,
      0.299 - 0.299 * c - 0.328 * s, 0.587 + 0.413 * c + 0.035 * s, 0.114 - 0.114 * c + 0.292 * s,
      0.299 - 0.300 * c + 1.250 * s, 0.587 - 0.588 * c - 1.050 * s, 0.114 + 0.886 * c - 0.203 * s
    ]);
  }

  return {
    init(canvasEl, onLost) {
      canvas = canvasEl;
      gl = canvas.getContext("webgl2", {
        antialias: false, alpha: false, depth: false, stencil: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true            /* enables PNG export */
      });
      if (!gl) return false;
      hasFloat = !!gl.getExtension("EXT_color_buffer_float");
      renderScale = Math.min(window.devicePixelRatio || 1, 1.5);

      progPts  = program(Atlas.buildVertexShader(), Atlas.GLSL.pointFrag);
      progTm   = program(Atlas.GLSL.quadVert, Atlas.GLSL.tonemapFrag);
      progFade = program(Atlas.GLSL.quadVert, Atlas.GLSL.fadeFrag);

      for (const n of ["uVP","uT","uMorph","uModeA","uModeB","uPt",
                       "uIntensity","uGainA","uGainB"])
        U[n] = gl.getUniformLocation(progPts, n);
      U.uPA = gl.getUniformLocation(progPts, "uPA[0]");
      U.uPB = gl.getUniformLocation(progPts, "uPB[0]");
      for (const n of ["uTex","uExp","uGamma","uSat","uHueM"])
        Utm[n] = gl.getUniformLocation(progTm, n);
      Ufade.uTex = gl.getUniformLocation(progFade, "uTex");
      Ufade.uPersist = gl.getUniformLocation(progFade, "uPersist");

      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.disable(gl.DEPTH_TEST);

      canvas.addEventListener("webglcontextlost", e => {
        e.preventDefault();
        if (onLost) onLost();
      });
      ensureSize();
      window.addEventListener("resize", ensureSize);
      return true;
    },

    gl() { return gl; },
    hasFloat() { return hasFloat; },
    size() { ensureSize(); return { w: canvas.width, h: canvas.height }; },

    gpuName() {
      try {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        let s = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
        const m = /\(([^,)]*),?\s*([^,)]*)/.exec(s);
        if (m && m[2]) s = m[2].trim();
        s = s.replace(/\s*\(0x[0-9A-Fa-f]+\)/g, "").replace(/Direct3D.*$/i, "").trim();
        return (s || "GPU").toUpperCase().slice(0, 40);
      } catch (e) { return "GPU"; }
    },

    /* opts: vp, simT, morph, modeA, modeB, N, ptSize, intensity,
             gainA, gainB, PA, PB, persist, exposure, gamma, hue, sat */
    render(o) {
      ensureSize();
      const W = canvas.width, H = canvas.height;
      cur ^= 1;
      const prev = 1 - cur;

      /* pass 1 — decayed history, or a clear */
      gl.bindFramebuffer(gl.FRAMEBUFFER, accum[cur]);
      gl.viewport(0, 0, fbW, fbH);
      gl.disable(gl.BLEND);
      if (o.persist > 0.001) {
        gl.useProgram(progFade);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, accumTex[prev]);
        gl.uniform1i(Ufade.uTex, 0);
        gl.uniform1f(Ufade.uPersist, o.persist);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }

      /* pass 2 — the measure */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(progPts);
      gl.bindVertexArray(vao);
      gl.uniformMatrix4fv(U.uVP, false, o.vp);
      gl.uniform1f(U.uT, o.simT);
      gl.uniform1f(U.uMorph, o.morph);
      gl.uniform1i(U.uModeA, o.modeA);
      gl.uniform1i(U.uModeB, o.modeB);
      gl.uniform1f(U.uPt, o.ptSize);
      gl.uniform1f(U.uIntensity, o.intensity);
      gl.uniform1f(U.uGainA, o.gainA);
      gl.uniform1f(U.uGainB, o.gainB);
      gl.uniform1fv(U.uPA, o.PA);
      gl.uniform1fv(U.uPB, o.PB);
      gl.drawArrays(gl.POINTS, 0, o.N);

      /* pass 3 — tonemap + grade to screen */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.disable(gl.BLEND);
      gl.useProgram(progTm);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, accumTex[cur]);
      gl.uniform1i(Utm.uTex, 0);
      gl.uniform1f(Utm.uExp, o.exposure);
      gl.uniform1f(Utm.uGamma, o.gamma);
      gl.uniform1f(Utm.uSat, o.sat);
      gl.uniformMatrix3fv(Utm.uHueM, true, hueMatrix(o.hue));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    exportPNG(name) {
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, "image/png");
    }
  };
})();
