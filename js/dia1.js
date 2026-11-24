// Día 1: recap de fotos de 2026. Las fotos de una misma escena salen juntas.
// Textos y fotos están en privado/dia1 y se publican cifrados en datos/ (ver cifrar.ps1).
const abrirRecap = (() => {
  const CARPETA = "dia1/";
  const HUECO = 10;

  // Bloques: una foto (proporción r), o varias en fila / columna. Para un ancho w,
  // cada bloque mide alto(w) = a*w + b, lo que permite encajarlas sin recortarlas.
  const foto = (i, r) => ({ a: 1 / r, b: 0, pintar: (x, y, w, h, out) => { out[i] = [x, y, w, h]; } });
  function columna(bloques) {
    const a = bloques.reduce((s, k) => s + k.a, 0);
    const b = bloques.reduce((s, k) => s + k.b, 0) + HUECO * (bloques.length - 1);
    return { a, b, pintar(x, y, w, h, out) {
      for (const k of bloques) { const alto = k.a * w + k.b; k.pintar(x, y, w, alto, out); y += alto + HUECO; }
    } };
  }
  function fila(bloques) { // mismo alto h: ancho de cada bloque = (h - b) / a
    const inv = bloques.reduce((s, k) => s + 1 / k.a, 0);
    const cte = bloques.reduce((s, k) => s + k.b / k.a, 0);
    return { a: 1 / inv, b: (cte - HUECO * (bloques.length - 1)) / inv, pintar(x, y, w, h, out) {
      for (const k of bloques) { const ancho = (h - k.b) / k.a; k.pintar(x, y, ancho, h, out); x += ancho + HUECO; }
    } };
  }
  function mejorDisposicion(fotos, W, H) {
    const f = fotos.map(([, w, h], i) => foto(i, w / h));
    let opciones = [f[0]];
    if (f.length === 2) opciones = [columna(f), fila(f)];
    if (f.length > 2) opciones = [columna(f), fila(f), columna([f[0], fila(f.slice(1))]), fila([f[0], columna(f.slice(1))])];
    let mejor = null;
    for (const o of opciones) {
      const w = Math.min(W, (H - o.b) / o.a);
      const h = o.a * w + o.b;
      if (w <= 0 || h <= 0) continue;
      const rects = [];
      o.pintar((W - w) / 2, (H - h) / 2, w, h, rects);
      if (rects.some((q) => q[2] <= 0 || q[3] <= 0)) continue;
      const area = rects.reduce((s, q) => s + q[2] * q[3], 0);
      if (!mejor || area > mejor.area) mejor = { area, rects };
    }
    return mejor ? mejor.rects : [];
  }

  function abrir(contenedor, cerrar) {
    let cerrado = false;
    let limpiar = null;
    const aviso = document.createElement("p");
    aviso.className = "cargando";
    aviso.textContent = "Cargando…";
    contenedor.append(aviso);
    Cifrado.json(CARPETA + "contenido").then((datos) => {
      if (cerrado) return;
      aviso.remove();
      limpiar = montar(contenedor, cerrar, datos);
    }).catch((e) => {
      console.error(e);
      aviso.textContent = "No se ha podido cargar. Comprueba la conexión y vuelve a abrir la caja.";
    });
    const cerrarTodo = () => { cerrado = true; if (limpiar) limpiar(); };
    cerrarTodo.adelantar = () => limpiar?.adelantar?.();
    return cerrarTodo;
  }

  function montar(contenedor, cerrar, { intro: INTRO, condiciones: CONDICIONES, nota: NOTA, escenas: ESCENAS, final: FINAL }) {
    const urls = [];
    let cerrado = false;
    const raiz = document.createElement("div");
    raiz.className = "recap";
    raiz.innerHTML = `
      <div class="recap-progreso" aria-hidden="true"><span></span></div>
      <div class="recap-pista" tabindex="0" aria-label="Recap de fotos">
        <section class="recap-hoja recap-intro"><div>
          <h3>${INTRO.titulo}</h3>${INTRO.parrafos.map((p) => `<p>${p}</p>`).join("")}
        </div></section>
        <section class="recap-hoja recap-condiciones">
          <p>${CONDICIONES}</p>
          <small>${NOTA}</small>
          <div class="recap-zona">
            <button type="button" class="recap-si">Sí</button>
            <button type="button" class="recap-no">No</button>
          </div>
        </section>
        ${ESCENAS.map((e) => `<section class="recap-hoja" hidden>
          <div class="recap-fotos">${e.fotos.map(([n]) => `<img data-src="${CARPETA}${n}" alt="${e.texto}" draggable="false">`).join("")}</div>
          <p class="recap-texto">${e.texto}</p>
        </section>`).join("")}
        <section class="recap-hoja recap-intro" hidden><div>
          ${FINAL.parrafos.map((p) => `<p>${p}</p>`).join("")}
          <h3>${FINAL.cierre}</h3><p class="recap-firma">${FINAL.firma}</p>
        </div></section>
      </div>
      <nav class="recap-nav">
        <button type="button" class="recap-atras">Atrás</button>
        <span class="recap-cuenta"></span>
        <button type="button" class="recap-sigue"></button>
      </nav>`;
    contenedor.append(raiz);

    const pista = raiz.querySelector(".recap-pista");
    const condiciones = raiz.querySelector(".recap-condiciones");
    const escenas = [...raiz.querySelectorAll(".recap-hoja[hidden]")];
    // Hasta aceptar solo existen el mensaje y las condiciones: no se puede pasar deslizando
    let hojas = [raiz.querySelector(".recap-intro"), condiciones];
    let aceptado = false;
    const atras = raiz.querySelector(".recap-atras");
    const sigue = raiz.querySelector(".recap-sigue");
    let ultima = hojas.length - 1;
    const suave = matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    let actual = -1;
    let objetivo = null; // hoja pedida con los botones, hasta que el usuario desliza

    function mostrar(i) {
      if (i === actual) return;
      actual = i;
      // Carga la foto actual y las cercanas
      hojas.slice(Math.max(0, i - 1), i + 3).forEach((h) =>
        h.querySelectorAll("img[data-src]").forEach((img) => {
          const ruta = img.dataset.src;
          img.removeAttribute("data-src");
          Cifrado.imagen(ruta).then((url) => {
            if (cerrado) return URL.revokeObjectURL(url);
            urls.push(url);
            img.src = url;
          }).catch(() => img.setAttribute("data-src", ruta)); // se reintenta al volver
        }));
      raiz.querySelector(".recap-progreso span").style.transform = `scaleX(${aceptado ? i / ultima : 0})`;
      raiz.querySelector(".recap-cuenta").textContent = aceptado && i && i <= ESCENAS.length ? `${i} / ${ESCENAS.length}` : "";
      atras.style.visibility = i ? "visible" : "hidden";
      sigue.textContent = i === 0 ? "Continuar" : i === ultima ? "Terminar" : "Siguiente";
      sigue.style.visibility = !aceptado && i === 1 ? "hidden" : "visible";
    }
    function ir(i) {
      const destino = Math.max(0, Math.min(ultima, i));
      mostrar(destino);
      objetivo = destino;
      pista.scrollTo({ left: destino * pista.clientWidth, behavior: suave });
    }
    function colocar() {
      ESCENAS.forEach((e, n) => {
        const caja = escenas[n].querySelector(".recap-fotos");
        const rects = mejorDisposicion(e.fotos, caja.clientWidth, caja.clientHeight);
        caja.querySelectorAll("img").forEach((img, k) => {
          const [x, y, w, h] = rects[k] || [0, 0, 0, 0];
          img.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
        });
      });
      if (pista.clientWidth !== anchoPista) { // solo al girar o cambiar de tamaño
        anchoPista = pista.clientWidth;
        pista.scrollTo({ left: actual * anchoPista, behavior: "instant" });
      }
    }

    let anchoPista = 0;
    let espera;
    pista.addEventListener("scroll", () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        const i = Math.round(pista.scrollLeft / pista.clientWidth);
        if (objetivo !== null && i !== objetivo) {
          pista.scrollTo({ left: objetivo * pista.clientWidth, behavior: "instant" });
        } else mostrar(i);
      }, 120);
    });
    for (const tipo of ["pointerdown", "touchstart", "wheel"]) {
      pista.addEventListener(tipo, () => { objetivo = null; }, { passive: true });
    }
    atras.addEventListener("click", () => ir(actual - 1));
    sigue.addEventListener("click", () => (actual === ultima ? cerrar() : ir(actual + 1)));
    raiz.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); ir(actual + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); ir(actual - 1); }
    });

    function aceptar() {
      aceptado = true;
      condiciones.remove();
      escenas.forEach((h) => { h.hidden = false; });
      hojas = [hojas[0], ...escenas];
      ultima = hojas.length - 1;
      actual = -1;
      colocar();
      mostrar(1);
      objetivo = 1;
      pista.scrollTo({ left: pista.clientWidth, behavior: "instant" });
      sigue.focus({ preventScroll: true });
    }

    // El "No" se escapa a otro punto, sin tapar el "Sí" ni quedarse cerca
    const zona = raiz.querySelector(".recap-zona");
    const si = raiz.querySelector(".recap-si");
    const no = raiz.querySelector(".recap-no");
    function huir() {
      const maxX = zona.clientWidth - no.offsetWidth, maxY = zona.clientHeight - no.offsetHeight;
      let mejor = null;
      for (let k = 0; k < 40; k++) {
        const x = Math.random() * maxX, y = Math.random() * maxY;
        const tapa = x < si.offsetLeft + si.offsetWidth + 10 && x + no.offsetWidth + 10 > si.offsetLeft &&
                     y < si.offsetTop + si.offsetHeight + 10 && y + no.offsetHeight + 10 > si.offsetTop;
        const lejos = Math.hypot(x - no.offsetLeft, y - no.offsetTop);
        if (!tapa && (!mejor || lejos > mejor.lejos)) mejor = { x, y, lejos };
        if (mejor && mejor.lejos > 110 && k > 4) break;
      }
      if (mejor) { no.style.left = `${mejor.x}px`; no.style.top = `${mejor.y}px`; }
    }
    si.addEventListener("click", aceptar);
    no.addEventListener("pointerdown", (e) => { e.preventDefault(); huir(); });
    no.addEventListener("click", (e) => { if (e.detail === 0) huir(); }); // teclado

    mostrar(0);
    const observador = new ResizeObserver(colocar);
    observador.observe(pista);
    // El hueco de las fotos también cambia si el texto crece (p. ej. al cargar la fuente)
    raiz.querySelectorAll(".recap-fotos").forEach((c) => observador.observe(c));
    colocar();
    addEventListener("resize", colocar);
    document.fonts?.ready.then(() => { if (raiz.isConnected) colocar(); });
    const terminar = () => {
      cerrado = true;
      observador.disconnect();
      removeEventListener("resize", colocar);
      clearTimeout(espera);
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    terminar.adelantar = () => {
      if (!aceptado) return actual === 0 ? ir(1) : aceptar();
      if (actual < ultima) ir(actual + 1);
    };
    return terminar;
  }

  return abrir;
})();
