// Ilustraciones planas en SVG
const DIBUJOS = (() => {
  const svg = (w, h, dentro, ajuste = "xMidYMid meet") =>
    `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="${ajuste}" aria-hidden="true">${dentro}</svg>`;

  // Copo/estrella de rayos redondeados
  const copo = (x, y, r, color) => {
    let d = "";
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 6;
      const dx = (Math.cos(a) * r).toFixed(1), dy = (Math.sin(a) * r).toFixed(1);
      d += `M${x - dx} ${y - dy}L${x + +dx} ${y + +dy}`;
    }
    return `<path d="${d}" stroke="${color}" stroke-width="${r / 3.4}" stroke-linecap="round"/>`;
  };

  const puntaEstrella = "M0-30 8-10 30-9 13 5 19 27 0 15-19 27-13 5-30-9-8-10Z";
  const cometa = `
    <g stroke="#fbf0e1" stroke-width="4" stroke-linecap="round" fill="none">
      <path d="M52 52 92 84M60 46 96 66M46 60 78 94"/></g>
    <path transform="translate(38 38)" d="${puntaEstrella}" fill="#e3bd79" stroke="#e3bd79" stroke-width="5" stroke-linejoin="round"/>
    <path d="M38 22V54M24 34 52 44M52 34 26 46" stroke="#c9975a" stroke-width="2" stroke-linecap="round"/>`;

  const corona = (c = "#e3bd79") => `
    <path d="M12 62 6 20 30 38 50 10 70 38 94 20 88 62Z" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>
    <g fill="#b14645"><circle cx="6" cy="16" r="6"/><circle cx="50" cy="8" r="7"/><circle cx="94" cy="16" r="6"/></g>
    <path d="M14 54H86" stroke="#fbf0e1" stroke-width="7" stroke-linecap="round" stroke-dasharray=".1 12"/>`;

  const camelloDentro = `
    <path d="M42 66C30 70 32 88 27 96" stroke="#a9744c" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M40 70C40 52 58 52 70 50 78 20 98 20 106 50 124 50 130 64 138 56 147 48 145 32 148 22 151 10 164 10 174 15 185 19 184 31 174 31L165 31C163 56 160 82 139 88L138 125H128L126 92H112L110 125H100L99 90H72L70 125H60L60 90 54 88 50 125H40Z" fill="#c08a5c" stroke="#c08a5c" stroke-width="3" stroke-linejoin="round"/>
    <path d="M152 14 150 4 159 10Z" fill="#a9744c"/>
    <path d="M65 52C78 20 98 20 109 52L114 76H62Z" fill="#b14645"/>
    <path d="M63 66H113" stroke="#f2b7bc" stroke-width="5"/>
    <path d="M65 78V84M75 78V84M85 78V84M95 78V84M105 78V84M112 78V84" stroke="#e3bd79" stroke-width="4" stroke-linecap="round"/>
    <path d="M147 36 165 38" stroke="#476356" stroke-width="5" stroke-linecap="round"/>
    <circle cx="163" cy="19" r="2.6" fill="#26233f"/><circle cx="168" cy="25" r="3" fill="#e79a8f"/>`;

  const regalos = `
    ${copo(24, 24, 11, "#f2b7bc")}${copo(138, 20, 14, "#fbf0e1")}${copo(128, 62, 7, "#e3a78c")}
    <rect x="16" y="104" width="128" height="74" rx="8" fill="#b14645"/>
    <rect x="68" y="104" width="24" height="74" fill="#f2b7bc"/>
    <g fill="#fbf0e1"><circle cx="34" cy="124" r="4"/><circle cx="52" cy="148" r="4"/><circle cx="32" cy="162" r="4"/><circle cx="110" cy="126" r="4"/><circle cx="128" cy="148" r="4"/><circle cx="108" cy="164" r="4"/></g>
    <rect x="36" y="56" width="88" height="52" rx="8" fill="#fbf0e1"/>
    <rect x="71" y="56" width="18" height="52" fill="#a9ab88"/>
    <path d="M36 82H124" stroke="#a9ab88" stroke-width="12"/>
    <g fill="none" stroke="#e79a8f" stroke-width="7" stroke-linejoin="round"><path d="M80 54C50 54 46 24 62 26 74 28 80 42 80 54ZM80 54C110 54 114 24 98 26 86 28 80 42 80 54Z"/></g>`;

  const roscon = (() => {
    let fruta = "", azucar = "";
    const colores = ["#b14645", "#476356", "#e3bd79", "#b14645", "#476356", "#e3bd79", "#b14645", "#476356"];
    colores.forEach((c, i) => {
      fruta += `<rect x="52" y="13" width="16" height="10" rx="5" fill="${c}" transform="rotate(${i * 45} 60 60)"/>`;
      azucar += `<g transform="rotate(${i * 45 + 22} 60 60)" fill="#fff"><circle cx="56" cy="19" r="2.2"/><circle cx="63" cy="25" r="2.2"/><circle cx="62" cy="15" r="2"/></g>`;
    });
    return `<circle cx="60" cy="60" r="38" fill="none" stroke="#b9783f" stroke-width="32"/>
      <circle cx="60" cy="60" r="39" fill="none" stroke="#d39a5c" stroke-width="24"/>${azucar}${fruta}`;
  })();

  function rey({ piel, barba, tunica, capa, coronaColor, regalo }) {
    return `
      <path d="M60 74C18 78 10 140 4 204H116C110 140 102 78 60 74Z" fill="${capa}"/>
      <path d="M60 84C40 88 32 140 30 204H90C88 140 80 88 60 84Z" fill="${tunica}"/>
      <path d="M33 196H87" stroke="#fbf0e1" stroke-width="7" stroke-dasharray=".1 11" stroke-linecap="round"/>
      <path d="M32 204C32 198 56 198 57 204ZM63 204C64 198 88 198 88 204Z" fill="#26233f"/>
      <circle cx="60" cy="60" r="28" fill="${piel}"/>
      <path d="M32 58C34 62 42 69 48 68 54 63 66 63 72 68 78 69 86 62 88 58 92 88 76 104 60 104 44 104 28 88 32 58Z" fill="${barba}"/>
      <path d="M54 75Q60 80 66 75" stroke="#b14645" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g fill="#26233f"><circle cx="50" cy="55" r="2.8"/><circle cx="70" cy="55" r="2.8"/></g>
      <g fill="#e58e85" opacity=".75"><circle cx="43" cy="61" r="4.5"/><circle cx="77" cy="61" r="4.5"/></g>
      <g transform="translate(31 -2) scale(.58)">${corona(coronaColor)}</g>
      <path d="M20 122C24 146 42 152 54 146M100 122C96 146 78 152 66 146" stroke="${capa}" stroke-width="17" fill="none" stroke-linecap="round"/>
      <circle cx="47" cy="148" r="8" fill="${piel}"/><circle cx="73" cy="148" r="8" fill="${piel}"/>
      ${regalo}`;
  }
  const cofre = `<rect x="44" y="124" width="32" height="26" rx="4" fill="#e3bd79"/><path d="M44 135H76" stroke="#a9744c" stroke-width="3"/><circle cx="60" cy="136" r="4" fill="#b14645"/>`;
  const incienso = `<path d="M46 130H74C74 148 68 152 60 152 52 152 46 148 46 130Z" fill="#e3bd79"/><path d="M50 128Q60 112 70 128Z" fill="#c9975a"/>`;
  const mirra = `<path d="M52 122H68V130C78 136 76 152 60 152 44 152 42 136 52 130Z" fill="#f2b7bc"/><path d="M50 121H70" stroke="#b14645" stroke-width="5" stroke-linecap="round"/>`;

  const trio = `
    <g transform="translate(0 10)">${rey({ piel: "#f3cdb4", barba: "#fbf7ef", tunica: "#f2b7bc", capa: "#b14645", coronaColor: "#e3bd79", regalo: cofre })}</g>
    <g transform="translate(224 10)">${rey({ piel: "#7a4b35", barba: "#33251f", tunica: "#e3bd79", capa: "#476356", coronaColor: "#f0d08f", regalo: mirra })}</g>
    <g transform="translate(112 0)">${rey({ piel: "#f0c3a2", barba: "#a8643c", tunica: "#fbf0e1", capa: "#5f8f8b", coronaColor: "#e3bd79", regalo: incienso })}</g>`;

  const rizos = (y, x1, n) => {
    let d = `M${x1} ${y}`;
    for (let i = 0; i < n; i++) d += "c26 4 30-30 16-30s-10 34 14 30";
    return `<path d="${d}" fill="none" stroke="#a53f3e" stroke-width="5" stroke-linecap="round"/>`;
  };

  const portada = `
    <path d="M-300 330C-200 330-60 340 0 296 70 244 140 270 200 290 270 312 330 262 400 276 460 290 600 300 700 300V400H-300Z" fill="#d6c5b5"/>
    <path d="M-300 360C-200 360-70 371 0 340 90 300 160 326 230 336 300 344 350 318 400 324 460 331 600 340 700 340V401H-300Z" fill="#b4bfab"/>
    ${rizos(374, 26, 4)}${rizos(384, 250, 4)}
    <g transform="translate(150 0) scale(.95)">
      <g stroke="#f2b7bc" stroke-width="5" stroke-linecap="round" fill="none"><path d="M56 48 104 70M50 60 92 90M60 38 112 46"/></g>
      <path transform="translate(38 38)" d="${puntaEstrella}" fill="#e3bd79" stroke="#e3bd79" stroke-width="6" stroke-linejoin="round"/></g>
    ${copo(52, 40, 13, "#b14645")}${copo(342, 62, 16, "#f2b7bc")}${copo(88, 104, 8, "#e3a78c")}${copo(312, 118, 8, "#a9ab88")}
    <g transform="translate(30 122)">${trio}</g>`;

  return {
    estrella: svg(104, 104, cometa),
    camello: svg(200, 130, camelloDentro + copo(16, 22, 8, "#fbf0e1") + copo(120, 16, 6, "#b14645")),
    regalos: svg(160, 182, regalos),
    corona: svg(104, 74, corona()),
    roscon: svg(120, 120, roscon),
    reyes: svg(344, 218, trio),
    portada: svg(400, 400, portada, "xMidYMax meet"),
  };
})();
