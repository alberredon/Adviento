// Día 3: fotos ampliadas; hay que marcar en el mapa dónde se hicieron.
// Fotos, respuestas, mapa y sorpresa están cifrados (privado/dia3 -> datos/dia3).
// Países y ciudades: Natural Earth (dominio público).
const abrirLugares = (() => {
  const CARPETA = "dia3/";
  const PARTIDA = "adviento-dia3-partida"; // puntos de cada foto ya jugada
  const MUNDO = 1024;                      // lado del mundo en unidades del mapa (Mercator)
  const MAXIMO = 1000;                     // puntos por foto
  const VIDAS = 3;                         // en toda la partida, y una por foto como mucho
  const TONOS = ["#f2b7bc", "#d6c5b5", "#b9bd94", "#fbf0e1", "#e6a79b", "#b4bfab", "#e3cf9f"];

  const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
  const aMapa = (lat, lon) => [(lon + 180) / 360 * MUNDO, (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * MUNDO];
  const aGrados = (x, y) => [Math.atan(Math.sinh(Math.PI * (1 - 2 * y / MUNDO))) * 180 / Math.PI, x / MUNDO * 360 - 180];
  function distancia([la1, lo1], [la2, lo2]) {
    const r = Math.PI / 180;
    const h = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function puntuar(km, foto, pistas) {
    return Math.round(MAXIMO * Math.exp(-Math.max(0, km - foto.margen) / foto.escala) * (1 - 0.2 * pistas));
  }
  const textoKm = (km) => km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km).toLocaleString("es-ES")} km`;

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
      pin: () => nota("sine", 640, 240, 0, 0.13, 0.2),
      pista: () => nota("triangle", 300, 520, 0, 0.18, 0.15),
      bien: () => [523, 659, 784].forEach((f, i) => nota("triangle", f, f, i * 0.1, 0.25, 0.18)),
      regular: () => [440, 494].forEach((f, i) => nota("triangle", f, f, i * 0.13, 0.22, 0.16)),
      mal: () => [330, 220].forEach((f, i) => nota("triangle", f, f * 0.94, i * 0.18, 0.3, 0.18)),
      ganar: () => [523, 659, 784, 1047].forEach((f, i) => nota("triangle", f, f, i * 0.13, i === 3 ? 0.9 : 0.24, 0.2)),
      cerrar() { ac?.close().catch(() => {}); ac = null; },
    };
  }

  // ---------- Mapa ----------
  function crearMapa(lienzo, datos, alTocar) {
    const c = lienzo.getContext("2d");
    function trazo(partes, cierra) {
      const p = new Path2D();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const a of partes) {
        let x = 0, y = 0;
        for (let i = 0; i < a.length; i += 2) { // coordenadas en milésimas, cada una respecto a la anterior
          x += a[i]; y += a[i + 1];
          const X = x / 1000, Y = y / 1000;
          if (i) p.lineTo(X, Y); else p.moveTo(X, Y);
          x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
        }
        if (cierra) p.closePath();
      }
      return { p, caja: [x0, y0, x1, y1] };
    }
    const paises = datos.paises.map(([nombre, x, y, z, color, partes]) => ({ nombre, x, y, z, color: TONOS[(color - 1) % TONOS.length], ...trazo(partes, true) }));
    const provincias = trazo(datos.prov, false);
    const v = { x: MUNDO / 2, y: 400, k: 0.5 }; // centro y píxeles por unidad
    const marcas = { pin: null, real: null };
    let W = 1, H = 1, pedido = 0, vuelo = 0, cerrado = false, avance = 1, bloqueado = false;

    const kMin = () => W / MUNDO;
    const K_MAX = 420; // unas 10 veces por debajo del kilómetro por píxel
    function ajustar() {
      v.k = limitar(v.k, kMin(), K_MAX);
      const a = W / 2 / v.k, b = H / 2 / v.k;
      v.x = a * 2 >= MUNDO ? MUNDO / 2 : limitar(v.x, a, MUNDO - a);
      v.y = b * 2 >= 760 ? 420 : limitar(v.y, 40 + b, 800 - b);
    }
    const aPantalla = (x, y) => [(x - v.x) * v.k + W / 2, (y - v.y) * v.k + H / 2];
    const aUnidades = (px, py) => [(px - W / 2) / v.k + v.x, (py - H / 2) / v.k + v.y];
    function pedir() {
      if (!pedido && !cerrado) pedido = requestAnimationFrame(() => { pedido = 0; if (!cerrado) pintar(); });
    }
    function chincheta(x, y, color) {
      c.save();
      c.translate(x, y);
      c.fillStyle = "rgb(38 35 63 / .25)";
      c.beginPath(); c.ellipse(0, 1, 8, 3.5, 0, 0, 7); c.fill();
      c.fillStyle = color; c.strokeStyle = "#fff"; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-4, -10, -13, -14, -13, -25); c.arc(0, -25, 13, Math.PI, 0); c.bezierCurveTo(13, -14, 4, -10, 0, 0);
      c.fill(); c.stroke();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(0, -25, 4.5, 0, 7); c.fill();
      c.restore();
    }
    function pintar() {
      const dpr = lienzo.width / W;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = "#c9dbd6";
      c.fillRect(0, 0, W, H);
      const [x0, y0] = aUnidades(0, 0), [x1, y1] = aUnidades(W, H);
      const visible = (b) => b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0;
      c.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * (W / 2 - v.x * v.k), dpr * (H / 2 - v.y * v.k));
      c.lineJoin = "round";
      for (const p of paises) {
        if (!visible(p.caja)) continue;
        c.fillStyle = p.color;
        c.fill(p.p, "evenodd");
        c.strokeStyle = "#8f3233"; c.lineWidth = (v.k > 4 ? 1.2 : v.k > 1 ? 0.7 : 0.35) / v.k;
        c.stroke(p.p);
      }
      const z = Math.log2(v.k * MUNDO / 256) + 0.8; // nivel de zoom para los rótulos
      if (z > 4.6 && visible(provincias.caja)) {
        c.strokeStyle = "rgb(143 50 51 / .35)"; c.lineWidth = 1 / v.k;
        c.setLineDash([4 / v.k, 3 / v.k]); c.stroke(provincias.p); c.setLineDash([]);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rótulos: los más importantes primero y sin pisarse
      const ocupado = [];
      const cabe = (b) => {
        if (ocupado.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) return false;
        ocupado.push(b);
        return true;
      };
      c.lineWidth = 3; c.strokeStyle = "rgb(255 252 244 / .85)"; c.textBaseline = "middle";
      c.textAlign = "center"; c.font = '400 14px "Abril Fatface", Georgia, serif';
      for (const p of paises) {
        if (p.z > z || z > 8 || !visible([p.x, p.y, p.x, p.y])) continue;
        const [px, py] = aPantalla(p.x, p.y), a = c.measureText(p.nombre).width / 2 + 4;
        if (z < 4 && a * 2 > (p.caja[2] - p.caja[0]) * v.k * 1.5) continue;
        if (!cabe([px - a, py - 10, px + a, py + 10])) continue;
        c.strokeText(p.nombre, px, py); c.fillStyle = "#8f3233"; c.fillText(p.nombre, px, py);
      }
      c.textAlign = "left"; c.font = '700 12px "Nunito", system-ui, sans-serif';
      for (const [nombre, x, y, min, capital] of datos.ciudades) {
        if (min > z) break; // van ordenadas
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        const [px, py] = aPantalla(x, y), a = c.measureText(nombre).width;
        if (!cabe([px - 5, py - 8, px + a + 10, py + 8])) continue;
        c.fillStyle = "#26233f"; c.beginPath(); c.arc(px, py, capital ? 3.6 : 2.4, 0, 7); c.fill();
        c.strokeText(nombre, px + 7, py); c.fillText(nombre, px + 7, py);
      }

      if (marcas.pin && marcas.real) {
        const [ax, ay] = aPantalla(...marcas.pin), [bx, by] = aPantalla(...marcas.real);
        c.strokeStyle = "#26233f"; c.lineWidth = 2.5; c.setLineDash([7, 6]);
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + (bx - ax) * avance, ay + (by - ay) * avance); c.stroke(); c.setLineDash([]);
      }
      if (marcas.real && avance >= 1) chincheta(...aPantalla(...marcas.real), "#476356");
      if (marcas.pin) chincheta(...aPantalla(...marcas.pin), "#b14645");
    }

    function volar(destino, ms, alFinal) {
      cancelAnimationFrame(vuelo);
      const a = { ...v }, t0 = performance.now();
      const rapido = matchMedia("(prefers-reduced-motion: reduce)").matches;
      avance = 0;
      const paso = () => {
        if (cerrado) return;
        const t = rapido ? 1 : limitar((performance.now() - t0) / ms, 0, 1), s = t * t * (3 - 2 * t);
        v.k = a.k * (destino.k / a.k) ** s;
        v.x = a.x + (destino.x - a.x) * s; v.y = a.y + (destino.y - a.y) * s;
        ajustar();
        avance = t;
        pedir();
        if (t < 1) vuelo = requestAnimationFrame(paso); else alFinal?.();
      };
      paso();
    }
    function escalar(f, px, py) {
      const [x, y] = aUnidades(px, py);
      v.k = limitar(v.k * f, kMin(), K_MAX);
      v.x = x - (px - W / 2) / v.k; v.y = y - (py - H / 2) / v.k;
      ajustar();
      pedir();
    }
    function medir() {
      const r = lienzo.getBoundingClientRect();
      if (!lienzo.clientWidth) return;
      W = lienzo.clientWidth; H = lienzo.clientHeight;
      const dpr = Math.min(2, devicePixelRatio || 1);
      lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
      ajustar();
      pintar();
      return r;
    }

    const dedos = new Map();
    let movido = 0, varios = false;
    const punto = (e) => { const r = lienzo.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    lienzo.addEventListener("pointerdown", (e) => {
      if (bloqueado) return;
      if (!dedos.size) { movido = 0; varios = false; }
      dedos.set(e.pointerId, punto(e));
      if (dedos.size > 1) varios = true;
      try { lienzo.setPointerCapture(e.pointerId); } catch {}
    });
    lienzo.addEventListener("pointermove", (e) => {
      const antes = dedos.get(e.pointerId);
      if (!antes) return;
      const viejos = [...dedos.values()], p = punto(e);
      dedos.set(e.pointerId, p);
      movido += Math.hypot(p[0] - antes[0], p[1] - antes[1]);
      if (movido < 8 && !varios) return;
      v.x -= (p[0] - antes[0]) / v.k / dedos.size; v.y -= (p[1] - antes[1]) / v.k / dedos.size;
      if (dedos.size === 2) {
        const n = [...dedos.values()], largo = (q) => Math.hypot(q[0][0] - q[1][0], q[0][1] - q[1][1]);
        escalar(largo(n) / Math.max(1, largo(viejos)), (n[0][0] + n[1][0]) / 2, (n[0][1] + n[1][1]) / 2);
      } else { ajustar(); pedir(); }
    });
    const soltar = (e) => {
      if (!dedos.has(e.pointerId)) return;
      dedos.delete(e.pointerId);
      if (e.type === "pointerup" && !dedos.size && movido < 8 && !varios) alTocar(aUnidades(...punto(e)));
    };
    lienzo.addEventListener("pointerup", soltar);
    lienzo.addEventListener("pointercancel", soltar);
    lienzo.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (!bloqueado) escalar(Math.exp(-e.deltaY * 0.0018), ...punto(e));
    }, { passive: false });

    return {
      marcas, medir, pedir, vista: v,
      zoom: (f) => { if (!bloqueado) escalar(f, W / 2, H / 2); },
      inicio() {
        cancelAnimationFrame(vuelo);
        marcas.pin = marcas.real = null;
        dedos.clear();
        bloqueado = false;
        avance = 1;
        Object.assign(v, { x: MUNDO / 2, y: 400, k: 0 });
        ajustar();
        pedir();
      },
      revelar(alFinal) {
        bloqueado = true;
        dedos.clear();
        const a = marcas.pin, b = marcas.real, hueco = (d, px) => Math.max(40, px) / Math.max(d, 0.4);
        const k = Math.min(hueco(Math.abs(a[0] - b[0]), W - 90), hueco(Math.abs(a[1] - b[1]), H - 165), 24);
        volar({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 + 26 / k, k }, 1300, () => { bloqueado = false; alFinal?.(); });
      },
      cerrar() { cerrado = true; cancelAnimationFrame(pedido); cancelAnimationFrame(vuelo); },
    };
  }

  // ---------- Pantallas ----------
  function montar(contenedor, datos, datosMapa) {
    const { fotos: FOTOS, frases: FRASES, vale: VALE } = datos;
    const urls = new Map();
    const sonidos = crearSonidos();
    let cerrado = false, puntos = [], usadas = [], fase = "", pistas = 0; // usadas: fotos que se han alejado
    try {
      const g = JSON.parse(localStorage.getItem(PARTIDA));
      if (g && g.puntos.length <= FOTOS.length && [...g.puntos, ...g.usadas].every(Number.isFinite)) ({ puntos, usadas } = g);
    } catch {}
    const guardar = () => { try { localStorage.setItem(PARTIDA, JSON.stringify({ puntos, usadas })); } catch {} };
    const total = () => puntos.reduce((s, p) => s + p, 0);

    const raiz = document.createElement("div");
    raiz.className = "lugares";
    raiz.innerHTML = `
      <div class="lug-arriba">
        <div class="lug-marco"><div class="lug-foto"><img class="lug-entera" alt="" draggable="false"><img class="lug-trozo" alt="" draggable="false"></div></div>
        <div class="lug-lado">
          <b class="lug-cuenta"></b><span class="lug-total"></span>
          <button type="button" class="lug-pista"></button>
        </div>
      </div>
      <div class="lug-mapa"><canvas aria-label="Mapa: toca para poner la chincheta"></canvas>
        <div class="lug-zoom"><button type="button" aria-label="Acercar">+</button><button type="button" aria-label="Alejar">−</button></div>
        <p class="lug-resultado" role="status" hidden></p>
      </div>
      <button type="button" class="boton lug-boton"></button>`;
    contenedor.append(raiz);
    const q = (s) => raiz.querySelector(s);
    const marco = q(".lug-marco"), capaFoto = q(".lug-foto"), boton = q(".lug-boton"), bPista = q(".lug-pista"), resultado = q(".lug-resultado");
    const [entera, trozo] = [q(".lug-entera"), q(".lug-trozo")];
    const mapa = crearMapa(q("canvas"), datosMapa, (p) => {
      if (fase !== "buscar") return;
      mapa.marcas.pin = p;
      sonidos.activar();
      sonidos.pin();
      mapa.pedir();
      pintarBoton();
    });
    const foto = () => FOTOS[puntos.length - (fase === "resultado" ? 1 : 0)];

    function imagen(nombre) {
      if (!urls.has(nombre)) {
        urls.set(nombre, Cifrado.imagen(CARPETA + nombre).then((u) => {
          if (cerrado) URL.revokeObjectURL(u);
          return u;
        }));
        urls.get(nombre).catch(() => urls.delete(nombre)); // se reintenta al volver a pedirla
      }
      return urls.get(nombre);
    }
    // Encuadre de la foto: trozo cuadrado (l, en anchos de foto) o entera
    function encuadrar(suave) {
      const f = foto();
      if (!f) return;
      const S = marco.clientWidth, alto = f.h / f.w;
      let w, x, y;
      if (fase === "resultado") {
        w = Math.min(1, 1 / alto) * S;
        if (Math.abs(alto - 1) < 0.04) w = Math.max(1, 1 / alto) * S; // casi cuadrada: llena el hueco
        x = (S - w) / 2; y = (S - w * alto) / 2;
      } else {
        const e = pistas ? f.pista : f; // con pista hay otro encuadre, elegido a mano
        const l = Math.min(e.lado, 1, alto);
        w = S / l;
        x = -limitar(e.x - l / 2, 0, 1 - l) * w;
        y = -limitar(e.y * alto - l / 2, 0, alto - l) * w;
      }
      capaFoto.style.transition = suave ? "" : "none";
      // Tamaño real y no escala: así el navegador no emborrona la foto
      Object.assign(capaFoto.style, { width: `${w}px`, height: `${w * alto}px`, left: `${x}px`, top: `${y}px` });
      const [zx, zy, zw, zh] = f.z;
      Object.assign(trozo.style, { left: `${zx * 100}%`, top: `${zy * 100}%`, width: `${zw * 100}%`, height: `${zh * 100}%` });
    }
    function pintarBoton() {
      if (fase === "buscar") {
        boton.disabled = !mapa.marcas.pin;
        boton.textContent = mapa.marcas.pin ? "Confirmar" : "Toca el mapa";
      } else {
        boton.disabled = false;
        boton.textContent = puntos.length < FOTOS.length ? "Siguiente foto" : "Ver mi resultado";
      }
    }
    function pintarLado() {
      const n = puntos.length + (fase === "buscar" ? 1 : 0);
      q(".lug-cuenta").textContent = `Foto ${n}/${FOTOS.length}`;
      q(".lug-total").textContent = `${total().toLocaleString("es-ES")} puntos`;
      bPista.hidden = fase !== "buscar";
      const quedan = VIDAS - usadas.length;
      bPista.disabled = pistas > 0 || quedan <= 0;
      const vidas = `<span class="lug-vidas" role="img" aria-label="${quedan === 1 ? "Queda 1 vida" : `Quedan ${quedan} vidas`}">${"♥".repeat(quedan)}<i>${"♥".repeat(VIDAS - quedan)}</i></span>`;
      bPista.innerHTML = vidas + (pistas ? "Foto alejada" : quedan <= 0 ? "Sin vidas" : "Alejar foto<small>−20 % de puntos</small>");
    }
    function jugar() {
      raiz.querySelector(".esc-capa")?.remove();
      if (puntos.length >= FOTOS.length) return final();
      fase = "buscar";
      pistas = usadas.includes(puntos.length) ? 1 : 0;
      resultado.hidden = true;
      const f = foto();
      for (const [img, nombre] of [[entera, `${f.n}`], [trozo, `${f.n}-z`]]) {
        img.removeAttribute("src");
        img.style.visibility = "hidden";
        imagen(nombre).then((u) => {
          if (cerrado || foto() !== f) return;
          img.src = u;
          img.style.visibility = "";
        }).catch(() => { if (!cerrado && foto() === f) { resultado.textContent = "No se ha podido cargar la foto. Comprueba la conexión y vuelve a abrir la caja."; resultado.hidden = false; } });
      }
      const sig = FOTOS[puntos.length + 1];
      if (sig) { imagen(`${sig.n}`).catch(() => {}); imagen(`${sig.n}-z`).catch(() => {}); }
      mapa.inicio();
      encuadrar(false);
      pintarLado();
      pintarBoton();
    }
    function confirmar() {
      const f = foto(), pin = mapa.marcas.pin;
      const km = distancia(aGrados(...pin), [f.lat, f.lon]);
      const p = puntuar(km, f, pistas);
      puntos.push(p);
      guardar();
      fase = "resultado";
      mapa.marcas.real = aMapa(f.lat, f.lon);
      encuadrar(true);
      pintarLado();
      boton.disabled = true;
      boton.textContent = "…";
      mapa.revelar(() => {
        if (cerrado) return;
        const r = p / MAXIMO;
        sonidos[r > 0.7 ? "bien" : r > 0.3 ? "regular" : "mal"]();
        const cerca = km <= f.margen;
        resultado.innerHTML = `<b>${f.lugar}</b><span>${cerca ? "¡Clavado!" : `A ${textoKm(km)}`} · +${p} puntos</span>`;
        resultado.hidden = false;
        pintarBoton();
      });
    }
    function capa(clase, html) {
      raiz.querySelector(".esc-capa")?.remove();
      const d = document.createElement("div");
      d.className = `esc-capa ${clase}`;
      d.innerHTML = html;
      raiz.append(d);
      return (s) => d.querySelector(s);
    }
    function portada() {
      const n = puntos.length, acabado = n >= FOTOS.length;
      const b = capa("lug-portada", `<svg viewBox="0 0 120 150" aria-hidden="true"><ellipse cx="60" cy="138" rx="30" ry="8" fill="#34503f"/><path d="M60 138C48 104 18 92 18 56a42 42 0 0 1 84 0c0 36-30 48-42 82Z" fill="#b14645"/><circle cx="60" cy="56" r="19" fill="#fbf0e1"/></svg>
        <h3>${datos.titulo}</h3><p>${datos.intro}</p>
        <p>Mueve el mapa, acércalo con dos dedos y toca para poner la chincheta. Tienes ${VIDAS} vidas para alejar la foto: una por foto como mucho, y te quita puntos.</p>
        <button type="button" class="boton">${acabado ? "Ver mi resultado" : n ? `Seguir en la foto ${n + 1}` : "Empezar"}</button>
        ${n ? '<button type="button" class="secundario">Empezar de nuevo</button>' : ""}`);
      b(".boton").addEventListener("click", () => { sonidos.activar(); jugar(); });
      b(".secundario")?.addEventListener("click", () => { sonidos.activar(); puntos = []; usadas = []; guardar(); jugar(); });
    }
    function final() {
      fase = "final";
      const tope = MAXIMO * FOTOS.length, pct = total() / tope * 100;
      const i = FRASES.reduce((m, f, k) => (pct >= f[0] ? k : m), 0);
      const estrellas = Array.from({ length: FRASES.length }, (_, k) => `<i class="${k <= i ? "si" : ""}">★</i>`).join("");
      const b = capa("lug-final", `<div class="lug-estrellas" role="img" aria-label="${i + 1} de ${FRASES.length} estrellas">${estrellas}</div>
        <h3>${FRASES[i][1]}</h3><p class="lug-puntos">${total().toLocaleString("es-ES")} de ${tope.toLocaleString("es-ES")} puntos</p><p>${FRASES[i][2]}</p>
        <button type="button" class="boton">Descubrir la sorpresa</button>`);
      sonidos.ganar();
      b(".boton").addEventListener("click", sorpresa);
    }
    function sorpresa() {
      fase = "sorpresa";
      let papel = "";
      for (let i = 0; i < 36; i++) {
        papel += `<i class="confeti" style="left:${(i * 37) % 100}%;background:${TONOS[i % 7]};animation-delay:${(1.4 + (i % 9) * 0.16).toFixed(2)}s"></i>`;
      }
      capa("esc-regalo", `<div class="caja-regalo" aria-hidden="true"><i class="base"></i><i class="cinta"></i><i class="tapa"></i></div>
        ${papel}<div class="vale"><strong>${VALE.titulo}</strong><span>${VALE.texto}</span></div>`);
      sonidos.ganar();
    }

    boton.addEventListener("click", () => {
      sonidos.activar();
      if (fase === "buscar") { if (mapa.marcas.pin) confirmar(); } else jugar();
    });
    bPista.addEventListener("click", () => {
      if (fase !== "buscar" || pistas || usadas.length >= VIDAS) return;
      pistas = 1;
      usadas.push(puntos.length);
      guardar();
      sonidos.activar();
      sonidos.pista();
      encuadrar(true);
      pintarLado();
    });
    const [mas, menos] = raiz.querySelectorAll(".lug-zoom button");
    mas.addEventListener("click", () => mapa.zoom(1.8));
    menos.addEventListener("click", () => mapa.zoom(1 / 1.8));

    const observador = new ResizeObserver(() => { mapa.medir(); if (fase === "buscar" || fase === "resultado") encuadrar(false); });
    observador.observe(q(".lug-mapa"));
    observador.observe(marco);
    mapa.medir();
    portada();

    const terminar = () => {
      cerrado = true;
      observador.disconnect();
      mapa.cerrar();
      sonidos.cerrar();
      for (const u of urls.values()) u.then((x) => URL.revokeObjectURL(x)).catch(() => {});
    };
    terminar.adelantar = () => {
      sonidos.activar();
      if (!fase) return jugar();
      if (fase === "buscar") {
        const f = foto();
        mapa.marcas.pin ||= aMapa(f.lat, f.lon);
        return confirmar();
      }
      if (fase === "resultado") { if (!boton.disabled) jugar(); } else if (fase === "final") sorpresa();
    };
    return terminar;
  }

  return function abrir(contenedor) {
    let cerrado = false, limpiar = null;
    const aviso = document.createElement("p");
    aviso.className = "cargando";
    aviso.textContent = "Cargando…";
    contenedor.append(aviso);
    Promise.all([Cifrado.json(CARPETA + "contenido"), Cifrado.json(CARPETA + "mapa")]).then(([datos, mapa]) => {
      if (cerrado) return;
      aviso.remove();
      limpiar = montar(contenedor, datos, mapa);
    }).catch((e) => {
      console.error(e);
      aviso.textContent = "No se ha podido cargar. Comprueba la conexión y vuelve a abrir la caja.";
    });
    const cerrarTodo = () => { cerrado = true; if (limpiar) limpiar(); };
    cerrarTodo.adelantar = () => limpiar?.adelantar?.();
    return cerrarTodo;
  };
})();
