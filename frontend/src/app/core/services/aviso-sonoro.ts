import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AvisoSonoro {
  activo = false;
  private contexto: AudioContext | null = null;

  // Hay que llamarlo desde un toque del usuario: el navegador no deja sonar antes.
  activar() {
    this.contexto = this.contexto ?? new AudioContext();
    this.contexto.resume();
    this.activo = true;
    this.sonar();
  }

  desactivar() {
    this.activo = false;
  }

  sonar() {
    const ctx = this.contexto;
    if (!ctx) return;

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
