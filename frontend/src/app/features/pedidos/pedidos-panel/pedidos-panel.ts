import { Component } from '@angular/core';
import { Auth } from '../../../core/services/auth';
import { ListaPedidos } from '../lista-pedidos/lista-pedidos';
import { PedidosLocal } from '../pedidos-local/pedidos-local';

@Component({
  selector: 'app-pedidos-panel',
  imports: [ListaPedidos, PedidosLocal],
  templateUrl: './pedidos-panel.html',
  styleUrl: './pedidos-panel.css'
})
export class PedidosPanel {
  pestana: 'domicilios' | 'local';

  constructor(private auth: Auth) {
    this.pestana = this.verDomicilios ? 'domicilios' : 'local';
  }

  get verDomicilios(): boolean {
    return ['dueño', 'domicilios'].includes(this.auth.rol() ?? '');
  }

  get verLocal(): boolean {
    return ['dueño', 'mesera'].includes(this.auth.rol() ?? '');
  }
}
