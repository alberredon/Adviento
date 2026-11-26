// Día 4: escape room en el refugio de Góriz, en 3D (Three.js, solo se carga este día).
// Textos, códigos, pistas y regalo están cifrados (privado/dia4 -> datos/dia4).
const abrirRefugio = (() => {
  const CARPETA = "dia4/";
  const PARTIDA = "adviento-dia4-partida";
  const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  const PISTAS = 3;
  const MORSE = { A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--.." };
  const OBJETOS = {
    lena: "Leña", cerillas: "Cerillas", pala: "Pala", arva: "ARVA", pilas: "Pilas", tabla: "Tabla morse",
  };
  const ICONOS = {
    lena: '<svg viewBox="0 0 40 40"><rect x="5" y="20" width="30" height="9" rx="4.5" fill="#8a5a3b"/><rect x="8" y="11" width="26" height="9" rx="4.5" fill="#a86d45"/><circle cx="9.5" cy="24.5" r="3.5" fill="#e3cf9f"/><circle cx="12.5" cy="15.5" r="3.5" fill="#e3cf9f"/></svg>',
    cerillas: '<svg viewBox="0 0 40 40"><rect x="8" y="14" width="24" height="16" rx="3" fill="#b14645"/><rect x="11" y="17" width="18" height="10" rx="2" fill="#fbf0e1"/><path d="M26 6l-4 12" stroke="#d6c5b5" stroke-width="2.5" stroke-linecap="round"/><circle cx="26.5" cy="6" r="2.6" fill="#8f3233"/></svg>',
    pala: '<svg viewBox="0 0 40 40"><path d="M20 4v20" stroke="#8a5a3b" stroke-width="3.5" stroke-linecap="round"/><path d="M15 4h10" stroke="#26233f" stroke-width="3.5" stroke-linecap="round"/><path d="M12 22h16v8a8 8 0 0 1-16 0z" fill="#b14645"/></svg>',
    arva: '<svg viewBox="0 0 40 40"><rect x="10" y="5" width="20" height="30" rx="6" fill="#e3a23c"/><rect x="14" y="10" width="12" height="9" rx="2" fill="#26233f"/><path d="M17 15h6" stroke="#a5d8b8" stroke-width="2"/><circle cx="20" cy="27" r="3.5" fill="#26233f"/></svg>',
    pilas: '<svg viewBox="0 0 40 40"><rect x="8" y="11" width="10" height="22" rx="2" fill="#26233f"/><rect x="22" y="11" width="10" height="22" rx="2" fill="#26233f"/><rect x="11" y="8" width="4" height="3" fill="#b4bfab"/><rect x="25" y="8" width="4" height="3" fill="#b4bfab"/><rect x="8" y="11" width="10" height="7" fill="#e3a23c"/><rect x="22" y="11" width="10" height="7" fill="#e3a23c"/></svg>',
    tabla: '<svg viewBox="0 0 40 40"><rect x="7" y="6" width="26" height="28" rx="3" fill="#fbf0e1" stroke="#26233f" stroke-width="2"/><circle cx="13" cy="14" r="2" fill="#26233f"/><path d="M18 14h9M12 21h7M23 21h2M13 28h2M19 28h8" stroke="#26233f" stroke-width="2.5" stroke-linecap="round"/></svg>',
  };

  const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  function cargarThree() {
    if (window.THREE) return Promise.resolve();
    cargarThree.p ||= new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = THREE_URL;
      s.crossOrigin = "anonymous";
      s.onload = ok;
      s.onerror = () => { cargarThree.p = null; s.remove(); mal(new Error("three")); };
      document.head.append(s);
    });
    return cargarThree.p;
  }

  // ---------- Sonido ----------
  function crearSonidos() {
    let ac = null, viento = null, ruido = null, chispas = 0, tono = null;
    function buffer() {
      if (ruido) return ruido;
      ruido = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return ruido;
    }
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
    function soplo(dura, vol, frec, tipo = "bandpass") {
      if (!ac) return;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
      s.buffer = buffer();
      f.type = tipo;
      f.frequency.value = frec;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dura);
      s.connect(f).connect(g).connect(ac.destination);
      s.start(t, Math.random());
      s.stop(t + dura);
    }
    return {
      activar() {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          ac ||= AC ? new AC() : null;
          if (ac && ac.state !== "running") ac.resume().catch(() => {});
        } catch {}
      },
      // Viento continuo; fuerza 0..1
      viento(fuerza) {
        if (!ac) return;
        if (!viento) {
          const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
          s.buffer = buffer();
          s.loop = true;
          f.type = "lowpass";
          f.frequency.value = 420;
          g.gain.value = 0;
          s.connect(f).connect(g).connect(ac.destination);
          s.start();
          viento = { f, g, fuerza: 0 };
          viento.racha = setInterval(() => {
            if (!ac) return;
            const t = ac.currentTime, v = viento.fuerza;
            viento.g.gain.setTargetAtTime(v * (0.05 + Math.random() * 0.07), t, 0.9);
            viento.f.frequency.setTargetAtTime(280 + Math.random() * 380 * (0.4 + v), t, 1.2);
          }, 1800);
        }
        viento.fuerza = fuerza;
        viento.g.gain.setTargetAtTime(fuerza * 0.08, ac.currentTime, 0.6);
      },
      fuego(encendido) {
        clearInterval(chispas);
        if (encendido) chispas = setInterval(() => { if (Math.random() < 0.6) soplo(0.04 + Math.random() * 0.05, 0.06 + Math.random() * 0.08, 1800 + Math.random() * 2500, "highpass"); }, 160);
      },
      toque: () => nota("sine", 700, 320, 0, 0.08, 0.12),
      rueda: () => nota("square", 1300, 900, 0, 0.03, 0.04),
      coger: () => [660, 880].forEach((f, i) => nota("triangle", f, f, i * 0.08, 0.16, 0.14)),
      abrir: () => { soplo(0.12, 0.25, 900); [392, 523, 659].forEach((f, i) => nota("triangle", f, f, 0.05 + i * 0.09, 0.22, 0.15)); },
      mal: () => [260, 200].forEach((f, i) => nota("triangle", f, f * 0.95, i * 0.14, 0.22, 0.14)),
      cavar: () => soplo(0.35, 0.35, 500),
      pitido: () => nota("square", 2200, 2200, 0, 0.06, 0.05),
      encender: () => { soplo(0.5, 0.3, 700); nota("sine", 120, 60, 0.05, 0.6, 0.18); },
      estatica: (dura) => soplo(dura, 0.12, 2400),
      morse(encendido) {
        if (!ac) return;
        if (encendido && !tono) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.frequency.value = 620;
          g.gain.setValueAtTime(0, ac.currentTime);
          g.gain.linearRampToValueAtTime(0.06, ac.currentTime + 0.01);
          o.connect(g).connect(ac.destination);
          o.start();
          tono = { o, g };
        } else if (!encendido && tono) {
          const { o, g } = tono, t = ac.currentTime;
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.linearRampToValueAtTime(0, t + 0.01);
          o.stop(t + 0.02);
          tono = null;
        }
      },
      ganar: () => [523, 659, 784, 1047].forEach((f, i) => nota("triangle", f, f, i * 0.13, i === 3 ? 0.9 : 0.24, 0.2)),
      cerrar() {
        clearInterval(chispas);
        if (viento) clearInterval(viento.racha);
        ac?.close().catch(() => {});
        ac = null; viento = null; ruido = null; tono = null;
      },
    };
  }

  // ---------- La sala en 3D ----------
  function crearSala(lienzo, alTocar) {
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const escena = new T.Scene();
    escena.background = new T.Color("#1d1b2e");
    const camara = new T.PerspectiveCamera(72, 1, 0.05, 60);
    camara.position.set(0, 1.55, 0);
    camara.rotation.order = "YXZ";
    const vista = { yaw: 1.62, pitch: -0.3, fov: 72 };
    const objetivo = { ...vista };
    const tocables = [];
    const reloj = new T.Clock();
    let cerrado = false, pedido = 0;

    const mats = new Map();
    const mat = (color, extra = {}) => {
      const k = color + JSON.stringify(extra);
      if (!mats.has(k)) mats.set(k, new T.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra }));
      return mats.get(k);
    };
    // Material con textura; rep: [ancho, alto] en repeticiones
    const conTextura = (tex, rep, extra = {}) => {
      const t = tex.clone();
      t.needsUpdate = true;
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(...rep);
      const m = new T.MeshStandardMaterial({ map: t, roughness: 0.9, metalness: 0, ...extra });
      mats.set(Symbol(), m);
      return m;
    };
    function caja(w, h, d, material, x, y, z, padre = escena) {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof material === "string" ? mat(material) : material);
      m.position.set(x, y, z);
      padre.add(m);
      return m;
    }
    function cilindro(r1, r2, h, material, x, y, z, padre = escena, lados = 20) {
      const m = new T.Mesh(new T.CylinderGeometry(r1, r2, h, lados), typeof material === "string" ? mat(material) : material);
      m.position.set(x, y, z);
      padre.add(m);
      return m;
    }
    function grupo(id, x, y, z, ry = 0) {
      const g = new T.Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;
      g.userData.id = id;
      escena.add(g);
      if (id) tocables.push(g);
      return g;
    }
    function textura(w, h, pintar) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      pintar(c.getContext("2d"), w, h);
      const t = new T.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    }
    // Pseudoaleatorio fijo: la sala sale igual siempre
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
    const mezcla = (hex, k) => {
      const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(limitar(v * k, 0, 255));
      return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
    };
    function tablas(base, linea, n, vertical) {
      return textura(512, 512, (c, w, h) => {
        if (!vertical) { c.translate(w, 0); c.rotate(Math.PI / 2); }
        const a = w / n;
        for (let i = 0; i < n; i++) {
          c.fillStyle = mezcla(base, 0.86 + azar() * 0.26);
          c.fillRect(i * a, 0, a, h);
          // Vetas
          for (let k = 0; k < 16; k++) {
            const x0 = i * a + azar() * a, amp = 2 + azar() * 5, fase = azar() * 9;
            c.strokeStyle = `rgba(${azar() < 0.5 ? "60,35,20" : "255,230,200"},${0.06 + azar() * 0.1})`;
            c.lineWidth = 0.6 + azar() * 1.6;
            c.beginPath();
            for (let y = 0; y <= h; y += 16) c.lineTo(limitar(x0 + Math.sin(y / 60 + fase) * amp, i * a + 1, (i + 1) * a - 1), y);
            c.stroke();
          }
          // Algún nudo
          if (azar() < 0.25) {
            const x = i * a + a * (0.3 + azar() * 0.4), y = azar() * h;
            for (let k = 4; k > 0; k--) { c.fillStyle = `rgba(70,40,22,${0.12 + 0.1 * (4 - k)})`; c.beginPath(); c.ellipse(x, y, k * 2.2, k * 4.5, 0, 0, 7); c.fill(); }
          }
          // Juntas
          c.fillStyle = linea;
          c.fillRect(i * a, 0, 2.5, h);
          c.fillStyle = "rgba(255,255,255,.08)";
          c.fillRect(i * a + 2.5, 0, 1.5, h);
        }
      });
    }
    function piedra() {
      return textura(512, 256, (c, w, h) => {
        c.fillStyle = "#5a5046"; c.fillRect(0, 0, w, h);
        const filas = 4, alto = h / filas;
        for (let f = 0; f < filas; f++) {
          let x = -azar() * 60;
          while (x < w) {
            const ancho = 55 + azar() * 70, g = 0.75 + azar() * 0.35;
            const tono = ["#b3a38c", "#a08f78", "#c2b196", "#a89478"][Math.floor(azar() * 4)];
            c.fillStyle = mezcla(tono.slice(0, 7), g);
            c.beginPath();
            c.roundRect ? c.roundRect(x + 3, f * alto + 3, ancho - 6, alto - 6, 14) : c.rect(x + 3, f * alto + 3, ancho - 6, alto - 6);
            c.fill();
            for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(${azar() < 0.5 ? "0,0,0" : "255,255,255"},${azar() * 0.08})`; c.fillRect(x + azar() * ancho, f * alto + azar() * alto, 3, 3); }
            c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(x + 6, f * alto + alto - 10, ancho - 12, 5);
            x += ancho;
          }
        }
      });
    }
    function lana(color) {
      return textura(256, 256, (c, w, h) => {
        c.fillStyle = color; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(0,0,0,${0.03 + azar() * 0.05})`; c.fillRect(0, y, w, 1.5); }
        for (let x = 0; x < w; x += 3) { c.fillStyle = `rgba(255,255,255,${azar() * 0.05})`; c.fillRect(x, 0, 1.5, h); }
        c.fillStyle = "rgba(255,255,255,.55)";
        for (const y of [20, 30, h - 34, h - 24]) c.fillRect(0, y, w, 4);
      });
    }
    function corcho() {
      return textura(256, 256, (c, w, h) => {
        c.fillStyle = "#b98d58"; c.fillRect(0, 0, w, h);
        for (let k = 0; k < 2500; k++) { c.fillStyle = `rgba(${azar() < 0.5 ? "70,40,15" : "240,210,160"},${azar() * 0.35})`; c.fillRect(azar() * w, azar() * h, 2, 2); }
      });
    }

    // Luces
    const ambiente = new T.HemisphereLight("#9fb4d8", "#2b2433", 0.8);
    escena.add(ambiente);
    const luna = new T.DirectionalLight("#a9c4ff", 0.35);
    luna.position.set(6, 4, -1);
    escena.add(luna);
    const farol = new T.PointLight("#ffc98a", 0.9, 7, 1.4);
    farol.position.set(-2.7, 1.2, -0.8);
    escena.add(farol);
    const luzFuego = new T.PointLight("#ff8a3c", 0, 9, 1.4);
    for (const l of [farol, luzFuego]) { l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.004; l.shadow.radius = 4; }
    luzFuego.position.set(2.5, 0.8, 1.6);
    escena.add(luzFuego);
    const sol = new T.DirectionalLight("#ffb27a", 0);
    sol.position.set(0, 2, -8);
    escena.add(sol);

    // Paredes, suelo y techo (sala de 7 x 7 m, 3 m de alto)
    const R = 3.5, ALTO = 3, G = 0.12;
    const texPared = tablas("#b98a5c", "#5a3a22", 6, true);
    const texMueble = tablas("#8a5a3b", "#3e2616", 5, false);
    const texPuerta = tablas("#6b3f26", "#2e1b10", 5, true);
    const texPiedra = piedra();
    const mueble = conTextura(texMueble, [1, 1]);
    const suelo = new T.Mesh(new T.PlaneGeometry(2 * R, 2 * R), conTextura(tablas("#7a5034", "#2e1d12", 6, false), [4, 4], { roughness: 0.75 }));
    suelo.rotation.x = -Math.PI / 2;
    escena.add(suelo);
    const techo = new T.Mesh(new T.PlaneGeometry(2 * R, 2 * R), conTextura(tablas("#6e4a31", "#2e1d12", 6, false), [4, 4]));
    techo.rotation.x = Math.PI / 2;
    techo.position.y = ALTO;
    escena.add(techo);
    for (let i = -2; i <= 2; i++) caja(2 * R, 0.16, 0.18, conTextura(texMueble, [4, 0.3]), 0, ALTO - 0.08, i * 1.4);
    const pared = (w, h, d, x, y, z) => caja(w, h, d, conTextura(texPared, [Math.max(w, d) / 1.2, h / 2.5]), x, y, z);
    // Norte (puerta, hueco x -0.55..0.55, y 0..2.1)
    pared(2.95, ALTO, G, -2.025, ALTO / 2, -R);
    pared(2.95, ALTO, G, 2.025, ALTO / 2, -R);
    pared(1.1, 0.9, G, 0, 2.55, -R);
    // Este (ventana, hueco z -1.2..0.2, y 1.1..2.1)
    pared(G, ALTO, 2.3, R, ALTO / 2, -2.35);
    pared(G, ALTO, 3.3, R, ALTO / 2, 1.85);
    pared(G, 1.1, 1.4, R, 0.55, -0.5);
    pared(G, 0.9, 1.4, R, 2.55, -0.5);
    // Sur y oeste
    pared(2 * R, ALTO, G, 0, ALTO / 2, R);
    pared(G, ALTO, 2 * R, -R, ALTO / 2, 0);
    // Rodapié de piedra
    for (const [w, d, x, z] of [[2 * R, 0.16, 0, R - 0.08], [0.16, 2 * R, -R + 0.08, 0], [2.95, 0.16, -2.025, -R + 0.08], [2.95, 0.16, 2.025, -R + 0.08], [0.16, 2.3, R - 0.08, -2.35], [0.16, 3.3, R - 0.08, 1.85]]) caja(w, 0.7, d, conTextura(texPiedra, [Math.max(w, d) / 2.2, 0.7]), x, 0.35, z);

    // Exterior: cielo y montañas, por la ventana y por la puerta
    function pintarCielo(c, w, h, amanecer) {
      const g = c.createLinearGradient(0, 0, 0, h);
      if (amanecer) { g.addColorStop(0, "#5b7fb6"); g.addColorStop(0.45, "#f2b7bc"); g.addColorStop(0.7, "#ffd59a"); }
      else { g.addColorStop(0, "#0e1426"); g.addColorStop(0.6, "#2a3554"); g.addColorStop(0.75, "#3d4a6b"); }
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      const sierra = (y0, alto, color, semilla) => {
        c.fillStyle = color; c.beginPath(); c.moveTo(0, h);
        for (let x = 0; x <= w; x += w / 14) c.lineTo(x, y0 - alto * Math.abs(Math.sin(x * 0.011 * semilla + semilla)) - (x * 13 % 7) * 3);
        c.lineTo(w, h); c.fill();
      };
      sierra(h * 0.62, h * 0.22, amanecer ? "#8d9ec4" : "#4b5878", 1.3);
      sierra(h * 0.72, h * 0.16, amanecer ? "#e9eef7" : "#8090b0", 2.1);
      c.fillStyle = amanecer ? "#fbfbff" : "#a7b3cc"; c.fillRect(0, h * 0.74, w, h);
      if (amanecer) { c.fillStyle = "#fff2c4"; c.beginPath(); c.arc(w * 0.62, h * 0.6, 26, 0, 7); c.fill(); }
    }
    const cielos = [false, true].map((a) => textura(1024, 512, (c, w, h) => pintarCielo(c, w, h, a)));
    const fondoMat = new T.MeshBasicMaterial({ map: cielos[0] });
    const fondoEste = new T.Mesh(new T.PlaneGeometry(30, 15), fondoMat);
    fondoEste.position.set(9, 3, -0.5);
    fondoEste.rotation.y = -Math.PI / 2;
    escena.add(fondoEste);
    const fondoNorte = new T.Mesh(new T.PlaneGeometry(30, 15), fondoMat);
    fondoNorte.position.set(0, 3, -9);
    escena.add(fondoNorte);
    const nieveSuelo = new T.Mesh(new T.PlaneGeometry(14, 14), mat("#dfe6f1"));
    nieveSuelo.rotation.x = -Math.PI / 2;
    nieveSuelo.position.set(0, -0.02, -10);
    escena.add(nieveSuelo);
    const nieveSuelo2 = nieveSuelo.clone();
    nieveSuelo2.position.set(10, -0.02, 0);
    escena.add(nieveSuelo2);
    // Copos (fuera)
    const COPOS = 500, posCopos = new Float32Array(COPOS * 3);
    const copoAzar = (i, y) => {
      const fuera = i % 2 ? [3.8 + Math.random() * 4.5, -3 + Math.random() * 5.5] : [-3 + Math.random() * 6, -3.8 - Math.random() * 4.5];
      posCopos[i * 3] = fuera[0]; posCopos[i * 3 + 1] = y ?? Math.random() * 5; posCopos[i * 3 + 2] = fuera[1];
    };
    for (let i = 0; i < COPOS; i++) copoAzar(i);
    const geoCopos = new T.BufferGeometry();
    geoCopos.setAttribute("position", new T.BufferAttribute(posCopos, 3));
    const copos = new T.Points(geoCopos, new T.PointsMaterial({ color: "#ffffff", size: 0.05, transparent: true, opacity: 0.9 }));
    escena.add(copos);
    // Luz de la linterna en la montaña (morse)
    const destello = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), new T.MeshBasicMaterial({ color: "#fff4c0" }));
    destello.position.set(8.4, 2.05, -1.1);
    destello.visible = false;
    escena.add(destello);

    // Ventana
    const ventana = grupo("ventana", R - 0.02, 1.6, -0.5);
    for (const [h, d, y, z] of [[0.08, 1.5, 0.5, 0], [0.08, 1.5, -0.5, 0], [1.08, 0.08, 0, 0.7], [1.08, 0.08, 0, -0.7], [1, 0.05, 0, 0], [0.05, 1.4, 0, 0]]) caja(0.1, h, d, mueble, 0, y, z, ventana);
    caja(0.3, 0.06, 1.6, mueble, -0.1, -0.53, 0, ventana);
    const escarcha = new T.Mesh(new T.PlaneGeometry(1.4, 1), new T.MeshBasicMaterial({ color: "#e8f1ff", transparent: true, opacity: 0.88, depthWrite: false }));
    escarcha.rotation.y = -Math.PI / 2;
    escarcha.position.x = -0.01;
    ventana.add(escarcha);

    // Puerta, con nieve detrás
    const puerta = grupo("puerta", 0, 0, -R);
    const bisagra = new T.Group();
    bisagra.position.set(-0.55, 0, 0.02);
    puerta.add(bisagra);
    const hoja = caja(1.1, 2.1, 0.08, conTextura(texPuerta, [1, 1]), 0.55, 1.05, 0, bisagra);
    for (const y of [0.5, 1.6]) caja(1.0, 0.1, 0.03, "#4f2e1c", 0.55, y, 0.05, bisagra);
    caja(0.12, 0.04, 0.05, "#d6c5b5", 0.98, 1.05, 0.07, bisagra);
    for (const [w, h, x, y] of [[0.1, 2.15, -0.6, 1.07], [0.1, 2.15, 0.6, 1.07], [1.3, 0.1, 0, 2.15]]) caja(w, h, 0.16, mueble, x, y, 0.02, puerta);
    const muroNieve = caja(1.1, 2.1, 0.2, "#eef3fa", 0, 1.05, -0.12, puerta);
    const montonNieve = new T.Mesh(new T.IcosahedronGeometry(0.6, 3), mat("#eef3fa", { roughness: 1 }));
    montonNieve.scale.set(1.3, 0.35, 0.7);
    montonNieve.position.set(0.1, 0, 0.55);
    puerta.add(montonNieve);
    hoja.userData.hoja = true;

    // Cesta de leña
    const cesta = grupo("cesta", -1.45, 0, -3.05);
    cilindro(0.32, 0.27, 0.38, mueble, 0, 0.19, 0, cesta, 12);
    cilindro(0.3, 0.3, 0.02, "#5e3b25", 0, 0.36, 0, cesta, 12);
    const troncos = new T.Group();
    cesta.add(troncos);
    for (const [x, y, rz, ry] of [[-0.1, 0.44, 1.57, 0.2], [0.1, 0.44, 1.57, -0.3], [0, 0.56, 1.57, 0.6]]) {
      const t = cilindro(0.075, 0.075, 0.6, conTextura(texMueble, [0.4, 1]), x, y, 0, troncos, 9);
      t.rotation.set(0, ry, rz);
    }

    // Radio en su balda
    const radio = grupo("radio", 1.75, 1.15, -R + 0.25);
    caja(0.9, 0.05, 0.4, mueble, 0, -0.03, 0, radio);
    caja(0.56, 0.32, 0.26, "#476356", 0, 0.16, 0, radio);
    caja(0.24, 0.16, 0.02, "#26233f", -0.1, 0.17, 0.135, radio);
    const dial = cilindro(0.06, 0.06, 0.04, "#d6c5b5", 0.15, 0.17, 0.14, radio, 12);
    dial.rotation.x = Math.PI / 2;
    const antena = cilindro(0.01, 0.01, 0.6, "#b4bfab", 0.22, 0.6, -0.05, radio, 5);
    antena.rotation.z = -0.3;
    const led = new T.Mesh(new T.SphereGeometry(0.02, 8, 6), new T.MeshBasicMaterial({ color: "#5a2020" }));
    led.position.set(0.15, 0.27, 0.13);
    radio.add(led);

    // Estufa
    const estufa = grupo("estufa", 2.95, 0, 1.6);
    cilindro(0.36, 0.36, 0.85, mat("#2b2a30", { roughness: 0.55, metalness: 0.35 }), 0, 0.55, 0, estufa, 28);
    cilindro(0.4, 0.4, 0.05, mat("#1d1c22", { roughness: 0.5, metalness: 0.4 }), 0, 1.0, 0, estufa, 28);
    for (const [x, z] of [[0.2, 0.2], [-0.2, 0.2], [0.2, -0.2], [-0.2, -0.2]]) caja(0.05, 0.14, 0.05, "#1d1c22", x, 0.07, z, estufa);
    cilindro(0.08, 0.08, 2, mat("#3a3940", { roughness: 0.5, metalness: 0.35 }), 0.05, 2.0, 0, estufa, 16);
    const cristal = new T.Mesh(new T.PlaneGeometry(0.32, 0.28), new T.MeshBasicMaterial({ color: "#15141a" }));
    cristal.position.set(-0.365, 0.55, 0);
    cristal.rotation.y = -Math.PI / 2;
    estufa.add(cristal);
    const llamas = new T.Group();
    llamas.position.set(-0.372, 0.42, 0);
    llamas.visible = false;
    estufa.add(llamas);
    const vidrioEstufa = new T.Mesh(new T.PlaneGeometry(0.32, 0.28), new T.MeshBasicMaterial({ color: "#ffb070", transparent: true, opacity: 0.18, depthWrite: false }));
    vidrioEstufa.position.set(-0.385, 0.55, 0);
    vidrioEstufa.rotation.y = -Math.PI / 2;
    estufa.add(vidrioEstufa);
    for (const [z, h, c] of [[-0.07, 0.17, "#ff7b2e"], [0.06, 0.14, "#ffb13b"], [0, 0.2, "#ffd36b"]]) {
      const f = new T.Mesh(new T.ConeGeometry(0.05, h, 8), new T.MeshBasicMaterial({ color: c }));
      f.position.set(0, h / 2, z);
      llamas.add(f);
    }

    // Termómetro
    const termo = grupo("termometro", R - 0.07, 1.75, 0.6);
    caja(0.03, 0.5, 0.12, "#fbf0e1", 0, 0, 0, termo);
    const mercurio = caja(0.03, 0.4, 0.03, "#b14645", -0.01, -0.2, 0, termo);
    mercurio.geometry.translate(0, 0.2, 0);

    // Literas y taquilla (sur)
    const literas = grupo("literas", -1.35, 0, 2.95);
    for (const [x, z] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) caja(0.08, 2.3, 0.08, mueble, x, 1.15, z, literas);
    for (const [y, manta] of [[0.45, "#b14645"], [1.55, "#476356"]]) {
      caja(2.05, 0.1, 0.95, mueble, 0, y - 0.07, 0, literas);
      caja(1.95, 0.14, 0.85, "#fbf0e1", 0, y + 0.05, 0, literas);
      caja(1.4, 0.06, 0.88, conTextura(lana(manta), [1, 1]), 0.25, y + 0.14, 0, literas);
      caja(0.35, 0.1, 0.6, "#ffffff", -0.75, y + 0.16, 0, literas);
    }
    const taquilla = grupo("taquilla", 1.85, 0, R - 0.35);
    caja(0.75, 1.9, 0.55, mat("#8fa094", { roughness: 0.5, metalness: 0.3 }), 0, 0.95, 0, taquilla);
    caja(0.7, 1.84, 0.02, "#26233f", 0, 0.95, -0.27, taquilla);
    const puertaTaq = new T.Group();
    puertaTaq.position.set(0.37, 0, -0.28);
    taquilla.add(puertaTaq);
    caja(0.74, 1.86, 0.03, mat("#b4bfab", { roughness: 0.5, metalness: 0.3 }), -0.37, 0.95, 0, puertaTaq);
    for (let i = 0; i < 4; i++) caja(0.4, 0.02, 0.01, "#6f7f73", -0.37, 1.65 - i * 0.05, -0.02, puertaTaq);
    const candado = caja(0.08, 0.1, 0.04, "#e3cf9f", -0.68, 1.0, -0.04, puertaTaq);
    const dentroTaq = new T.Group();
    taquilla.add(dentroTaq);
    const palaMesh = caja(0.06, 1.1, 0.06, "#8a5a3b", -0.15, 0.75, 0, dentroTaq);
    caja(0.26, 0.3, 0.04, "#b14645", -0.15, 0.25, 0, dentroTaq);
    caja(0.12, 0.18, 0.06, "#e3a23c", 0.15, 1.3, 0, dentroTaq);
    palaMesh.rotation.z = 0.08;

    // Tablón de cimas
    const tablon = grupo("tablon", 0.15, 1.75, R - 0.07, Math.PI);
    caja(1.3, 0.85, 0.04, conTextura(corcho(), [1.5, 1]), 0, 0, 0, tablon);
    const tonos = ["#fbf0e1", "#f2b7bc", "#b4bfab", "#e3cf9f"];
    for (let i = 0; i < 8; i++) {
      const c = caja(0.24, 0.3, 0.01, tonos[i % 4], -0.45 + (i % 4) * 0.3, i < 4 ? 0.19 : -0.19, -0.025, tablon);
      c.rotation.z = ((i * 7) % 5 - 2) * 0.03;
      caja(0.03, 0.03, 0.02, "#b14645", c.position.x, c.position.y + 0.13, -0.035, tablon);
    }

    // Mesa, bancos, libro, farol y botiquín (oeste)
    const mesa = grupo("", -2.75, 0, 0);
    caja(0.95, 0.07, 3.2, mueble, 0, 0.78, 0, mesa);
    for (const [x, z] of [[-0.38, -1.45], [0.38, -1.45], [-0.38, 1.45], [0.38, 1.45]]) caja(0.07, 0.76, 0.07, mueble, x, 0.38, z, mesa);
    caja(0.32, 0.05, 2.8, mueble, 0.85, 0.45, 0, mesa);
    for (const z of [-1.2, 1.2]) caja(0.05, 0.43, 0.25, mueble, 0.85, 0.22, z, mesa);
    const libro = grupo("libro", -2.65, 0.815, 0.25, 0.25);
    caja(0.42, 0.05, 0.55, "#b14645", 0, 0, 0, libro);
    caja(0.39, 0.045, 0.52, "#fbf0e1", 0.02, 0.004, 0, libro);
    const farolG = grupo("farol", -2.8, 0.815, -0.8);
    cilindro(0.09, 0.1, 0.03, "#26233f", 0, 0.015, 0, farolG, 8);
    const vidrio = cilindro(0.07, 0.07, 0.2, new T.MeshBasicMaterial({ color: "#ffd59a" }), 0, 0.13, 0, farolG, 8);
    cilindro(0.02, 0.09, 0.07, "#26233f", 0, 0.27, 0, farolG, 8);
    const botiquin = grupo("botiquin", -R + 0.1, 1.75, -1.9, Math.PI / 2);
    caja(0.55, 0.45, 0.14, "#ffffff", 0, 0, 0, botiquin);
    const tapaBot = new T.Group();
    tapaBot.position.set(-0.275, 0, 0.075);
    botiquin.add(tapaBot);
    caja(0.55, 0.45, 0.02, "#f4f1ea", 0.275, 0, 0, tapaBot);
    caja(0.26, 0.07, 0.01, "#b14645", 0.275, 0, 0.012, tapaBot);
    caja(0.07, 0.26, 0.01, "#b14645", 0.275, 0, 0.012, tapaBot);
    caja(0.47, 0.37, 0.01, "#26233f", 0, 0, 0.065, botiquin);

    // Mochila (aparece al encontrarla)
    const mochila = grupo("mochila", 0.75, 0, -2.75, -0.4);
    caja(0.42, 0.55, 0.26, "#b14645", 0, 0.28, 0, mochila);
    caja(0.36, 0.18, 0.08, "#8f3233", 0, 0.2, 0.16, mochila);
    caja(0.44, 0.12, 0.28, "#8f3233", 0, 0.58, 0, mochila);
    mochila.visible = false;

    escena.traverse((o) => {
      if (!o.isMesh || o.material.isMeshBasicMaterial) return;
      o.castShadow = o.receiveShadow = true;
    });
    for (const o of [suelo, techo]) { o.castShadow = false; o.receiveShadow = true; }
    escarcha.castShadow = false;

    // ---------- Estado visible ----------
    let fuego = false, morseLuz = false, final = 0;
    function aplicar(e) {
      troncos.visible = !e.inv.includes("lena") && !e.hechos.lenaDentro && !e.hechos.fuego;
      tapaBot.rotation.y = e.hechos.botiquin ? -1.9 : 0;
      fuego = !!e.hechos.fuego;
      llamas.visible = fuego;
      cristal.material.color.set(fuego ? "#7a2a0c" : "#15141a");
      escarcha.material.opacity = e.hechos.vaho ? 0.06 : fuego ? 0.55 : 0.88;
      puertaTaq.rotation.y = e.hechos.taquilla ? 1.9 : 0;
      candado.visible = !e.hechos.taquilla;
      dentroTaq.visible = !e.hechos.taquilla;
      bisagra.rotation.y = e.hechos.cavado ? -1.75 : 0;
      montonNieve.scale.set(e.hechos.cavado ? 1.7 : 1.3, e.hechos.cavado ? 0.55 : 0.35, e.hechos.cavado ? 1.2 : 0.7);
      mochila.visible = !!e.hechos.mochila;
      led.material.color.set(e.hechos.radio ? "#7dff8a" : "#5a2020");
      morseLuz = !!e.hechos.radio && !e.hechos.fin;
      if (!morseLuz) destello.visible = false;
      ambiente.color.set(fuego ? "#ffd9b0" : "#9fb4d8");
      ambiente.intensity = fuego ? 1 : 0.8;
      luzFuego.intensity = fuego ? 1.5 : 0;
      luzFuego.castShadow = fuego;
      renderer.shadowMap.needsUpdate = true;
      pedir();
    }
    function temperatura(t) { // -12..19 ºC
      mercurio.scale.y = limitar((t + 15) / 36, 0.05, 1);
    }
    function amanecer() {
      final = performance.now();
      fondoMat.map = cielos[1];
      fondoMat.needsUpdate = true;
      escena.background.set("#f2b7bc");
      muroNieve.visible = false;
      montonNieve.scale.set(1.2, 0.25, 0.6);
      destello.visible = false;
      morseLuz = false;
      copos.visible = false;
      sol.intensity = 1.1;
      renderer.shadowMap.needsUpdate = true;
      luna.intensity = 0;
      pedir();
    }

    // ---------- Cámara y controles ----------
    function medir() {
      const w = lienzo.clientWidth, h = lienzo.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.shadowMap.needsUpdate = true;
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
      pedir();
    }
    function mirarA(obj, bajar) {
      const p = new T.Vector3();
      obj.getWorldPosition(p);
      if (obj === puerta) p.y = 1.0;
      const d = p.sub(camara.position);
      let yaw = Math.atan2(-d.x, -d.z);
      while (yaw - vista.yaw > Math.PI) yaw -= 2 * Math.PI;
      while (yaw - vista.yaw < -Math.PI) yaw += 2 * Math.PI;
      objetivo.yaw = yaw;
      objetivo.pitch = limitar(Math.atan2(d.y, Math.hypot(d.x, d.z)) - (bajar ? 0.3 : 0), -0.9, 0.5);
      objetivo.fov = bajar ? 52 : 72;
      pedir();
    }
    function soltar() { objetivo.fov = 72; objetivo.pitch = limitar(objetivo.pitch + 0.25, -0.55, 0.4); pedir(); }

    const dedos = new Map();
    let movido = 0, bloqueado = false;
    lienzo.addEventListener("pointerdown", (e) => {
      dedos.set(e.pointerId, [e.clientX, e.clientY]);
      movido = 0;
      try { lienzo.setPointerCapture(e.pointerId); } catch {}
    });
    lienzo.addEventListener("pointermove", (e) => {
      const p = dedos.get(e.pointerId);
      if (!p || bloqueado) return;
      const dx = e.clientX - p[0], dy = e.clientY - p[1];
      dedos.set(e.pointerId, [e.clientX, e.clientY]);
      movido += Math.abs(dx) + Math.abs(dy);
      const k = (objetivo.fov / 72) * 2.4 / Math.max(300, lienzo.clientWidth);
      objetivo.yaw += dx * k;
      objetivo.pitch = limitar(objetivo.pitch + dy * k, -0.55, 0.4);
      vista.yaw = objetivo.yaw;
      vista.pitch = objetivo.pitch;
      pedir();
    });
    const fin = (e) => {
      if (!dedos.has(e.pointerId)) return;
      dedos.delete(e.pointerId);
      if (e.type === "pointerup" && movido < 10 && !bloqueado) tocar(e);
    };
    lienzo.addEventListener("pointerup", fin);
    lienzo.addEventListener("pointercancel", fin);
    const rayo = new T.Raycaster(), raton = new T.Vector2();
    function tocar(e) {
      const r = lienzo.getBoundingClientRect();
      raton.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      rayo.setFromCamera(raton, camara);
      const golpe = rayo.intersectObjects(tocables.filter((g) => g.visible), true)[0];
      if (!golpe || golpe.distance > 7) return;
      let o = golpe.object;
      while (o && !o.userData.id) o = o.parent;
      if (o) alTocar(o.userData.id, o);
    }

    // ---------- Bucle ----------
    function pedir() { if (!pedido && !cerrado) pedido = requestAnimationFrame(cuadro); }
    function cuadro() {
      pedido = 0;
      if (cerrado) return;
      const dt = Math.min(reloj.getDelta(), 0.1), t = reloj.elapsedTime;
      const s = 1 - Math.pow(0.0015, dt);
      vista.yaw += (objetivo.yaw - vista.yaw) * s;
      vista.pitch += (objetivo.pitch - vista.pitch) * s;
      vista.fov += (objetivo.fov - vista.fov) * s;
      camara.rotation.y = vista.yaw;
      camara.rotation.x = vista.pitch;
      if (Math.abs(camara.fov - vista.fov) > 0.01) { camara.fov = vista.fov; camara.updateProjectionMatrix(); }
      if (copos.visible) {
        for (let i = 0; i < COPOS; i++) {
          posCopos[i * 3 + 1] -= dt * (0.6 + (i % 5) * 0.15);
          posCopos[i * 3] += Math.sin(t + i) * dt * 0.3;
          if (posCopos[i * 3 + 1] < 0) copoAzar(i, 5);
        }
        geoCopos.attributes.position.needsUpdate = true;
      }
      if (fuego) {
        luzFuego.intensity = 1.3 + Math.sin(t * 13) * 0.15 + Math.sin(t * 7.3) * 0.15;
        llamas.children.forEach((f, i) => { f.scale.y = 0.8 + Math.abs(Math.sin(t * (6 + i * 2.3))) * 0.45; });
      }
      vidrio.material.color.setHSL(0.09, 1, 0.7 + Math.sin(t * 9) * 0.03);
      if (morseLuz) destello.visible = !!crearSala.destello;
      if (final) {
        const k = limitar((performance.now() - final) / 2500, 0, 1);
        bisagra.rotation.y = -1.75 - k * 0.3;
        if (k < 1) renderer.shadowMap.needsUpdate = true;
        ambiente.intensity = 1 + k * 0.4;
      }
      renderer.render(escena, camara);
      pedir();
    }
    medir();
    pedir();

    return {
      medir, aplicar, temperatura, amanecer, mirarA, soltar,
      bloquear(b) { bloqueado = b; },
      objeto: (id) => tocables.find((g) => g.userData.id === id),
      cerrar() {
        cerrado = true;
        cancelAnimationFrame(pedido);
        renderer.dispose();
        escena.traverse((o) => { o.geometry?.dispose(); });
        for (const m of mats.values()) m.dispose();
        cielos.forEach((c) => c.dispose());
        renderer.forceContextLoss?.();
      },
    };
  }

  // ---------- El juego ----------
  function montar(contenedor, datos) {
    const C = datos.codigos;
    const sonidos = crearSonidos();
    let cerrado = false, sala = null, fotoUrl = null, morseCorriendo = 0, panelAbierto = "";
    const nuevo = () => ({ inv: [], hechos: {}, pistas: [], temp: 4, empezado: false });
    let e = nuevo();
    try {
      const g = JSON.parse(localStorage.getItem(PARTIDA));
      if (g && Array.isArray(g.inv) && g.hechos && Array.isArray(g.pistas) && Number.isFinite(g.temp)) e = g;
    } catch {}
    const guardar = () => { try { localStorage.setItem(PARTIDA, JSON.stringify(e)); } catch {} };

    const raiz = document.createElement("div");
    raiz.className = "refugio";
    raiz.innerHTML = `
      <div class="ref-escena">
        <canvas aria-label="El refugio. Desliza para mirar alrededor y toca los objetos"></canvas>
        <div class="ref-frio" aria-hidden="true"></div>
        <div class="ref-arriba">
          <span class="ref-temp" role="status"></span>
          <button type="button" class="ref-pista"></button>
        </div>
        <p class="ref-aviso" role="status" hidden></p>
        <section class="ref-panel" hidden aria-live="polite"></section>
      </div>
      <div class="ref-inventario" aria-label="Mochila"></div>`;
    contenedor.append(raiz);
    const q = (s) => raiz.querySelector(s);
    const panel = q(".ref-panel"), aviso = q(".ref-aviso"), inventario = q(".ref-inventario");

    // ---------- Etapas y pistas ----------
    function etapa() {
      const h = e.hechos;
      if (!h.fuego) return !h.botiquin ? "botiquin" : !e.inv.includes("lena") && !h.lenaDentro ? "lena" : "estufa";
      if (!h.vaho) return "vaho";
      if (!h.taquilla) return "taquilla";
      if (!h.cavado) return "puerta";
      if (!h.mochila) return "arva";
      if (!h.mochilaAbierta) return "mochila";
      if (!h.radio) return "pilas";
      if (!h.morse) return "morse";
      if (!h.fin) return "frecuencia";
      return "";
    }
    function pintarArriba() {
      const t = Math.round(e.temp);
      q(".ref-temp").textContent = `🌡 ${t} °C`;
      q(".ref-frio").style.opacity = limitar((6 - e.temp) / 18, 0, 0.85);
      const quedan = PISTAS - e.pistas.length;
      const b = q(".ref-pista");
      b.innerHTML = `Pista <span aria-hidden="true">${"●".repeat(quedan)}<i>${"●".repeat(PISTAS - quedan)}</i></span>`;
      b.setAttribute("aria-label", `Pedir pista. Quedan ${quedan}`);
      sala?.temperatura(e.temp);
    }
    function pintarInventario() {
      inventario.innerHTML = e.inv.length ? "" : '<p>Aquí irá lo que encuentres</p>';
      for (const id of e.inv) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ref-obj";
        b.innerHTML = `${ICONOS[id]}<span>${OBJETOS[id]}</span>`;
        b.addEventListener("click", () => { sonidos.activar(); if (id === "tabla") abrirPanel("tabla"); else avisar(`${OBJETOS[id]}: tócalo dentro de un objeto para usarlo.`); });
        inventario.append(b);
      }
    }
    let avisoT = 0;
    function avisar(texto, ms = 2600) {
      aviso.textContent = texto;
      aviso.hidden = false;
      clearTimeout(avisoT);
      avisoT = setTimeout(() => { aviso.hidden = true; }, ms);
    }
    function coger(...ids) {
      for (const id of ids) if (!e.inv.includes(id)) e.inv.push(id);
      sonidos.coger();
      guardar();
      pintarInventario();
      sala?.aplicar(e);
      avisar(`Has cogido: ${ids.map((i) => OBJETOS[i].toLowerCase()).join(" y ")}`);
    }
    function gastar(id) { e.inv = e.inv.filter((x) => x !== id); pintarInventario(); }
    function hecho(clave) { e.hechos[clave] = true; guardar(); sala?.aplicar(e); }

    // ---------- Paneles ----------
    function cerrarPanel() {
      if (!panelAbierto) return;
      panelAbierto = "";
      panel.hidden = true;
      panel.innerHTML = "";
      clearTimeout(morseCorriendo);
      morseCorriendo = 0;
      sonidos.morse(false);
      crearSala.destello = false;
      sala?.bloquear(false);
      sala?.soltar();
    }
    // Botones para usar objetos del inventario aquí
    function usar(lista, alUsar) {
      const utiles = e.inv.filter((i) => i !== "tabla");
      if (!utiles.length) return '<p class="ref-nota">No llevas nada que puedas usar aquí.</p>';
      setTimeout(() => panel.querySelectorAll("[data-usar]").forEach((b) => b.addEventListener("click", () => {
        sonidos.activar();
        const id = b.dataset.usar;
        if (lista.includes(id)) alUsar(id); else { sonidos.mal(); avisar("Eso aquí no sirve."); }
      })));
      return `<p class="ref-nota">Usar:</p><div class="ref-usar">${utiles.map((i) => `<button type="button" data-usar="${i}">${ICONOS[i]}<span>${OBJETOS[i]}</span></button>`).join("")}</div>`;
    }
    function candado(codigo, letras, alAbrir) {
      const abc = letras ? "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" : "0123456789";
      const v = Array.from(codigo, () => 0);
      const html = `<div class="ref-candado ${letras ? "letras" : ""}">${v.map((_, i) => `<div><button type="button" data-i="${i}" data-d="1" aria-label="Siguiente">▲</button><b>${abc[0]}</b><button type="button" data-i="${i}" data-d="-1" aria-label="Anterior">▼</button></div>`).join("")}</div>`;
      setTimeout(() => {
        const ruedas = panel.querySelectorAll(".ref-candado b");
        panel.querySelectorAll(".ref-candado button").forEach((b) => b.addEventListener("click", () => {
          sonidos.activar();
          const i = +b.dataset.i;
          v[i] = (v[i] + +b.dataset.d + abc.length) % abc.length;
          ruedas[i].textContent = abc[v[i]];
          sonidos.rueda();
          if (v.map((x) => abc[x]).join("") === codigo) {
            panel.querySelector(".ref-candado").classList.add("abierto");
            setTimeout(() => { if (!cerrado) alAbrir(); }, 450);
          }
        }));
      });
      return html;
    }
    function abrirPanel(id) {
      if (cerrado || e.hechos.fin) return;
      clearTimeout(morseCorriendo);
      morseCorriendo = 0;
      sonidos.morse(false);
      crearSala.destello = false;
      panelAbierto = id;
      const obj = sala?.objeto(id);
      if (obj) sala.mirarA(obj, true);
      sala?.bloquear(true);
      const html = PANELES[id]?.();
      if (html == null) { cerrarPanel(); return; }
      panel.innerHTML = `<button type="button" class="ref-volver" aria-label="Volver a la sala">✕</button>${html}`;
      panel.hidden = false;
      panel.scrollTop = 0;
      panel.querySelector(".ref-volver").addEventListener("click", cerrarPanel);
    }
    const refrescar = () => { if (panelAbierto) abrirPanel(panelAbierto); };

    const PANELES = {
      libro: () => `<h3>Libro del refugio</h3><ol class="ref-libro">${datos.libro.map(([f, c, n]) => `<li><time>${f}</time><b>${c}</b>${n ? `<span>${n}</span>` : ""}</li>`).join("")}</ol><p class="ref-mano">${datos.nota}</p>`,
      tablon: () => `<h3>Nuestras cimas</h3><div class="ref-cimas">${datos.cimas.map(([n, a, s], i) => `<div class="${a === "?" ? "pendiente" : ""}" style="--g:${((i * 7) % 5 - 2) * 1.2}deg"><b>${n}</b><span>${a === "?" ? "? m" : `${Number(a).toLocaleString("es-ES")} m`}</span><small>${s}</small></div>`).join("")}</div>`,
      botiquin: () => {
        if (e.hechos.botiquin) return `<h3>Botiquín</h3><p>Vendas, una manta térmica y tiritas. Nada más de utilidad.</p>`;
        return `<h3>Botiquín</h3><p>Tiene un candado de 4 cifras.</p>${candado(C.botiquin, false, () => { sonidos.abrir(); hecho("botiquin"); coger("cerillas"); refrescar(); })}`;
      },
      cesta: () => {
        if (e.inv.includes("lena") || e.hechos.lenaDentro || e.hechos.fuego) return `<h3>Cesta de leña</h3><p>Ya no queda leña.</p>`;
        setTimeout(() => panel.querySelector(".ref-coger")?.addEventListener("click", () => { coger("lena"); refrescar(); }));
        return `<h3>Cesta de leña</h3><p>Troncos secos. Justo lo que necesita la estufa.</p><button type="button" class="boton ref-coger">Coger la leña</button>`;
      },
      estufa: () => {
        if (e.hechos.fuego) return `<h3>Estufa</h3><p>El fuego crepita. Por fin se está a gusto aquí dentro.</p>`;
        const dentro = e.hechos.lenaDentro;
        return `<h3>Estufa</h3><p>${dentro ? "La leña ya está dentro. Falta encenderla." : "Está fría y vacía."}</p>${usar(dentro ? ["cerillas"] : ["lena"], (id) => {
          gastar(id);
          if (id === "lena") { e.hechos.lenaDentro = true; guardar(); sonidos.toque(); avisar("Has metido la leña en la estufa."); }
          else { sonidos.encender(); hecho("fuego"); sonidos.fuego(true); sonidos.viento(0.4); avisar("¡Fuego! El refugio empieza a calentarse.", 3200); }
          refrescar();
        })}`;
      },
      ventana: () => {
        if (!e.hechos.fuego) return `<h3>Ventana</h3><p>El cristal está cubierto de hielo por dentro. Con este frío no se ve nada.</p>`;
        if (!e.hechos.vaho) { setTimeout(montarVaho); return `<h3>Ventana</h3><p>Con el calor, el hielo se ha convertido en vaho. Parece que hay algo escrito…</p><canvas class="ref-vaho" width="600" height="340" aria-label="Frota el cristal"></canvas>`; }
        const texto = `<div class="ref-cristal"><p>${datos.vaho.join("</p><p>")}</p></div>`;
        if (e.hechos.radio && !e.hechos.fin) { setTimeout(montarMorse); return `<h3>Ventana</h3><div class="ref-noche"><i class="ref-luz"></i></div><p class="ref-nota">Una luz parpadea a lo lejos:</p><p class="ref-signos" aria-live="off"></p>${texto}`; }
        return `<h3>Ventana</h3>${texto}<p class="ref-nota">Fuera sigue nevando.</p>`;
      },
      taquilla: () => {
        if (e.hechos.taquilla) return `<h3>Taquilla</h3><p>Vacía.</p>`;
        return `<h3>Taquilla</h3><p>Un candado de ${C.taquilla.length} letras.</p>${candado(C.taquilla, true, () => { sonidos.abrir(); hecho("taquilla"); coger("pala", "arva"); refrescar(); })}`;
      },
      puerta: () => {
        if (!e.hechos.cavado) return `<h3>Puerta</h3><p>No se abre: la nieve la tapa por fuera y se cuela por debajo.</p>${usar(["pala"], () => { sonidos.cavar(); gastar("pala"); hecho("cavado"); avisar("Abres la puerta y cavas: solo hay un muro de nieve."); refrescar(); })}`;
        if (!e.hechos.mochila) {
          const html = `<h3>Puerta</h3><p>Al otro lado hay un muro de nieve. Parece que algo quedó enterrado…</p>`;
          if (!e.inv.includes("arva")) return html;
          return html + usar(["arva"], () => abrirPanel("arva"));
        }
        return `<h3>Puerta</h3><p>Un muro de nieve. Por aquí no se puede salir: habrá que pedir rescate.</p>`;
      },
      arva: () => { setTimeout(montarArva); return `<h3>ARVA</h3><p class="ref-nota">Mueve el dedo por la nieve. Cuanto más cerca, más rápido pita.</p><div class="ref-arva"><canvas width="600" height="420"></canvas><b class="ref-dist">-- m</b></div><button type="button" class="boton ref-cavar">Cavar aquí</button>`; },
      mochila: () => {
        if (e.hechos.mochilaAbierta) return `<h3>Mochila de Alber</h3><p>Ropa mojada y una barrita aplastada.</p>`;
        return `<h3>Mochila</h3><p class="ref-mano">${datos.etiquetaMochila}</p>${candado(C.mochila, false, () => { sonidos.abrir(); hecho("mochilaAbierta"); coger("pilas", "tabla"); refrescar(); })}`;
      },
      radio: () => {
        const pegatina = `<p class="ref-pegatina">${datos.pegatina}</p>`;
        if (!e.hechos.radio) return `<h3>Radio</h3><p>No enciende: le faltan las pilas.</p>${pegatina}${usar(["pilas"], () => {
          gastar("pilas"); hecho("radio"); sonidos.estatica(1.8); avisar("La radio se enciende…", 2000); refrescar();
        })}`;
        return `<h3>Radio</h3><p class="ref-voz">${datos.radioPilas}</p>${pegatina}<p class="ref-nota">Frecuencia</p>${candado(C.radio, false, () => { hecho("fin"); rescate(); })}`;
      },
      tabla: () => `<h3>Tabla morse</h3><p class="ref-nota">Corto = punto · Largo = raya</p><div class="ref-tabla">${Object.entries(MORSE).map(([l, m]) => `<span><b>${l}</b>${m.replace(/\./g, "•").replace(/-/g, "—")}</span>`).join("")}</div>`,
      termometro: () => `<h3>Termómetro</h3><p>${e.temp < 0 ? "Bajo cero. Hay que encender la estufa cuanto antes." : e.hechos.fuego ? "Va subiendo. ¡Bien!" : "Hace frío y cada vez más."}</p>`,
      literas: () => `<h3>Literas</h3><p>Las mantas están heladas. Ni se te ocurra echarte una siesta ahora.</p>`,
      farol: () => `<h3>Farol</h3><p>Le queda poco aceite, pero da algo de luz.</p>`,
    };

    function montarVaho() {
      const c = panel.querySelector(".ref-vaho");
      if (!c) return;
      const x = c.getContext("2d"), W = c.width, H = c.height;
      x.fillStyle = "#d9e2ec";
      x.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 6 + Math.random() * 30, 0, 7); x.fill(); }
      x.globalCompositeOperation = "destination-out";
      let ultimo = null, limpio = false;
      const frotar = (ev) => {
        const r = c.getBoundingClientRect(), p = [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H];
        x.lineWidth = 56; x.lineCap = "round";
        x.beginPath(); x.moveTo(...(ultimo || p)); x.lineTo(...p); x.stroke();
        ultimo = p;
      };
      c.addEventListener("pointerdown", (ev) => { sonidos.activar(); ultimo = null; frotar(ev); try { c.setPointerCapture(ev.pointerId); } catch {} });
      c.addEventListener("pointermove", (ev) => { if (ev.buttons || ev.pointerType === "touch") frotar(ev); });
      c.addEventListener("pointerup", () => {
        ultimo = null;
        if (limpio) return;
        const d = x.getImageData(0, 0, W, H).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 64) if (d[i] < 40) n++;
        if (n / (d.length / 64) > 0.5) { limpio = true; sonidos.coger(); hecho("vaho"); refrescar(); }
      });
      c.style.backgroundImage = "none";
      c.insertAdjacentHTML("beforebegin", `<div class="ref-tras"><div class="ref-cristal"><p>${datos.vaho.join("</p><p>")}</p></div></div>`);
      const tras = panel.querySelector(".ref-tras");
      tras.append(c);
    }

    function montarMorse() {
      const luz = panel.querySelector(".ref-luz"), signos = panel.querySelector(".ref-signos");
      if (!luz) return;
      const U = 260, pasos = [];
      for (const [i, l] of [...C.morse].entries()) {
        for (const [j, s] of [...MORSE[l]].entries()) { pasos.push([true, s === "." ? U : 3 * U, s]); pasos.push([false, j === MORSE[l].length - 1 ? 3 * U : U, j === MORSE[l].length - 1 ? " " : ""]); }
        if (i === C.morse.length - 1) pasos.push([false, 8 * U, "fin"]);
      }
      let k = 0;
      signos.textContent = "";
      const paso = () => {
        if (cerrado || panelAbierto !== "ventana") return;
        const [on, dura, s] = pasos[k];
        luz.classList.toggle("on", on);
        crearSala.destello = on;
        sonidos.morse(on);
        if (on) signos.textContent += s === "." ? "•" : "—";
        else if (s === " ") signos.textContent += "  ";
        else if (s === "fin") { signos.textContent += "   ⟲"; if (!e.hechos.morse) hecho("morse"); }
        k = (k + 1) % pasos.length;
        if (k === 0) setTimeout(() => { if (panelAbierto === "ventana") signos.textContent = ""; }, dura - 20);
        morseCorriendo = setTimeout(paso, dura);
      };
      morseCorriendo = setTimeout(paso, 600);
    }

    function montarArva() {
      const c = panel.querySelector(".ref-arva canvas"), dist = panel.querySelector(".ref-dist"), cavar = panel.querySelector(".ref-cavar");
      if (!c) return;
      const x = c.getContext("2d"), W = c.width, H = c.height, ANCHO = 20; // metros
      const meta = [W * (0.2 + Math.random() * 0.6), H * (0.25 + Math.random() * 0.55)];
      let yo = null, siguiente = 0, agujeros = [];
      function pintar() {
        x.fillStyle = "#eef3fa"; x.fillRect(0, 0, W, H);
        x.fillStyle = "#dbe4f0";
        for (let i = 0; i < 18; i++) { x.beginPath(); x.ellipse((i * 137) % W, (i * 89) % H, 60, 18, 0, 0, 7); x.fill(); }
        for (const a of agujeros) { x.fillStyle = "#b9c6d8"; x.beginPath(); x.ellipse(a[0], a[1], 22, 12, 0, 0, 7); x.fill(); }
        if (yo) { x.fillStyle = "#e3a23c"; x.strokeStyle = "#26233f"; x.lineWidth = 4; x.beginPath(); x.roundRect?.(yo[0] - 16, yo[1] - 24, 32, 48, 8); if (!x.roundRect) x.rect(yo[0] - 16, yo[1] - 24, 32, 48); x.fill(); x.stroke(); }
      }
      const metros = () => yo ? Math.hypot(yo[0] - meta[0], yo[1] - meta[1]) / W * ANCHO : 99;
      function mover(ev) {
        const r = c.getBoundingClientRect();
        yo = [(ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H];
        const m = metros();
        dist.textContent = `${m.toFixed(1).replace(".", ",")} m`;
        pintar();
      }
      const latido = () => {
        if (cerrado || panelAbierto !== "arva") return;
        if (yo && performance.now() > siguiente) { sonidos.pitido(); dist.classList.add("pita"); setTimeout(() => dist.classList.remove("pita"), 70); siguiente = performance.now() + limitar(90 + metros() * 70, 120, 1300); }
        morseCorriendo = setTimeout(latido, 40);
      };
      c.addEventListener("pointerdown", (ev) => { sonidos.activar(); mover(ev); try { c.setPointerCapture(ev.pointerId); } catch {} });
      c.addEventListener("pointermove", (ev) => { if (ev.buttons || ev.pointerType === "touch") mover(ev); });
      cavar.addEventListener("click", () => {
        sonidos.activar();
        if (!yo) return avisar("Primero mueve el ARVA por la nieve.");
        sonidos.cavar();
        if (metros() < 1.5) {
          gastar("arva"); hecho("mochila");
          avisar("¡Has encontrado la mochila de Alber!", 3000);
          sonidos.coger();
          cerrarPanel();
          setTimeout(() => { if (!cerrado) abrirPanel("mochila"); }, 700);
        } else { agujeros.push(yo); pintar(); avisar(`Aquí no hay nada. Marca ${metros().toFixed(1).replace(".", ",")} m.`); }
      });
      pintar();
      latido();
    }

    // ---------- Final ----------
    async function rescate() {
      sonidos.ganar();
      panel.innerHTML = `<h3>Radio</h3><p class="ref-voz ref-rescate"></p>`;
      const voz = panel.querySelector(".ref-rescate");
      for (const ch of datos.rescate) { if (cerrado) return; voz.textContent += ch; await esperar(28); }
      await esperar(1300);
      if (cerrado) return;
      cerrarPanel();
      sonidos.fuego(false);
      sonidos.viento(0);
      const p = sala?.objeto("puerta");
      if (p) sala.mirarA(p, false);
      sala?.bloquear(true);
      sala?.amanecer();
      await esperar(3200);
      if (!cerrado) final();
    }
    function capa(clase, html) {
      raiz.querySelector(".esc-capa")?.remove();
      const d = document.createElement("div");
      d.className = `esc-capa ${clase}`;
      d.innerHTML = html;
      raiz.append(d);
      return (s) => d.querySelector(s);
    }
    function final() {
      const n = e.pistas.length;
      const b = capa("ref-final", `<h3>¡Rescatada!</h3><p>${n ? `Has salido del refugio usando ${n} ${n === 1 ? "pista" : "pistas"}.` : "Has salido del refugio sin pedir ninguna pista. ¡Toda una experta!"}</p><button type="button" class="boton">Abrir el regalo</button>`);
      sonidos.ganar();
      b(".boton").addEventListener("click", regalo);
    }
    function regalo() {
      let papel = "";
      const tonos = ["#f2b7bc", "#d6c5b5", "#b9bd94", "#fbf0e1", "#e6a79b", "#b4bfab", "#e3cf9f"];
      for (let i = 0; i < 36; i++) papel += `<i class="confeti" style="left:${(i * 37) % 100}%;background:${tonos[i % 7]};animation-delay:${(1.4 + (i % 9) * 0.16).toFixed(2)}s"></i>`;
      const b = capa("esc-regalo ref-regalo", `<div class="caja-regalo" aria-hidden="true"><i class="base"></i><i class="cinta"></i><i class="tapa"></i></div>
        ${papel}<figure class="ref-foto"><img alt="Tu regalo"><figcaption><strong>${datos.regalo.titulo}</strong><span>${datos.regalo.mensaje}</span></figcaption></figure>`);
      sonidos.ganar();
      const img = b("img");
      img.style.visibility = "hidden";
      Cifrado.imagen(CARPETA + "regalo").then((u) => {
        if (cerrado) return URL.revokeObjectURL(u);
        fotoUrl = u;
        img.src = u;
        img.style.visibility = "";
      }).catch(() => { b("figcaption span").textContent += " (No se ha podido cargar la foto: comprueba la conexión y vuelve a abrir la caja.)"; });
    }

    // ---------- Portada ----------
    function portada() {
      const b = capa("ref-portada", `<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M8 92 60 30l52 62Z" fill="#fbf0e1"/><path d="M28 92V60l32-24 32 24v32Z" fill="#8a5a3b"/><path d="M20 64 60 32l40 32" stroke="#fbf0e1" stroke-width="8" fill="none" stroke-linejoin="round"/><rect x="52" y="70" width="16" height="22" fill="#4f2e1c"/><rect x="34" y="66" width="12" height="10" fill="#ffd59a"/><rect x="74" y="66" width="12" height="10" fill="#ffd59a"/><path d="M0 92h120v8H0z" fill="#eef3fa"/></svg>
        <h3>${datos.titulo}</h3><p>${datos.intro}</p>
        <p class="ref-como">Desliza el dedo para mirar alrededor y toca los objetos. Tienes ${PISTAS} pistas por si te atascas.</p>
        <button type="button" class="boton">${e.empezado ? "Seguir" : "Empezar"}</button>
        ${e.empezado ? '<button type="button" class="secundario">Empezar de nuevo</button>' : ""}`);
      b(".boton").addEventListener("click", () => empezar(false));
      b(".secundario")?.addEventListener("click", () => empezar(true));
    }
    let frio = 0, ticks = 0;
    function empezar(deNuevo) {
      sonidos.activar();
      if (deNuevo) e = nuevo();
      e.empezado = true;
      guardar();
      raiz.querySelector(".esc-capa")?.remove();
      sala?.aplicar(e);
      pintarInventario();
      pintarArriba();
      if (e.hechos.fin) return final();
      sonidos.viento(e.hechos.fuego ? 0.4 : 1);
      sonidos.fuego(!!e.hechos.fuego);
      clearInterval(frio);
      frio = setInterval(() => {
        if (cerrado || e.hechos.fin) return;
        e.temp = e.hechos.fuego ? Math.min(19, e.temp + 0.25) : Math.max(-12, e.temp - 1 / 25);
        pintarArriba();
        if (++ticks % 5 === 0) guardar();
      }, 1000);
      if (!e.hechos.fuego && e.inv.length === 0 && !e.hechos.botiquin) avisar("Brrr… Hace un frío que pela. Echa un vistazo a la mesa.", 4000);
    }

    q(".ref-pista").addEventListener("click", () => {
      sonidos.activar();
      const k = etapa();
      if (!k) return;
      if (!e.pistas.includes(k)) {
        if (e.pistas.length >= PISTAS) return avisar("Ya no te quedan pistas. ¡Tú puedes!");
        e.pistas.push(k);
        guardar();
        pintarArriba();
      }
      cerrarPanel();
      panelAbierto = "pista";
      panel.innerHTML = `<button type="button" class="ref-volver" aria-label="Cerrar la pista">✕</button><h3>Pista</h3><p>${datos.pistas[k]}</p>`;
      panel.hidden = false;
      panel.querySelector(".ref-volver").addEventListener("click", () => { panelAbierto = "pista"; cerrarPanel(); });
    });

    // 3D
    const lienzo = q("canvas");
    let observador = null;
    cargarThree().then(() => {
      if (cerrado) return;
      try {
        sala = crearSala(lienzo, (id) => {
          sonidos.activar();
          sonidos.toque();
          if (id === "puerta" && e.hechos.cavado && !e.hechos.mochila && e.inv.includes("arva")) return abrirPanel("arva");
          abrirPanel(id);
        });
      } catch (err) {
        console.error(err);
        avisar("Este móvil no puede mostrar el 3D. Prueba a abrir la caja en otro navegador.", 9000);
        return;
      }
      sala.aplicar(e);
      sala.temperatura(e.temp);
      if (e.hechos.fin) sala.amanecer();
      observador = new ResizeObserver(() => sala.medir());
      observador.observe(lienzo);
    }).catch(() => {
      avisar("No se ha podido cargar el refugio. Comprueba la conexión y vuelve a abrir la caja.", 9000);
    });
    pintarArriba();
    pintarInventario();
    portada();

    const terminar = () => {
      cerrado = true;
      clearInterval(frio);
      clearTimeout(morseCorriendo);
      clearTimeout(avisoT);
      observador?.disconnect();
      guardar();
      sala?.cerrar();
      sonidos.cerrar();
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    };
    if (location.hostname === "localhost") window.refugioPruebas = { abrirPanel, estado: () => e };
    // Pruebas: resuelve el paso actual
    terminar.adelantar = () => {
      sonidos.activar();
      if (!e.empezado || raiz.querySelector(".ref-portada")) return empezar(false);
      if (raiz.querySelector(".ref-final")) return regalo();
      const h = e.hechos;
      cerrarPanel();
      switch (etapa()) {
        case "botiquin": hecho("botiquin"); coger("cerillas"); break;
        case "lena": coger("lena"); break;
        case "estufa": gastar("lena"); gastar("cerillas"); h.lenaDentro = true; hecho("fuego"); sonidos.fuego(true); sonidos.viento(0.4); break;
        case "vaho": hecho("vaho"); break;
        case "taquilla": hecho("taquilla"); coger("pala", "arva"); break;
        case "puerta": gastar("pala"); hecho("cavado"); break;
        case "arva": gastar("arva"); hecho("mochila"); break;
        case "mochila": hecho("mochilaAbierta"); coger("pilas", "tabla"); break;
        case "pilas": gastar("pilas"); hecho("radio"); break;
        case "morse": hecho("morse"); abrirPanel("ventana"); break;
        case "frecuencia": hecho("fin"); rescate(); break;
      }
    };
    return terminar;
  }

  return function abrir(contenedor) {
    let cerrado = false, limpiar = null;
    const aviso = document.createElement("p");
    aviso.className = "cargando";
    aviso.textContent = "Cargando…";
    contenedor.append(aviso);
    cargarThree().catch(() => {}); // en paralelo con el descifrado
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
