// Orden: 1 recap, 2 ruleta de vales, 3 rocódromo, 4 fotos y mapa, 5 escape room, 6 guardia.
// Una entrada por caja. `abrir(contenedor, cerrar)` rellena la ventana de ese día:
// ahí irá el minijuego, la foto, el mensaje... Puede devolver una función
// de limpieza, que se ejecuta al cerrar (parar música, temporizadores...).
function contenidoProvisional(dibujo) {
  return (contenedor) => {
    contenedor.innerHTML =
      `<div class="provisional">${dibujo}<p>Aquí irá la sorpresa</p></div>`;
  };
}

const DIAS = [
  { dia: 1, hueco: ".fila-1", fondo: "#b14645", texto: "#ffffff", dibujo: DIBUJOS.estrella, abrir: abrirRecap },
  { dia: 2, hueco: ".fila-1", fondo: "#d6c5b5", texto: "#8f3233", dibujo: DIBUJOS.camello, abrir: abrirRuleta },
  { dia: 3, hueco: ".col-izq", fondo: "#476356", texto: "#f2b7bc", dibujo: DIBUJOS.regalos, abrir: abrirEscalada },
  { dia: 4, hueco: ".col-der", fondo: "#f2b7bc", texto: "#26233f", dibujo: DIBUJOS.corona, abrir: abrirLugares },
  { dia: 5, hueco: ".col-der", fondo: "#a9ab88", texto: "#1d1b2e", dibujo: DIBUJOS.roscon, abrir: abrirRefugio },
  { dia: 6, hueco: ".fila-3", fondo: "#d6c5b5", texto: "#34503f", dibujo: DIBUJOS.reyes, abrir: abrirGuardia },
].map((d) => ({ abrir: contenidoProvisional(d.dibujo), ...d }));
