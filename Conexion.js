class Conexion {
  constructor(a, b, distancia) {
    this.a = a;
    this.b = b;
    this.distancia = distancia;   // distancia al nacer (solo informativa; el dibujo usa la distancia en vivo)
    this.vida = 1.0;
    this.brilloFlash = 0.0;
    this.seed = random(1000);
  }

  destellar() {
    this.brilloFlash = 0.1;
  }

  // Lógica (se llama siempre, se dibuje o no localmente).
  // k = cuadros transcurridos (1 a 60 fps): el decaimiento no depende del framerate.
  actualizar(k = 1) {
    this.brilloFlash *= Math.pow(0.88, k);
    if (this.brilloFlash < 0.01) this.brilloFlash = 0;
  }

  // --- Funciones compartidas: el notebook y el proyector dibujan EXACTAMENTE igual ---

  // dist siempre en píxeles del notebook (la escala que usa distConexion).
  static alpha(dist, distRef, vida, opacidadLineas, flash) {
    const base = map(dist, 0, distRef, 180, 20, true);   // constrain: no se va a negativo si se estiran
    return constrain(base * vida * opacidadLineas + flash * 255, 0, 255);
  }

  static grosor(flash) {
    return map(flash, 0, 1, 0.9, 3.2);
  }

  // Filamento ondulado. k = factor de escala de pantalla (proyector / notebook).
  // Usa vertex() (no curveVertex) para que la línea llegue hasta las dos células.
  static trazar(ax, ay, bx, by, seed, k = 1) {
    noFill();
    const perp = atan2(by - ay, bx - ax) + HALF_PI;
    const pasos = 10;
    beginShape();
    for (let i = 0; i <= pasos; i++) {
      const t = i / pasos;
      const x = lerp(ax, bx, t);
      const y = lerp(ay, by, t);
      const n = noise((x / k) * 0.01, (y / k) * 0.01, frameCount * 0.01 + seed);
      const offset = map(n, 0, 1, -10, 10) * k * sin(t * PI);
      vertex(x + cos(perp) * offset, y + sin(perp) * offset);
    }
    endShape();
  }

  dibujar() {
    const distRef = (typeof params !== "undefined" && params.distConexion) ? params.distConexion : 160;
    const d = dist(this.a.x, this.a.y, this.b.x, this.b.y);
    stroke(255, Conexion.alpha(d, distRef, this.vida, params.opacidadLineas, this.brilloFlash));
    strokeWeight(Conexion.grosor(this.brilloFlash));
    Conexion.trazar(this.a.x, this.a.y, this.b.x, this.b.y, this.seed, 1);
  }
}
