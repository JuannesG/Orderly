import { Injectable } from '@angular/core';

const CLAVE = 'sonido_activo';
const EVENTOS = ['click', 'keydown'];

@Injectable({
  providedIn: 'root',
})
export class AvisoSonoro {
  activo = localStorage.getItem(CLAVE) === '1';
  listo = false;
  private contexto: AudioContext | null = null;

  constructor() {
    if (this.activo) {
      this.esperarPrimerToque();
    }
  }

  get texto(): string {
    if (!this.activo) return 'Activar sonido';
    return this.listo ? 'Sonido activado' : 'Toca aquí para activar el sonido';
  }

  private esperarPrimerToque() {
    const iniciar = () => {
      EVENTOS.forEach((e) => document.removeEventListener(e, iniciar));
      this.prepararContexto();
    };
    EVENTOS.forEach((e) => document.addEventListener(e, iniciar));
  }

  private prepararContexto(): Promise<void> {
    this.contexto = this.contexto ?? new AudioContext();
    return this.contexto.resume().then(() => {
      this.listo = this.contexto?.state === 'running';
    });
  }

  activar() {
    localStorage.setItem(CLAVE, '1');
    this.activo = true;
    this.prepararContexto().then(() => this.sonar());
  }

  desactivar() {
    localStorage.removeItem(CLAVE);
    this.activo = false;
  }

  sonar() {
    const ctx = this.contexto;
    if (!ctx || ctx.state !== 'running') return;

    const tono = (frecuencia: number, inicio: number) => {
      const oscilador = ctx.createOscillator();
      const volumen = ctx.createGain();
      oscilador.frequency.value = frecuencia;
      oscilador.connect(volumen);
      volumen.connect(ctx.destination);

      const t = ctx.currentTime + inicio;
      volumen.gain.setValueAtTime(0.0001, t);
      volumen.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      oscilador.start(t);
      oscilador.stop(t + 0.32);
    };

    tono(880, 0);
    tono(1175, 0.35);
  }
}
