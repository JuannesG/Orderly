import { Injectable } from '@angular/core';

const NEGOCIO = 'MR LUCHO';
const ESLOGAN = 'Comidas rápidas y asados';

const ZONAS: { [clave: string]: string } = {
  salon: 'Salón',
  terraza: 'Terraza',
  para_llevar: 'Para llevar'
};

const METODOS: { [clave: string]: string } = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  bancolombia: 'Bancolombia'
};

const ESTILOS = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    width: 72mm; margin: 0 auto; padding: 3mm 1mm 6mm;
    font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.35; color: #000;
  }
  .centro { text-align: center; }
  .negocio { font-size: 18px; font-weight: bold; }
  .aviso { border: 1px solid #000; text-align: center; font-weight: bold; padding: 3px; margin: 6px 0; }
  .linea { border-top: 1px dashed #000; margin: 6px 0; }
  .fila { display: flex; justify-content: space-between; gap: 6px; }
  .adicion { padding-left: 8px; font-size: 11px; }
  .categoria { font-size: 10px; text-transform: uppercase; margin-top: 3px; }
  .destacado { font-size: 15px; font-weight: bold; text-align: center; margin: 4px 0; }
  .total { font-size: 15px; font-weight: bold; }
  .obs { margin-top: 4px; font-style: italic; }
  .pie { font-size: 10px; text-align: center; margin-top: 8px; }
`;

@Injectable({
  providedIn: 'root',
})
export class Recibo {
  imprimir(pedido: any) {
    const marco = document.createElement('iframe');
    marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(marco);

    const ventana = marco.contentWindow!;
    ventana.document.open();
    ventana.document.write(this.armarHtml(pedido));
    ventana.document.close();

    ventana.onafterprint = () => marco.remove();
    setTimeout(() => {
      ventana.focus();
      ventana.print();
    }, 300);
    setTimeout(() => marco.remove(), 120000);
  }

  // Todo texto escrito por personas pasa por aquí antes de ir al recibo.
  private esc(texto: unknown): string {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private moneda(valor: number | string): string {
    return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(valor));
  }

  private armarHtml(pedido: any): string {
    const esLocal = pedido.tipo === 'local';
    const momento = new Date(pedido.creado_en);
    const fecha = momento.toLocaleDateString('es-CO');
    const hora = momento.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    const lineas = (pedido.detalles ?? [])
      .map((d: any) => {
        const adiciones = (d.adiciones ?? [])
          .map(
            (a: any) => `
          <div class="fila adicion">
            <span>+ ${this.esc(a.nombre)}</span>
            <span>${this.moneda(Number(a.precio) * d.cantidad)}</span>
          </div>`
          )
          .join('');
        const categoria = d.categoria_nombre
          ? `<div class="categoria">${this.esc(d.categoria_nombre)}</div>`
          : '';
        return `
          ${categoria}
          <div class="fila">
            <span>${d.cantidad}x ${this.esc(d.producto_nombre)}</span>
            <span>${this.moneda(Number(d.precio_unitario) * d.cantidad)}</span>
          </div>
          ${adiciones}`;
      })
      .join('');

    let encabezadoPedido: string;
    let metodo: string;
    let totales: string;

    if (esLocal) {
      const zona = ZONAS[pedido.zona] ?? pedido.zona;
      const lugar = pedido.zona === 'para_llevar' ? `${zona} · ${pedido.nota}` : `${zona} · Mesa ${pedido.mesa}`;
      const mesera = pedido.mesera_nombre ?? pedido.mesero_nombre ?? '';
      encabezadoPedido = `
        <div class="destacado">EN EL LOCAL</div>
        <div class="destacado">${this.esc(lugar)}</div>
        ${mesera ? `<div>Atiende: ${this.esc(mesera)}</div>` : ''}`;
      metodo = METODOS[pedido.metodo_pago_local] ?? '';
      totales = `
        <div class="fila total"><span>TOTAL</span><span>${this.moneda(pedido.total)}</span></div>`;
    } else {
      encabezadoPedido = `
        <div class="destacado">DOMICILIO</div>
        <div>Cliente: ${this.esc(pedido.cliente_nombre)}</div>
        <div>Tel: ${this.esc(pedido.cliente_telefono)}</div>
        <div>Dir: ${this.esc(pedido.cliente_direccion)}</div>
        ${pedido.cliente_referencia ? `<div>Ref: ${this.esc(pedido.cliente_referencia)}</div>` : ''}`;
      metodo = METODOS[pedido.pago?.metodo] ?? '';
      totales = `
        <div class="fila"><span>Subtotal</span><span>${this.moneda(pedido.subtotal)}</span></div>
        <div class="fila"><span>Domicilio</span><span>${this.moneda(pedido.costo_domicilio)}</span></div>
        <div class="fila total"><span>TOTAL</span><span>${this.moneda(pedido.total)}</span></div>`;
    }

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Recibo</title>
  <style>${ESTILOS}</style>
</head>
<body>
  <div class="centro negocio">${NEGOCIO}</div>
  <div class="centro">${ESLOGAN}</div>
  <div class="aviso">· RECIBO DE PEDIDO ·</div>

  <div>${fecha} · ${hora}</div>
  ${encabezadoPedido}
  <div class="linea"></div>

  ${lineas}
  ${pedido.observaciones ? `<div class="obs">Obs: ${this.esc(pedido.observaciones)}</div>` : ''}

  <div class="linea"></div>
  ${totales}
  ${metodo ? `<div>Pago: ${this.esc(metodo)}</div>` : ''}

  <div class="linea"></div>
  <div class="pie">· ¡Gracias por tu pedido! ·</div>
</body>
</html>`;
  }
}
