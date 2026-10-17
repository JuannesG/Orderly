import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirmar-accion',
  templateUrl: './confirmar-accion.html',
  styleUrl: './confirmar-accion.css'
})
export class ConfirmarAccion {
  titulo = input.required<string>();
  mensaje = input<string>('');
  textoConfirmar = input<string>('Confirmar');
  confirmar = output<void>();
  cancelar = output<void>();
}
