// Día 6: gymkhana de una guardia en la noche de Reyes.
// Personajes, llamada y mensaje final están cifrados (privado/dia6 -> datos/dia6).
// Cada escena es una función de ESCENAS; se guarda por cuál se va.
const abrirGuardia = (() => {
  const CARPETA = "dia6/";
  const PROGRESO = "adviento-dia6-escena2";
  const W = 360; // ancho lógico de los minijuegos
  const leer = () => { try { return Number(localStorage.getItem(PROGRESO)) || 0; } catch { return 0; } };
  const guardar = (v) => { try { localStorage.setItem(PROGRESO, v); } catch {} };
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const azar = (a, b) => a + Math.random() * (b - a);

  // ---------- Sonidos sintetizados ----------
  function crearSonidos() {
    let ac = null, auch = null, sonando = null;
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
      // «¡Auch!»: grabación cifrada (privado/dia6/auch.mp3), sin el silencio del principio
      async cargarAuch() {
        try {
          if (!ac || auch) return;
          const a = await ac.decodeAudioData(await Cifrado.datos(CARPETA + "auch"));
          const d = a.getChannelData(0);
          let i = 0;
          while (i < d.length && Math.abs(d[i]) < 0.02) i++;
          let pico = 0.01;
          for (const v of d) pico = Math.max(pico, Math.abs(v));
          auch = { a, desde: i < d.length ? Math.max(0, i / a.sampleRate - 0.01) : 0, volumen: Math.min(4, 0.85 / pico) };
        } catch (e) { console.warn("Sin sonido de auch", e); }
      },
      auch() {
        if (!listo()) return;
        this.callar();
        if (!auch) return this.mal();
        sonando = ac.createBufferSource();
        sonando.buffer = auch.a;
        const g = ac.createGain();
        g.gain.value = auch.volumen;
        sonando.connect(g).connect(ac.destination);
        sonando.start(0, auch.desde);
      },
      callar() { try { sonando?.stop(); } catch {} sonando = null; },
      tono() { for (const c of [0, 0.5]) for (let i = 0; i < 8; i++) nota("sine", i % 2 ? 480 : 440, i % 2 ? 480 : 440, c + i * 0.045, 0.06, 0.2); },
      globo: () => nota("sine", 520, 760, 0, 0.1, 0.12),
      timbre: () => [0, 0.28, 0.56].forEach((t) => { nota("triangle", 988, 988, t, 0.14, 0.2); nota("triangle", 784, 784, t + 0.13, 0.16, 0.2); }),
      pitido: () => nota("sine", 880, 880, 0, 0.12, 0.12),
      plano: () => nota("sine", 880, 880, 0, 1.3, 0.1),
      alarma: () => { nota("square", 880, 880, 0, 0.16, 0.06); nota("square", 660, 660, 0.2, 0.16, 0.06); },
      bien: () => [659, 880].forEach((f, i) => nota("triangle", f, f, i * 0.1, 0.18, 0.2)),
      mal: () => nota("sawtooth", 200, 110, 0, 0.28, 0.12),
      salto: () => nota("sine", 300, 620, 0, 0.16, 0.15),
acelera: (v) => nota("sawtooth", 55 + v * 0.16, 62 + v * 0.18, 0, 0.2, 0.045),
      golpe: () => nota("sine", 120, 60, 0, 0.12, 0.3),
      compas: () => nota("square", 1100, 1100, 0, 0.035, 0.035),
      descarga() { nota("sawtooth", 1400, 60, 0, 0.25, 0.25); nota("square", 90, 40, 0.05, 0.3, 0.2); },
      ganar() { [523, 659, 784, 1047].forEach((f, i) => nota("triangle", f, f, i * 0.13, 0.26, 0.2)); },
      mensaje: () => [988, 1319].forEach((f, i) => nota("sine", f, f, i * 0.12, 0.3, 0.2)),
      cerrar() { this.callar(); ac?.close().catch(() => {}); ac = null; },
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
      const calle = (x) => suave(x, 260, 800) * (1 - suave(x, META - 1250, META - 1000)) *
        (0.8 + 0.3 * x / META) * (58 * Math.sin(x / 140) + 21 * Math.sin(x / 59 + 1) + 22 * Math.sin(x / 330) + 30 * Math.exp(-(((x % 1150) - 640) ** 2) / 2600));
      // La última cuesta, justo antes del hospital: la más empinada
      const COLINA = META - 820;
      const tierra = (x) => calle(x) + 185 * Math.exp(-((x - COLINA) ** 2) / 26000);
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
        // Ciudad: edificios lejanos (se mueven menos) y los de la propia calle
        const azarFijo = (n) => { const v = Math.sin(n * 127.1 + 11.7) * 43758.5; return v - Math.floor(v); };
        for (let n = Math.floor(cx * 0.3 / 54) - 1; n * 54 < cx * 0.3 + W; n++) {
          const x = n * 54 - cx * 0.3, h = 120 + azarFijo(n) * 130;
          c.fillStyle = "#222a56"; c.fillRect(x, base - h, 50, H);
          c.fillStyle = "rgb(245 217 138 / .35)";
          for (let k = 0; k < 10; k++) if (azarFijo(n * 13 + k) > 0.55) c.fillRect(x + 8 + (k % 2) * 22, base - h + 14 + Math.floor(k / 2) * 24, 8, 10);
        }
        const FACHADAS = ["#7c4a4a", "#56617e", "#84694f", "#4d6b63", "#6d5577", "#8a5d46"];
        for (let n = Math.floor(cx / 132) - 1; n * 132 < cx + W; n++) {
          const s = n * 132, x = s - cx, w = 104 + azarFijo(n) * 24;
          if (s + w > META - 60) continue;
          const pie = Math.max(py(tierra(s)), py(tierra(s + w))) + 20, arriba = Math.min(py(tierra(s)), py(tierra(s + w))) - 92 - azarFijo(n + 50) * 84;
          c.fillStyle = FACHADAS[Math.floor(azarFijo(n + 9) * 6)]; c.fillRect(x, arriba, w, pie - arriba);
          c.fillStyle = "rgb(0 0 0 / .28)"; c.fillRect(x - 3, arriba - 5, w + 6, 8);
          for (let fila = 0; arriba + 18 + fila * 36 < pie - 60; fila++) for (let k = 0; k < 3; k++) {
            c.fillStyle = azarFijo(n * 31 + fila * 7 + k) > 0.42 ? "#f8dd94" : "#2d3350";
            c.fillRect(x + 14 + k * (w - 28 - 18) / 2, arriba + 18 + fila * 36, 18, 22);
          }
          // Local con toldo
          const suelo = Math.min(py(tierra(s)), py(tierra(s + w)));
          c.fillStyle = "#f5e6c0"; c.fillRect(x + 12, suelo - 38, w - 24, 50);
          const rayas = 7, ar = (w - 16) / rayas;
          for (let k = 0; k < rayas; k++) { c.fillStyle = k % 2 ? "#fff" : ["#c93a3a", "#2f7d57", "#3466a8"][Math.abs(n) % 3]; c.fillRect(x + 8 + k * ar, suelo - 48, ar + 0.5, 13); }
        }
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
        c.fillStyle = "#2e3140"; c.fill();
        const linea = (baja) => { c.beginPath(); for (let x = -5; x <= W + 5; x += 5) c.lineTo(x, py(tierra(x + cx)) + baja); c.stroke(); };
        c.lineJoin = "round";
        c.strokeStyle = "#555a6b"; c.lineWidth = 34; linea(18); // asfalto
        c.strokeStyle = "#b9bfcc"; c.lineWidth = 5; linea(2); // bordillo
        c.strokeStyle = "#f5f3ee"; c.lineWidth = 3; c.setLineDash([26, 22]); c.lineDashOffset = cx; linea(21); c.setLineDash([]);
        // Farolas con guirnaldas de luces
        const PASO = 240, alto = 92;
        for (let s = Math.floor(cx / PASO) * PASO - PASO + 60; s < cx + W + PASO; s += PASO) {
          if (s < 0 || s > META - 120) continue;
          const x = s - cx, y = py(tierra(s)), x2 = x + PASO, y2 = py(tierra(s + PASO));
          if (s + PASO <= META - 120) {
            const mx = (x + x2) / 2, my = (y + y2) / 2 - alto + 46;
            c.strokeStyle = "#1b2038"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - alto); c.quadraticCurveTo(mx, my, x2, y2 - alto); c.stroke();
            for (let k = 1; k < 12; k++) {
              const f = k / 12, bx = (1 - f) ** 2 * x + 2 * f * (1 - f) * mx + f * f * x2, by = (1 - f) ** 2 * (y - alto) + 2 * f * (1 - f) * my + f * f * (y2 - alto);
              c.globalAlpha = 0.55 + 0.45 * Math.sin(g.t * 4 + k * 2);
              c.fillStyle = ["#ff6a5e", "#f5d04a", "#4be08a", "#6cb8ff"][k % 4]; c.beginPath(); c.arc(bx, by + 3, 3.4, 0, 7); c.fill();
            }
            c.globalAlpha = 1;
          }
          const luz = c.createRadialGradient(x, y - alto, 2, x, y - alto, 46);
          luz.addColorStop(0, "rgb(255 236 170 / .5)"); luz.addColorStop(1, "rgb(255 236 170 / 0)");
          c.fillStyle = luz; c.fillRect(x - 46, y - alto - 46, 92, 92);
          c.fillStyle = "#1b2038"; c.fillRect(x - 2.5, y - alto, 5, alto); c.fillRect(x - 6, y - 8, 12, 8);
          c.fillStyle = "#fff3c4"; c.beginPath(); c.arc(x, y - alto - 4, 7, 0, 7); c.fill();
        }
        for (let s = TRAMO; s < META - 10; s += TRAMO) { // puntos de control: semáforos
          const x = s - cx;
          if (x < -20 || x > W + 20) continue;
          const y = py(tierra(s)), verde = g.punto >= s;
          c.fillStyle = "#14172a"; c.fillRect(x - 3, y - 78, 6, 80);
          c.beginPath(); c.roundRect(x - 12, y - 122, 24, 50, 7); c.fill();
          c.fillStyle = verde ? "#5a2b2b" : "#ff4b3e"; c.beginPath(); c.arc(x, y - 109, 8, 0, 7); c.fill();
          c.fillStyle = verde ? "#3fe07a" : "#23472f"; c.beginPath(); c.arc(x, y - 86, 8, 0, 7); c.fill();
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
    const caso2 = () => caso({ desde: "2:40", hora: "3:52", titulo: "Otro ingreso", quien: S.baltasar, boton: "Hacer la gastroscopia", frases: [
      "Llega Baltasar con muy mala cara.",
      "«Me he comido el roscón entero… ¡y creo que también el premio!»",
      "Toca gastroscopia para sacar la figurita."] });
    const caso3 = () => caso({ desde: "5:20", hora: "7:55", titulo: "Cinco minutos y a casa…", quien: "", boton: "¡Coger el carro!", alarma: "¡Parada!", frases: [
      "Todo tranquilo. Parece que la noche por fin va a terminar.",
      "¡Papá Noel está en parada en la habitación 6! ¡Corre!"] });

    // ---------- 5. Vía ----------
    function via() {
      // Basta un acierto. La zona empieza diminuta y crece con cada fallo
      const g = raiz.estado = { fase: "pinchar", t: 0, fallos: 0, aguja: 0, zona: 0.5, ancho: 0.028, sacude: 0, espera: 0 };
      const anchoZona = () => Math.min(0.2, 0.028 + 0.014 * g.fallos);
      const tiritas = [];
      sonidos.cargarAuch();
      rotulo("Papá Noel tiene unas venas horribles");
      dentroDe(3200, () => { if (g.fase === "pinchar" && !g.fallos) rotulo("Pincha justo en la zona verde"); });
      const quejas = ["«¡Auch!»", "«¡Auch! ¡Jo, jo… ay!»", "«¡Auch! ¡Que esa no era!»", "«¡Auch! ¡Que soy mayor!»", "«¡Auch! ¡Te quedas sin regalo!»", "«¡Auch! ¡Llama a otra!»"];
      lienzo((dt, c, H) => {
        g.t += dt;
        g.espera = Math.max(0, g.espera - dt);
        g.sacude = Math.max(0, g.sacude - dt * 2.2);
        if (g.fase === "pinchar" && g.espera <= 0) g.aguja = 0.5 + 0.5 * Math.sin(g.t * 3.7);
        const medio = H * 0.42;
        c.fillStyle = "#dfe9ec"; c.fillRect(0, 0, W, H);
        c.fillStyle = "#c6d6db"; c.fillRect(0, H * 0.62, W, H);
        c.fillStyle = "#fff"; c.beginPath(); c.roundRect(-20, medio - 92, W + 40, 190, 26); c.fill();
        c.save();
        c.translate(Math.sin(g.t * 1.3) * 7 + Math.sin(g.t * 60) * 12 * g.sacude, medio + Math.cos(g.t * 1.7) * 6);
        c.fillStyle = "#f3c6ac"; c.beginPath(); c.roundRect(60, -62, 220, 124, 50); c.fill();
        c.beginPath(); c.roundRect(250, -50, 84, 100, 40); c.fill(); // mano
        for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(300, -48 + i * 25, 56, 21, 10); c.fill(); }
        c.fillStyle = "#c93a3a"; c.fillRect(-60, -80, 120, 160);
        c.fillStyle = "#fbf7ef"; c.beginPath(); c.roundRect(44, -86, 38, 172, 18); c.fill();
        // Venas finas, torcidas y a trozos
        c.strokeStyle = "#b3a3bd"; c.lineWidth = 2.4; c.lineCap = "round";
        for (let i = 0; i < 4; i++) {
          c.setLineDash([22 + i * 5, 9 + i * 3]);
          c.beginPath();
          for (let x = 96; x <= 250; x += 4) c.lineTo(x, -40 + i * 26 + Math.sin(x / (9 + i * 2) + i * 2) * (5 + i % 2 * 3));
          c.stroke();
        }
        c.setLineDash([]);
        for (const [x, y, r] of tiritas) {
          c.save(); c.translate(x, y); c.rotate(r);
          c.fillStyle = "#e0a272"; c.beginPath(); c.roundRect(-19, -7, 38, 14, 7); c.fill();
          c.fillStyle = "#f7ddc2"; c.fillRect(-7, -5.5, 14, 11);
          c.restore();
        }
        const d = g.fase === "fin" || g.espera > 0 ? 0 : 26;
        c.save(); c.translate(172, 6); c.rotate(-0.6);
        c.fillStyle = "#c9ced6"; c.fillRect(d, -1.5, 34, 3);
        c.fillStyle = "#2b8fe0"; c.fillRect(d + 34, -8, 34, 16);
        c.restore();
        c.restore();
        if (g.fase === "pinchar") {
          const y = H - 128, x0 = 30, a = W - 60;
          c.fillStyle = "#26233f"; c.beginPath(); c.roundRect(x0 - 6, y - 6, a + 12, 36, 12); c.fill();
          c.fillStyle = "#e0493f"; c.fillRect(x0, y, a, 24);
          c.fillStyle = "#3fdf7a"; c.fillRect(x0 + (g.zona - g.ancho / 2) * a, y, g.ancho * a, 24);
          c.fillStyle = "#fff"; c.fillRect(x0 + g.aguja * a - 2, y - 12, 4, 48);
        } else { // suero
          c.strokeStyle = "#8a98a3"; c.lineWidth = 4; c.beginPath(); c.moveTo(300, 78); c.lineTo(300, 66); c.stroke();
          c.fillStyle = "rgb(190 225 240 / .95)"; c.strokeStyle = "#7fa9ba"; c.lineWidth = 3;
          c.beginPath(); c.roundRect(272, 78, 56, 74, 12); c.fill(); c.stroke();

          c.strokeStyle = "#9fc6d6"; c.lineWidth = 4; c.beginPath(); c.moveTo(300, 152); c.bezierCurveTo(300, medio - 40, 260, medio - 70, 225, medio - 34); c.stroke();
          c.fillStyle = "#5fb4dd"; for (let i = 0; i < 3; i++) { const f = (g.t * 0.8 + i / 3) % 1; c.beginPath(); c.arc(300 - f * f * 75, 152 + f * (medio - 186), 4, 0, 7); c.fill(); }
        }
      });
      const nueva = () => { g.ancho = anchoZona(); g.zona = azar(0.2, 0.8); };
      nueva();
      function pinchar() {
        if (g.fase !== "pinchar" || g.espera > 0) return;
        if (Math.abs(g.aguja - g.zona) <= g.ancho / 2 + 0.002) {
          g.fase = "fin";
          raiz.querySelector(".g-panel")?.remove();
          rotulo("¡Dentro! El suero ya está pasando");
          sonidos.bien();
          dentroDe(300, sonidos.pitido);
          dentroDe(2200, () => victoria("¡Vía cogida!", g.fallos ? `Solo ha hecho falta pincharle ${g.fallos + 1} veces. Papá Noel ya duerme la mona con su suero.` : "¡A la primera! Papá Noel ya duerme la mona con su suero."));
          return;
        }
        g.fallos++;
        g.sacude = 1;
        g.espera = 0.75;
        if (tiritas.length < 14) tiritas.push([azar(105, 250), azar(-46, 46), azar(-0.9, 0.9)]);
        sonidos.auch();
        rotulo(quejas[(g.fallos - 1) % quejas.length]);
        dentroDe(750, nueva);
      }
      const q = panel('<button type="button">Pinchar</button>');
      q("button").addEventListener("pointerdown", (e) => { e.preventDefault(); pinchar(); });
      q("button").addEventListener("click", (e) => { if (e.detail === 0 && !teclas[" "]) pinchar(); });
      usarTeclas((k, suelta) => { if (!suelta && k === " ") pinchar(); });
      escena.fin.push(() => sonidos.callar());
    }

    // ---------- Timbre y pasillo hasta la habitación ----------
    function timbre(id, desde) {
      const k = datos.casos[id];
      const aMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      let luces = "";
      for (let i = 1; i <= 8; i++) luces += `<span class="${i === k.hab ? "si" : ""}"><i></i>${i}</span>`;
      const q = capa("g-noche", `<div class="g-hora" aria-label="${k.hora}">${desde}</div><div class="g-luces" aria-hidden="true">${luces}</div>
        <h3></h3><button type="button" class="boton" hidden>Ir a la habitación ${k.hab}</button>`);
      const reloj = q(".g-hora"), t0 = performance.now(), a = aMin(desde), b = aMin(k.hora);
      const parar = cada(40, () => {
        const f = Math.min(1, (performance.now() - t0) / 1500), m = Math.round(a + (b - a) * (1 - (1 - f) ** 3));
        reloj.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
        if (f < 1) return;
        parar();
        q(".g-luces").classList.add("suena");
        q("h3").textContent = `Suena el timbre de la ${k.hab}`;
        sonidos.timbre();
        const callar = cada(2200, sonidos.timbre);
        const bt = q(".boton");
        bt.hidden = false;
        bt.addEventListener("click", () => {
          sonidos.activar();
          callar();
          raiz.replaceChildren();
          pasillo(k.hab);
        });
      });
    }
    function pasillo(hab) {
      const PASO = 210, desde = hab - 4, META = 4 * PASO - 20;
      const g = raiz.estado = { x: 0, t: 0, abre: 0 };
      let fin = false;
      lienzo((dt, c, H) => {
        g.t += dt;
        g.x = Math.min(META, g.x + 215 * dt);
        if (g.x >= META) g.abre = Math.min(1, g.abre + dt * 1.8);
        if (g.abre >= 1 && !fin) { fin = true; dentroDe(350, siguiente); }
        const suelo = H * 0.72, cam = g.x - 70;
        c.fillStyle = "#cfdbe6"; c.fillRect(0, 0, W, suelo);
        c.fillStyle = "#b9d3c8"; c.fillRect(0, suelo - 92, W, 92);
        c.fillStyle = "#6fa58a"; c.fillRect(0, suelo - 96, W, 6);
        for (let i = 1; i <= 4; i++) {
          const n = desde + i, x = i * PASO - cam - 10;
          if (n < 1 || x > W || x < -120) continue;
          const esta = n === hab;
          c.fillStyle = "#fff8dc"; c.fillRect(x - 70, 60, 60, 10);
          c.fillStyle = "#86a9b8"; c.fillRect(x - 6, suelo - 216, 112, 216);
          c.fillStyle = esta ? "#ffefb0" : "#a7c4d1"; c.fillRect(x, suelo - 210, 100, 210);
          const ancho = esta ? 100 * (1 - g.abre * 0.82) : 100; // la puerta se abre
          c.fillStyle = "#a7c4d1"; c.fillRect(x, suelo - 210, ancho, 210);
          c.fillStyle = "#dbe9ef"; c.fillRect(x + ancho * 0.18, suelo - 192, ancho * 0.64, 62);
          c.fillStyle = "#56717e"; c.beginPath(); c.arc(x + ancho * 0.88, suelo - 92, 5, 0, 7); c.fill();
          c.fillStyle = "#476356"; c.textAlign = "center"; c.font = '400 26px "Abril Fatface", Georgia, serif'; c.fillText(String(n), x + 50, suelo - 226);
          if (esta) { c.fillStyle = Math.sin(g.t * 9) > 0 ? "#ff4b3e" : "#7d2a26"; c.beginPath(); c.arc(x + 50, suelo - 262, 9, 0, 7); c.fill(); }
        }
        c.fillStyle = "#a6b7c2"; c.fillRect(0, suelo, W, H - suelo);
        c.fillStyle = "#92a5b1"; for (let i = 0; i < 8; i++) c.fillRect(i * 60 - (((cam % 60) + 60) % 60), suelo + 14, 30, 5);
        const anda = g.x < META, paso = Math.floor(g.t * 6) % 2;
        const x = 70 + (anda ? 0 : g.abre * 12);
        c.globalAlpha = 1 - Math.max(0, g.abre - 0.5) * 1.2;
        c.drawImage(anda ? (paso ? img.corre1 : img.corre2) : img.pie, x, suelo - 138, 92, 141);
        c.globalAlpha = 1;
      });
    }

    // ---------- Habitación: pruebas y diagnóstico ----------
    const ICONOS = {
      tension: '<path d="M8 26h30v18H8z" class="late"/><path d="M38 35h8c6 0 6-12 0-14"/><circle cx="46" cy="14" r="8"/><path d="M46 14l4-4"/>',
      sat: '<path d="M10 22h34c8 0 8 20 0 20H10z"/><circle cx="40" cy="32" r="5" class="late"/><path d="M10 12h8l4-7 6 14 4-7h14"/>',
      sangre: '<path d="M22 6h12M24 6v36c0 10 8 10 8 0V6"/><path d="M25 24h6v20h-6z" class="sube"/>',
      mirar: '<circle cx="24" cy="24" r="15" class="late"/><path d="M35 35l14 14"/>',
      orina: '<path d="M14 12h28l-3 36H17z"/><path d="M10 12h36"/><path d="M17 28h22l-2 17H19z" class="sube"/>',
      gota: '<path d="M28 6c10 14 15 20 15 28a15 15 0 0 1-30 0c0-8 5-14 15-28z" class="late"/>',
      onda: '<path d="M4 30h8l5-16 8 32 7-26 5 14 4-4h11" class="late"/>',
    };
    const icono = (n) => `<svg viewBox="0 0 56 56" aria-hidden="true">${ICONOS[n]}</svg>`;
    function habitacion(id) {
      const k = datos.casos[id];
      // Solo da tiempo a cuatro pruebas; cada sospecha fallida permite una más, pero la paciente empeora
      const g = raiz.estado = { hechas: new Set(), fase: "pruebas", tope: 4, fallos: 0 };
      const q = capa("g-cuarto", `<div class="g-cama" aria-hidden="true">${k.mal}</div>
        <p class="g-ficha">${k.ficha}</p><p class="g-queja" role="status">${k.queja}</p>
        <div class="g-pruebas">${k.pruebas.map((p, i) => `<button type="button" data-i="${i}">${icono(p[0])}<span>${p[1]}</span><b></b></button>`).join("")}</div>
        <button type="button" class="boton" disabled>Dar un diagnóstico</button>`);
      const pie = q(".boton"), queja = q(".g-queja"), zona = q(".g-pruebas");
      const avisar = () => {
        const quedan = g.tope - g.hechas.size;
        pie.disabled = g.hechas.size < 2;
        pie.textContent = pie.disabled ? `Elige bien: ${quedan} pruebas` : quedan > 0 ? `Ya sé qué es (${quedan} por hacer)` : "¿Qué sospechas?";
        zona.querySelectorAll("button").forEach((b, i) => { b.classList.toggle("sin-tiempo", quedan <= 0 && !g.hechas.has(i)); });
      };
      let ocupada = false;
      function probar(i, b) {
        if (ocupada) return;
        const p = k.pruebas[i];
        const enseñar = () => { queja.innerHTML = `<strong>${p[1]}: ${p[2]}.</strong> ${p[3]}`; };
        if (g.hechas.has(i)) return enseñar();
        if (g.hechas.size >= g.tope) { queja.textContent = "No da tiempo a más pruebas. Decide con lo que tienes."; return; }
        ocupada = true;
        b.classList.add("midiendo");
        queja.textContent = "Un momento…";
        sonidos.pitido();
        dentroDe(450, sonidos.pitido);
        dentroDe(900, sonidos.pitido);
        dentroDe(1300, () => {
          ocupada = false;
          b.classList.remove("midiendo");
          b.classList.add("hecha");
          b.querySelector("b").textContent = p[2];
          g.hechas.add(i);
          sonidos.globo();
          enseñar();
          avisar();
        });
      }
      zona.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => probar(Number(b.dataset.i), b)));
      avisar();
      pie.addEventListener("click", () => {
        if (pie.disabled || ocupada) return;
        if (g.fase === "pruebas") return diagnostico();
        if (g.fase === "diagnostico") {
          g.fase = "pruebas";
          opciones.hidden = true;
          zona.hidden = false;
          queja.textContent = k.queja;
          return avisar();
        }
        siguiente();
      });
      const opciones = document.createElement("div");
      opciones.className = "g-opciones";
      opciones.hidden = true;
      opciones.innerHTML = k.opciones.map((o, i) => `<button type="button" data-i="${i}">${o[0]}</button>`).join("");
      zona.after(opciones);
      function diagnostico() {
        g.fase = "diagnostico";
        zona.hidden = true;
        opciones.hidden = false;
        queja.textContent = "Llamas a la médica de guardia. ¿Qué sospechas?";
        pie.textContent = "Volver a las pruebas";
      }
      opciones.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        const pista = k.opciones[Number(b.dataset.i)][1];
        if (pista) {
          b.disabled = true;
          g.fallos++;
          g.tope = Math.min(6, g.tope + 1);
          sonidos.mal();
          q(".g-cama").style.filter = `saturate(${Math.max(0.25, 1 - g.fallos * 0.28)}) brightness(${1 - g.fallos * 0.04})`;
          queja.innerHTML = `${pista}<br><strong>La paciente está peor.</strong>${g.hechas.size < 6 ? " Puedes hacer otra prueba." : ""}`;
          return;
        }
        g.fase = "fin";
        sonidos.ganar();
        opciones.remove();
        q(".g-cama").style.filter = "";
        q(".g-cama").innerHTML = k.bien;
        q(".g-ficha").innerHTML = `<strong>¡Buen ojo!</strong> ${b.textContent}.`;
        queja.innerHTML = k.final.join("<br><br>");
        pie.textContent = "Seguir con la guardia";
        pie.focus({ preventScroll: true });
      }));
    }

    // ---------- 7. Gastroscopia ----------
    function gastro() {
      // Empieza muy rápida y se frena con cada golpe
      const LARGO = 4400, TRAMO = 1100;
      const g = raiz.estado = { fase: "bajar", s: 0, x: W / 2, vidas: 3, t: 0, golpe: 0, choques: 0, pinzazos: 0, px: W / 2, py: 0, pinza: "quieta", cogida: null };
      const centro = (s) => W / 2 + Math.min(1, s / 200) * (Math.sin(s / 150) * 66 + Math.sin(s / 64 + 1) * 30);
      const velocidad = () => Math.max(95, 215 * 0.9 ** g.choques);
      const radio = (s) => 56 - 12 * Math.min(1, s / LARGO) + 6 * Math.sin(g.t * 2.2 - s / 80); // se contrae al tragar
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
        for (let i = 0; i < 5; i++) cosas.push({ tipo: i === 2 ? "premio" : "roscon", x: 50 + i * 65, fila: i % 2, v: (i % 2 ? -1 : 1) * azar(105, 150), r: i === 2 ? 22 : 24 });
        const q = panel('<button type="button">Soltar la pinza</button>');
        q("button").addEventListener("pointerdown", (e) => { e.preventDefault(); soltar(); });
        q("button").addEventListener("click", (e) => { if (e.detail === 0) soltar(); });
      }
      function soltar() { if (g.fase === "estomago" && g.pinza === "quieta") { g.pinza = "baja"; sonidos.salto(); } }
      const v = lienzo((dt, c, H) => {
        g.t += dt;
        g.golpe = Math.max(0, g.golpe - dt);
        const mueve = (teclas.ArrowRight ? 1 : 0) - (teclas.ArrowLeft ? 1 : 0);
        g.x += mueve * (g.fase === "bajar" ? 330 : 240) * dt;
        if (g.fase === "bajar") bajar(dt, c, H); else digerir(dt, c, H);
      });
      function bajar(dt, c, H) {
        const yTip = H * 0.36;
        if (g.golpe <= 0) g.s += velocidad() * dt;
        const r = radio(g.s), d = g.x - centro(g.s);
        if (Math.abs(d) > r - 11 && g.golpe <= 0) {
          g.vidas--;
          g.choques++;
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
            o.x += o.v * Math.max(0.28, 0.86 ** g.pinzazos) * dt;
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
            else { g.pinzazos++; sonidos.mal(); rotulo("Eso es roscón. ¡Otra vez!"); }
          } else if (g.py > fondo + 90) { g.pinza = "sube"; g.pinzazos++; sonidos.mal(); rotulo("¡Casi! Inténtalo de nuevo"); }
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
        if (g.golpe <= 0) g.x += (x - arrastre) * 1.3;
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

    // ---------- 10. Reanimación: compresiones, ritmo, descarga y compresiones ----------
    function desfibrilador() {
      const g = raiz.estado = { fase: "rcp", ciclo: 1, t: 0, buenas: 0, ultima: 0, lpm: 0, hunde: 0, carga: 0, cargando: false, flash: 0, salta: 0, vivo: false, manos: [], descargas: 0 };
      const META = { 1: 30, 2: 15 };
      const ZONA = [0.66, 0.88];
      let pararTono = () => {};
      let pararPlano = cada(1250, sonidos.plano);
      const quitar = () => raiz.querySelector(".g-panel")?.remove();

      function comprimir() {
        if (g.fase !== "rcp") return;
        const ahora = performance.now(), ms = ahora - g.ultima;
        g.ultima = ahora;
        g.hunde = 1;
        sonidos.golpe();
        if (ms > 1500) { g.lpm = 0; return; }
        g.lpm = 60000 / ms;
        if (g.lpm >= 94 && g.lpm <= 128) {
          g.buenas++;
          rotulo(`¡Bien! ${Math.min(g.buenas, META[g.ciclo])} de ${META[g.ciclo]}`);
        } else rotulo(g.lpm < 94 ? "Más rápido: entre 100 y 120 por minuto" : "Más despacio: deja que se expanda el tórax");
        if (g.buenas >= META[g.ciclo]) return g.ciclo === 1 ? analizar() : recuperar();
      }
      function rcp(texto) {
        g.fase = "rcp";
        g.buenas = 0;
        g.ultima = 0;
        g.lpm = 0;
        rotulo(texto);
        quitar();
        const b = panel('<button type="button">Comprimir</button>')("button");
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); comprimir(); });
        b.addEventListener("contextmenu", (e) => e.preventDefault());
        pararTono();
        pararTono = cada(60000 / 110, () => { g.pulso = 1; sonidos.compas(); });
      }
      function analizar() {
        g.fase = "ritmo";
        pararTono();
        pararPlano();
        quitar();
        rotulo("Para y mira el monitor. ¿Qué ritmo es?");
        const d = panel('<button type="button" data-r="asistolia">Asistolia</button><button type="button" data-r="fv">Fibrilación ventricular</button><button type="button" data-r="sinusal">Sinusal</button>');
        d("button").parentElement.classList.add("g-tres");
        raiz.querySelectorAll(".g-panel button").forEach((b) => b.addEventListener("click", () => {
          if (b.dataset.r === "fv") { sonidos.bien(); return cargar(); }
          b.disabled = true;
          sonidos.mal();
          rotulo(b.dataset.r === "asistolia" ? "No es una línea plana: hay actividad caótica" : "Eso no late de forma organizada. Mira otra vez");
        }));
      }
      function cargar() {
        g.fase = "carga";
        g.carga = 0;
        rotulo("Desfibrilable. Mantén para cargar y suelta en lo verde");
        quitar();
        const b = panel('<button type="button">Mantener para cargar</button>')("button");
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); if (g.fase === "carga") { g.cargando = true; g.carga = 0; } });
        b.addEventListener("contextmenu", (e) => e.preventDefault());
      }
      function soltar() {
        if (g.fase !== "carga" || !g.cargando) return;
        g.cargando = false;
        const f = g.carga;
        if (f < ZONA[0] || f > ZONA[1]) { g.carga = 0; sonidos.mal(); return rotulo(f < ZONA[0] ? "Poca carga. Aguanta un poco más" : "Te has pasado. Suelta antes"); }
        sonidos.bien();
        g.fase = "fuera";
        g.manos = [{ q: "elfo", x: 66, vuelve: 0 }, { q: "reno", x: 180, vuelve: 1 }, { q: "baltasar", x: 296, vuelve: 0 }].map((m) => ({ ...m, toca: true, d: 0 }));
        rotulo("¡Todos fuera! Toca a quien esté tocando la cama");
        quitar();
        const b = panel('<button type="button">¡Descargar!</button>')("button");
        b.addEventListener("click", descargar);
      }
      function apartar(x) {
        if (g.fase !== "fuera") return;
        const m = g.manos.filter((k) => k.toca).sort((p, q) => Math.abs(p.x - x) - Math.abs(q.x - x))[0];
        if (!m || Math.abs(m.x - x) > 60) return;
        m.toca = false;
        sonidos.globo();
        if (m.vuelve > 0) { // el reno es un pesado
          m.vuelve--;
          dentroDe(1500, () => { if (g.fase === "fuera") { m.toca = true; rotulo("¡El reno, otra vez no!"); } });
        }
      }
      function descargar() {
        if (g.fase !== "fuera") return;
        const m = g.manos.find((k) => k.toca);
        if (m) {
          m.chispa = 1;
          sonidos.mal();
          return rotulo(`¡Espera! ${{ elfo: "El elfo", reno: "El reno", baltasar: "Baltasar" }[m.q]} sigue tocando la cama`);
        }
        g.descargas++;
        g.flash = 1;
        g.salta = 1;
        g.fase = "espera";
        quitar();
        sonidos.descarga();
        rotulo("¡Descarga!");
        dentroDe(1300, () => { g.ciclo = 2; g.manos = []; rcp("Sigue con las compresiones sin perder tiempo"); });
      }
      function recuperar() {
        g.fase = "fin";
        g.vivo = true;
        pararTono();
        quitar();
        rotulo("¡Hay pulso! «¡Jo, jo… jo! ¿Quién ha apagado la luz?»");
        sonidos.pitido();
        cada(850, sonidos.pitido);
        dentroDe(3000, () => victoria("¡Papá Noel ha vuelto!", "Buenas compresiones, buena descarga. Le has salvado la noche… y la Navidad que viene."));
      }

      const v = lienzo((dt, c, H) => {
        g.t += dt;
        g.flash = Math.max(0, g.flash - dt * 2.4);
        g.salta = Math.max(0, g.salta - dt * 2);
        g.hunde = Math.max(0, g.hunde - dt * 5);
        g.pulso = Math.max(0, (g.pulso || 0) - dt * 5);
        if (g.cargando) {
          g.carga += dt * 0.62;
          if (g.carga >= 1) { g.cargando = false; g.carga = 0; sonidos.mal(); rotulo("¡Demasiada carga! Vuelve a empezar"); }
        }
        c.fillStyle = "#dfe9ec"; c.fillRect(0, 0, W, H);
        c.fillStyle = "#c6d6db"; c.fillRect(0, H * 0.66, W, H);
        // Monitor
        const my = 78, mh = Math.min(92, H * 0.17);
        c.fillStyle = "#39424e"; c.beginPath(); c.roundRect(24, my, W - 48, mh, 14); c.fill();
        c.fillStyle = "#0f2a23"; c.beginPath(); c.roundRect(32, my + 8, W - 64, mh - 16, 8); c.fill();
        c.save(); c.beginPath(); c.rect(32, my + 8, W - 64, mh - 16); c.clip();
        c.strokeStyle = g.vivo ? "#4be08a" : "#ffb03e"; c.lineWidth = 2.6; c.lineJoin = "round"; c.beginPath();
        const amp = mh / 100;
        for (let x = 0; x <= W - 70; x += 2.5) {
          const k = x + g.t * 110, f = (k % 92) / 92;
          let y;
          if (g.vivo) y = f > 0.4 && f < 0.48 ? -32 : f >= 0.48 && f < 0.55 ? 22 : f > 0.7 && f < 0.82 ? -7 : 0;
          else if (g.fase === "rcp") y = 20 * Math.sin(k / 13) * (0.4 + g.hunde); // artefacto de las compresiones
          else if (g.flash > 0 || g.fase === "espera") y = g.salta > 0.5 ? 0 : 1.5 * Math.sin(k / 9);
          else y = 15 * Math.sin(k / 6.1) + 11 * Math.sin(k / 3.7 + 1) + 8 * Math.sin(k / 9.3);
          c.lineTo(36 + x, my + mh / 2 + y * amp);
        }
        c.stroke(); c.restore();
        // Cama y paciente
        const cama = H * 0.585, sal = Math.sin(g.salta * Math.PI) * 30, tam = Math.min(1, H / 600);
        c.fillStyle = "#7b8794"; c.fillRect(40, cama + 20, 8, 50); c.fillRect(W - 50, cama + 20, 8, 50);
        c.fillStyle = "#fff"; c.beginPath(); c.roundRect(18, cama, W - 36, 28, 10); c.fill();
        c.fillStyle = "#a7c4d1"; c.beginPath(); c.roundRect(24, cama - 18, 76, 24, 12); c.fill();
        c.save(); c.translate(W / 2 - 4, cama - 48 * tam - sal); c.rotate(-Math.PI / 2); c.scale((1 - g.hunde * 0.1) * tam, tam); c.drawImage(img.papa, -72, -108, 144, 207); c.restore();
        if (g.fase === "rcp") { // ella haciendo compresiones
          const h = 150 * tam, w = h * 178 / 272;
          c.drawImage(img.agacha, W / 2 - w / 2 + 6, cama - 78 * tam - h * 0.86 + g.hunde * 9, w, h);
        }
        for (const m of g.manos) {
          m.d += ((m.toca ? 0 : 46) - m.d) * Math.min(1, dt * 9);
          m.chispa = Math.max(0, (m.chispa || 0) - dt);
          ayudante(c, m, cama + 46 + m.d);
        }
        // Indicadores
        const x0 = 30, a = W - 60, y = H - 132;
        if (g.fase === "rcp") {
          c.fillStyle = "#26233f"; c.beginPath(); c.roundRect(x0 - 6, y - 6, a + 12, 36, 12); c.fill();
          c.fillStyle = "#e0493f"; c.fillRect(x0, y, a, 24);
          const pos = (l) => x0 + a * limitar((l - 60) / 100, 0, 1);
          c.fillStyle = "#f5c518"; c.fillRect(pos(94), y, pos(128) - pos(94), 24);
          c.fillStyle = "#3fbf6f"; c.fillRect(pos(100), y, pos(120) - pos(100), 24);
          if (g.lpm) { c.fillStyle = "#fff"; c.fillRect(pos(g.lpm) - 3, y - 10, 6, 44); }
          c.fillStyle = "#26233f"; c.font = "700 15px Nunito, sans-serif"; c.textAlign = "center";
          c.fillText(g.lpm ? `${Math.round(g.lpm)} por minuto` : "Sigue el compás", W / 2 - 14, y - 20);
          c.fillStyle = "#e0493f"; const r = 8 + 7 * g.pulso, cx = W - 44, cy = y - 26; // corazón-metrónomo
          c.beginPath(); c.arc(cx - r * 0.5, cy, r * 0.55, 0, 7); c.arc(cx + r * 0.5, cy, r * 0.55, 0, 7); c.fill();
          c.beginPath(); c.moveTo(cx - r, cy + r * 0.2); c.lineTo(cx, cy + r * 1.3); c.lineTo(cx + r, cy + r * 0.2); c.fill();
        }
        if (g.fase === "carga") {
          c.fillStyle = "#26233f"; c.beginPath(); c.roundRect(x0 - 6, y - 6, a + 12, 36, 12); c.fill();
          c.fillStyle = "#4a4860"; c.fillRect(x0, y, a, 24);
          c.fillStyle = "#3fbf6f"; c.fillRect(x0 + ZONA[0] * a, y, (ZONA[1] - ZONA[0]) * a, 24);
          c.fillStyle = "#f5c518"; c.fillRect(x0, y + 5, a * g.carga, 14);
        }
        if (g.flash > 0) { c.fillStyle = `rgb(255 255 230 / ${g.flash})`; c.fillRect(0, 0, W, H); }
      });
      function ayudante(c, m, y) {
        c.save(); c.translate(m.x + (m.chispa > 0 ? Math.sin(g.t * 70) * 5 : 0), y);
        if (m.toca) { // brazo sobre la cama
          c.strokeStyle = { elfo: "#2f7d57", reno: "#8a5d36", baltasar: "#476356" }[m.q]; c.lineWidth = 9; c.lineCap = "round";
          c.beginPath(); c.moveTo(10, -2); c.lineTo(16, -42); c.stroke();
          c.fillStyle = { elfo: "#f3c6ac", reno: "#5b3b20", baltasar: "#7a4b35" }[m.q]; c.beginPath(); c.arc(16, -45, 6, 0, 7); c.fill();
        }
        if (m.q === "baltasar") c.drawImage(img.baltasar, -31, -54, 62, 100);
        else if (m.q === "elfo") {
          c.fillStyle = "#2f7d57"; c.beginPath(); c.roundRect(-18, 0, 36, 44, 12); c.fill();
          c.fillStyle = "#f3c6ac"; c.beginPath(); c.moveTo(-18, -18); c.lineTo(-32, -26); c.lineTo(-17, -10); c.moveTo(18, -18); c.lineTo(32, -26); c.lineTo(17, -10); c.fill();
          c.beginPath(); c.arc(0, -14, 19, 0, 7); c.fill();
          c.fillStyle = "#c93a3a"; c.beginPath(); c.moveTo(-20, -22); c.quadraticCurveTo(0, -64, 14, -50); c.lineTo(20, -22); c.fill();
          c.fillStyle = "#f5c518"; c.beginPath(); c.arc(14, -51, 5, 0, 7); c.fill();
        } else {
          c.fillStyle = "#8a5d36"; c.beginPath(); c.roundRect(-18, 0, 36, 44, 14); c.fill();
          c.strokeStyle = "#5b3b20"; c.lineWidth = 4; c.lineCap = "round"; c.beginPath();
          for (const k of [-1, 1]) { c.moveTo(k * 9, -28); c.lineTo(k * 17, -50); c.moveTo(k * 13, -40); c.lineTo(k * 25, -44); }
          c.stroke();
          c.beginPath(); c.arc(0, -14, 19, 0, 7); c.fill();
          c.fillStyle = "#c99f74"; c.beginPath(); c.ellipse(0, -5, 13, 9, 0, 0, 7); c.fill();
          c.fillStyle = "#e0493f"; c.beginPath(); c.arc(0, -10, 5, 0, 7); c.fill();
        }
        if (m.q !== "baltasar") { c.fillStyle = "#26233f"; c.beginPath(); c.arc(-7, -19, 2.6, 0, 7); c.arc(7, -19, 2.6, 0, 7); c.fill(); }
        c.restore();
      }
      v.cv.addEventListener("pointerdown", (e) => { if (g.fase === "rcp") comprimir(); else apartar(v.punto(e)[0]); });
      for (const t of ["pointerup", "pointercancel"]) alEvento(window, t, soltar);
      usarTeclas((k, suelta) => {
        if (k === " " && g.fase === "rcp" && !suelta) comprimir();
        if (k === " " && g.fase === "carga") { if (suelta) soltar(); else { g.cargando = true; g.carga = 0; } }
        if (suelta || g.fase !== "fuera") return;
        if (k === "ArrowLeft") apartar(66);
        if (k === "ArrowUp" || k === "ArrowDown") apartar(180);
        if (k === "ArrowRight") apartar(296);
        if (k === " ") descargar();
      });
      rcp("¡Sin pulso! Comprime al compás: 100-120 por minuto");
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

    const ESCENAS = [inicio, llamada, conversacion, viaje, caso1, via,
      () => timbre("pilar", "1:36"), () => habitacion("pilar"), caso2, gastro,
      () => timbre("rosa", "3:52"), () => habitacion("rosa"), caso3, carrera, desfibrilador, final];

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
