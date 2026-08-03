"use strict";
Atlas.Camera = (function () {
  const st = { yaw: 0.6, pitch: 0.32, dist: 3.5, tgtY: 0, vyaw: 0, vpitch: 0 };
  const pointers = new Map();
  let pinchD = 0;
  let dragging = false;

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,   0, f, 0, 0,
      0, 0, (far + near) * nf, -1,   0, 0, 2 * far * near * nf, 0
    ]);
  }
  function lookAt(eye, tgt, up) {
    const zx = eye[0]-tgt[0], zy = eye[1]-tgt[1], zz = eye[2]-tgt[2];
    const zl = Math.hypot(zx, zy, zz) || 1;
    const z = [zx/zl, zy/zl, zz/zl];
    const x = [up[1]*z[2]-up[2]*z[1], up[2]*z[0]-up[0]*z[2], up[0]*z[1]-up[1]*z[0]];
    const xl = Math.hypot(x[0], x[1], x[2]) || 1;
    x[0]/=xl; x[1]/=xl; x[2]/=xl;
    const y = [z[1]*x[2]-z[2]*x[1], z[2]*x[0]-z[0]*x[2], z[0]*x[1]-z[1]*x[0]];
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),
      -(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),
      -(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]), 1
    ]);
  }
  function mul4(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
      o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    return o;
  }

  function clampPitch(p) { return Math.min(1.45, Math.max(-1.45, p)); }

  return {
    state: st,
    dragging: () => dragging,

    attach(canvas) {
      canvas.addEventListener("pointerdown", e => {
        canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        dragging = true;
        canvas.classList.add("dragging");
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinchD = Math.hypot(a.x - b.x, a.y - b.y);
        }
      });
      canvas.addEventListener("pointermove", e => {
        if (!pointers.has(e.pointerId)) return;
        const prev = pointers.get(e.pointerId);
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
          st.vyaw = -dx * 0.005;
          st.vpitch = dy * 0.005;
          st.yaw += st.vyaw;
          st.pitch = clampPitch(st.pitch + st.vpitch);
        } else if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchD > 0) st.dist = Math.min(9, Math.max(1.1, st.dist * pinchD / d));
          pinchD = d;
        }
      });
      const end = e => {
        pointers.delete(e.pointerId);
        if (pointers.size === 0) { dragging = false; canvas.classList.remove("dragging"); }
      };
      canvas.addEventListener("pointerup", end);
      canvas.addEventListener("pointercancel", end);
      canvas.addEventListener("wheel", e => {
        e.preventDefault();
        st.dist = Math.min(9, Math.max(1.1, st.dist * Math.exp(e.deltaY * 0.0011)));
      }, { passive: false });
    },

    home(cam) { st.dist = cam.dist; st.pitch = cam.pitch; st.tgtY = cam.tgtY; st.yaw = 0.6; },

    /* dt, plate camera home, whether a transition is running, spin multiplier */
    update(dt, home, transitioning, spinMul, reduceMotion) {
      if (!dragging) {
        st.yaw += (reduceMotion ? 0 : home.rot * spinMul) * dt;
        st.vyaw *= 0.92; st.vpitch *= 0.92;
        st.yaw += st.vyaw;
        st.pitch = clampPitch(st.pitch + st.vpitch);
      }
      if (transitioning) {
        const k = Math.min(1, dt * 2.0);
        st.dist  += (home.dist  - st.dist)  * k;
        st.pitch += (home.pitch - st.pitch) * k * 0.6;
        st.tgtY  += (home.tgtY  - st.tgtY)  * k;
      }
    },

    matrix(aspect, fovRad) {
      const eye = [
        st.dist * Math.cos(st.pitch) * Math.sin(st.yaw),
        st.tgtY + st.dist * Math.sin(st.pitch),
        st.dist * Math.cos(st.pitch) * Math.cos(st.yaw)
      ];
      return mul4(perspective(fovRad, aspect, 0.05, 60),
                  lookAt(eye, [0, st.tgtY, 0], [0, 1, 0]));
    }
  };
})();
