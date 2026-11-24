// Día 2: juego de escalada en un rocódromo. Se salta solo; hay que moverse a los lados.
// Personaje, vídeos y sorpresa están cifrados (privado/dia2 -> datos/dia2).

// ---------- Reglas (sin dibujo, para poder probarlas aparte) ----------
// Altura `y` hacia arriba, en unidades de un muro de 360 de ancho.
class Escalada {
  static ANCHO = 360;
  static META = 8200;         // algo más de 1 minuto si se juega bien
  static GRAVEDAD = 1500;
  static SALTO = 760;         // sube unos 192
  static VX = 340;

  // trampa: en el primer intento, las presas de arriba se sueltan y no se puede ganar
  constructor({ trampa = false, azar = Math.random } = {}) {
    this.trampa = trampa;
    this.azar = azar;
    this.presas = [];
    this.trozos = [];
    this.x = Escalada.ANCHO / 2;
    this.y = 0;
    this.vx = 0;
    this.vy = Escalada.SALTO;
    this.mira = 1;
    this.camara = -40;
    this.generado = 0;
    this.tiempo = 0;
    this.saltos = 0; // para el sonido
    this.estado = "jugando"; // jugando | cayendo | perdido | ganado
  }

  generar(hasta) {
    const A = Escalada.ANCHO, META = Escalada.META;
    while (this.generado < Math.min(hasta, META)) {
      const p = this.generado / META;
      // Último cuarto del muro: presas más pequeñas, separadas y móviles
      const fin = Math.max(0, (p - 0.75) / 0.25);
      // Nunca más de 150 entre filas (el salto sube 192), tampoco antes del top
      const falta = META - this.generado;
      const salto = 78 + 30 * p + 14 * fin + this.azar() * 22;
      this.generado += falta <= 150 ? falta : Math.min(salto, falta - 60);
      if (this.generado === META) {
        this.presas.push({ x: A / 2, y: META, w: 170, color: 0, forma: 0, top: true });
        break;
      }
      const w = 78 - 18 * p - 10 * fin;
      const pos = () => w / 2 + 6 + this.azar() * (A - w - 12);
      const nueva = (x, y, tipo) => this.presas.push({
        x, x0: x, y, w, tipo, color: Math.floor(this.azar() * 7), forma: Math.floor(this.azar() * 3),
        fase: this.azar() * 6.28, vaiven: 46 + 14 * fin, ritmo: 1.5 + 0.7 * fin, trampa: this.trampa && this.generado > META * 0.86,
      });
      // En cada fila hay siempre una presa firme: nunca se queda sin salida
      const movil = p > 0.3 && this.azar() < 0.28 + 0.3 * fin;
      const x = movil ? w / 2 + 64 + this.azar() * (A - w - 128) : pos();
      nueva(x, this.generado, movil ? "movil" : "firme");
      if (p > 0.04 && this.azar() < 0.34 + 0.2 * p) {
        const x2 = (x + A / 2 + (this.azar() - 0.5) * 70) % A;
        nueva(Math.max(w / 2 + 6, Math.min(A - w / 2 - 6, x2)), this.generado + this.azar() * 24, "rompible");
      }
    }
  }

  romper(p) {
    p.rota = true;
    for (let i = 0; i < 7; i++) {
      this.trozos.push({ x: p.x + (i - 3) * 9, y: p.y - 4, vx: (this.azar() - 0.5) * 160, vy: this.azar() * 120, color: p.color, t: 0 });
    }
  }

  // direccion: -1..1; alto: altura visible en unidades
  paso(dt, direccion, alto) {
    if (this.estado === "perdido" || this.estado === "ganado") return;
    const A = Escalada.ANCHO;
    this.tiempo += dt;
    this.generar(this.camara + alto + 300);
    if (this.estado === "cayendo") direccion = 0;
    this.vx += (direccion * Escalada.VX - this.vx) * Math.min(1, dt * 11);
    if (Math.abs(direccion) > 0.12) this.mira = Math.sign(direccion);
    this.x = (this.x + this.vx * dt + A) % A;
    const antes = this.y;
    this.vy -= Escalada.GRAVEDAD * dt;
    this.y += this.vy * dt;
    for (const p of this.presas) {
      if (p.tipo === "movil") p.x = p.x0 + Math.sin(this.tiempo * p.ritmo + p.fase) * p.vaiven;
      if (p.rota || this.estado !== "jugando" || this.vy > 0) continue;
      const cerca = Math.min(Math.abs(p.x - this.x), A - Math.abs(p.x - this.x));
      if (antes >= p.y && this.y <= p.y && cerca < p.w / 2 + 15) {
        this.y = p.y;
        if (p.top) { this.estado = "ganado"; return; }
        if (p.trampa) { this.romper(p); this.estado = "cayendo"; this.vy = -60; break; }
        this.vy = Escalada.SALTO;
        this.saltos++;
        if (p.tipo === "rompible") this.romper(p);
        break;
      }
    }
    if (this.y <= 0 && this.camara <= 0 && this.vy < 0 && this.estado === "jugando") { this.y = 0; this.vy = Escalada.SALTO; this.saltos++; }
    for (const t of this.trozos) { t.t += dt; t.vy -= 1100 * dt; t.x += t.vx * dt; t.y += t.vy * dt; }
    this.trozos = this.trozos.filter((t) => t.t < 1.4);
    if (this.estado === "jugando") this.camara = Math.max(this.camara, this.y - alto * 0.42);
    this.presas = this.presas.filter((p) => p.y > this.camara - 60);
    if (this.y < this.camara - 90) this.estado = "perdido";
  }
}

const abrirEscalada = (() => {
  const CARPETA = "dia2/";
  const PERDIDAS = "adviento-dia2-intentos";
  const GANADO = "adviento-dia2-ganado";
  const SIN_CASCO = "adviento-dia2-sin-casco";
  const COLORES = [["#f5c518", "#b98a00"], ["#7a4fc9", "#4c2c8e"], ["#22a35a", "#12683a"], ["#f0568c", "#a82458"],
                   ["#2b8fe0", "#155a96"], ["#f47a2a", "#a9480d"], ["#e23b3b", "#931c1c"]];
  const leer = (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  // ---------- Dibujo ----------
  function pared(c, W, H, cam) {
    const alto = 180;
    for (let n = Math.floor(cam / alto); n * alto < cam + H; n++) {
      const y = H - (n * alto - cam) - alto;
      for (let k = 0; k < 2; k++) {
        const par = (((n + k) % 2) + 2) % 2;
        c.fillStyle = par ? "#ecd3aa" : "#e6c99b";
        c.fillRect(k * 180, y, 180, alto);
        c.strokeStyle = "rgb(160 115 65 / .16)";
        c.lineWidth = 1.5;
        for (let v = 0; v < 5; v++) { // vetas
          const yy = y + 18 + v * 36;
          c.beginPath();
          c.moveTo(k * 180, yy);
          c.bezierCurveTo(k * 180 + 60, yy - 9 + par * 14, k * 180 + 120, yy + 10 - par * 12, k * 180 + 180, yy);
          c.stroke();
        }
        c.strokeStyle = "rgb(120 80 40 / .35)";
        c.strokeRect(k * 180, y, 180, alto);
        c.fillStyle = "rgb(95 62 30 / .42)"; // agujeros
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          c.beginPath();
          c.arc(k * 180 + 30 + i * 60, y + 30 + j * 60, 2.4, 0, 7);
          c.fill();
        }
      }
    }
  }
  function formaPresa(c, w, forma) {
    const r = w / 2;
    c.beginPath();
    if (forma === 0) { c.moveTo(-r, 2); c.bezierCurveTo(-r, -9, r, -9, r, 2); c.bezierCurveTo(r * 0.8, 22, -r * 0.8, 22, -r, 2); }
    else if (forma === 1) { c.moveTo(-r, -2); c.bezierCurveTo(-r * 0.4, -8, r * 0.4, -3, r, -3); c.bezierCurveTo(r * 1.05, 12, r * 0.35, 24, -r * 0.2, 17); c.bezierCurveTo(-r * 0.8, 15, -r * 1.1, 8, -r, -2); }
    else { c.moveTo(-r, 0); c.lineTo(-r * 0.6, -4); c.lineTo(r * 0.6, -4); c.lineTo(r, 0); c.lineTo(r * 0.45, 18); c.lineTo(-r * 0.45, 18); }
    c.closePath();
  }
  function presa(c, p, y) {
    const [claro, oscuro] = COLORES[p.color];
    c.save();
    c.translate(p.x, y);
    c.save(); c.translate(2, 5); formaPresa(c, p.w, p.forma); c.fillStyle = "rgb(90 55 20 / .25)"; c.fill(); c.restore();
    formaPresa(c, p.w, p.forma);
    c.fillStyle = claro; c.fill();
    c.strokeStyle = oscuro; c.lineWidth = 2.2; c.lineJoin = "round"; c.stroke();
    c.fillStyle = oscuro; c.beginPath(); c.arc(0, 8, 3.2, 0, 7); c.fill();
    c.strokeStyle = "rgb(255 255 255 / .6)"; c.lineWidth = 3; c.lineCap = "round";
    c.beginPath(); c.moveTo(-p.w * 0.3, 1.5); c.lineTo(p.w * 0.05, 0); c.stroke();
    if (p.tipo === "rompible") { // grietas: avisan de que se rompe
      c.strokeStyle = "#2a1a12"; c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-p.w * 0.22, -5); c.lineTo(-p.w * 0.12, 3); c.lineTo(-p.w * 0.2, 9); c.lineTo(-p.w * 0.1, 15);
      c.moveTo(p.w * 0.24, -4); c.lineTo(p.w * 0.14, 4); c.lineTo(p.w * 0.22, 11);
      c.stroke();
    }
    if (p.top) {
      c.fillStyle = "#26233f"; c.font = '400 26px "Abril Fatface", Georgia, serif'; c.textAlign = "center";
      c.fillText("TOP", 0, -100);
    }
    c.restore();
  }
  function pintar(c, j, W, H, sprites) {
    pared(c, W, H, j.camara);
    const py = (y) => H - (y - j.camara);
    if (j.camara < 60) { // colchoneta
      c.fillStyle = "#4b5160"; c.fillRect(0, py(0), W, 400);
      c.fillStyle = "#6a7182"; c.fillRect(0, py(0), W, 9);
    }
    for (const p of j.presas) if (!p.rota) presa(c, p, py(p.y));
    for (const t of j.trozos) {
      c.fillStyle = COLORES[t.color][0];
      c.save(); c.translate(t.x, py(t.y)); c.rotate(t.t * 8 + t.vx); c.fillRect(-5, -4, 10, 8); c.restore();
    }
    const img = j.estado === "cayendo" || j.estado === "perdido" ? sprites.caida : j.vy > 90 ? sprites.salto : sprites.pie;
    const h = 92, w = h * 190 / 272;
    const estira = j.estado === "jugando" ? 1 + Math.max(-0.06, Math.min(0.06, j.vy / 9000)) : 1;
    for (const dx of [0, -W, W]) { // al salir por un lado aparece por el otro
      const x = j.x + dx;
      if (x < -w || x > W + w) continue;
      c.save();
      c.translate(x, py(j.y) + 4);
      if (j.estado === "cayendo") c.rotate(Math.sin(j.tiempo * 9) * 0.25);
      c.scale(j.mira, estira);
      c.drawImage(img, -w / 2, -h, w, h);
      c.restore();
    }
    // Progreso
    const f = Math.max(0, Math.min(1, j.y / Escalada.META));
    c.fillStyle = "rgb(38 35 63 / .25)"; c.beginPath(); c.roundRect(W - 16, 16, 7, H - 32, 4); c.fill();
    c.fillStyle = "#b14645"; c.beginPath(); c.roundRect(W - 16, 16 + (H - 32) * (1 - f), 7, (H - 32) * f, 4); c.fill();
  }

  // ---------- Sonidos (sintetizados, sin archivos) ----------
  function crearSonidos() {
    let ac = null;
    function nota(tipo, f0, f1, cuando, dura, vol) {
      const t = ac.currentTime + cuando;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = tipo;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dura);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dura);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dura + 0.03);
    }
    const tocar = (f) => { if (ac && ac.state === "running") try { f(); } catch {} };
    return {
      // Hay que llamarla desde una pulsación
      activar() {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          ac ||= AC ? new AC() : null;
          if (ac && ac.state !== "running") ac.resume().catch(() => {});
        } catch {}
      },
      salto: () => tocar(() => nota("sine", 300, 640, 0, 0.16, 0.16)),
      perder: () => tocar(() => [[392, 370], [330, 311], [277, 262], [220, 98]].forEach(([a, b], i) =>
        nota("triangle", a, b, i * 0.17, i === 3 ? 0.6 : 0.2, 0.22))),
      ganar: () => tocar(() => {
        [523, 659, 784, 1047].forEach((f, i) => nota("triangle", f, f, i * 0.13, 0.24, 0.2));
        [523, 659, 784, 1047].forEach((f) => nota("triangle", f, f, 0.56, 0.9, 0.1));
      }),
      cerrar() { ac?.close().catch(() => {}); ac = null; },
    };
  }

  // ---------- Pantallas ----------
  function montar(contenedor, datos) {
    const raiz = document.createElement("div");
    raiz.className = "escalada";
    raiz.innerHTML = "<canvas></canvas>";
    contenedor.append(raiz);
    const lienzo = raiz.querySelector("canvas");
    const c = lienzo.getContext("2d");
    const tactil = matchMedia("(pointer: coarse)").matches;
    const urls = [];
    const todos = { casco: {}, sin: {} };
    let estilo = leer(SIN_CASCO) ? "sin" : "casco";
    let sprites = todos[estilo];
    const sonidos = crearSonidos();
    let cerrado = false, cuadro = 0, juego = null, capa = null, ultimo = 0, resto = 0;
    const W = Escalada.ANCHO;
    let H = 600;

    const imagenes = Promise.all(Object.entries(datos.sprites).flatMap(([e, grupo]) => Object.entries(grupo).map(([n, s]) => new Promise((ok, mal) => {
      const u = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
      urls.push(u);
      const img = new Image();
      img.onload = () => ok(); img.onerror = mal;
      img.src = u;
      todos[e][n] = img;
    }))));
    const videos = {};
    const pedirVideo = (n) => (videos[n] ||= Cifrado.video(CARPETA + n).then((u) => {
      if (cerrado) URL.revokeObjectURL(u); else urls.push(u);
      return u;
    }).catch((e) => { videos[n] = null; throw e; }));
    pedirVideo("loss").then(() => pedirVideo("win")).catch(() => {});

    function mostrar(clase, html) {
      capa?.remove();
      capa = document.createElement("div");
      capa.className = "esc-capa " + clase;
      capa.innerHTML = html;
      raiz.append(capa);
      return (s) => capa.querySelector(s);
    }

    // ---------- Controles ----------
    const teclas = { ArrowLeft: 0, ArrowRight: 0 };
    let dedo = 0, inclinacion = 0, haySensor = false;
    function alTecla(e) {
      if (!(e.key in teclas)) return;
      if (juego) e.preventDefault();
      teclas[e.key] = e.type === "keydown" ? 1 : 0;
    }
    function alInclinar(e) {
      if (e.beta === null || e.gamma === null) return;
      haySensor = true;
      const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
      const giro = screen.orientation?.angle ?? window.orientation ?? 0;
      const x = giro === 90 ? Math.sin(b) : (giro === 270 || giro === -90) ? -Math.sin(b)
        : (giro === 180 ? -1 : 1) * Math.cos(b) * Math.sin(g);
      const fuerza = Math.max(0, Math.abs(x) - 0.03) / 0.3;
      inclinacion = Math.sign(x) * Math.min(1, fuerza);
    }
    const alDedo = (e) => {
      const r = lienzo.getBoundingClientRect();
      dedo = e.clientX < r.left + r.width / 2 ? -1 : 1;
    };
    const alSoltar = () => { dedo = 0; };
    const soltarTodo = () => { teclas.ArrowLeft = teclas.ArrowRight = 0; dedo = 0; };
    addEventListener("keydown", alTecla);
    addEventListener("keyup", alTecla);
    addEventListener("blur", soltarTodo);
    lienzo.addEventListener("pointerdown", alDedo);
    addEventListener("pointerup", alSoltar);
    addEventListener("pointercancel", alSoltar);
    async function activarSensor() {
      try {
        const D = window.DeviceOrientationEvent;
        if (!D) return;
        // Se escucha siempre: sin permiso, simplemente no llegan datos y queda el control táctil
        addEventListener("deviceorientation", alInclinar);
        await D.requestPermission?.();
      } catch {}
    }
    const direccion = () => {
      const t = teclas.ArrowRight - teclas.ArrowLeft;
      return t || dedo || inclinacion;
    };

    // ---------- Bucle ----------
    function medir() {
      const r = raiz.getBoundingClientRect();
      const k = Math.min(devicePixelRatio || 1, 2.5);
      const ancho = Math.max(1, raiz.clientWidth), alto = Math.max(1, raiz.clientHeight);
      lienzo.width = ancho * k;
      lienzo.height = alto * k;
      H = W * alto / ancho;
      c.setTransform(lienzo.width / W, 0, 0, lienzo.width / W, 0, 0);
      if (juego) pintar(c, juego, W, H, sprites);
      else pared(c, W, H, 0);
      return r;
    }
    function tic(ahora) {
      if (cerrado || !juego) return;
      resto += Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      const dt = 1 / 120;
      const antes = juego.saltos;
      while (resto >= dt) { juego.paso(dt, direccion(), H); resto -= dt; }
      if (juego.saltos > antes) sonidos.salto();
      pintar(c, juego, W, H, sprites);
      if (juego.estado === "perdido") return perder();
      if (juego.estado === "ganado") return ganar();
      cuadro = requestAnimationFrame(tic);
    }
    const alVolver = () => { ultimo = performance.now(); resto = 0; soltarTodo(); };
    document.addEventListener("visibilitychange", alVolver);

    async function empezar() {
      await imagenes;
      if (cerrado) return;
      capa?.remove();
      capa = null;
      soltarTodo();
      juego = new Escalada({ trampa: leer(PERDIDAS) === 0 });
      ultimo = performance.now();
      resto = 0;
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(tic);
    }

    // Vídeo sin sonido con el mensaje desde el principio; el botón sale al terminar (o si algo falla)
    async function pantallaVideo(nombre, titulo, boton, accion) {
      juego = null;
      const q = mostrar("esc-video esc-" + nombre, `<video playsinline muted preload="auto"></video><div class="esc-pie"><h3 role="status">${titulo}</h3><button type="button" class="boton" hidden>${boton}</button></div>`);
      const esta = capa;
      const v = q("video"), b = q(".boton");
      v.muted = true;
      const fin = () => {
        if (!b.hidden || cerrado) return;
        b.hidden = false;
        b.focus({ preventScroll: true });
      };
      b.addEventListener("click", () => { sonidos.activar(); accion(); });
      v.addEventListener("ended", fin);
      v.addEventListener("error", fin);
      try {
        const u = await pedirVideo(nombre);
        if (cerrado || capa !== esta) return;
        v.src = u;
        await v.play();
        setTimeout(fin, 9000);
      } catch { fin(); }
    }
    function perder() {
      guardar(PERDIDAS, leer(PERDIDAS) + 1);
      sonidos.perder();
      pantallaVideo("loss", "¡Te has caído!", "Intentarlo otra vez", empezar);
    }
    function ganar() {
      guardar(GANADO, 1);
      sonidos.ganar();
      pantallaVideo("win", "¡Has superado el bloque!", "Descubrir la sorpresa del día de hoy", sorpresa);
    }
    function sorpresa() {
      const colores = COLORES.map((x) => x[0]);
      let papel = "";
      for (let i = 0; i < 36; i++) {
        papel += `<i class="confeti" style="left:${(i * 37) % 100}%;background:${colores[i % 7]};animation-delay:${(1.4 + (i % 9) * 0.16).toFixed(2)}s"></i>`;
      }
      mostrar("esc-regalo", `<div class="caja-regalo" aria-hidden="true"><i class="base"></i><i class="cinta"></i><i class="tapa"></i></div>
        ${papel}<div class="vale"><strong>${datos.vale.titulo}</strong><span>${datos.vale.texto}</span></div>`);
    }
    function portada() {
      const ganado = leer(GANADO);
      const q = mostrar("", `<div class="esc-heroe" aria-hidden="true"></div>
        <div class="esc-casco" role="group" aria-label="Elegir equipo">
          <button type="button" data-e="casco">Con casco</button><button type="button" data-e="sin">Sin casco</button>
        </div>
        <h3>¡A por el top!</h3>
        <p class="esc-reto">${datos.frase}</p>
        <p>${tactil ? "Inclina el móvil a los lados para moverte. También puedes tocar la izquierda o la derecha." : "Muévete con las flechas ← y →."}</p>
        <p>Cuidado: las presas con grietas se rompen.</p>
        <button type="button" class="boton">Empezar</button>
        ${ganado ? '<button type="button" class="secundario">Ver la sorpresa</button>' : ""}`);
      const elegir = (e) => {
        estilo = e;
        sprites = todos[e];
        guardar(SIN_CASCO, e === "sin" ? 1 : 0);
        q(".esc-heroe").innerHTML = datos.sprites[e].pie;
        capa.querySelectorAll(".esc-casco button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.e === e));
      };
      capa.querySelectorAll(".esc-casco button").forEach((b) => b.addEventListener("click", () => elegir(b.dataset.e)));
      elegir(estilo);
      q(".boton").addEventListener("click", async () => { sonidos.activar(); await activarSensor(); empezar(); });
      q(".secundario")?.addEventListener("click", sorpresa);
    }

    const observador = new ResizeObserver(medir);
    observador.observe(raiz);
    medir();
    portada();

    return () => {
      cerrado = true;
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      removeEventListener("keydown", alTecla);
      removeEventListener("keyup", alTecla);
      removeEventListener("blur", soltarTodo);
      removeEventListener("pointerup", alSoltar);
      removeEventListener("pointercancel", alSoltar);
      removeEventListener("deviceorientation", alInclinar);
      document.removeEventListener("visibilitychange", alVolver);
      raiz.querySelector("video")?.pause();
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
