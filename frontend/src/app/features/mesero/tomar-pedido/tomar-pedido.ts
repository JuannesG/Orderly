import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Zona = 'salon' | 'terraza' | 'para_llevar';

@Component({
  selector: 'app-tomar-pedido',
  imports: [FormsModule],
  templateUrl: './tomar-pedido.html',
  styleUrl: './tomar-pedido.css'
})
export class TomarPedido {
  zona: Zona | null = null;
  mesa = '';
  nota = '';

  readonly mesasSalon = Array.from({ length: 17 }, (_, i) => String(i + 1));
  readonly mesasTerraza = Array.from({ length: 11 }, (_, i) => `A${i + 1}`);

  get mesas(): string[] {
    if (this.zona === 'salon') return this.mesasSalon;
    if (this.zona === 'terraza') return this.mesasTerraza;
    return [];
  }

  elegirZona(zona: Zona) {
    this.zona = zona;
    this.mesa = '';
    this.nota = '';
  }

  elegirMesa(mesa: string) {
    this.mesa = mesa;
  }

  get listoParaPedir(): boolean {
    if (this.zona === 'para_llevar') return this.nota.trim().length > 0;
    return this.zona !== null && this.mesa !== '';
  }

  get destino(): string {
    if (this.zona === 'salon') return `Salón · Mesa ${this.mesa}`;
    if (this.zona === 'terraza') return `Terraza · Mesa ${this.mesa}`;
    return `Para llevar · ${this.nota.trim()}`;
  }
}
