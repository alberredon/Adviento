(() => {
  const $ = (s) => document.querySelector(s);
  const CLAVE = "adviento-abiertos";
  const ICONOS = {
    candado: '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    hecho: '<svg viewBox="0 0 24 24"><path d="m5 13 5 5L19 7"/></svg>',
  };
  const nombreFecha = (dia) => `${dia} de enero`;
  const aNumero = (a, m, d) => a * 10000 + m * 100 + d;

  // ---------- Fecha ----------
  // Solo en pruebas locales: index.html?fecha=2027-01-03
  const enLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  const simulada = enLocal && new URLSearchParams(location.search).get("fecha");

  function hoy() {
    if (simulada) return aNumero(...simulada.split("-").map(Number));
    const p = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: CONFIG.zonaHoraria, calendar: "gregory", numberingSystem: "latn",
      year: "numeric", month: "numeric", day: "numeric",
    }).formatToParts(new Date()).forEach(({ type, value }) => (p[type] = Number(value)));
    return aNumero(p.year, p.month, p.day);
  }

  function estado(dia) {
    const fecha = aNumero(CONFIG.anio, CONFIG.mes, dia);
    const ahora = hoy();
    if (ahora < fecha) return CONFIG.diasDePrueba.includes(dia) ? "prueba" : "futuro";
    if (ahora === fecha) return "hoy";
    return CONFIG.permitirDiasPasados ? "abierto" : "pasado";
  }

  // ---------- Cajas ya abiertas ----------
  function leerAbiertos() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch { return []; }
  }
  const abiertos = new Set(leerAbiertos());
  function marcarAbierto(dia) {
    abiertos.add(dia);
    try { localStorage.setItem(CLAVE, JSON.stringify([...abiertos])); } catch {}
  }

  // ---------- Cajas ----------
  const cajas = DIAS.map((d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "caja";
    b.style.setProperty("--c-fondo", d.fondo);
    b.style.setProperty("--c-texto", d.texto);
    b.innerHTML = `<span class="fecha">${nombreFecha(d.dia)}</span><span class="dibujo">${d.dibujo}</span><span class="estado" aria-hidden="true"></span>`;
    b.addEventListener("click", () => pulsar(d, b));
    b.addEventListener("animationend", (e) => { if (e.target === b) b.classList.remove("no"); });
    $(d.hueco).append(b);
    return { d, b };
  });

  function refrescar() {
    for (const { d, b } of cajas) {
      const e = estado(d.dia);
      // Solo cuenta como vista si ya ha llegado su día (evita restos de pruebas)
      const visto = abiertos.has(d.dia) && ["hoy", "abierto", "pasado"].includes(e);
      b.classList.toggle("hoy", e === "hoy" && !visto);
      const icono = b.querySelector(".estado");
      const tipo = visto ? "hecho" : (e === "futuro" || e === "pasado") ? "candado" : "";
      icono.hidden = !tipo;
      icono.innerHTML = ICONOS[tipo] || "";
      const texto = { futuro: "cerrada", pasado: "ya no se puede abrir", hoy: "abrir", abierto: "abrir", prueba: "abrir" }[e];
      b.setAttribute("aria-label", `${nombreFecha(d.dia)}, ${texto}`);
    }
  }

  function pulsar(d, b) {
    refrescar();
    const e = estado(d.dia);
    if (e === "futuro" || e === "pasado") {
      b.classList.add("no");
      avisar(e === "futuro"
        ? `Esta caja se abre el ${nombreFecha(d.dia)}`
        : `Esta caja solo se podía abrir el ${nombreFecha(d.dia)}`);
      return;
    }
    abrir(d);
  }

  // ---------- Ventana del día ----------
  const ventana = $("#ventana");
  const contenido = $("#ventana-contenido");
  let limpiar = null;

  function abrir(d) {
    $("#aviso").classList.remove("visible");
    $("#ventana-titulo").textContent = nombreFecha(d.dia);
    ventana.style.setProperty("--c-fondo", d.fondo);
    ventana.style.setProperty("--c-texto", d.texto);
    vaciar();
    ventana.showModal();
    limpiar = d.abrir(contenido, () => ventana.close()) || null;
    if (estado(d.dia) !== "prueba") marcarAbierto(d.dia);
    // Botón de adelantar: solo en pruebas (nunca en el día real)
    $("#adelantar").hidden = !(limpiar?.adelantar && (estado(d.dia) === "prueba" || enLocal));
    refrescar();
  }
  $("#adelantar").addEventListener("click", () => limpiar?.adelantar?.());
  $("#cerrar").addEventListener("click", () => ventana.close());
  function vaciar() {
    if (limpiar) limpiar();
    limpiar = null;
    contenido.replaceChildren();
  }
  // El aviso de cierre puede llegar tarde, con la ventana ya reabierta
  ventana.addEventListener("close", () => { if (!ventana.open) vaciar(); });

  let temporizador;
  function avisar(texto) {
    const a = $("#aviso");
    a.textContent = texto;
    a.classList.add("visible");
    clearTimeout(temporizador);
    temporizador = setTimeout(() => a.classList.remove("visible"), 2600);
  }

  // ---------- Pantalla completa ----------
  async function pantallaCompleta() {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      await screen.orientation?.lock?.("portrait");
    } catch {} // iPhone y algunos navegadores no lo permiten: la web sigue igual
  }

  // ---------- Arranque ----------
  $("#anio").textContent = CONFIG.tituloAnio;
  document.title = `Calendario de adviento ${CONFIG.tituloAnio}`;
  $("#escena").innerHTML = DIBUJOS.portada;
  $("#clave-dibujo").innerHTML = DIBUJOS.corona;
  function verCalendario() {
    $("#calendario").hidden = false;
    scrollTo(0, 0);
  }
  $("#continuar").addEventListener("click", async () => {
    if ($("#continuar").disabled) return;
    $("#continuar").disabled = true;
    pantallaCompleta();
    const lista = await Cifrado.abrirGuardada();
    $("#inicio").hidden = true;
    if (lista) return verCalendario();
    $("#pantalla-clave").hidden = false;
    $("#clave").focus();
  });
  $("#form-clave").addEventListener("submit", async (e) => {
    e.preventDefault();
    const boton = e.target.querySelector("button");
    if (boton.disabled) return;
    const error = $("#clave-error");
    error.textContent = "";
    boton.disabled = true;
    boton.textContent = "Comprobando…";
    const r = await Cifrado.abrirCon($("#clave").value);
    boton.disabled = false;
    boton.textContent = "Abrir calendario";
    if (r === "ok") {
      $("#clave").value = "";
      $("#pantalla-clave").hidden = true;
      return verCalendario();
    }
    error.textContent = r === "clave"
      ? "Esa clave no abre el calendario. Revisa las mayúsculas y prueba otra vez."
      : "No se ha podido comprobar. Revisa la conexión y prueba otra vez.";
    $("#clave").focus();
  });
  refrescar();
  setInterval(refrescar, 30000);
  document.addEventListener("visibilitychange", refrescar);
})();
