let reverb;

// 🎻 ENSAMBLE DE DRONES GRAVES (Re2, La, Re3) que respiran con el tráfico
const dronesGrave = [];
let filtroDrones;

// 🎹 SÍNTESIS CRISTALINA POLIFÓNICA (Sine + Triángulo desafinado)
const MAX_VOCES_PULSO = 12;          // más voces: con tráfico real las colas largas ya no se pisan
let ultimoPulso = 0;
const INTERVALO_MIN_PULSO = 50;    // ms mínimos entre sonidos de probes (lo visual NO se limita)
let oscsSine = [];
let oscsTri = [];
let envsPulso = [];
let vozFiltro;
let idxVozPulso = 0;

// 🎼 MOTOR DE CONEXIONES Y ACORDES (cada célula del grupo aporta su propia nota)
const MAX_VOCES_CONEXION = 12;        // 4 acordes de 3 notas en rotación
let idxVozConexion = 0;
let oscsConexionSine = [];
let oscsConexionTri = [];
let envsConexion = [];
let filtroConexion;
let gainConexionesMaster;
let ultimoDisparoAcorde = 0;
const INTERVALO_MIN_ACORDE = 800;

// 🎼 ESCALA PENTATÓNICA MENOR DE RE (15 notas: 3 octavas desde Re3 = 146.83 Hz)
const ESCALA_PENTA_RE_MENOR = [
  // Octava 3
  146.83, 174.61, 196.00, 220.00, 261.63,
  // Octava 4
  293.66, 349.23, 392.00, 440.00, 523.25,
  // Octava 5
  587.33, 698.46, 783.99, 880.00, 1046.50
];

let ESCALA_BASE_CONSONANTE = [...ESCALA_PENTA_RE_MENOR];
let nombreEscalaActual = "PENTATÓNICA MENOR DE RE (CRISTAL)";

// Frecuencias fijas para el drone continuo de fondo (Re2, La2, Re3)
const FREQS_DRONE = [73.42, 110.14, 146.83];
const AMP_DRONE_MAX = [0.035, 0.025, 0.020];

function asegurarReverb() {
  if (!reverb && typeof p5.Reverb !== "undefined") {
    reverb = new p5.Reverb();
    reverb.set(8.0, 4.5); // Una sola reverb compartida (cola larga). Antes cada process() la reconfiguraba y ganaba la última.
    reverb.drywet(0.55);
  }
}

// ---------------- 1. PAISAJE SONORO: DRONES CONTINUOS ----------------

function iniciarCapaGrave() {
  asegurarReverb();
  asegurarFiltroDrones();

  for (let i = 0; i < FREQS_DRONE.length; i++) {
    const osc = new p5.Oscillator("sine");
    osc.disconnect();
    if (filtroDrones) osc.connect(filtroDrones);
    osc.freq(FREQS_DRONE[i]);
    osc.amp(0);
    osc.start();

    dronesGrave.push({
      osc: osc,
      maxAmp: AMP_DRONE_MAX[i],
      seed: random(1000)
    });
  }
}

function asegurarFiltroDrones() {
  if (!filtroDrones && typeof p5.LowPass !== "undefined") {
    filtroDrones = new p5.LowPass();
    filtroDrones.freq(520);
    filtroDrones.res(0.4);
    if (reverb) reverb.process(filtroDrones);
  }
}

// ---------------- 2. PROBES CRISTALINOS (SINE + TRIÁNGULO DESAFINADO) ----------------

function iniciarPulso() {
  asegurarReverb();

  vozFiltro = new p5.LowPass();
  vozFiltro.freq(1800);
  vozFiltro.res(0.3);

  oscsSine = [];
  oscsTri = [];
  envsPulso = [];

  for (let i = 0; i < MAX_VOCES_PULSO; i++) {
    const sOsc = new p5.Oscillator("sine");
    sOsc.disconnect();
    sOsc.connect(vozFiltro);
    sOsc.amp(0);
    sOsc.start();

    // Armónico triangular apenas desafinado para textura de vidrio/campana
    const tOsc = new p5.Oscillator("triangle");
    tOsc.disconnect();
    tOsc.connect(vozFiltro);
    tOsc.amp(0);
    tOsc.start();

    const env = new p5.Envelope();

    oscsSine.push(sOsc);
    oscsTri.push(tOsc);
    envsPulso.push(env);
  }

  if (reverb) reverb.process(vozFiltro);
}

function dispararPulsoCrecimiento(maduracion = 0, rssi = -70, frecuenciaNota = 146.83, nx = 0.5, entidadRef = null) {
  // Lo visual va primero: el destello NO depende del volumen ni del interruptor de sonido.
  if (entidadRef) {
    entidadRef.brilloSonoro = 1.0;
  }

  if (typeof params !== "undefined") {
    if (!params.pulsosEntidades) return;
    if (params.volProbes !== undefined && params.volProbes <= 0.001) return;
  }
  if (frecuenciaNota === null || frecuenciaNota <= 0) return;
  if (oscsSine.length === 0 || !vozFiltro) return;

  // Límite global de sonidos por segundo (evita el tartamudeo con mucho tráfico).
  const ahoraPulso = millis();
  if (ahoraPulso - ultimoPulso < INTERVALO_MIN_PULSO) return;
  ultimoPulso = ahoraPulso;

  const sOsc = oscsSine[idxVozPulso];
  const tOsc = oscsTri[idxVozPulso];
  const env = envsPulso[idxVozPulso];
  idxVozPulso = (idxVozPulso + 1) % MAX_VOCES_PULSO;

  const panVal = map(constrain(nx, 0.0, 1.0), 0.0, 1.0, -0.8, 0.8);
  if (typeof sOsc.pan === "function") {
    sOsc.pan(panVal, 0.03);
    tOsc.pan(panVal, 0.03);
  }

  sOsc.freq(frecuenciaNota, 0.02);
  tOsc.freq(frecuenciaNota * 1.003, 0.02); // Leve desafinación para cuerpo de campana

  const gananciaUsuario = (typeof params !== "undefined" && params.volProbes !== undefined) ? params.volProbes : 1.0;
  const volumen = map(maduracion, 0, 1, 0.04, 0.16) * gananciaUsuario;

  const duracion = map(maduracion, 0, 1, 1.2, 3.5); // Ataque suave, cola larga
  env.setADSR(0.12, duracion * 0.4, 0.0, duracion * 0.6);
  env.setRange(volumen, 0);

  env.play(sOsc);
  env.play(tOsc);
}

// ---------------- 3. MOTOR DE ACORDES: OCTAVAS Y QUINTAS DE COLOR ----------------

function iniciarConexionSonora() {
  asegurarReverb();

  filtroConexion = new p5.LowPass();
  filtroConexion.freq(2200);
  filtroConexion.res(0.3);

  if (typeof p5.Gain !== "undefined") {
    gainConexionesMaster = new p5.Gain();
    filtroConexion.disconnect();
    filtroConexion.connect(gainConexionesMaster);
    gainConexionesMaster.amp(1.0);
    if (reverb) reverb.process(gainConexionesMaster);
  } else {
    if (reverb) reverb.process(filtroConexion);
  }

  oscsConexionSine = [];
  oscsConexionTri = [];
  envsConexion = [];

  for (let i = 0; i < MAX_VOCES_CONEXION; i++) {
    const sOsc = new p5.Oscillator("sine");
    sOsc.disconnect();
    sOsc.connect(filtroConexion);
    sOsc.amp(0);
    sOsc.start();

    const tOsc = new p5.Oscillator("triangle");
    tOsc.disconnect();
    tOsc.connect(filtroConexion);
    tOsc.amp(0);
    tOsc.start();

    const env = new p5.Envelope();
    oscsConexionSine.push(sOsc);
    oscsConexionTri.push(tOsc);
    envsConexion.push(env);
  }
}

// Devuelve true si el acorde "ocurrió" (pasó el límite de tiempo), suene o esté silenciado:
// así los destellos visuales no dependen del volumen. Devuelve false si se descartó.
function dispararAcordeGrupo(vocesCluster, distPromedio) {
  if (!vocesCluster || vocesCluster.length < 2) return false;
  const vocesSonoras = vocesCluster.filter(v => v.freq !== null && v.freq > 0);
  if (vocesSonoras.length === 0) return false;

  const ahora = millis();
  if (ahora - ultimoDisparoAcorde < INTERVALO_MIN_ACORDE) return false;
  ultimoDisparoAcorde = ahora;

  const p = (typeof params !== "undefined") ? params : {};
  const silenciado = p.pulsosEntidades === false || (p.volConexiones !== undefined && p.volConexiones <= 0.001);
  if (silenciado || oscsConexionSine.length === 0 || !filtroConexion) return true;

  // Cada célula del grupo canta su nota. Si faltan para llegar a 3, se completa con
  // la octava y la octava + quinta de la primera (la nota "de color").
  const notas = [...new Set(vocesSonoras.map(v => v.freq))].slice(0, 3);
  const base = notas[0];
  for (const extra of [base * 2, base * 3, base * 1.5]) {
    if (notas.length >= 3) break;
    if (!notas.some(n => Math.abs(n - extra) < 1)) notas.push(extra);
  }

  const numNotas = notas.length;
  const distRef = p.distConexion ? p.distConexion : 160;
  const gananciaConexiones = p.volConexiones !== undefined ? p.volConexiones : 1.0;
  const volBase = (map(distPromedio, 0, distRef, 0.12, 0.04, true) / Math.sqrt(numNotas)) * gananciaConexiones;
  const duracion = map(distPromedio, 0, distRef, 1.8, 3.8, true);

  const delayPasoSegundos = 0.07;
  const v0 = idxVozConexion;                                   // rotación: un acorde nuevo no corta la cola del anterior
  idxVozConexion = (idxVozConexion + numNotas) % MAX_VOCES_CONEXION;

  for (let i = 0; i < numNotas; i++) {
    const idx = (v0 + i) % MAX_VOCES_CONEXION;
    const sOsc = oscsConexionSine[idx];
    const tOsc = oscsConexionTri[idx];
    const env = envsConexion[idx];
    const freq = notas[i];
    const nx = vocesSonoras[i % vocesSonoras.length].nx;

    const panIndividual = map(constrain(nx, 0.0, 1.0), 0.0, 1.0, -0.75, 0.75);
    if (typeof sOsc.pan === "function") {
      sOsc.pan(panIndividual, 0.03);
      tOsc.pan(panIndividual, 0.03);
    }

    sOsc.freq(freq, 0.02);
    tOsc.freq(freq * 1.004, 0.02);

    const tAttack = 0.08 + (i * 0.05);
    const tRelease = duracion * (0.7 + i * 0.1);

    env.setADSR(tAttack, duracion * 0.3, 0.0, tRelease);
    env.setRange(volBase, 0);

    const retardoVoz = i * delayPasoSegundos;
    env.play(sOsc, retardoVoz);
    env.play(tOsc, retardoVoz);
  }
  return true;
}

// ---------------- 4. ACTUALIZACIÓN DINÁMICA DEL DRONE CON TRÁFICO ----------------

// Compresor suave en la salida. p5.sound ya trae un limitador duro al final (-3 dB, ratio 20):
// este compresor actúa ANTES, con ajustes suaves, para que los momentos densos se "aplanen"
// con naturalidad y no lleguen a tocar el limitador (que sí se oiría como distorsión).
const COMPRESOR_MAESTRO = true;
function iniciarMasterSuave() {
  if (!COMPRESOR_MAESTRO) return;
  try {
    const so = p5.soundOut;
    const ctx = getAudioContext();
    if (!so || !so.input || !so.limiter) {
      console.warn("Compresor maestro: no se encontró la cadena interna de p5.sound; se omite.");
      return;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 20;
    comp.ratio.value = 2.5;
    comp.attack.value = 0.03;
    comp.release.value = 0.4;
    so.input.disconnect();
    so.input.connect(comp);
    comp.connect(so.limiter);
  } catch (e) {
    console.warn("Compresor maestro no instalado:", e);
  }
}

// Reinicio de la obra: límites de tiempo y rotación de voces vuelven a cero.
// (Las notas que ya estaban sonando terminan solas con su cola natural.)
function reiniciarSonido() {
  ultimoDisparoAcorde = 0;
  ultimoPulso = 0;
  idxVozPulso = 0;
  idxVozConexion = 0;
}

// Estado previo del interruptor de sonido (null = todavía no se aplicó).
let sonidoHabilitadoPrevio = null;

function actualizarCampo(densidad) {
  // Interruptor "Habilitar Sonido": silencia TODO (drones, probes, acordes y colas en vuelo)
  // con un fade corto de 0,25 s. Solo se aplica cuando el estado cambia.
  const habilitado = !(typeof params !== "undefined" && params.pulsosEntidades === false);
  if (habilitado !== sonidoHabilitadoPrevio && typeof outputVolume === "function") {
    sonidoHabilitadoPrevio = habilitado;
    outputVolume(habilitado ? 1 : 0, 0.25);
  }

  const vGrave = (typeof params !== "undefined" && params.volGrave !== undefined) ? params.volGrave : 0.7;
  const vDrone = (typeof params !== "undefined" && params.volDrone !== undefined) ? params.volDrone : 0.7;

  // El volumen global de los drones sube y baja suavemente según la densidad de conexiones en la sala
  const factorDucking = map(densidad, 0, 1, 0.35, 1.15, true);

  if (gainConexionesMaster && typeof params !== "undefined" && params.volConexiones !== undefined) {
    gainConexionesMaster.amp(params.volConexiones, 0.05);
  }

  if (filtroDrones) {
    const corteFiltro = map(densidad, 0, 1, 380, 750, true);
    filtroDrones.freq(corteFiltro);
  }

  for (let i = 0; i < dronesGrave.length; i++) {
    const d = dronesGrave[i];
    const marea = map(sin(millis() * 0.000024 + d.seed), -1, 1, 0.6, 1.0);
    const ampFinal = d.maxAmp * factorDucking * marea * ((i === 0) ? vGrave : vDrone);
    d.osc.amp(ampFinal, 0.2);
  }
}