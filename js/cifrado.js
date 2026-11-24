// Descifra el contenido de datos/ con la clave. Formato de cada .bin:
// IV (16) | AES-256-CBC | HMAC-SHA256 (32) sobre nombre + 0x00 + IV + cifrado.
// La clave no está en la web: solo se comprueba intentando descifrar.
const Cifrado = (() => {
  const RECUERDO = "adviento-llave";
  let llaves = null;

  const aBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const aBase64 = (u) => btoa(String.fromCharCode(...u));

  async function bajar(ruta, opciones) {
    const r = await fetch(ruta, opciones);
    if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
    return r;
  }
  async function importar(bits) {
    return {
      aes: await crypto.subtle.importKey("raw", bits.slice(0, 32), "AES-CBC", false, ["decrypt"]),
      mac: await crypto.subtle.importKey("raw", bits.slice(32), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]),
    };
  }
  // Devuelve null si la clave no corresponde
  async function descifrar(nombre, datos, k) {
    const cuerpo = datos.subarray(0, datos.length - 32);
    const n = new TextEncoder().encode(nombre);
    const firmado = new Uint8Array(n.length + 1 + cuerpo.length);
    firmado.set(n);
    firmado.set(cuerpo, n.length + 1);
    if (!(await crypto.subtle.verify("HMAC", k.mac, datos.subarray(datos.length - 32), firmado))) return null;
    return crypto.subtle.decrypt({ name: "AES-CBC", iv: cuerpo.subarray(0, 16) }, k.aes, cuerpo.subarray(16));
  }
  async function leer(nombre, k, opciones) {
    const r = await bajar(`datos/${nombre}.bin`, opciones);
    return descifrar(nombre, new Uint8Array(await r.arrayBuffer()), k);
  }
  async function leerSeguro(nombre, opciones) {
    const datos = (await leer(nombre, llaves, opciones)) || (await leer(nombre, llaves, { cache: "reload" }));
    if (!datos) throw new Error(`No se puede descifrar ${nombre}`);
    return datos;
  }
  async function probar(bits) {
    const k = await importar(bits);
    if (!(await leer("prueba", k, { cache: "no-cache" }))) return false;
    llaves = k;
    return true;
  }

  return {
    // Usa la llave recordada en este móvil
    async abrirGuardada() {
      if (llaves) return true;
      try {
        const b64 = localStorage.getItem(RECUERDO);
        return b64 ? await probar(aBytes(b64)) : false;
      } catch { return false; }
    },
    // "ok", "clave" (no es correcta) o "red"
    async abrirCon(texto) {
      const clave = texto.normalize("NFC").trim();
      if (!clave) return "clave";
      try {
        const { iteraciones, sal } = await (await bajar("datos/clave.json", { cache: "no-cache" })).json();
        const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveBits"]);
        const bits = new Uint8Array(await crypto.subtle.deriveBits(
          { name: "PBKDF2", hash: "SHA-256", salt: aBytes(sal), iterations: iteraciones }, base, 512));
        if (!(await probar(bits))) return "clave";
        try { localStorage.setItem(RECUERDO, aBase64(bits)); } catch {}
        return "ok";
      } catch { return "red"; }
    },
    async json(nombre) {
      return JSON.parse(new TextDecoder().decode(await leerSeguro(nombre, { cache: "no-cache" })));
    },
    async imagen(nombre) {
      return URL.createObjectURL(new Blob([await leerSeguro(nombre)], { type: "image/webp" }));
    },
    async video(nombre) {
      return URL.createObjectURL(new Blob([await leerSeguro(nombre)], { type: "video/mp4" }));
    },
  };
})();
