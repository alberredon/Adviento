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

  // Paisaje de montañas: cielo, estrellas, crestas con nieve y sombra, bosque y nieve delante
  function pintarMontes(c, w, h, amanecer) {
    let sem = 11;
    const az = () => ((sem = (sem * 16807) % 2147483647) / 2147483647);
    const g = c.createLinearGradient(0, 0, 0, h * 0.75);
    if (amanecer) { g.addColorStop(0, "#4f74ad"); g.addColorStop(0.45, "#e9a3b4"); g.addColorStop(0.8, "#ffd59a"); }
    else { g.addColorStop(0, "#070b1a"); g.addColorStop(0.55, "#1b2647"); g.addColorStop(1, "#3c4b74"); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (!amanecer) {
      for (let i = 0; i < 160; i++) {
        const x = az() * w, y = az() * h * 0.55, r = az() < 0.9 ? 0.6 + az() * 0.8 : 1.6;
        c.fillStyle = `rgba(255,255,255,${0.3 + az() * 0.6})`;
        c.beginPath(); c.arc(x, y, r * w / 600, 0, 7); c.fill();
      }
      const lx = w * 0.82, ly = h * 0.16, lr = w * 0.028, halo = c.createRadialGradient(lx, ly, lr, lx, ly, lr * 5);
      halo.addColorStop(0, "rgba(220,230,255,.35)"); halo.addColorStop(1, "rgba(220,230,255,0)");
      c.fillStyle = halo; c.fillRect(lx - lr * 5, ly - lr * 5, lr * 10, lr * 10);
      c.fillStyle = "#eef2ff"; c.beginPath(); c.arc(lx, ly, lr, 0, 7); c.fill();
      c.fillStyle = "rgba(160,170,200,.35)"; c.beginPath(); c.arc(lx - lr * 0.3, ly + lr * 0.2, lr * 0.25, 0, 7); c.arc(lx + lr * 0.35, ly - lr * 0.3, lr * 0.18, 0, 7); c.fill();
    } else {
      const sx = w * 0.62, sy = h * 0.58, halo = c.createRadialGradient(sx, sy, 0, sx, sy, w * 0.25);
      halo.addColorStop(0, "rgba(255,240,200,.9)"); halo.addColorStop(1, "rgba(255,220,160,0)");
      c.fillStyle = halo; c.fillRect(0, 0, w, h);
    }
    // Cresta por desplazamiento del punto medio
    function cresta(base, altura, rugosidad) {
      // Picos y collados alternos, luego detalle fractal
      const tramos = 6;
      let p = Array.from({ length: tramos + 1 }, (_, i) => [(i + (i && i < tramos ? (az() - 0.5) * 0.5 : 0)) * w / tramos, base - (i % 2 ? altura * (0.65 + az() * 0.35) : altura * az() * 0.3)]);
      for (let paso = 0; paso < 6; paso++) {
        const n = [p[0]];
        for (let i = 1; i < p.length; i++) {
          const [x0, y0] = p[i - 1], [x1, y1] = p[i];
          n.push([(x0 + x1) / 2, (y0 + y1) / 2 - (az() - 0.5) * altura * 0.35 * Math.pow(rugosidad, paso)], p[i]);
        }
        p = n;
      }
      return p.map(([x, y]) => [x, Math.min(y, base + altura * 0.15)]);
    }
    const capas = amanecer
      ? [[0.6, 0.32, "#9aa8cc", "#fbeef0"], [0.68, 0.24, "#6f7ea6", "#fff7ee"], [0.76, 0.16, "#4e5c80", "#ffffff"]]
      : [[0.6, 0.32, "#2c3858", "#9fb0d4"], [0.68, 0.24, "#222c47", "#b8c6e4"], [0.76, 0.16, "#161d33", "#cfd9ef"]];
    for (const [k, [b, a, roca, nieve]] of capas.entries()) {
      const p = cresta(h * b, h * a, 0.55);
      const camino = new Path2D();
      camino.moveTo(0, h);
      p.forEach(([x, y]) => camino.lineTo(x, y));
      camino.lineTo(w, h);
      c.fillStyle = roca; c.fill(camino);
      c.save(); c.clip(camino);
      // Nieve en las cumbres
      const cima = Math.min(...p.map((q) => q[1]));
      const gn = c.createLinearGradient(0, cima, 0, cima + h * a * 0.7);
      gn.addColorStop(0, nieve); gn.addColorStop(0.7, nieve + "aa"); gn.addColorStop(1, nieve + "00");
      c.fillStyle = gn;
      c.beginPath(); c.moveTo(0, cima + h * a * 0.7);
      p.forEach(([x, y]) => c.lineTo(x, y + h * 0.02 + az() * h * 0.03));
      c.lineTo(w, cima + h * a * 0.7); c.lineTo(w, 0); c.lineTo(0, 0); c.fill();
      // Laderas en sombra: del pico al valle siguiente
      c.fillStyle = `rgba(10,14,30,${0.22 + k * 0.05})`;
      for (let i = 2; i < p.length - 2; i++) {
        if (p[i][1] < p[i - 2][1] && p[i][1] < p[i + 2][1]) {
          let j = i + 1;
          while (j < p.length - 1 && p[j + 1][1] >= p[j][1]) j++;
          c.beginPath(); c.moveTo(...p[i]);
          for (let m = i + 1; m <= j; m++) c.lineTo(...p[m]);
          const hondo = h * a * 0.9;
          c.lineTo(p[j][0] - (p[j][0] - p[i][0]) * 0.3, p[j][1] + hondo * 0.5); c.lineTo(p[i][0] + (p[j][0] - p[i][0]) * 0.15, p[i][1] + hondo); c.fill();
        }
      }
      c.restore();
    }
    // Bosque de abetos y nieve delante
    c.fillStyle = amanecer ? "#3d4a5c" : "#0d1322";
    for (let i = 0; i < 40; i++) {
      const x = az() * w, base = h * (0.78 + az() * 0.04), alto = h * (0.04 + az() * 0.05), ancho = alto * 0.35;
      c.beginPath(); c.moveTo(x, base - alto); c.lineTo(x - ancho, base); c.lineTo(x + ancho, base); c.fill();
    }
    const gs = c.createLinearGradient(0, h * 0.8, 0, h);
    gs.addColorStop(0, amanecer ? "#fff8f0" : "#8d9cc0"); gs.addColorStop(1, amanecer ? "#e8ecf6" : "#56648a");
    c.fillStyle = gs;
    c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 12) c.lineTo(x, h * 0.81 + Math.sin(x / w * 9) * h * 0.012);
    c.lineTo(w, h); c.fill();
  }
  // Destello de linterna con halo y rayos
  function pintarDestello(c, x, y, tam) {
    const g = c.createRadialGradient(x, y, 0, x, y, tam);
    g.addColorStop(0, "rgba(255,255,240,1)"); g.addColorStop(0.15, "rgba(255,244,190,.95)"); g.addColorStop(0.45, "rgba(255,220,120,.35)"); g.addColorStop(1, "rgba(255,200,90,0)");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, tam, 0, 7); c.fill();
    c.strokeStyle = "rgba(255,240,190,.5)"; c.lineWidth = tam * 0.04;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(x - Math.cos(a) * tam * 1.3, y - Math.sin(a) * tam * 1.3); c.lineTo(x + Math.cos(a) * tam * 1.3, y + Math.sin(a) * tam * 1.3); c.stroke(); }
  }

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
  function crearSala(lienzo, alTocar, cimas = []) {
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
    const vista = { yaw: 0, pitch: -0.08, fov: 72 };
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
      const m = new T.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.012, roughness: 0.9, metalness: 0, ...extra });
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
          const x0 = i * a, tono = 0.9 + azar() * 0.18;
          const g = c.createLinearGradient(x0, 0, x0 + a, 0);
          g.addColorStop(0, mezcla(base, tono * 0.86));
          g.addColorStop(0.18, mezcla(base, tono));
          g.addColorStop(0.82, mezcla(base, tono * 1.02));
          g.addColorStop(1, mezcla(base, tono * 0.84));
          c.fillStyle = g;
          c.fillRect(x0, 0, a, h);
          // Vetas finas que ondulan juntas
          const fase = azar() * 9, onda = 3 + azar() * 6;
          for (let k = 0; k < 46; k++) {
            const xv = x0 + 3 + azar() * (a - 6), amp = onda * (0.6 + azar() * 0.6);
            const oscura = azar() < 0.7;
            c.strokeStyle = oscura ? `rgba(55,30,15,${0.05 + azar() * 0.1})` : `rgba(255,228,190,${0.04 + azar() * 0.07})`;
            c.lineWidth = 0.5 + azar() * (oscura ? 1.8 : 1);
            c.beginPath();
            for (let y = -8; y <= h + 8; y += 8) c.lineTo(limitar(xv + Math.sin(y / 70 + fase) * amp + Math.sin(y / 23 + k) * 0.8, x0 + 1, x0 + a - 1), y);
            c.stroke();
          }
          // Nudo con vetas que lo rodean
          if (azar() < 0.3) {
            const x = x0 + a * (0.3 + azar() * 0.4), y = azar() * h;
            for (let k = 7; k > 0; k--) {
              c.strokeStyle = `rgba(60,32,15,${0.1 + 0.05 * (7 - k)})`;
              c.lineWidth = 1.2;
              c.beginPath(); c.ellipse(x, y, k * 2, k * 5.5, 0, 0, 7); c.stroke();
            }
            c.fillStyle = "rgba(50,25,12,.7)"; c.beginPath(); c.ellipse(x, y, 2.5, 5, 0, 0, 7); c.fill();
          }
          // Poro
          for (let k = 0; k < 220; k++) { c.fillStyle = `rgba(40,20,8,${azar() * 0.12})`; c.fillRect(x0 + azar() * a, azar() * h, 1, 2 + azar() * 4); }
          // Junta entre tablas y clavos
          c.fillStyle = linea;
          c.fillRect(x0, 0, 2.5, h);
          c.fillStyle = "rgba(255,255,255,.07)";
          c.fillRect(x0 + 2.5, 0, 1.5, h);
          for (const y of [h * 0.12, h * 0.88]) { c.fillStyle = "rgba(30,25,22,.75)"; c.beginPath(); c.arc(x0 + a / 2, y, 2.2, 0, 7); c.fill(); }
        }
      });
    }
    function corteza() {
      return textura(256, 256, (c, w, h) => {
        c.fillStyle = "#4a3324"; c.fillRect(0, 0, w, h);
        for (let k = 0; k < 90; k++) {
          const x = azar() * w, alto = 20 + azar() * 70;
          c.fillStyle = mezcla(["#5c4130", "#3a281c", "#6e5241", "#2c1f16"][Math.floor(azar() * 4)], 1);
          c.fillRect(x, azar() * h, 3 + azar() * 7, alto);
        }
        for (let k = 0; k < 400; k++) { c.fillStyle = `rgba(${azar() < 0.5 ? "0,0,0" : "180,160,130"},${azar() * 0.2})`; c.fillRect(azar() * w, azar() * h, 2, 2); }
      });
    }
    function anillos() {
      return textura(128, 128, (c, w, h) => {
        c.fillStyle = "#c79a68"; c.fillRect(0, 0, w, h);
        for (let k = 14; k > 0; k--) { c.strokeStyle = `rgba(110,65,30,${0.25 + azar() * 0.25})`; c.lineWidth = 1 + azar() * 1.5; c.beginPath(); c.arc(64 + azar() * 3, 64 + azar() * 3, k * 4.3, 0, 7); c.stroke(); }
        c.strokeStyle = "#4a3324"; c.lineWidth = 8; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.stroke();
      });
    }
    function lona(color) {
      return textura(256, 256, (c, w, h) => {
        c.fillStyle = color; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 2) for (let x = (y / 2) % 2 * 2; x < w; x += 4) { c.fillStyle = `rgba(255,255,255,${0.025 + azar() * 0.03})`; c.fillRect(x, y, 2, 1); }
        for (let k = 0; k < 300; k++) { c.fillStyle = `rgba(0,0,0,${azar() * 0.25})`; c.fillRect(azar() * w, azar() * h, 2, 1); }
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
    for (const [w, d, x, z] of [[2 * R, 0.16, 0, R - 0.08], [0.16, 2 * R, -R + 0.08, 0], [2.95, 0.16, -2.025, -R + 0.08], [2.95, 0.16, 2.025, -R + 0.08], [0.16, 2.3, R - 0.08, -2.35], [0.16, 3.3, R - 0.08, 1.85], [0.16, 1.4, R - 0.08, -0.5]]) caja(w, 0.7, d, conTextura(texPiedra, [Math.max(w, d) / 2.2, 0.7]), x, 0.35, z);

    // Exterior: cielo y montañas, por la ventana y por la puerta
    function pintarCielo(c, w, h, amanecer) { pintarMontes(c, w, h, amanecer); }
    const cielos = [false, true].map((a) => textura(2048, 1024, (c, w, h) => pintarCielo(c, w, h, a)));
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
    const destello = new T.Sprite(new T.SpriteMaterial({
      map: textura(128, 128, (c) => pintarDestello(c, 64, 64, 46)), transparent: true, blending: T.AdditiveBlending, depthWrite: false,
    }));
    destello.scale.set(1.1, 1.1, 1);
    destello.position.set(8.4, 2.25, -1.1);
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

    // Cubo de madera con troncos
    const cesta = grupo("cesta", -1.45, 0, -3.0);
    const duelas = conTextura(tablas("#9b6a40", "#3a2414", 14, true), [2, 0.6], { side: T.DoubleSide });
    const cuerpoCubo = new T.Mesh(new T.CylinderGeometry(0.3, 0.25, 0.44, 28, 1, true), duelas);
    cuerpoCubo.position.y = 0.22;
    cesta.add(cuerpoCubo);
    cilindro(0.25, 0.25, 0.02, mueble, 0, 0.03, 0, cesta, 28);
    const metalCubo = mat("#3a3a40", { roughness: 0.45, metalness: 0.6 });
    for (const [y, rr] of [[0.07, 0.258], [0.37, 0.292]]) {
      const aro = new T.Mesh(new T.TorusGeometry(rr, 0.012, 6, 36), metalCubo);
      aro.rotation.x = Math.PI / 2;
      aro.position.y = y;
      cesta.add(aro);
    }
    const borde = new T.Mesh(new T.TorusGeometry(0.297, 0.014, 6, 36), mueble);
    borde.rotation.x = Math.PI / 2;
    borde.position.y = 0.44;
    cesta.add(borde);
    const asa = new T.Mesh(new T.TorusGeometry(0.29, 0.008, 6, 30, Math.PI), metalCubo);
    asa.position.y = 0.44;
    asa.rotation.y = 0.5;
    cesta.add(asa);
    const troncos = new T.Group();
    cesta.add(troncos);
    const matTronco = [conTextura(corteza(), [1, 1.5], { roughness: 1 }), conTextura(anillos(), [1, 1]), conTextura(anillos(), [1, 1])];
    for (const [x, z, r0, alto, inc, gir] of [[-0.1, -0.06, 0.055, 0.62, 0.16, 0.3], [0.09, -0.08, 0.06, 0.56, -0.12, 1.1], [0.02, 0.1, 0.05, 0.66, 0.08, 2.2], [-0.12, 0.09, 0.045, 0.5, 0.2, 3.9], [0.13, 0.08, 0.05, 0.58, -0.18, 5.1]]) {
      const t = new T.Mesh(new T.CylinderGeometry(r0, r0 * 1.05, alto, 10), matTronco);
      t.position.set(x, 0.04 + alto / 2, z);
      t.rotation.set(inc * Math.cos(gir), gir, inc * Math.sin(gir));
      troncos.add(t);
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
    llamas.visible = false;
    estufa.add(llamas);
    const lienzoFuego = document.createElement("canvas");
    lienzoFuego.width = 128; lienzoFuego.height = 112;
    const cf = lienzoFuego.getContext("2d");
    const texFuego = new T.CanvasTexture(lienzoFuego);
    const matFuego = new T.MeshBasicMaterial({ map: texFuego, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    const planoFuego = new T.Mesh(new T.PlaneGeometry(0.32, 0.28), matFuego);
    planoFuego.position.set(-0.37, 0.55, 0);
    planoFuego.rotation.y = -Math.PI / 2;
    llamas.add(planoFuego);
    const vidrioEstufa = new T.Mesh(new T.PlaneGeometry(0.32, 0.28), new T.MeshBasicMaterial({ color: "#ffb070", transparent: true, opacity: 0.08, depthWrite: false }));
    vidrioEstufa.position.set(-0.385, 0.55, 0);
    vidrioEstufa.rotation.y = -Math.PI / 2;
    estufa.add(vidrioEstufa);
    // Marco de la puertecilla
    for (const [h, d, y, z] of [[0.025, 0.36, 0.69, 0], [0.025, 0.36, 0.41, 0], [0.3, 0.025, 0.55, 0.17], [0.3, 0.025, 0.55, -0.17]]) caja(0.02, h, d, "#151418", -0.375, y, z, estufa);
    // Resplandor en el suelo
    const resplandor = new T.Mesh(new T.PlaneGeometry(2.2, 2.2), new T.MeshBasicMaterial({
      map: textura(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,140,50,.55)"); g.addColorStop(1, "rgba(255,120,40,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }),
      transparent: true, blending: T.AdditiveBlending, depthWrite: false,
    }));
    resplandor.rotation.x = -Math.PI / 2;
    resplandor.position.set(-0.8, 0.012, 0);
    llamas.add(resplandor);
    const chispas = Array.from({ length: 14 }, () => [azar() * 128, 112 * azar(), 0.5 + azar()]);
    function pintarFuego(t) {
      cf.globalCompositeOperation = "source-over";
      cf.fillStyle = "#000";
      cf.fillRect(0, 0, 128, 112);
      cf.globalCompositeOperation = "lighter";
      // Brasas
      for (let i = 0; i < 6; i++) {
        const x = 14 + i * 20 + Math.sin(i * 3.1) * 4, b = 0.55 + 0.45 * Math.sin(t * (1.5 + i * 0.37) + i);
        const g = cf.createRadialGradient(x, 100, 0, x, 100, 22);
        g.addColorStop(0, `rgba(255,${120 + b * 60},40,${0.5 + b * 0.4})`);
        g.addColorStop(1, "rgba(120,20,0,0)");
        cf.fillStyle = g;
        cf.fillRect(x - 22, 78, 44, 34);
      }
      // Lenguas de fuego
      for (let k = 0; k < 9; k++) {
        const x = 16 + k * 12 + Math.sin(t * 2.1 + k * 1.3) * 5;
        const ruido = 0.55 + 0.25 * Math.sin(t * (6.3 + k % 4) + k * 2.7) + 0.2 * Math.sin(t * (11.7 + k) + k);
        const alto = (34 + 46 * Math.sin((k + 0.5) / 9 * Math.PI)) * ruido, ancho = 9 + (k % 3) * 3;
        const vaiven = Math.sin(t * 4.7 + k * 1.9) * 7, base = 104;
        const g = cf.createLinearGradient(0, base, 0, base - alto);
        g.addColorStop(0, "rgba(255,245,200,.95)");
        g.addColorStop(0.25, "rgba(255,190,60,.85)");
        g.addColorStop(0.6, "rgba(240,90,20,.55)");
        g.addColorStop(1, "rgba(150,20,0,0)");
        cf.fillStyle = g;
        cf.beginPath();
        cf.moveTo(x - ancho, base);
        cf.quadraticCurveTo(x - ancho * 0.9 + vaiven * 0.3, base - alto * 0.55, x + vaiven, base - alto);
        cf.quadraticCurveTo(x + ancho * 0.9 + vaiven * 0.3, base - alto * 0.55, x + ancho, base);
        cf.fill();
      }
      // Chispas
      for (const p of chispas) {
        p[1] -= p[2] * 1.4;
        p[0] += Math.sin(t * 5 + p[2] * 9) * 0.6;
        if (p[1] < 0) { p[1] = 100; p[0] = 20 + azar() * 88; }
        cf.fillStyle = `rgba(255,${180 + p[2] * 50},90,${p[1] / 110})`;
        cf.fillRect(p[0], p[1], 1.6, 1.6);
      }
      texFuego.needsUpdate = true;
    }

    // Termómetro: tablilla de madera, escala, tubo de cristal y bulbo
    const termo = grupo("termometro", R - 0.075, 1.75, 0.6);
    caja(0.025, 0.56, 0.15, mueble, 0, 0, 0, termo);
    const escala = new T.Mesh(new T.PlaneGeometry(0.12, 0.5), new T.MeshStandardMaterial({
      roughness: 0.7,
      map: textura(96, 400, (c, w, h) => {
        c.fillStyle = "#f3ead8"; c.fillRect(0, 0, w, h);
        c.strokeStyle = "#8a5a3b"; c.lineWidth = 3; c.strokeRect(3, 3, w - 6, h - 6);
        c.fillStyle = "#26233f"; c.textAlign = "right"; c.font = "700 15px Nunito, sans-serif";
        for (let t = -20; t <= 40; t += 2) {
          const y = 330 - (t + 20) / 60 * 290, largo = t % 10 === 0 ? 16 : 8;
          c.fillRect(w / 2 + 8, y - 0.75, largo, 1.5);
          if (t % 10 === 0) c.fillText(String(t), w / 2 - 8, y + 5);
        }
        c.fillStyle = "#b14645"; c.textAlign = "center"; c.font = "700 16px Nunito, sans-serif"; c.fillText("°C", w / 2, 380);
      }),
    }));
    escala.rotation.y = -Math.PI / 2;
    escala.position.x = -0.014;
    termo.add(escala);
    const tubo = cilindro(0.008, 0.008, 0.33, mat("#ffffff", { transparent: true, opacity: 0.35, roughness: 0.1 }), -0.024, 0.05, 0, termo, 12);
    tubo.castShadow = false;
    cilindro(0.0085, 0.0085, 0.006, "#c9c9c9", -0.024, 0.218, 0, termo, 12);
    const bulbo = new T.Mesh(new T.SphereGeometry(0.016, 16, 12), mat("#c0392b", { roughness: 0.25 }));
    bulbo.position.set(-0.024, -0.125, 0);
    termo.add(bulbo);
    const mercurio = cilindro(0.0045, 0.0045, 0.31, mat("#c0392b", { roughness: 0.3 }), -0.024, -0.112, 0, termo, 8);
    mercurio.geometry.translate(0, 0.155, 0);

    // Literas y taquilla (sur)
    const literas = grupo("literas", -1.35, 0, 2.95);
    for (const [x, z] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) caja(0.08, 2.3, 0.08, mueble, x, 1.15, z, literas);
    for (const [y, manta] of [[0.45, "#b14645"], [1.55, "#476356"]]) {
      caja(2.05, 0.1, 0.95, mueble, 0, y - 0.07, 0, literas);
      caja(1.95, 0.14, 0.85, "#fbf0e1", 0, y + 0.05, 0, literas);
      caja(1.4, 0.06, 0.88, conTextura(lana(manta), [1, 1]), 0.25, y + 0.14, 0, literas);
      caja(0.35, 0.1, 0.6, "#ffffff", -0.75, y + 0.16, 0, literas);
    }
    const taquilla = grupo("taquilla", 1.85, 0, R - 0.45);
    const chapa = mat("#8fa094", { roughness: 0.5, metalness: 0.3 }), chapaDentro = mat("#56635a", { roughness: 0.7, metalness: 0.2 });
    caja(0.75, 1.9, 0.02, chapa, 0, 0.95, 0.265, taquilla);
    for (const x of [-0.365, 0.365]) caja(0.02, 1.9, 0.55, chapa, x, 0.95, 0, taquilla);
    caja(0.75, 0.02, 0.55, chapa, 0, 1.89, 0, taquilla);
    caja(0.75, 0.06, 0.55, chapa, 0, 0.03, 0, taquilla);
    caja(0.71, 1.82, 0.01, chapaDentro, 0, 0.95, 0.25, taquilla);
    caja(0.71, 0.02, 0.5, chapaDentro, 0, 1.55, 0.01, taquilla);
    caja(0.04, 0.04, 0.04, "#c9c9c9", 0, 1.48, 0.2, taquilla); // percha
    const puertaTaq = new T.Group();
    puertaTaq.position.set(0.375, 0, -0.275);
    taquilla.add(puertaTaq);
    caja(0.75, 1.88, 0.025, mat("#b4bfab", { roughness: 0.45, metalness: 0.3 }), -0.375, 0.95, -0.0125, puertaTaq);
    for (let i = 0; i < 5; i++) caja(0.4, 0.018, 0.01, "#6f7f73", -0.375, 1.68 - i * 0.05, -0.03, puertaTaq);
    for (let i = 0; i < 5; i++) caja(0.4, 0.018, 0.01, "#6f7f73", -0.375, 0.42 - i * 0.05, -0.03, puertaTaq);
    caja(0.03, 0.14, 0.03, "#c9c9c9", -0.7, 1.0, -0.035, puertaTaq);
    const candado = caja(0.07, 0.09, 0.035, mat("#d4b14a", { roughness: 0.3, metalness: 0.7 }), -0.7, 0.9, -0.05, puertaTaq);
    const dentroTaq = new T.Group();
    taquilla.add(dentroTaq);
    const palaMesh = caja(0.035, 1.0, 0.035, mueble, -0.15, 0.6, 0.05, dentroTaq);
    caja(0.24, 0.3, 0.03, mat("#b14645", { roughness: 0.4 }), -0.15, 0.12, 0.05, dentroTaq);
    caja(0.13, 0.04, 0.03, "#26233f", -0.15, 1.1, 0.05, dentroTaq);
    caja(0.1, 0.16, 0.05, mat("#e3a23c", { roughness: 0.4 }), 0.15, 1.65, 0.05, dentroTaq);
    palaMesh.rotation.z = 0.06;

    // Tablón de cimas: corcho con marco de madera y fotos con chincheta
    const tablon = grupo("tablon", 0.62, 1.7, R - 0.085, Math.PI);
    caja(1.3, 0.85, 0.03, conTextura(corcho(), [1.6, 1]), 0, 0, 0, tablon);
    for (const [w, h, x, y] of [[1.42, 0.06, 0, 0.455], [1.42, 0.06, 0, -0.455], [0.06, 0.97, 0.68, 0], [0.06, 0.97, -0.68, 0]]) caja(w, h, 0.05, mueble, x, y, 0.01, tablon);
    const CIELOS = [["#7fa6d6", "#d9e6f2"], ["#f0a77a", "#f7d9b0"], ["#5d86c4", "#bcd3ec"], ["#8ab0cf", "#eef3f7"], ["#93b5e0", "#f2e6d0"], ["#4f78b8", "#c9dcf0"], ["#e9a3a8", "#f9e2c8"], ["#9aa5b5", "#dfe3e8"]];
    function fotoCima(i, nombre) {
      return textura(160, 200, (c, w, h) => {
        c.fillStyle = "#f7f4ee"; c.fillRect(0, 0, w, h);
        const [arriba, abajo] = CIELOS[i % CIELOS.length];
        const g = c.createLinearGradient(0, 10, 0, 150);
        g.addColorStop(0, arriba); g.addColorStop(1, abajo);
        c.fillStyle = g; c.fillRect(10, 10, 140, 140);
        c.save(); c.beginPath(); c.rect(10, 10, 140, 140); c.clip();
        // Montañas en capas, la última con nieve
        for (const [y0, tono, pico] of [[95, "#7a8aa3", 0.6], [110, "#55657d", 0.8], [128, "#3c4a5c", 1]]) {
          c.fillStyle = tono;
          c.beginPath(); c.moveTo(10, 150);
          const cx = 30 + azar() * 100, alto = 45 + azar() * 40 * pico;
          c.lineTo(10, y0 + 10); c.lineTo(cx - 40, y0 - alto * 0.4); c.lineTo(cx, y0 - alto); c.lineTo(cx + 35, y0 - alto * 0.5); c.lineTo(150, y0 + 5); c.lineTo(150, 150);
          c.fill();
          if (pico === 1) { c.fillStyle = "#f4f7fb"; c.beginPath(); c.moveTo(cx - 12, y0 - alto * 0.78); c.lineTo(cx, y0 - alto); c.lineTo(cx + 10, y0 - alto * 0.82); c.lineTo(cx + 2, y0 - alto * 0.86); c.fill(); }
        }
        if (nombre && /pendiente/i.test(nombre[2] || "")) { c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(10, 10, 140, 140); c.fillStyle = "#3c4a5c"; c.font = "700 60px Nunito, sans-serif"; c.textAlign = "center"; c.fillText("?", 80, 100); }
        c.restore();
        // Pie escrito a mano
        c.fillStyle = "#3a3550"; c.textAlign = "center";
        c.font = "400 17px Pacifico, cursive";
        c.fillText(nombre ? nombre[0] : "", 80, 178, 140);
        c.strokeStyle = "rgba(0,0,0,.08)"; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
      });
    }
    const chinchetas = ["#b14645", "#e3a23c", "#476356", "#2c7be5"];
    for (let i = 0; i < 8; i++) {
      const fx = -0.45 + (i % 4) * 0.3, fy = i < 4 ? 0.18 : -0.2, giro = ((i * 7) % 5 - 2) * 0.045;
      const foto = new T.Mesh(new T.PlaneGeometry(0.22, 0.275), new T.MeshStandardMaterial({ map: fotoCima(i, cimas[i]), roughness: 0.6 }));
      foto.position.set(fx + Math.sin(i * 2.3) * 0.02, fy, 0.018 + i * 0.0005);
      foto.rotation.z = giro;
      tablon.add(foto);
      const pin = new T.Mesh(new T.SphereGeometry(0.014, 12, 8), mat(chinchetas[i % 4], { roughness: 0.3 }));
      pin.position.set(foto.position.x - Math.sin(giro) * 0.12, fy + Math.cos(giro) * 0.12, 0.03);
      tablon.add(pin);
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
    const botiquin = grupo("botiquin", -R + 0.13, 1.75, -1.9, Math.PI / 2);
    const blanco = mat("#f4f1ea", { roughness: 0.45 }), fondoBot = mat("#ddd6ca", { roughness: 0.8 });
    caja(0.55, 0.45, 0.01, blanco, 0, 0, -0.065, botiquin);
    for (const x of [-0.265, 0.265]) caja(0.02, 0.45, 0.14, blanco, x, 0, 0, botiquin);
    for (const y of [-0.215, 0.215]) caja(0.55, 0.02, 0.14, blanco, 0, y, 0, botiquin);
    caja(0.51, 0.41, 0.005, fondoBot, 0, 0, -0.058, botiquin);
    caja(0.51, 0.012, 0.12, fondoBot, 0, 0.02, -0.005, botiquin);
    for (const x of [-0.17, -0.09]) { const v = cilindro(0.035, 0.035, 0.07, "#ffffff", x, 0.06, -0.01, botiquin, 16); v.rotation.x = Math.PI / 2; }
    cilindro(0.025, 0.025, 0.1, mat("#c96b3a", { roughness: 0.3 }), 0.05, 0.077, -0.01, botiquin, 14);
    caja(0.12, 0.08, 0.06, "#b14645", 0.16, 0.066, -0.01, botiquin);
    caja(0.2, 0.06, 0.08, "#9fc7d8", -0.1, -0.17, -0.01, botiquin);
    caja(0.16, 0.1, 0.06, "#e7e1d3", 0.13, -0.15, -0.01, botiquin);
    const tapaBot = new T.Group();
    tapaBot.position.set(-0.275, 0, 0.07);
    botiquin.add(tapaBot);
    caja(0.55, 0.45, 0.02, blanco, 0.275, 0, 0.01, tapaBot);
    caja(0.26, 0.07, 0.005, "#b14645", 0.275, 0, 0.022, tapaBot);
    caja(0.07, 0.26, 0.005, "#b14645", 0.275, 0, 0.022, tapaBot);
    caja(0.02, 0.08, 0.02, "#9a9a9a", 0.52, 0, 0.025, tapaBot);

    // Mochila (aparece al encontrarla)
    const mochila = grupo("mochila", 0.75, 0, -2.72, -0.4);
    const lonaNegra = conTextura(lona("#202024"), [1.5, 1.5], { roughness: 0.95 }), lonaOscura = conTextura(lona("#151518"), [1.5, 1.5], { roughness: 0.95 });
    const cinta = mat("#2e2e34", { roughness: 0.8 }), hebilla = mat("#55555c", { roughness: 0.4, metalness: 0.3 });
    const cuerpoMochila = new T.Group();
    cuerpoMochila.rotation.x = -0.12;
    mochila.add(cuerpoMochila);
    caja(0.38, 0.5, 0.22, lonaNegra, 0, 0.27, 0, cuerpoMochila);
    const lomo = cilindro(0.11, 0.11, 0.38, lonaNegra, 0, 0.52, 0, cuerpoMochila, 20);
    lomo.rotation.z = Math.PI / 2;
    const tapaM = cilindro(0.125, 0.125, 0.4, lonaOscura, 0, 0.55, 0.01, cuerpoMochila, 20);
    tapaM.rotation.z = Math.PI / 2;
    tapaM.scale.set(1, 1, 1);
    caja(0.32, 0.24, 0.06, lonaOscura, 0, 0.2, 0.13, cuerpoMochila);
    caja(0.28, 0.008, 0.006, "#6d6d75", 0, 0.31, 0.162, cuerpoMochila);
    caja(0.015, 0.03, 0.01, "#8a8a92", 0.1, 0.3, 0.166, cuerpoMochila);
    for (const y of [0.18, 0.38]) {
      caja(0.395, 0.025, 0.006, cinta, 0, y, 0.113, cuerpoMochila);
      caja(0.05, 0.035, 0.012, hebilla, 0.13, y, 0.118, cuerpoMochila);
    }
    for (const x of [-0.08, 0.08]) {
      caja(0.025, 0.46, 0.006, cinta, x, 0.38, 0.137, cuerpoMochila);
      caja(0.07, 0.4, 0.04, lonaOscura, x * 1.3, 0.3, -0.13, cuerpoMochila);
    }
    const asaM = new T.Mesh(new T.TorusGeometry(0.035, 0.008, 6, 14, Math.PI), cinta);
    asaM.position.set(0, 0.665, -0.06);
    cuerpoMochila.add(asaM);
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
      cristal.material.color.set(fuego ? "#1a0904" : "#15141a");
      escarcha.material.opacity = e.hechos.vaho ? 0.06 : fuego ? 0.55 : 0.88;
      puertaTaq.rotation.y = e.hechos.taquilla ? -1.9 : 0;
      candado.visible = !e.hechos.taquilla;
      dentroTaq.visible = !e.hechos.taquilla;
      if (final && !e.hechos.fin) {
        final = 0;
        fondoMat.map = cielos[0];
        fondoMat.needsUpdate = true;
        escena.background.set("#1d1b2e");
        muroNieve.visible = true;
        copos.visible = true;
        sol.intensity = 0;
        luna.intensity = 0.35;
      }
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
      mercurio.scale.y = limitar((t + 20) / 60 * 0.93 + 0.04, 0.03, 1);
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
      objetivo.pitch = limitar(Math.atan2(d.y, Math.hypot(d.x, d.z)) - (bajar ? 0.2 : 0), -0.9, 0.5);
      objetivo.vuelta = limitar(objetivo.pitch + (bajar ? 0.2 : 0), -0.4, 0.15);
      objetivo.fov = bajar ? 52 : 72;
      pedir();
    }
    function soltar() { objetivo.fov = 72; objetivo.pitch = objetivo.vuelta ?? -0.15; pedir(); }

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
    let pausado = false;
    function pedir() { if (!pedido && !cerrado && !pausado) pedido = requestAnimationFrame(cuadro); }
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
        pintarFuego(t);
        resplandor.material.opacity = 0.75 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.1;
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
      pausar(p) { pausado = p; if (p) { cancelAnimationFrame(pedido); pedido = 0; } else { reloj.getDelta(); pedir(); } },
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
    let cerrado = false, sala = null, fotoUrl = null, morseCorriendo = 0, panelAbierto = "", dormida = null, fotoRegalo = null;
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
        <div class="ref-inventario" aria-label="Lo que llevas"></div>
      </div>`;
    contenedor.append(raiz);
    // El 3D ocupa toda la ventana; la cabecera queda encima
    const dialogo = contenedor.closest("dialog");
    dialogo?.classList.add("ref-completo");
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
      panel.classList.remove("ref-grande");
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
      panel.classList.toggle("ref-grande", id === "arva");
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
        if (e.hechos.radio && !e.hechos.fin) { setTimeout(montarMorse); return `<h3>Ventana</h3><canvas class="ref-noche" width="640" height="300" aria-label="Montañas de noche con una luz a lo lejos"></canvas><p class="ref-nota">Una luz parpadea a lo lejos:</p><p class="ref-signos" aria-live="off"></p>${texto}`; }
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
      arva: () => { setTimeout(montarArva); return `<h3>ARVA</h3><p class="ref-nota">Mueve el dedo por la nieve: cuanto más cerca, más rápido pita.</p><div class="ref-arva"><canvas></canvas><span class="ref-aparato" hidden>${ICONOS.arva}</span><b class="ref-dist">-- m</b></div><button type="button" class="boton ref-cavar">Cavar aquí</button>`; },
      mochila: () => {
        if (e.hechos.mochilaAbierta) return `<h3>Mochila de Alber</h3><p>${datos.mochilaDentro}</p>`;
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
      literas: () => {
        setTimeout(() => {
          const img = panel.querySelector(".ref-dormida");
          if (!img) return;
          dormida ||= Cifrado.imagen(CARPETA + "durmiendo");
          dormida.then((u) => { if (!cerrado && img.isConnected) { img.src = u; img.hidden = false; } }).catch(() => { dormida = null; });
        });
        return `<h3>Literas</h3><p>Parece que alguien está durmiendo…</p><img class="ref-dormida" alt="Alguien durmiendo en la litera" hidden>`;
      },
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
      const lienzoNoche = panel.querySelector(".ref-noche"), signos = panel.querySelector(".ref-signos");
      if (!lienzoNoche) return;
      const cn = lienzoNoche.getContext("2d"), fondo = document.createElement("canvas");
      fondo.width = lienzoNoche.width; fondo.height = lienzoNoche.height;
      pintarMontes(fondo.getContext("2d"), fondo.width, fondo.height, false);
      const LX = fondo.width * 0.36, LY = fondo.height * 0.5;
      const luz = { classList: { toggle(_, on) {
        cn.drawImage(fondo, 0, 0);
        cn.fillStyle = "#2a2f44"; cn.fillRect(LX - 7, LY - 2, 14, 8); // refugio lejano
        if (on) pintarDestello(cn, LX, LY - 4, 34); else { cn.fillStyle = "rgba(255,220,150,.35)"; cn.fillRect(LX - 2, LY - 5, 4, 3); }
      } } };
      luz.classList.toggle("on", false);
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
      const aparato = panel.querySelector(".ref-aparato");
      c.width = Math.round(c.clientWidth * Math.min(devicePixelRatio || 1, 2));
      c.height = Math.round(c.clientHeight * Math.min(devicePixelRatio || 1, 2));
      const x = c.getContext("2d"), W = c.width, H = c.height, ANCHO = 20; // metros a lo ancho
      const meta = [W * (0.2 + Math.random() * 0.6), H * (0.25 + Math.random() * 0.55)];
      let yo = null, siguiente = 0, agujeros = [];
      function pintar() {
        x.fillStyle = "#eef3fa"; x.fillRect(0, 0, W, H);
        x.fillStyle = "#dbe4f0";
        const k = W / 600;
        for (let i = 0; i < 30; i++) { x.beginPath(); x.ellipse((i * 137 * k) % W, (i * 89 * k) % H, 60 * k, 18 * k, 0, 0, 7); x.fill(); }
        for (const a of agujeros) { x.fillStyle = "#b9c6d8"; x.beginPath(); x.ellipse(a[0], a[1], 26 * k, 14 * k, 0, 0, 7); x.fill(); }
        if (yo) Object.assign(aparato.style, { left: `${yo[0] / W * 100}%`, top: `${yo[1] / H * 100}%` });
        aparato.hidden = !yo;
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
    // Foto del regalo lista (descifrada y decodificada) antes de enseñarla
    function prepararRegalo() {
      fotoRegalo ||= Cifrado.imagen(CARPETA + "regalo").then(async (u) => {
        if (cerrado) { URL.revokeObjectURL(u); throw new Error("cerrado"); }
        fotoUrl = u;
        const i = new Image();
        i.src = u;
        try { await i.decode(); } catch {}
        return i;
      });
      fotoRegalo.catch(() => { fotoRegalo = null; });
      return fotoRegalo;
    }
    function final() {
      sala?.pausar(true);
      prepararRegalo().catch(() => {});
      const n = e.pistas.length;
      const b = capa("ref-final", `<h3>¡Rescatada!</h3><p>${n ? `Has salido del refugio usando ${n} ${n === 1 ? "pista" : "pistas"}.` : "Has salido del refugio sin pedir ninguna pista. ¡Toda una experta!"}</p><button type="button" class="boton">Abrir el regalo</button>`);
      sonidos.ganar();
      b(".boton").addEventListener("click", regalo);
    }
    async function regalo() {
      const boton = raiz.querySelector(".ref-final .boton");
      if (boton) { boton.disabled = true; boton.textContent = "Abriendo…"; }
      let foto = null;
      try { foto = await prepararRegalo(); } catch {}
      if (cerrado) return;
      let papel = "";
      const tonos = ["#f2b7bc", "#d6c5b5", "#b9bd94", "#fbf0e1", "#e6a79b", "#b4bfab", "#e3cf9f"];
      for (let i = 0; i < 36; i++) papel += `<i class="confeti" style="left:${(i * 37) % 100}%;background:${tonos[i % 7]};animation-delay:${(1.4 + (i % 9) * 0.16).toFixed(2)}s"></i>`;
      const b = capa("esc-regalo ref-regalo", `<div class="caja-regalo" aria-hidden="true"><i class="base"></i><i class="cinta"></i><i class="tapa"></i></div>
        ${papel}<figure class="ref-foto"><img alt="Tu regalo"><figcaption><strong>${datos.regalo.titulo}</strong><span>${datos.regalo.mensaje}</span></figcaption></figure>`);
      sonidos.ganar();
      const img = b("img");
      if (foto) {
        img.width = foto.naturalWidth;
        img.height = foto.naturalHeight;
        img.src = foto.src;
      } else {
        img.remove();
        b("figcaption span").textContent += " (No se ha podido cargar la foto: comprueba la conexión y vuelve a abrir la caja.)";
      }
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
      sala?.pausar(false);
      sonidos.viento(e.hechos.fuego ? 0.4 : 1);
      sonidos.fuego(!!e.hechos.fuego);
      clearInterval(frio);
      frio = setInterval(() => {
        if (cerrado || e.hechos.fin) return;
        e.temp = e.hechos.fuego ? Math.min(19, e.temp + 0.25) : Math.max(-12, e.temp - 1 / 25);
        pintarArriba();
        if (++ticks % 5 === 0) guardar();
      }, 1000);
      if (!e.hechos.fuego && e.inv.length === 0 && !e.hechos.botiquin) avisar("Brrr… Hace un frío que pela.", 3500);
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
        }, datos.cimas);
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
      dialogo?.classList.remove("ref-completo");
      clearInterval(frio);
      clearTimeout(morseCorriendo);
      clearTimeout(avisoT);
      observador?.disconnect();
      guardar();
      sala?.cerrar();
      sonidos.cerrar();
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
      dormida?.then((u) => URL.revokeObjectURL(u)).catch(() => {});
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
