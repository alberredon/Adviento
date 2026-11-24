// Día 6: gymkhana de una guardia en la noche de Reyes.
// Personajes, llamada y mensaje final están cifrados (privado/dia6 -> datos/dia6).
// Cada escena es una función de ESCENAS; se guarda por cuál se va.
const abrirGuardia = (() => {
  const CARPETA = "dia6/";
  const PROGRESO = "adviento-dia6-escena";
  const W = 360; // ancho lógico de los minijuegos
  const leer = () => { try { return Number(localStorage.getItem(PROGRESO)) || 0; } catch { return 0; } };
  const guardar = (v) => { try { localStorage.setItem(PROGRESO, v); } catch {} };
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const azar = (a, b) => a + Math.random() * (b - a);

  // ---------- Sonidos sintetizados ----------
  function crearSonidos() {
    let ac = null;
    const listo = () => ac && ac.state === "running";
    function nota(tipo, f0, f1, cuando, dura, vol) {
      if (!listo()) return;
      try {
        const t = ac.currentTime + cuando, o = ac.createOscillator(), g = ac.createGain();
        o.type = tipo;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dura);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dura);
        o.connect(g).connect(ac.destination);
        o.start(t); o.stop(t + dura + 0.03);
      } catch {}
    }
    return {
      activar() {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          ac ||= AC ? new AC() : null;
          if (ac && ac.state !== "running") ac.resume().catch(() => {});
        } catch {}
      },
      tono() { for (const c of [0, 0.5]) for (let i = 0; i < 8; i++) nota("sine", i % 2 ? 480 : 440, i % 2 ? 480 : 440, c + i * 0.045, 0.06, 0.2); },
      globo: () => nota("sine", 520, 760, 0, 0.1, 0.12),
      pitido: () => nota("sine", 880, 880, 0, 0.12, 0.12),
      plano: () => nota("sine", 880, 880, 0, 1.3, 0.1),
      alarma: () => { nota("square", 880, 880, 0, 0.16, 0.06); nota("square", 660, 660, 0.2, 0.16, 0.06); },
      bien: () => [659, 880].forEach((f, i) => nota("triangle", f, f, i * 0.1, 0.18, 0.2)),
      mal: () => nota("sawtooth", 200, 110, 0, 0.28, 0.12),
      salto: () => nota("sine", 300, 620, 0, 0.16, 0.15),
acelera: (v) => nota("sawtooth", 55 + v * 0.16, 62 + v * 0.18, 0, 0.2, 0.045),
      descarga() { nota("sawtooth", 1400, 60, 0, 0.25, 0.25); nota("square", 90, 40, 0.05, 0.3, 0.2); },
      ganar() { [523, 659, 784, 1047].forEach((f, i) => nota("triangle", f, f, i * 0.13, 0.26, 0.2)); },
      mensaje: () => [988, 1319].forEach((f, i) => nota("sine", f, f, i * 0.12, 0.3, 0.2)),
      cerrar() { ac?.close().catch(() => {}); ac = null; },
    };
  }

  function montar(contenedor, datos) {
    const S = datos.sprites;
    const raiz = document.createElement("div");
    raiz.className = "escalada guardia";
    contenedor.append(raiz);
    const sonidos = crearSonidos();
    const img = {}, urls = [];
    let cerrado = false;
    let escena = null; // { fin: [funciones de limpieza] }
    const imagenes = Promise.all(Object.entries(S).map(([n, s]) => new Promise((ok, mal) => {
      const u = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
      urls.push(u);
      const i = new Image();
      i.onload = () => ok(); i.onerror = mal; i.src = u;
      img[n] = i;
    })));

    function limpiarEscena() {
      if (!escena) return;
      const fin = escena.fin;
      escena = null;
      fin.forEach((f) => f());
      raiz.replaceChildren();
    }
    function ir(n) {
      if (cerrado) return;
      limpiarEscena();
      escena = { fin: [], n };
      guardar(n);
      raiz.estado = null;
      ESCENAS[n]();
    }
    const siguiente = () => ir(escena.n + 1);

    // Utilidades que se limpian solas al cambiar de escena
    function alEvento(obj, tipo, f, op) {
      obj.addEventListener(tipo, f, op);
      escena.fin.push(() => obj.removeEventListener(tipo, f, op));
    }
    function dentroDe(ms, f) {
      const t = setTimeout(f, ms);
      escena.fin.push(() => clearTimeout(t));
    }
    function cada(ms, f) {
      const t = setInterval(f, ms);
      escena.fin.push(() => clearInterval(t));
      return () => clearInterval(t);
    }
    function capa(clase, html) {
      const d = document.createElement("div");
      d.className = "esc-capa " + clase;
      d.innerHTML = html;
      raiz.append(d);
      return (s) => d.querySelector(s);
    }
    // Lienzo de 360 de ancho; f(dt, c, H) en cada cuadro
    function lienzo(f) {
      const cv = document.createElement("canvas");
      raiz.prepend(cv);
      const c = cv.getContext("2d");
      const v = { cv, H: 600 };
      const medir = () => {
        const k = Math.min(devicePixelRatio || 1, 2.5), a = Math.max(1, raiz.clientWidth), h = Math.max(1, raiz.clientHeight);
        cv.width = a * k; cv.height = h * k;
        v.H = W * h / a;
        c.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
      };
      medir();
      const ob = new ResizeObserver(medir);
      ob.observe(raiz);
      let antes = performance.now(), cuadro = 0, vivo = true;
      const tic = (t) => {
        if (!vivo) return;
        const dt = limitar((t - antes) / 1000, 0, 0.04);
        antes = t;
        f(dt, c, v.H);
        if (vivo) cuadro = requestAnimationFrame(tic);
      };
      cuadro = requestAnimationFrame(tic);
      escena.fin.push(() => { vivo = false; cancelAnimationFrame(cuadro); ob.disconnect(); });
      v.punto = (e) => {
        const r = cv.getBoundingClientRect();
        return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * W / r.width];
      };
      return v;
    }
    function rotulo(texto) {
      let d = raiz.querySelector(".g-texto");
      if (!d) { d = document.createElement("div"); d.className = "g-texto"; d.setAttribute("role", "status"); raiz.append(d); }
      d.innerHTML = texto ? `<span>${texto}</span>` : "";
    }
    function panel(html) {
      const d = document.createElement("div");
      d.className = "g-panel";
      d.innerHTML = html;
      raiz.append(d);
      return (s) => d.querySelector(s);
    }
    const teclas = {};
    function usarTeclas(alPulsar) {
      for (const k of Object.keys(teclas)) delete teclas[k];
      const ks = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
      alEvento(window, "keydown", (e) => {
        if (!ks.includes(e.key)) return;
        e.preventDefault();
        if (!teclas[e.key]) alPulsar?.(e.key);
        teclas[e.key] = true;
      });
      alEvento(window, "keyup", (e) => { if (ks.includes(e.key)) { e.preventDefault(); teclas[e.key] = false; alPulsar?.(e.key, true); } });
      alEvento(window, "blur", () => { for (const k of ks) teclas[k] = false; });
    }
    function victoria(titulo, texto, boton = "Continuar") {
      sonidos.ganar();
      const q = capa("", `<h3>${titulo}</h3><p>${texto}</p><button type="button" class="boton">${boton}</button>`);
      q(".boton").addEventListener("click", siguiente);
      q(".boton").focus({ preventScroll: true });
    }
    function corazones(c, n, total, x, y) {
      for (let i = 0; i < total; i++) {
        c.fillStyle = i < n ? "#e0493f" : "rgb(0 0 0 / .2)";
        c.beginPath();
        c.arc(x + i * 24 - 4, y, 5, 0, 7); c.arc(x + i * 24 + 4, y, 5, 0, 7); c.fill();
        c.beginPath(); c.moveTo(x + i * 24 - 8.6, y + 2); c.lineTo(x + i * 24, y + 12); c.lineTo(x + i * 24 + 8.6, y + 2); c.fill();
      }
    }
    function barra(c, f, H) {
      c.fillStyle = "rgb(38 35 63 / .25)"; c.beginPath(); c.roundRect(W - 14, 14, 6, H - 110, 3); c.fill();
      c.fillStyle = "#b14645"; c.beginPath(); c.roundRect(W - 14, 14 + (H - 110) * (1 - f), 6, (H - 110) * f, 3); c.fill();
    }

    // ---------- 0. Inicio ----------
    function inicio() {
      const q = capa("g-inicio", `<div class="g-regalo" aria-hidden="true">${DIBUJOS.regalos}</div><h3>El regalo final</h3>
        <p>Has llegado al día de Reyes.</p><button type="button" class="boton">Descubrir el regalo final</button>`);
      q(".boton").addEventListener("click", () => { sonidos.activar(); siguiente(); });
    }

    // ---------- 1. Llamada ----------
    function llamada() {
      const tel = '<path d="M6 3h4l2 5-3 2c1 3 3 5 6 6l2-3 5 2v4c0 1-1 2-2 2C11 21 3 13 3 5c0-1 1-2 3-2Z" fill="currentColor"/>';
      const q = capa("g-llamada", `<div class="g-quien"><div class="g-avatar" aria-hidden="true">${S.supervisora}</div><h3>Supervisora</h3><p>Llamada entrante…</p></div>
        <div class="g-zona">
          <button type="button" class="g-colgar" aria-label="Colgar"><svg viewBox="0 0 24 24" style="transform:rotate(135deg)">${tel}</svg></button>
          <button type="button" class="g-coger" aria-label="Coger la llamada"><svg viewBox="0 0 24 24">${tel}</svg></button>
        </div>`);
      const sonar = () => { sonidos.tono(); try { navigator.vibrate?.([350, 150, 350]); } catch {} };
      dentroDe(150, sonar);
      cada(2200, sonar);
      escena.fin.push(() => { try { navigator.vibrate?.(0); } catch {} });
      const zona = q(".g-zona"), no = q(".g-colgar"), si = q(".g-coger");
      const huir = () => {
        const mx = zona.clientWidth - no.offsetWidth, my = zona.clientHeight - no.offsetHeight;
        let mejor = null;
        for (let k = 0; k < 40; k++) {
          const x = Math.random() * mx, y = Math.random() * my;
          const tapa = x < si.offsetLeft + si.offsetWidth + 8 && x + no.offsetWidth + 8 > si.offsetLeft &&
                       y < si.offsetTop + si.offsetHeight + 8 && y + no.offsetHeight + 8 > si.offsetTop;
          const lejos = Math.hypot(x - no.offsetLeft, y - no.offsetTop);
          if (!tapa && (!mejor || lejos > mejor.lejos)) mejor = { x, y, lejos };
          if (mejor && mejor.lejos > 100 && k > 4) break;
        }
        if (mejor) { no.style.bottom = "auto"; no.style.left = mejor.x + "px"; no.style.top = mejor.y + "px"; }
      };
      no.addEventListener("pointerdown", (e) => { e.preventDefault(); huir(); });
      no.addEventListener("click", (e) => { if (e.detail === 0) huir(); });
      si.addEventListener("click", () => { sonidos.activar(); siguiente(); });
    }

    // ---------- 2. Conversación ----------
    function conversacion() {
      const q = capa("g-chat", `<div class="g-mensajes" role="log"></div><button type="button" class="boton">Siguiente</button>`);
      const lista = q(".g-mensajes"), b = q(".boton");
      let i = 0;
      const poner = () => {
        if (i > datos.llamada.length) return siguiente();
        const d = document.createElement("div");
        if (i === datos.llamada.length) {
          d.className = "g-globo fin";
          d.textContent = datos.espera;
          b.textContent = "Ir al hospital";
        } else {
          d.className = "g-globo " + datos.llamada[i][0];
          d.textContent = datos.llamada[i][1];
        }
        i++;
        lista.append(d);
        lista.scrollTop = lista.scrollHeight;
        sonidos.globo();
      };
      b.addEventListener("click", poner);
      poner();
    }

    // ---------- 3. Conducir hasta el hospital ----------
    function viaje() {
      const META = 8400, TRAMO = 1400, L = 42, R = 11, ALTO = 14;
      const g = raiz.estado = { fase: "andar", t: 0, x: 0, y: 0, vx: 0, vy: 0, a: 0, w: 0, punto: 0, vuelcos: 0, cam: 0, vuelco: 0, quieto: 0, suelo: true };
      const suave = (v, p, q) => { const f = limitar((v - p) / (q - p), 0, 1); return f * f * (3 - 2 * f); };
      // Altura del terreno (hacia arriba); llano al salir y al llegar
      const tierra = (x) => suave(x, 260, 800) * (1 - suave(x, META - 480, META - 130)) *
        (0.8 + 0.3 * x / META) * (58 * Math.sin(x / 140) + 21 * Math.sin(x / 59 + 1) + 22 * Math.sin(x / 330) + 30 * Math.exp(-(((x % 1150) - 640) ** 2) / 2600));
      const pendiente = (x) => (tierra(x + 2) - tierra(x - 2)) / 4;
      g.tierra = tierra;
      const colocar = (x) => Object.assign(g, { x, y: tierra(x) + R + ALTO + 4, vx: 0, vy: 0, a: Math.atan(pendiente(x)), w: 0, vuelco: 0, quieto: 0 });
      colocar(0);
      let gas = false, freno = false, ultimoMotor = 0, fin = false;
      const estrellas = Array.from({ length: 46 }, () => [Math.random() * W, Math.random(), azar(0.7, 1.9)]);

      function fisica(dt, acel) {
        let ax = 0, ay = -620, aw = 0, apoyos = 0;
        const co = Math.cos(g.a), se = Math.sin(g.a);
        for (const lx of [-L, L]) {
          const rx = lx * co + ALTO * se, ry = lx * se - ALTO * co;
          const px = g.x + rx, py = g.y + ry;
          const m = pendiente(px), n = Math.hypot(1, m);
          const nx = -m / n, ny = 1 / n, tx = 1 / n, ty = m / n;
          const hunde = (tierra(px) + R * n - py) / n;
          if (hunde <= 0) continue;
          apoyos++;
          const vx = g.vx - g.w * ry, vy = g.vy + g.w * rx;
          const fn = Math.max(0, 320 * hunde - 17 * (vx * nx + vy * ny));
          const vt = vx * tx + vy * ty;
          const ft = acel * 270 - vt * (acel < 0 && vt > 0 ? 2.2 : 0.35);
          ax += fn * nx + ft * tx; ay += fn * ny + ft * ty;
          aw += (rx * (fn * ny + ft * ty) - ry * (fn * nx + ft * tx * 1.25)) / 700;
        }
        g.suelo = apoyos > 0;
        if (!apoyos) aw += acel * 13; // en el aire se equilibra con los pedales
        g.vx += ax * dt; g.vy += ay * dt; g.w = (g.w + aw * dt) * (1 - 1.1 * dt);
        g.vx = limitar(g.vx, -130, 430);
        g.x += g.vx * dt; g.y += g.vy * dt; g.a += g.w * dt;
        if (g.x < -60) { g.x = -60; g.vx = Math.max(0, g.vx); }
        for (const lx of [-30, 30]) { // techo
          const qx = g.x + lx * co - 30 * se, qy = g.y + lx * se + 30 * co;
          if (qy < tierra(qx) && g.vuelco <= 0) return volcar();
        }
      }
      function volcar() {
        g.vuelcos++;
        g.vuelco = 1.1;
        sonidos.mal();
        rotulo("¡Has volcado! Frena antes de las bajadas");
      }
      function empezar() {
        g.fase = "conducir";
        g.t = 0;
        rotulo(matchMedia("(pointer: coarse)").matches ? "Acelera y frena sin volcar" : "→ acelera, ← frena. ¡No vuelques!");
        dentroDe(3500, () => { if (g.fase === "conducir" && g.vuelco <= 0) rotulo(""); });
        const q = panel('<button type="button" class="b-freno">Frenar</button><button type="button" class="b-gas">Acelerar</button>');
        q(".b-gas").addEventListener("pointerdown", (e) => { e.preventDefault(); e.target.releasePointerCapture?.(e.pointerId); gas = true; });
        q(".b-freno").addEventListener("pointerdown", (e) => { e.preventDefault(); e.target.releasePointerCapture?.(e.pointerId); freno = true; });
        for (const s of [".b-gas", ".b-freno"]) {
          for (const t of ["pointerup", "pointercancel", "pointerleave"]) q(s).addEventListener(t, () => { if (s === ".b-gas") gas = false; else freno = false; });
          q(s).addEventListener("contextmenu", (e) => e.preventDefault());
        }
      }
      alEvento(window, "blur", () => { gas = freno = false; });
      usarTeclas();

      lienzo((dt, c, H) => {
        g.t += dt;
        if (g.fase === "andar" && g.t > 2.4) empezar();
        if (g.fase !== "andar") {
          if (g.vuelco > 0) {
            g.vuelco -= dt;
            if (g.vuelco <= 0) { colocar(g.punto); rotulo(""); }
          } else {
            const acelera = gas || teclas.ArrowRight, frena = freno || teclas.ArrowLeft;
            const acel = g.fase === "llegar" ? (g.vx > 4 ? -0.9 : 0) : (acelera ? 1 : 0) - (frena ? 0.85 : 0);
            for (let k = 0; k < 6 && g.vuelco <= 0; k++) fisica(dt / 6, acel);
            if (acelera && g.fase === "conducir" && g.t - ultimoMotor > 0.16) { ultimoMotor = g.t; sonidos.acelera(Math.abs(g.vx)); }
            const p = Math.floor(limitar(g.x, 0, META - 1) / TRAMO) * TRAMO;
            if (p > g.punto && g.suelo) { g.punto = p; sonidos.bien(); rotulo("¡Punto de control!"); dentroDe(1200, () => { if (g.vuelco <= 0 && !fin) rotulo(""); }); }
            // De lado y parada: se recoloca
            g.quieto = Math.abs(g.a) > 1.2 && Math.hypot(g.vx, g.vy) < 25 ? g.quieto + dt : 0;
            if (g.quieto > 1) volcar();
            if (g.x >= META - 60 && g.fase === "conducir") { g.fase = "llegar"; raiz.querySelector(".g-panel")?.remove(); }
            if (g.fase === "llegar" && !fin && Math.abs(g.vx) < 12) {
              fin = true;
              rotulo(`Has llegado al Hospital ${datos.hospital}`);
              sonidos.ganar();
              panel('<button type="button">Entrar a trabajar</button>')("button").addEventListener("click", siguiente);
            }
          }
        }
        dibujar(c, H, dt);
      });
      function dibujar(c, H, dt) {
        const cx = limitar(g.x - 105, -110, META + 40);
        const base = H * 0.6, objetivo = g.y * 0.85;
        g.cam += (objetivo - g.cam) * Math.min(1, dt * 5);
        const py = (y) => base - (y - g.cam);
        const cielo = c.createLinearGradient(0, 0, 0, H);
        cielo.addColorStop(0, "#10152f"); cielo.addColorStop(0.8, "#3d4379");
        c.fillStyle = cielo; c.fillRect(0, 0, W, H);
        c.fillStyle = "#fff";
        for (const [x, y, r] of estrellas) { c.globalAlpha = 0.5 + 0.5 * Math.sin(g.t * 2 + x); c.beginPath(); c.arc(x, y * H * 0.5, r, 0, 7); c.fill(); }
        c.globalAlpha = 1;
        c.fillStyle = "#fbf0e1"; c.beginPath(); c.arc(285, 92, 25, 0, 7); c.fill();
        c.fillStyle = "#151b3b"; c.beginPath(); c.arc(295, 85, 22, 0, 7); c.fill();
        c.fillStyle = "#272e5c"; // montañas
        c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) { const s = x + cx * 0.3; c.lineTo(x, base - 46 - 34 * Math.sin(s / 70) - 18 * Math.sin(s / 31)); }
        c.lineTo(W, H); c.fill();
        // Hospital
        const hx = META - 20 - cx, hy = py(0);
        if (hx < W + 10) {
          c.fillStyle = "#e7ebee"; c.fillRect(hx, hy - 220, 250, 224);
          c.fillStyle = "#8fb7c9";
          for (let a = 0; a < 5; a++) for (let b = 0; b < 3; b++) c.fillRect(hx + 16 + a * 46, hy - 146 + b * 40, 28, 22);
          c.fillStyle = "#476356"; c.fillRect(hx, hy - 220, 250, 58);
          c.fillStyle = "#fff"; c.textAlign = "left";
          c.font = '400 17px "Abril Fatface", Georgia, serif'; c.fillText("HOSPITAL", hx + 46, hy - 198);
          c.font = '400 22px "Abril Fatface", Georgia, serif'; c.fillText(datos.hospital.toUpperCase(), hx + 46, hy - 174);
          c.fillStyle = "#e0493f"; c.fillRect(hx + 10, hy - 196, 28, 9); c.fillRect(hx + 19.5, hy - 205.5, 9, 28);
        }
        // Terreno
        c.beginPath(); c.moveTo(-5, H + 5);
        for (let x = -5; x <= W + 5; x += 5) c.lineTo(x, py(tierra(x + cx)));
        c.lineTo(W + 5, H + 5); c.closePath();
        c.fillStyle = "#33503f"; c.fill();
        c.strokeStyle = "#8f95a3"; c.lineWidth = 8; c.lineJoin = "round";
        c.beginPath();
        for (let x = -5; x <= W + 5; x += 5) c.lineTo(x, py(tierra(x + cx)) + 4);
        c.stroke();
        for (let s = Math.ceil(cx / 210) * 210; s < cx + W + 40; s += 210) { // árboles
          if (s < 200 || s > META - 160) continue;
          const x = s - cx, y = py(tierra(s)) + 34;
          c.fillStyle = "#5b4636"; c.fillRect(x - 3, y, 6, 14);
          c.fillStyle = "#78a082"; c.beginPath(); c.moveTo(x, y - 34); c.lineTo(x + 17, y + 4); c.lineTo(x - 17, y + 4); c.fill();
        }
        for (let s = TRAMO; s < META - 10; s += TRAMO) { // puntos de control
          const x = s - cx;
          if (x < -20 || x > W + 20) continue;
          const y = py(tierra(s));
          c.fillStyle = "#e7ebee"; c.fillRect(x - 2, y - 62, 4, 64);
          c.fillStyle = g.punto >= s ? "#3fbf6f" : "#e0493f"; c.beginPath(); c.moveTo(x + 2, y - 62); c.lineTo(x + 30, y - 52); c.lineTo(x + 2, y - 42); c.fill();
        }
        // Coche
        const cw = 150, ch = cw * 160 / 362;
        c.save();
        c.translate(g.x - cx, py(g.y));
        c.rotate(-g.a);
        if (g.fase !== "andar") {
          const luz = c.createLinearGradient(70, 0, 185, 0);
          luz.addColorStop(0, "rgb(255 243 196 / .45)"); luz.addColorStop(1, "rgb(255 243 196 / 0)");
          c.fillStyle = luz; c.beginPath(); c.moveTo(66, -6); c.lineTo(185, -28); c.lineTo(185, 30); c.lineTo(66, 6); c.fill();
        }
        c.drawImage(g.fase === "andar" && g.t < 2 ? img.coche : img.cocheElla, -cw / 2, ALTO - 50.5, cw, ch);
        c.restore();
        if (g.fase === "andar" && g.t < 2) { // camina hasta el coche
          const f = Math.min(1, g.t / 1.7), x = -60 + f * (g.x - cx + 60), paso = Math.floor(g.t * 7) % 2;
          c.globalAlpha = g.t > 1.7 ? Math.max(0, 1 - (g.t - 1.7) / 0.3) : 1;
          c.drawImage(g.t > 1.7 ? img.pie : paso ? img.corre1 : img.corre2, x - 30, py(0) - 92, 64, 98);
          c.globalAlpha = 1;
        }
        if (g.fase !== "andar") barra(c, limitar(g.x / META, 0, 1), H);
      }
    }

    // ---------- Reloj y presentación de cada caso ----------
    function caso({ desde, hora, titulo, quien, frases, boton, alarma }) {
      const aMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      const a = aMin(desde), b = aMin(hora) < a ? aMin(hora) + 1440 : aMin(hora);
      const q = capa("g-noche", `<div class="g-hora" aria-label="${hora}">${desde}</div>
        <div class="g-sala" aria-hidden="true">${quien ? `<div class="g-borracho">${quien}</div>` : ""}<div class="g-alta">${S.pie}</div></div>
        <h3></h3><p></p><button type="button" class="boton" hidden></button>`);
      const reloj = q(".g-hora"), p = q("p"), bt = q(".boton");
      const t0 = performance.now(), DURA = 1700;
      const parar = cada(40, () => {
        const f = Math.min(1, (performance.now() - t0) / DURA);
        const m = Math.round(a + (b - a) * (1 - (1 - f) ** 3)) % 1440;
        reloj.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
        if (f < 1) return;
        parar();
        reloj.textContent = hora;
        sonidos.pitido();
        q("h3").textContent = titulo;
        let i = 0;
        const pon = () => {
          p.textContent = frases[i];
          i++;
          if (i === frases.length) {
            bt.textContent = boton;
            if (alarma) {
              q("h3").textContent = alarma;
              reloj.parentElement.classList.add("g-alarma");
              sonidos.alarma();
              cada(800, sonidos.alarma);
            }
          } else bt.textContent = "Siguiente";
        };
        bt.hidden = false;
        bt.addEventListener("click", () => { sonidos.activar(); if (i < frases.length) pon(); else siguiente(); });
        pon();
      });
    }
    const caso1 = () => caso({ desde: "22:00", hora: "1:36", titulo: "Nuevo ingreso", quien: S.papa, boton: "Cogerle una vía", frases: [
      "Papá Noel llega a urgencias… un poco perjudicado.",
      "«¡Jo, jo, hip! Me han puesto un anís en cada casa y no iba a hacer el feo.»",
      "Hay que cogerle una vía para ponerle suero."] });
    const caso2 = () => caso({ desde: "1:36", hora: "3:52", titulo: "Otro ingreso", quien: S.baltasar, boton: "Hacer la gastroscopia", frases: [
      "Llega Baltasar con muy mala cara.",
      "«Me he comido el roscón entero… ¡y creo que también el premio!»",
      "Toca gastroscopia para sacar la figurita."] });
    const caso3 = () => caso({ desde: "3:52", hora: "7:55", titulo: "Cinco minutos y a casa…", quien: "", boton: "¡Coger el carro!", alarma: "¡Parada!", frases: [
      "Todo tranquilo. Parece que la noche por fin va a terminar.",
      "¡Papá Noel está en parada en la habitación 6! ¡Corre!"] });

    // ---------- 5. Vía ----------
    function via() {
      const g = raiz.estado = { fase: "vena", t: 0, aciertos: 0, aguja: 0, zona: 0.5, ancho: 0.3, sacude: 0, gotas: 0, buena: Math.floor(Math.random() * 3) };
      rotulo("Toca la vena buena: la más gruesa, que late");
      const venaY = (i) => -34 + i * 34;
      let medio = 300;
      const v = lienzo((dt, c, H) => {
        g.t += dt;
        g.sacude = Math.max(0, g.sacude - dt * 2.5);
        if (g.fase === "pinchar") g.aguja = 0.5 + 0.5 * Math.sin(g.t * (2.1 + g.aciertos * 0.55));
        medio = H * 0.42;
        c.fillStyle = "#dfe9ec"; c.fillRect(0, 0, W, H);
        c.fillStyle = "#c6d6db"; c.fillRect(0, H * 0.62, W, H);
        c.fillStyle = "#fff"; c.beginPath(); c.roundRect(-20, medio - 92, W + 40, 190, 26); c.fill();
        c.save();
        c.translate(Math.sin(g.t * 1.3) * 7 + Math.sin(g.t * 60) * 9 * g.sacude, medio + Math.cos(g.t * 1.7) * 6);
        c.fillStyle = "#f3c6ac"; c.beginPath(); c.roundRect(60, -62, 220, 124, 50); c.fill();
        c.beginPath(); c.roundRect(250, -50, 84, 100, 40); c.fill(); // mano
        for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(300, -48 + i * 25, 56, 21, 10); c.fill(); }
        c.fillStyle = "#c93a3a"; c.fillRect(-60, -80, 120, 160);
        c.fillStyle = "#fbf7ef"; c.beginPath(); c.roundRect(44, -86, 38, 172, 18); c.fill();
        for (let i = 0; i < 3; i++) {
          const b = i === g.buena, l = b ? 7 + 1.6 * Math.sin(g.t * 7) : 4;
          c.strokeStyle = b ? "#5579b8" : "#a59dbb"; c.lineWidth = l; c.lineCap = "round";
          c.beginPath(); c.moveTo(96, venaY(i)); c.bezierCurveTo(140, venaY(i) - 13, 190, venaY(i) + 13, 248, venaY(i) - 3); c.stroke();
        }
        if (g.fase !== "vena") { // aguja
          const d = g.fase === "fin" ? 0 : 26;
          c.save(); c.translate(172, venaY(g.buena)); c.rotate(-0.6);
          c.fillStyle = "#c9ced6"; c.fillRect(d, -1.5, 34, 3);
          c.fillStyle = "#2b8fe0"; c.fillRect(d + 34, -8, 34, 16);
          c.restore();
        }
        c.restore();
        if (g.fase === "pinchar") {
          const y = H - 128, x0 = 30, a = W - 60;
          c.fillStyle = "#26233f"; c.beginPath(); c.roundRect(x0 - 6, y - 6, a + 12, 36, 12); c.fill();
          c.fillStyle = "#e0493f"; c.fillRect(x0, y, a, 24);
          c.fillStyle = "#3fbf6f"; c.fillRect(x0 + (g.zona - g.ancho / 2) * a, y, g.ancho * a, 24);
          c.fillStyle = "#fff"; c.fillRect(x0 + g.aguja * a - 3, y - 12, 6, 48);
          for (let i = 0; i < 3; i++) { c.fillStyle = i < g.aciertos ? "#3fbf6f" : "#b9c8cd"; c.beginPath(); c.arc(W / 2 - 30 + i * 30, y - 34, 9, 0, 7); c.fill(); }
        }
        if (g.fase === "fin") { // suero
          c.strokeStyle = "#8a98a3"; c.lineWidth = 4; c.beginPath(); c.moveTo(300, 92); c.lineTo(300, medio - 90); c.stroke();
          c.fillStyle = "rgb(190 225 240 / .95)"; c.strokeStyle = "#7fa9ba"; c.lineWidth = 3;
          c.beginPath(); c.roundRect(272, 78, 56, 74, 12); c.fill(); c.stroke();
          c.fillStyle = "#26233f"; c.font = "700 14px Nunito, sans-serif"; c.textAlign = "center"; c.fillText("SUERO", 300, 120);
          c.strokeStyle = "#9fc6d6"; c.lineWidth = 4; c.beginPath(); c.moveTo(300, 152); c.bezierCurveTo(300, medio - 40, 260, medio - 70, 215, medio + venaY(g.buena) - 30); c.stroke();
          c.fillStyle = "#5fb4dd"; for (let i = 0; i < 3; i++) { const f = (g.t * 0.8 + i / 3) % 1; c.beginPath(); c.arc(300 - f * f * 80, 152 + f * (medio - 170), 4, 0, 7); c.fill(); }
        }
      });
      const nueva = () => { g.zona = azar(0.22, 0.78); g.ancho = 0.3 - g.aciertos * 0.04; };
      function pinchar() {
        if (g.fase !== "pinchar") return;
        if (Math.abs(g.aguja - g.zona) <= g.ancho / 2 + 0.01) {
          g.aciertos++;
          sonidos.bien();
          if (g.aciertos === 3) {
            g.fase = "fin";
            raiz.querySelector(".g-panel")?.remove();
            rotulo("¡Dentro! El suero ya está pasando");
            sonidos.pitido();
            dentroDe(2000, () => victoria("¡Vía cogida!", "Papá Noel ya duerme la mona con su suero."));
          } else { rotulo(["¡Bien! Ahora, sin temblar", "¡Casi está! La última"][g.aciertos - 1]); nueva(); }
        } else {
          g.aciertos = Math.max(0, g.aciertos - 1);
          g.sacude = 1;
          sonidos.mal();
          rotulo("«¡Ay, ay, ay! ¡Jo, jo, jo!» Otra vez");
          nueva();
        }
      }
      function elegir(i) {
        if (i !== g.buena) { g.sacude = 0.7; sonidos.mal(); rotulo("Esa vena baila mucho. Prueba otra"); return; }
        g.fase = "pinchar";
        sonidos.bien();
        nueva();
        rotulo("Pincha cuando la marca pase por la zona verde. ¡Tres veces!");
        const q = panel('<button type="button">Pinchar</button>');
        q("button").addEventListener("pointerdown", (e) => { e.preventDefault(); pinchar(); });
        q("button").addEventListener("click", (e) => { if (e.detail === 0) pinchar(); });
      }
      v.cv.addEventListener("pointerdown", (e) => {
        if (g.fase === "pinchar") return pinchar();
        if (g.fase !== "vena") return;
        const [x, y] = v.punto(e);
        if (x < 84 || x > 270 || Math.abs(y - medio) > 66) return;
        const d = [0, 1, 2].map((i) => Math.abs(y - medio - venaY(i)));
        elegir(d.indexOf(Math.min(...d)));
      });
      let cursor = -1;
      usarTeclas((k, suelta) => {
        if (suelta) return;
        if (g.fase === "pinchar") { if (k === " ") pinchar(); return; }
        if (g.fase !== "vena") return;
        if (k === "ArrowUp" || k === "ArrowDown") { cursor = k === "ArrowUp" ? Math.max(0, cursor - 1) : Math.min(2, cursor + 1); rotulo(`Vena ${cursor + 1} de 3. Espacio para elegir`); }
        if (k === " " && cursor >= 0) elegir(cursor);
      });
    }

    // ---------- 7. Gastroscopia ----------
    function gastro() {
      const LARGO = 3000, VEL = 92, TRAMO = 750;
      const g = raiz.estado = { fase: "bajar", s: 0, x: W / 2, vidas: 3, t: 0, golpe: 0, control: 0, px: W / 2, py: 0, pinza: "quieta", cogida: null };
      const centro = (s) => W / 2 + Math.min(1, s / 200) * (Math.sin(s / 165) * 62 + Math.sin(s / 71 + 1) * 24);
      const radio = (s) => 64 - 16 * Math.min(1, s / LARGO);
      g.centro = centro;
      const cosas = [];
      rotulo(`Baja sin tocar las paredes: ${matchMedia("(pointer: coarse)").matches ? "arrastra el dedo" : "usa las flechas"}`);
      dentroDe(4000, () => { if (g.fase === "bajar") rotulo(""); });
      let arrastre = null;
      function estomago() {
        g.fase = "estomago";
        g.x = W / 2;
        rotulo("¡Ahí está! Coloca la pinza y suéltala sobre la figurita");
        sonidos.bien();
        for (let i = 0; i < 5; i++) cosas.push({ tipo: i === 2 ? "premio" : "roscon", x: 50 + i * 65, fila: i % 2, v: (i % 2 ? -1 : 1) * azar(26, 42), r: i === 2 ? 22 : 24 });
        const q = panel('<button type="button">Soltar la pinza</button>');
        q("button").addEventListener("pointerdown", (e) => { e.preventDefault(); soltar(); });
        q("button").addEventListener("click", (e) => { if (e.detail === 0) soltar(); });
      }
      function soltar() { if (g.fase === "estomago" && g.pinza === "quieta") { g.pinza = "baja"; sonidos.salto(); } }
      const v = lienzo((dt, c, H) => {
        g.t += dt;
        g.golpe = Math.max(0, g.golpe - dt);
        const mueve = (teclas.ArrowRight ? 1 : 0) - (teclas.ArrowLeft ? 1 : 0);
        g.x += mueve * 215 * dt;
        if (g.fase === "bajar") bajar(dt, c, H); else digerir(dt, c, H);
      });
      function bajar(dt, c, H) {
        const yTip = H * 0.36;
        if (g.golpe <= 0) g.s += VEL * dt;
        const r = radio(g.s), d = g.x - centro(g.s);
        if (Math.abs(d) > r - 11 && g.golpe <= 0) {
          g.vidas--;
          g.golpe = 0.8;
          sonidos.mal();
          g.x = centro(g.s);
          arrastre = null;
          if (g.vidas <= 0) {
            g.vidas = 3;
            g.s = Math.floor(g.s / TRAMO) * TRAMO;
            g.x = centro(g.s);
            rotulo("¡Arcada! Vuelves un poco atrás");
          } else rotulo("«¡Uaaagh!» Cuidado con las paredes");
        }
        if (g.s >= LARGO) return estomago();
        c.fillStyle = "#a8434a"; c.fillRect(0, 0, W, H);
        c.save();
        if (g.golpe > 0) c.translate(Math.sin(g.t * 70) * 5 * g.golpe, 0);
        for (const [extra, color] of [[14, "#c9636a"], [0, "#f2b1ad"]]) {
          c.fillStyle = color; c.beginPath();
          for (let y = -10; y <= H + 10; y += 10) { const s = g.s + y - yTip; c.lineTo(centro(s) - radio(s) - extra, y); }
          for (let y = H + 10; y >= -10; y -= 10) { const s = g.s + y - yTip; c.lineTo(centro(s) + radio(s) + extra, y); }
          c.fill();
        }
        c.strokeStyle = "rgb(201 99 106 / .4)"; c.lineWidth = 4;
        for (let k = Math.floor((g.s - yTip) / 60); k * 60 < g.s + H; k++) {
          const s = k * 60, y = s - g.s + yTip, w = radio(s);
          c.beginPath(); c.moveTo(centro(s) - w, y); c.quadraticCurveTo(centro(s), y + 16, centro(s) + w, y); c.stroke();
        }
        c.strokeStyle = "#26282f"; c.lineWidth = 15; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
        for (let y = -20; y <= yTip - 14; y += 12) { const f = Math.max(0, 1 - (yTip - y) / 150); c.lineTo(centro(g.s + y - yTip) * (1 - f) + g.x * f, y); }
        c.lineTo(g.x, yTip - 4); c.stroke();
        c.fillStyle = "#3b4252"; c.beginPath(); c.arc(g.x, yTip, 11, 0, 7); c.fill();
        c.fillStyle = "#fff3c4"; c.beginPath(); c.arc(g.x, yTip + 2, 5.5, 0, 7); c.fill();
        c.restore();
        corazones(c, g.vidas, 3, 26, H - 34);
        barra(c, g.s / LARGO, H);
      }
      function digerir(dt, c, H) {
        g.x = limitar(g.x, 24, W - 24);
        c.fillStyle = "#a8434a"; c.fillRect(0, 0, W, H);
        c.fillStyle = "#f2b1ad"; c.beginPath(); c.ellipse(W / 2, H * 0.48, W * 0.56, H * 0.44, 0, 0, 7); c.fill();
        c.fillStyle = "#d9c56a"; c.beginPath(); c.ellipse(W / 2, H * 0.72, W * 0.5, H * 0.15, 0, 0, 7); c.fill();
        const fondo = H * 0.6;
        const objetivo = g.cogida;
        for (const o of cosas) {
          if (o !== objetivo) {
            o.x += o.v * dt;
            if (o.x < 34 || o.x > W - 34) { o.v *= -1; o.x = limitar(o.x, 34, W - 34); }
            o.y = fondo + o.fila * 46 + Math.sin(g.t * 2 + o.x / 40) * 5;
          }
          c.save(); c.translate(o.x, o.y);
          if (o.tipo === "roscon") {
            c.fillStyle = "#d39a5c"; c.strokeStyle = "#b9783f"; c.lineWidth = 3;
            c.beginPath(); c.arc(0, 8, 26, Math.PI, 0); c.lineTo(11, 8); c.arc(0, 8, 11, 0, Math.PI, true); c.closePath(); c.fill(); c.stroke();
            c.fillStyle = "#b14645"; c.beginPath(); c.arc(-13, -4, 4.5, 0, 7); c.fill(); c.fillStyle = "#476356"; c.beginPath(); c.arc(10, -7, 4.5, 0, 7); c.fill();
          } else {
            c.fillStyle = "#f5f3ee"; c.strokeStyle = "#8a7c5c"; c.lineWidth = 2.5;
            c.beginPath(); c.moveTo(-15, 22); c.quadraticCurveTo(-13, -2, 0, -4); c.quadraticCurveTo(13, -2, 15, 22); c.closePath(); c.fill(); c.stroke();
            c.beginPath(); c.arc(0, -8, 9, 0, 7); c.fill(); c.stroke();
            c.fillStyle = "#e3bd3f"; c.beginPath(); c.moveTo(-10, -14); c.lineTo(-11, -26); c.lineTo(-4, -20); c.lineTo(0, -28); c.lineTo(4, -20); c.lineTo(11, -26); c.lineTo(10, -14); c.fill();
          }
          c.restore();
        }
        const arriba = 110;
        if (g.pinza === "quieta") { g.px = g.x; g.py = arriba; }
        if (g.pinza === "baja") {
          g.py += 460 * dt;
          const o = cosas.filter((k) => Math.abs(k.x - g.px) < k.r + 6 && g.py >= k.y - 22 && g.py <= k.y + 18).sort((a, b) => Math.abs(a.x - g.px) - Math.abs(b.x - g.px))[0];
          if (o) {
            g.cogida = o;
            g.pinza = "sube";
            if (o.tipo === "premio") { sonidos.bien(); rotulo("¡La tienes!"); }
            else { sonidos.mal(); rotulo("Eso es roscón. ¡Otra vez!"); }
          } else if (g.py > fondo + 90) { g.pinza = "sube"; sonidos.mal(); rotulo("¡Casi! Inténtalo de nuevo"); }
        }
        if (g.pinza === "sube") {
          g.py -= 330 * dt;
          if (g.cogida) { g.cogida.x = g.px; g.cogida.y = g.py + 20; }
          if (g.py <= arriba) {
            const o = g.cogida;
            g.cogida = null;
            if (o?.tipo === "premio") {
              g.pinza = "fin";
              cosas.splice(cosas.indexOf(o), 1);
              raiz.querySelector(".g-panel")?.remove();
              return victoria("¡Figurita rescatada!", "Baltasar promete masticar más despacio el año que viene.");
            }
            g.pinza = "quieta";
            g.x = g.px;
          }
        }
        c.strokeStyle = "#26282f"; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.moveTo(W / 2, -10); c.quadraticCurveTo(g.px, 30, g.px, g.py); c.stroke();
        c.strokeStyle = "#c9ced6"; c.lineWidth = 5; c.beginPath();
        const ab = g.pinza === "sube" && g.cogida ? 10 : 18;
        c.moveTo(g.px, g.py); c.lineTo(g.px - ab, g.py + 14); c.lineTo(g.px - ab * 0.5, g.py + 28);
        c.moveTo(g.px, g.py); c.lineTo(g.px + ab, g.py + 14); c.lineTo(g.px + ab * 0.5, g.py + 28); c.stroke();
        g.premio = cosas.find((o) => o.tipo === "premio");
      }
      v.cv.addEventListener("pointerdown", (e) => { arrastre = v.punto(e)[0]; });
      alEvento(window, "pointermove", (e) => {
        if (arrastre === null) return;
        const x = v.punto(e)[0];
        if (g.golpe <= 0) g.x += (x - arrastre) * 1.15;
        arrastre = x;
      });
      for (const t of ["pointerup", "pointercancel"]) alEvento(window, t, () => { arrastre = null; });
      usarTeclas((k, suelta) => { if (!suelta && (k === " " || k === "ArrowDown")) soltar(); });
    }

    // ---------- 9. Carrera con el carro ----------
    function carrera() {
      const META = 13200;
      const g = raiz.estado = { d: 0, y: 0, vy: 0, agacha: false, obs: [], prox: 520, t: 0, invul: 1, choques: 0, parado: 0, punto: 0 };
      rotulo("Salta las camillas y agáchate bajo las jeringuillas");
      dentroDe(3500, () => rotulo(""));
      const velocidad = () => 250 + 110 * g.d / META;
      let dedoAgacha = false;
      const saltar = () => { if (g.y <= 0 && g.parado <= 0) { g.vy = 720; g.y = 0.1; sonidos.salto(); } };
      lienzo((dt, c, H) => {
        g.t += dt;
        g.invul = Math.max(0, g.invul - dt);
        g.agacha = !!(teclas.ArrowDown || dedoAgacha) && g.y <= 0;
        if (g.parado > 0) {
          g.parado -= dt;
          if (g.parado <= 0) { g.d = g.punto; g.obs = []; g.prox = g.d + 520; g.y = 0; g.vy = 0; g.invul = 1; rotulo(""); }
        } else {
          g.d += velocidad() * dt;
          if (g.y > 0 || g.vy > 0) {
            g.vy -= (teclas.ArrowDown || dedoAgacha ? 3400 : 1700) * dt;
            g.y = Math.max(0, g.y + g.vy * dt);
            if (g.y === 0) g.vy = 0;
          }
          const nuevo = Math.min(2, Math.floor(g.d / (META / 3))) * (META / 3);
          if (nuevo > g.punto) { g.punto = nuevo; rotulo("¡Punto de control!"); sonidos.bien(); dentroDe(1200, () => rotulo("")); }
          if (g.prox < g.d + W + 80 && g.prox < META - 350) {
            g.obs.push({ tipo: Math.random() < 0.56 ? "camilla" : "jeringuilla", x: g.prox });
            g.prox += velocidad() * azar(1.15, 1.75);
          } else if (g.prox < g.d + W + 80) g.prox = Infinity;
          g.obs = g.obs.filter((o) => o.x > g.d - 160);
          for (const o of g.obs) {
            const x = o.x - g.d;
            const toca = o.tipo === "camilla" ? x < 132 && x + 54 > 66 && g.y < 40 : x < 112 && x + 58 > 60 && g.y < 112 && g.y + (g.agacha ? 88 : 124) > 100;
            if (toca && g.invul <= 0) {
              g.parado = 1.1;
              g.choques++;
              sonidos.mal();
              rotulo(o.tipo === "camilla" ? "¡Golpe con la camilla!" : "¡Ay, jeringuillazo!");
              break;
            }
          }
          if (g.d >= META) {
            g.d = META;
            raiz.querySelector(".g-panel")?.remove();
            g.parado = Infinity;
            victoria("¡Has llegado!", "Habitación 6. Papá Noel te necesita.", "Reanimarle");
          }
        }
        dibujar(c, H);
      });
      function dibujar(c, H) {
        const suelo = H * 0.7;
        c.fillStyle = "#e9f0f2"; c.fillRect(0, 0, W, suelo);
        c.fillStyle = "#cfe3da"; c.fillRect(0, suelo - 92, W, 92);
        c.fillStyle = "#78b793"; c.fillRect(0, suelo - 96, W, 6);
        for (let i = -1; i < 3; i++) { // puertas
          const n = Math.floor(g.d * 0.8 / 210) + i + 1, x = n * 210 - g.d * 0.8;
          c.fillStyle = "#a7c4d1"; c.fillRect(x + 20, suelo - 205, 92, 205);
          c.fillStyle = "#dbe9ef"; c.fillRect(x + 36, suelo - 188, 60, 62);
          c.fillStyle = "#7b8794"; c.beginPath(); c.arc(x + 100, suelo - 90, 5, 0, 7); c.fill();
          c.fillStyle = "#476356"; c.font = '400 18px "Abril Fatface", Georgia, serif'; c.textAlign = "center"; c.fillText(String(((n % 5) + 5) % 5 + 1), x + 66, suelo - 214);
          c.fillStyle = "#fff8dc"; c.fillRect(x + 130, 64, 70, 12);
        }
        c.fillStyle = "#b9c8cd"; c.fillRect(0, suelo, W, H - suelo);
        c.fillStyle = "#a6b7bd"; for (let i = 0; i < 8; i++) c.fillRect(i * 60 - (g.d % 60), suelo + 14, 30, 5);
        if (META - g.d < W) { // puerta de la habitación 6
          const x = META - g.d + 130;
          c.fillStyle = "#c93a3a"; c.fillRect(x, suelo - 220, 110, 220);
          c.fillStyle = "#fff"; c.font = '400 54px "Abril Fatface", Georgia, serif'; c.textAlign = "center"; c.fillText("6", x + 55, suelo - 110);
        }
        for (const o of g.obs) {
          const x = o.x - g.d;
          if (o.tipo === "camilla") {
            c.fillStyle = "#7b8794"; c.fillRect(x + 6, suelo - 24, 4, 18); c.fillRect(x + 46, suelo - 24, 4, 18); c.fillRect(x + 4, suelo - 20, 50, 4);
            c.fillStyle = "#fff"; c.strokeStyle = "#8fb7c9"; c.lineWidth = 2; c.beginPath(); c.roundRect(x - 2, suelo - 38, 62, 15, 6); c.fill(); c.stroke();
            c.fillStyle = "#8fb7c9"; c.beginPath(); c.roundRect(x + 40, suelo - 46, 18, 11, 5); c.fill();
            c.fillStyle = "#39424e"; for (const k of [9, 49]) { c.beginPath(); c.arc(x + k, suelo - 5, 5.5, 0, 7); c.fill(); }
          } else {
            const y = suelo - 107 + Math.sin(g.t * 6 + o.x) * 2;
            c.fillStyle = "#c9ced6"; c.fillRect(x - 16, y - 1.5, 20, 3);
            c.fillStyle = "#eaf6fb"; c.strokeStyle = "#5b8ea6"; c.lineWidth = 2.5; c.beginPath(); c.roundRect(x + 4, y - 9, 38, 18, 4); c.fill(); c.stroke();
            c.fillStyle = "#e0493f"; c.fillRect(x + 7, y - 6, 18, 12);
            c.fillStyle = "#5b8ea6"; c.fillRect(x + 42, y - 2, 14, 4); c.fillRect(x + 54, y - 9, 4, 18);
          }
        }
        const paso = Math.floor(g.t * 9) % 2;
        const sp = g.parado > 0 && g.parado < 9 ? img.salta : g.y > 0 ? img.salta : g.agacha ? img.agacha : paso ? img.corre1 : img.corre2;
        const h = 128, w = h * 178 / 272, y = suelo - g.y + 3;
        c.save();
        if (g.invul > 0 && g.parado <= 0) c.globalAlpha = 0.6 + 0.4 * Math.sin(g.t * 24);
        if (g.parado > 0 && g.parado < 9) { c.translate(90, y - 40); c.rotate(-0.22); c.translate(-90, -(y - 40)); }
        c.drawImage(sp, 18, y - h, w, h);
        c.drawImage(img.carro, 92, y - 72 + (g.y > 0 ? -4 : 0), 60, 70);
        c.restore();
        barra(c, g.d / META, H);
      }
      const q = panel('<button type="button" class="b-baja">Agacharse</button><button type="button" class="b-salta">Saltar</button>');
      q(".b-salta").addEventListener("pointerdown", (e) => { e.preventDefault(); saltar(); });
      q(".b-salta").addEventListener("click", (e) => { if (e.detail === 0) saltar(); });
      q(".b-baja").addEventListener("pointerdown", (e) => { e.preventDefault(); dedoAgacha = true; });
      for (const t of ["pointerup", "pointercancel", "blur"]) alEvento(window, t, () => { dedoAgacha = false; });
      usarTeclas((k, suelta) => { if (!suelta && (k === "ArrowUp" || k === " ")) saltar(); });
    }

    // ---------- 10. Desfibrilador ----------
    function desfibrilador() {
      const g = raiz.estado = { t: 0, carga: 0, cargando: false, golpes: 0, flash: 0, salta: 0, vivo: false, pista: [] };
      rotulo("Mantén pulsado para cargar y suelta en la zona verde");
      sonidos.plano();
      const pararPlano = cada(1250, () => sonidos.plano());
      const ZONA = [0.66, 0.88];
      lienzo((dt, c, H) => {
        g.t += dt;
        g.flash = Math.max(0, g.flash - dt * 2.4);
        g.salta = Math.max(0, g.salta - dt * 2);
        if (g.cargando) {
          g.carga += dt * 0.62;
          if (g.carga >= 1) { g.cargando = false; g.carga = 0; sonidos.mal(); rotulo("¡Demasiada carga! Vuelve a empezar"); }
        }
        c.fillStyle = "#dfe9ec"; c.fillRect(0, 0, W, H);
        c.fillStyle = "#c6d6db"; c.fillRect(0, H * 0.66, W, H);
        // Monitor
        c.fillStyle = "#39424e"; c.beginPath(); c.roundRect(24, 92, W - 48, 106, 14); c.fill();
        c.fillStyle = "#0f2a23"; c.beginPath(); c.roundRect(34, 102, W - 68, 86, 8); c.fill();
        c.strokeStyle = g.vivo ? "#4be08a" : "#ff6a5e"; c.lineWidth = 3; c.lineJoin = "round"; c.beginPath();
        for (let x = 0; x <= W - 84; x += 3) {
          const f = ((x + g.t * 110) % 92) / 92;
          const y = g.vivo ? (f > 0.4 && f < 0.48 ? -30 : f >= 0.48 && f < 0.55 ? 22 : f > 0.7 && f < 0.82 ? -7 : 0) : Math.sin(x / 5 + g.t * 9) * 1.2;
          c.lineTo(42 + x, 146 + y);
        }
        c.stroke();
        // Cama y paciente
        const cama = H * 0.6, sal = Math.sin(g.salta * Math.PI) * 34;
        c.fillStyle = "#7b8794"; c.fillRect(40, cama + 20, 8, 60); c.fillRect(W - 50, cama + 20, 8, 60);
        c.fillStyle = "#fff"; c.beginPath(); c.roundRect(18, cama, W - 36, 30, 10); c.fill();
        c.fillStyle = "#a7c4d1"; c.beginPath(); c.roundRect(24, cama - 18, 76, 24, 12); c.fill();
        c.save(); c.translate(W / 2 - 4, cama - 48 - sal); c.rotate(-Math.PI / 2); c.drawImage(img.papa, -72, -108, 144, 207); c.restore();
        // Carga
        const x0 = 30, a = W - 60, y = H - 132;
        c.fillStyle = "#26233f"; c.beginPath(); c.roundRect(x0 - 6, y - 6, a + 12, 36, 12); c.fill();
        c.fillStyle = "#4a4860"; c.fillRect(x0, y, a, 24);
        c.fillStyle = "#3fbf6f"; c.fillRect(x0 + ZONA[0] * a, y, (ZONA[1] - ZONA[0]) * a, 24);
        c.fillStyle = "#f5c518"; c.fillRect(x0, y + 5, a * g.carga, 14);
        if (g.flash > 0) { c.fillStyle = `rgb(255 255 230 / ${g.flash})`; c.fillRect(0, 0, W, H); }
      });
      function empezar() { if (!g.vivo && !g.cargando && g.salta <= 0) { g.cargando = true; g.carga = 0; } }
      function soltar() {
        if (!g.cargando) return;
        g.cargando = false;
        const f = g.carga;
        g.carga = 0;
        if (f < ZONA[0] || f > ZONA[1]) { sonidos.mal(); rotulo(f < ZONA[0] ? "Poca carga. Aguanta un poco más" : "¡Te has pasado! Suelta antes"); return; }
        g.golpes++;
        g.flash = 1;
        g.salta = 1;
        sonidos.descarga();
        if (g.golpes < 2) return rotulo("¡Fuera! Todavía nada… ¡otra descarga!");
        g.vivo = true;
        pararPlano();
        raiz.querySelector(".g-panel")?.remove();
        rotulo("«¡Jo, jo… jo! ¿Quién ha apagado la luz?»");
        dentroDe(500, () => sonidos.pitido());
        cada(850, sonidos.pitido);
        dentroDe(2600, () => victoria("¡Papá Noel ha vuelto!", "Le has salvado la noche. Y la Navidad que viene."));
      }
      const q = panel('<button type="button">Mantener para cargar</button>');
      const b = q("button");
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); empezar(); });
      b.addEventListener("contextmenu", (e) => e.preventDefault());
      for (const t of ["pointerup", "pointercancel"]) alEvento(window, t, soltar);
      usarTeclas((k, suelta) => { if (k === " ") (suelta ? soltar : empezar)(); });
    }

    // ---------- 11. Final ----------
    function final() {
      const q = capa("g-alba", `<div class="g-hora" style="font-size:54px">8:00</div><div class="g-sala" aria-hidden="true" style="height:clamp(80px,24vh,200px)"><div class="g-alta">${S.feliz}</div></div>
        <h3>Fin del turno</h3>
        <button type="button" class="g-aviso-sms" hidden><svg viewBox="0 0 32 24" aria-hidden="true"><rect x="1" y="1" width="30" height="22" rx="4" fill="#f2b7bc"/><path d="M3 4l13 10L29 4" fill="none" stroke="#8f3233" stroke-width="2.5"/></svg><span>Tienes un mensaje nuevo</span></button>`);
      const sms = q(".g-aviso-sms");
      dentroDe(1300, () => { sms.hidden = false; sonidos.mensaje(); });
      sms.addEventListener("click", () => {
        sonidos.activar();
        sonidos.ganar();
        raiz.replaceChildren();
        const m = datos.mensaje, col = ["#f5c518", "#7a4fc9", "#22a35a", "#f0568c", "#2b8fe0", "#e23b3b"];
        let papel = "";
        for (let i = 0; i < 36; i++) papel += `<i class="confeti" style="left:${(i * 37) % 100}%;background:${col[i % 6]};animation-delay:${((i % 9) * 0.16).toFixed(2)}s"></i>`;
        capa("g-alba", `${papel}<div class="g-sobre">${m.parrafos.map((x) => `<p>${x}</p>`).join("")}<h3>${m.cierre}</h3><p class="firma">${m.firma}</p></div>`);
      });
    }

    const ESCENAS = [inicio, llamada, conversacion, viaje, caso1, via, caso2, gastro, caso3, carrera, desfibrilador, final];

    // Si ya había empezado, puede seguir donde lo dejó
    function arrancar() {
      const n = Math.min(leer(), ESCENAS.length - 1);
      if (n === 0) return ir(0);
      escena = { fin: [], n };
      const q = capa("g-inicio", `<div class="g-regalo" aria-hidden="true">${DIBUJOS.regalos}</div><h3>El regalo final</h3>
        <button type="button" class="boton">${n === ESCENAS.length - 1 ? "Ver el final" : "Seguir donde lo dejé"}</button>
        <button type="button" class="secundario">Empezar de nuevo</button>`);
      q(".boton").addEventListener("click", () => { sonidos.activar(); ir(n); });
      q(".secundario").addEventListener("click", () => { sonidos.activar(); ir(0); });
    }
    imagenes.then(() => { if (!cerrado) arrancar(); });

    return () => {
      cerrado = true;
      limpiarEscena();
      sonidos.cerrar();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }

  return function abrir(contenedor) {
    let cerrado = false, limpiar = null;
    const aviso = document.createElement("p");
    aviso.className = "cargando";
    aviso.textContent = "Cargando…";
    contenedor.append(aviso);
    Cifrado.json(CARPETA + "contenido").then((datos) => {
      if (cerrado) return;
      aviso.remove();
      limpiar = montar(contenedor, datos);
    }).catch((e) => {
      console.error(e);
      aviso.textContent = "No se ha podido cargar. Comprueba la conexión y vuelve a abrir la caja.";
    });
    return () => { cerrado = true; if (limpiar) limpiar(); };
  };
})();
