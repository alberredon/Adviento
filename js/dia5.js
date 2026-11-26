// Día 5: ruleta de vales. Tres tiradas; el vale "trampa" nunca toca. En la
// última, la ruleta se para en la trampa por muy poco... y al rato vuelve
// a la casilla de al lado.
// Los vales están cifrados (privado/dia5 -> datos/dia5).
const abrirRuleta = (() => {
  const CARPETA = "dia5/";
  const PARTIDA = "adviento-dia5-ruleta";
  const TIRADAS = 3;
  const COLORES = ["#b14645", "#fbf0e1", "#476356", "#f2b7bc", "#e3cf9f", "#d6c5b5"];
  const TINTA = { "#b14645": "#fff", "#476356": "#fff" };
  const PIVOTES = 2; // pivotes por casilla (suenan al pasar)
  const DOS_PI = Math.PI * 2;

  const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
  const mod = (a, n) => ((a % n) + n) % n;
  const salida = (t, p = 4) => 1 - Math.pow(1 - t, p);
  const suave = (t) => t * t * (3 - 2 * t);

  function crearSonidos() {
    let ac = null;
    function nota(tipo, f1, f2, cuando, dura, vol) {
      if (!ac) return;
      const t = ac.currentTime + cuando, o = ac.createOscillator(), g = ac.createGain();
      o.type = tipo;
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + dura);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dura);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dura);
    }
    return {
      activar() {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          ac ||= AC ? new AC() : null;
          if (ac && ac.state !== "running") ac.resume().catch(() => {});
        } catch {}
      },
      tic: () => nota("square", 1500, 700, 0, 0.025, 0.05),
      premio: () => [523, 659, 784, 1047].forEach((f, i) => nota("triangle", f, f, i * 0.11, i === 3 ? 0.7 : 0.2, 0.18)),
      uy: () => { nota("sine", 700, 300, 0, 0.5, 0.18); nota("triangle", 520, 240, 0.08, 0.55, 0.1); },
      ganar: () => [392, 523, 659, 784, 1047].forEach((f, i) => nota("triangle", f, f, i * 0.12, i === 4 ? 0.9 : 0.22, 0.2)),
      cerrar() { ac?.close().catch(() => {}); ac = null; },
    };
  }

  function montar(contenedor, datos) {
    const VALES = datos.vales, N = VALES.length, A = DOS_PI / N;
    const TRAMPA = VALES.findIndex((v) => v.trampa);
    const ANTES = mod(TRAMPA + 1, N); // casilla que pasa por la flecha justo antes de la trampa (último premio)
    const sonidos = crearSonidos();
    let cerrado = false, girando = false, angulo = 0, ganados = [], pedido = 0, luces = 0, golpe = 0;
    try {
      const g = JSON.parse(localStorage.getItem(PARTIDA));
      if (g && Array.isArray(g.ganados) && g.ganados.length <= TIRADAS && g.ganados.every((i) => Number.isInteger(i) && i >= 0 && i < N && i !== TRAMPA)) {
        ganados = g.ganados;
        angulo = Number.isFinite(g.angulo) ? g.angulo : 0;
      }
    } catch {}
    const guardar = () => { try { localStorage.setItem(PARTIDA, JSON.stringify({ ganados, angulo })); } catch {} };

    const raiz = document.createElement("div");
    raiz.className = "ruleta";
    raiz.innerHTML = `
      <p class="rul-intro"></p>
      <div class="rul-rueda">
        <canvas aria-label="Ruleta de vales"></canvas>
        <svg class="rul-flecha" viewBox="0 0 40 52" aria-hidden="true"><path d="M20 50 3 12A17 17 0 1 1 37 12Z" fill="#8f3233"/><circle cx="20" cy="17" r="7" fill="#fbf0e1"/></svg>
        <p class="rul-mensaje" role="status" hidden></p>
      </div>
      <button type="button" class="boton rul-girar"></button>
      <div class="rul-ganados" aria-label="Vales conseguidos"></div>`;
    contenedor.append(raiz);
    const q = (s) => raiz.querySelector(s);
    const lienzo = q("canvas"), c = lienzo.getContext("2d"), flecha = q(".rul-flecha"), boton = q(".rul-girar"), mensaje = q(".rul-mensaje");

    // ---------- Dibujo ----------
    function partir(c, texto, ancho) {
      const palabras = texto.split(" "), lineas = [];
      let l = "";
      for (const p of palabras) {
        const prueba = l ? `${l} ${p}` : p;
        if (c.measureText(prueba).width > ancho && l) { lineas.push(l); l = p; } else l = prueba;
      }
      lineas.push(l);
      return lineas;
    }
    // La rueda, el aro (dos estados de bombillas) y el centro se dibujan una vez
    // en lienzos aparte; en cada fotograma solo se copian girando la rueda.
    let capas = null, claveCapas = "";
    function lienzoAparte(S, dibujar) {
      const l = document.createElement("canvas");
      l.width = l.height = S;
      const x = l.getContext("2d");
      x.translate(S / 2, S / 2);
      dibujar(x, S / 2);
      return l;
    }
    function prepararCapas() {
      const S = lienzo.width, clave = `${S}|${ganados.join(",")}`;
      if (!S || (capas && clave === claveCapas)) return;
      claveCapas = clave;
      const aro = (encendidas) => lienzoAparte(S, (x, R) => {
        x.fillStyle = "#8f3233";
        x.beginPath(); x.arc(0, 0, R * 0.995, 0, DOS_PI); x.fill();
        x.fillStyle = "#6e2526";
        x.beginPath(); x.arc(0, 0, R * 0.93, 0, DOS_PI); x.fill();
        const BOMBILLAS = N * 4;
        for (let i = 0; i < BOMBILLAS; i++) {
          const a = i / BOMBILLAS * DOS_PI, on = (i + encendidas) % 2 === 0;
          x.fillStyle = on ? "#fff4c0" : "#c9a85c";
          if (on) { x.shadowColor = "#ffe48a"; x.shadowBlur = R * 0.05; }
          x.beginPath(); x.arc(Math.sin(a) * R * 0.963, -Math.cos(a) * R * 0.963, R * 0.022, 0, DOS_PI); x.fill();
          x.shadowBlur = 0;
        }
      });
      const rueda = lienzoAparte(S, (x, R) => {
        const r = R * 0.9;
        // Casillas (la 0 empieza arriba y siguen en el sentido del reloj)
        for (let i = 0; i < N; i++) {
          const a0 = -Math.PI / 2 + i * A, color = COLORES[i % COLORES.length];
          x.fillStyle = color;
          x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, r, a0, a0 + A); x.closePath(); x.fill();
          const g = x.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
          g.addColorStop(0, "rgba(0,0,0,.12)"); g.addColorStop(0.7, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,.18)");
          x.fillStyle = g; x.fill();
          if (ganados.includes(i)) { x.fillStyle = "rgba(38,35,63,.45)"; x.fill(); }
          x.strokeStyle = "#e3cf9f"; x.lineWidth = R * 0.012;
          x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); x.stroke();
          x.save();
          x.rotate(a0 + A / 2 + Math.PI / 2);
          x.textAlign = "center"; x.textBaseline = "middle";
          x.font = `${R * 0.15}px sans-serif`;
          x.fillText(VALES[i].icono, 0, -r * 0.8);
          x.fillStyle = TINTA[color] || "#26233f";
          x.font = `800 ${R * 0.072}px Nunito, sans-serif`;
          partir(x, VALES[i].corto, r * 0.62).slice(0, 3).forEach((l, k) => x.fillText(l, 0, -r * (0.6 - k * 0.13), r * 0.7));
          if (ganados.includes(i)) { x.font = `${R * 0.11}px sans-serif`; x.fillText("✔️", 0, -r * 0.24); }
          x.restore();
        }
        for (let i = 0; i < N * PIVOTES; i++) {
          const a = -Math.PI / 2 + i * A / PIVOTES;
          x.fillStyle = "#e3cf9f";
          x.beginPath(); x.arc(Math.cos(a) * r * 0.975, Math.sin(a) * r * 0.975, R * 0.016, 0, DOS_PI); x.fill();
        }
      });
      const centro = lienzoAparte(S, (x, R) => {
        x.fillStyle = "#8f3233"; x.beginPath(); x.arc(0, 0, R * 0.15, 0, DOS_PI); x.fill();
        x.fillStyle = "#fbf0e1"; x.beginPath(); x.arc(0, 0, R * 0.11, 0, DOS_PI); x.fill();
        x.fillStyle = "#b14645"; x.beginPath();
        for (let k = 0; k < 10; k++) { const rr = k % 2 ? R * 0.035 : R * 0.085, a = k / 10 * DOS_PI - Math.PI / 2; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        x.fill();
      });
      capas = { aros: [aro(0), aro(1)], rueda, centro };
    }
    function pintar() {
      prepararCapas();
      if (!capas) return;
      const S = lienzo.width, R = S / 2;
      c.clearRect(0, 0, S, S);
      c.drawImage(capas.aros[luces % 2], 0, 0);
      c.save();
      c.translate(R, R);
      c.rotate(angulo);
      c.drawImage(capas.rueda, -R, -R);
      c.restore();
      c.drawImage(capas.centro, 0, 0);
      flecha.style.transform = `translateX(-50%) rotate(${golpe}deg)`;
    }
    function medir() {
      const lado = Math.round(lienzo.clientWidth * Math.min(devicePixelRatio || 1, 2));
      if (lado && lienzo.width !== lado) { lienzo.width = lienzo.height = lado; pintar(); }
    }

    // ---------- Estado de la interfaz ----------
    // Casilla bajo la flecha: ángulo en el marco de la rueda medido desde arriba
    const bajoFlecha = (ang) => Math.floor(mod(-ang, DOS_PI) / A);
    function pintarGanados() {
      const caja = q(".rul-ganados");
      caja.innerHTML = Array.from({ length: TIRADAS }, (_, k) => {
        const v = VALES[ganados[k]];
        return v ? `<div class="rul-ticket"><span>${v.icono}</span><b>${v.texto}</b></div>` : `<div class="rul-ticket vacio"><b>Vale ${k + 1}</b></div>`;
      }).join("");
    }
    function pintarBoton() {
      const quedan = TIRADAS - ganados.length;
      boton.disabled = girando;
      boton.textContent = quedan > 0 ? (girando ? "Girando…" : `¡Girar! · ${quedan === 1 ? "última tirada" : `quedan ${quedan}`}`) : "Ver mis vales";
      q(".rul-intro").textContent = datos.intro;
    }

    // ---------- Giro ----------
    function elegir() {
      // Orden fijo de premios (si viene en el contenido); la última siempre pasa por la trampa
      const fijo = datos.orden?.[ganados.length];
      if (Number.isInteger(fijo) && fijo !== TRAMPA && !ganados.includes(fijo)) return fijo;
      const ultima = ganados.length === TIRADAS - 1;
      if (ultima && !ganados.includes(ANTES)) return ANTES;
      const libres = VALES.map((_, i) => i).filter((i) => i !== TRAMPA && i !== ANTES && !ganados.includes(i));
      return libres[Math.floor(Math.random() * libres.length)] ?? VALES.findIndex((_, i) => i !== TRAMPA && !ganados.includes(i));
    }
    // Ángulo final (creciente) para que la flecha quede en phi (marco de la rueda)
    function destino(desde, phi, vueltas) {
      const objetivo = mod(-phi, DOS_PI);
      return desde + vueltas * DOS_PI + mod(objetivo - mod(desde, DOS_PI), DOS_PI);
    }
    function girar() {
      if (girando || cerrado) return;
      if (ganados.length >= TIRADAS) return final();
      sonidos.activar();
      girando = true;
      mensaje.hidden = true;
      pintarBoton();
      const premio = elegir(), trampa = ganados.length === TIRADAS - 1 && premio === ANTES;
      const inicio = mod(angulo, DOS_PI); // evita que el ángulo crezca sin fin entre rondas
      let tramos;
      if (trampa) {
        // Frena con naturalidad y se queda en la trampa por muy poco, pegada al premio;
        // cuando ya parece que ha caído ahí, se mueve y vuelve al premio
        const pegada = destino(inicio, (ANTES - 0.05) * A, 5);  // 5 % dentro de la trampa
        const vuelta = pegada - 0.17 * A;                         // 12 % dentro del premio
        const asentar = (t) => 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.5);
        tramos = [
          { a: inicio, b: pegada, t: 6800, f: (t) => salida(t, 4) },
          { a: pegada, b: pegada, t: 1500, f: () => 0 },
          { a: pegada, b: vuelta, t: 1400, f: (t) => asentar(suave(t)) },
        ];
      } else {
        const fin = destino(inicio, (premio + 0.2 + Math.random() * 0.6) * A, 4 + Math.floor(Math.random() * 2));
        tramos = [{ a: inicio, b: fin, t: 5200, f: (t) => salida(t, 4) }];
      }
      let k = 0, t0 = performance.now(), ultimoPivote = Math.floor(mod(-angulo, DOS_PI) / (A / PIVOTES));
      const paso = (ahora) => {
        if (cerrado) return;
        const tr = tramos[k], u = limitar((ahora - t0) / tr.t, 0, 1);
        angulo = tr.a + (tr.b - tr.a) * tr.f(u) + (tr.temblor ? Math.sin(u * Math.PI * 6) * 0.004 * (1 - u) : 0);
        const piv = Math.floor(mod(-angulo, DOS_PI) / (A / PIVOTES));
        if (piv !== ultimoPivote) { ultimoPivote = piv; sonidos.tic(); golpe = -22; }
        golpe *= 0.82;
        pintar();
        if (u >= 1) {
          k++;
          t0 = ahora;
          if (k >= tramos.length) return terminarGiro(premio, trampa);
        }
        pedido = requestAnimationFrame(paso);
      };
      pedido = requestAnimationFrame(paso);
    }
    function terminarGiro(premio, trampa) {
      girando = false;
      golpe = 0;
      const cae = bajoFlecha(angulo);
      ganados.push(cae === TRAMPA ? premio : cae);
      guardar();
      pintar();
      pintarGanados();
      pintarBoton();
      const v = VALES[ganados[ganados.length - 1]];
      if (trampa) {
        sonidos.uy();
        mensaje.innerHTML = `<b>${datos.casi}</b><span>${datos.trampa}</span><span class="rul-premio">${v.icono} ${v.texto}</span>`;
        setTimeout(() => { if (!cerrado) sonidos.premio(); }, 900);
      } else {
        sonidos.premio();
        mensaje.innerHTML = `<b>¡${v.icono} ${v.corto}!</b><span>${v.texto}</span>`;
      }
      mensaje.hidden = false;
      const ticket = q(`.rul-ganados .rul-ticket:nth-child(${ganados.length})`);
      ticket?.classList.add("nuevo");
    }

    // ---------- Final ----------
    function capa(clase, html) {
      raiz.querySelector(".esc-capa")?.remove();
      const d = document.createElement("div");
      d.className = `esc-capa ${clase}`;
      d.innerHTML = html;
      raiz.append(d);
      return (s) => d.querySelector(s);
    }
    function final() {
      let papel = "";
      for (let i = 0; i < 36; i++) papel += `<i class="confeti" style="left:${(i * 37) % 100}%;background:${COLORES[i % COLORES.length]};animation-delay:${(0.2 + (i % 9) * 0.16).toFixed(2)}s"></i>`;
      const b = capa("rul-final", `${papel}<h3>${datos.final.titulo}</h3>
        <div class="rul-vales">${ganados.map((i, k) => `<div class="rul-vale" style="animation-delay:${0.3 + k * 0.35}s"><span>${VALES[i].icono}</span><strong>${VALES[i].texto}</strong></div>`).join("")}</div>
        <p>${datos.final.texto}</p>${datos.pista ? '<button type="button" class="boton rul-ver-pista">Ver tu pista</button>' : ""}<button type="button" class="secundario">Volver a tirar</button>`);
      b(".rul-ver-pista")?.addEventListener("click", () => {
        const p = datos.pista;
        const t = capa("rul-final", `<div class="pista-tarjeta"><span aria-hidden="true">🔍</span><small>${p.titulo}</small><strong>${p.texto}</strong></div><button type="button" class="secundario">Volver a tus vales</button>`);
        sonidos.premio();
        t(".secundario").addEventListener("click", final);
      });
      sonidos.activar();
      sonidos.ganar();
      b(".secundario").addEventListener("click", () => {
        ganados = [];
        guardar();
        raiz.querySelector(".esc-capa")?.remove();
        mensaje.hidden = true;
        pintar();
        pintarGanados();
        pintarBoton();
      });
    }

    // ---------- Gestos ----------
    let inicioToque = null;
    lienzo.addEventListener("pointerdown", (e) => { inicioToque = [e.clientX, e.clientY, performance.now()]; });
    lienzo.addEventListener("pointerup", (e) => {
      if (!inicioToque) return;
      const [x, y, t] = inicioToque;
      inicioToque = null;
      // Un arrastre rápido también la hace girar
      if (Math.hypot(e.clientX - x, e.clientY - y) > 40 && performance.now() - t < 700 && ganados.length < TIRADAS) girar();
    });
    boton.addEventListener("click", girar);
    raiz.addEventListener("pointerdown", () => sonidos.activar(), { passive: true });
    document.fonts?.ready.then(() => { if (!cerrado) { claveCapas = ""; pintar(); } });

    const observador = new ResizeObserver(medir);
    observador.observe(lienzo);
    const parpadeo = setInterval(() => { if (!girando) { luces++; pintar(); } }, 600);
    medir();
    pintar();
    pintarGanados();
    pintarBoton();
    if (ganados.length >= TIRADAS) final();

    const terminar = () => {
      cerrado = true;
      cancelAnimationFrame(pedido);
      clearInterval(parpadeo);
      observador.disconnect();
      sonidos.cerrar();
    };
    // Pruebas: tirada instantánea
    terminar.adelantar = () => {
      if (girando) return;
      if (ganados.length >= TIRADAS) return final();
      const premio = elegir(), trampa = ganados.length === TIRADAS - 1 && premio === ANTES;
      angulo = destino(angulo, trampa ? (ANTES + 0.14) * A : (premio + 0.5) * A, 0);
      sonidos.activar();
      terminarGiro(premio, trampa);
    };
    return terminar;
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
    }).catch((err) => {
      console.error(err);
      aviso.textContent = "No se ha podido cargar. Comprueba la conexión y vuelve a abrir la caja.";
    });
    const cerrarTodo = () => { cerrado = true; if (limpiar) limpiar(); };
    cerrarTodo.adelantar = () => limpiar?.adelantar?.();
    return cerrarTodo;
  };
})();
