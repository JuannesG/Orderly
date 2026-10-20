import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideUserPlus,
  LucideUser,
  LucidePencil,
  LucideKeyRound,
  LucideUserX,
  LucideUserCheck,
  LucideTrash2,
  LucideX,
  LucideEye,
  LucideEyeOff,
  LucideCircleAlert,
  LucideCircleCheck
} from '@lucide/angular';
import { UsuarioService, UsuarioEquipo } from '../../../core/services/usuario';
import { ConfirmarAccion } from '../../../shared/confirmar-accion/confirmar-accion';

const ROLES = [
  { valor: 'dueño', etiqueta: 'Dueño' },
  { valor: 'domicilios', etiqueta: 'Domicilios' },
  { valor: 'mesera', etiqueta: 'Mesera' }
];

interface AccionPendiente {
  tipo: 'desactivar' | 'eliminar';
  usuario: UsuarioEquipo;
}

@Component({
  selector: 'app-lista-equipo',
  imports: [
    CommonModule,
    FormsModule,
    ConfirmarAccion,
    LucideUserPlus,
    LucideUser,
    LucidePencil,
    LucideKeyRound,
    LucideUserX,
    LucideUserCheck,
    LucideTrash2,
    LucideX,
    LucideEye,
    LucideEyeOff,
    LucideCircleAlert,
    LucideCircleCheck
  ],
  templateUrl: './lista-equipo.html',
  styleUrl: './lista-equipo.css'
})
export class ListaEquipo implements OnInit {
  usuarios: UsuarioEquipo[] = [];
  cargando = true;
  error = '';
  aviso = '';
  roles = ROLES;

  // Formulario de crear / editar
  formAbierto = false;
  editando: UsuarioEquipo | null = null;
  nombre = '';
  apellido = '';
  username = '';
  rol = 'mesera';
  clave = '';
  mostrarClave = false;
  errorForm = '';
  guardando = false;

  // Contraseña nueva
  claveDe: UsuarioEquipo | null = null;
  nuevaClave = '';
  mostrarNuevaClave = false;
  errorClave = '';
  guardandoClave = false;

  // Confirmación de desactivar / eliminar
  accion: AccionPendiente | null = null;

  constructor(
    private usuarioService: UsuarioService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.usuarioService.listar().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.error = this.mensajeError(err, 'No se pudo cargar el equipo.');
        this.cdr.detectChanges();
      }
    });
  }

  etiquetaRol(rol: string): string {
    return ROLES.find((r) => r.valor === rol)?.etiqueta ?? rol;
  }

  rolClase(rol: string): string {
    return rol === 'dueño' ? 'dueno' : rol;
  }

  // ---------- Crear / editar ----------

  abrirCrear() {
    this.editando = null;
    this.nombre = '';
    this.apellido = '';
    this.username = '';
    this.rol = 'mesera';
    this.clave = '';
    this.mostrarClave = false;
    this.errorForm = '';
    this.formAbierto = true;
  }

  abrirEditar(u: UsuarioEquipo) {
    this.editando = u;
    this.nombre = u.first_name;
    this.apellido = u.last_name;
    this.username = u.username;
    this.rol = u.rol;
    this.errorForm = '';
    this.formAbierto = true;
  }

  cerrarFormulario() {
    if (this.guardando) return;
    this.formAbierto = false;
    this.clave = '';
  }

  guardar() {
    if (this.guardando) return;

    const nombre = this.nombre.trim();
    const apellido = this.apellido.trim();
    if (!nombre || !apellido) {
      this.errorForm = 'Escribe el nombre y el apellido.';
      return;
    }

    if (this.editando) {
      this.guardando = true;
      this.errorForm = '';
      this.usuarioService
        .editar(this.editando.id, { first_name: nombre, last_name: apellido, rol: this.rol })
        .subscribe({
          next: () => this.terminarFormulario('Cambios guardados.'),
          error: (err) => this.falloFormulario(err, 'No se pudieron guardar los cambios.')
        });
      return;
    }

    const username = this.username.trim();
    if (!username || !this.clave) {
      this.errorForm = 'Escribe el usuario y la contraseña temporal.';
      return;
    }

    this.guardando = true;
    this.errorForm = '';
    this.usuarioService
      .crear({
        username,
        first_name: nombre,
        last_name: apellido,
        rol: this.rol,
        password: this.clave
      })
      .subscribe({
        next: () => this.terminarFormulario(`Cuenta de ${nombre} ${apellido} creada.`),
        error: (err) => this.falloFormulario(err, 'No se pudo crear la cuenta.')
      });
  }

  private terminarFormulario(aviso: string) {
    this.guardando = false;
    this.formAbierto = false;
    this.clave = '';
    this.mostrarAviso(aviso);
    this.cargar();
  }

  private falloFormulario(err: any, defecto: string) {
    this.guardando = false;
    this.errorForm = this.mensajeError(err, defecto);
    this.cdr.detectChanges();
  }

  generarClave() {
    this.clave = this.claveAleatoria();
    this.mostrarClave = true;
  }

  // ---------- Contraseña nueva ----------

  abrirClave(u: UsuarioEquipo) {
    this.claveDe = u;
    this.nuevaClave = '';
    this.mostrarNuevaClave = false;
    this.errorClave = '';
  }

  cerrarClave() {
    if (this.guardandoClave) return;
    this.claveDe = null;
    this.nuevaClave = '';
  }

  generarNuevaClave() {
    this.nuevaClave = this.claveAleatoria();
    this.mostrarNuevaClave = true;
  }

  guardarClave() {
    const u = this.claveDe;
    if (!u || this.guardandoClave) return;

    if (!this.nuevaClave) {
      this.errorClave = 'Escribe la contraseña nueva.';
      return;
    }

    this.guardandoClave = true;
    this.errorClave = '';
    this.usuarioService.cambiarClave(u.id, this.nuevaClave).subscribe({
      next: () => {
        this.guardandoClave = false;
        this.claveDe = null;
        this.nuevaClave = '';
        this.mostrarAviso(`Contraseña de ${u.nombre_completo} actualizada.`);
      },
      error: (err) => {
        this.guardandoClave = false;
        this.errorClave = this.mensajeError(err, 'No se pudo cambiar la contraseña.');
        this.cdr.detectChanges();
      }
    });
  }

  // ---------- Desactivar, reactivar, eliminar ----------

  pedirDesactivar(u: UsuarioEquipo) {
    this.accion = { tipo: 'desactivar', usuario: u };
  }

  pedirEliminar(u: UsuarioEquipo) {
    this.accion = { tipo: 'eliminar', usuario: u };
  }

  cancelarAccion() {
    this.accion = null;
  }

  get tituloConfirmacion(): string {
    if (!this.accion) return '';
    return this.accion.tipo === 'desactivar' ? '¿Desactivar esta cuenta?' : '¿Eliminar esta cuenta?';
  }

  get mensajeConfirmacion(): string {
    if (!this.accion) return '';
    const nombre = this.accion.usuario.nombre_completo;
    return this.accion.tipo === 'desactivar'
      ? `${nombre} no podrá entrar al sistema. Puedes reactivarla cuando quieras.`
      : `${nombre} se eliminará para siempre. Esto no se puede deshacer.`;
  }

  get textoConfirmacion(): string {
    return this.accion?.tipo === 'desactivar' ? 'Sí, desactivar' : 'Sí, eliminar';
  }

  confirmarAccion() {
    const pendiente = this.accion;
    this.accion = null;
    if (!pendiente) return;

    const usuario = pendiente.usuario;

    if (pendiente.tipo === 'desactivar') {
      this.usuarioService.desactivar(usuario.id).subscribe({
        next: () => {
          this.mostrarAviso(`${usuario.nombre_completo} fue desactivado.`);
          this.cargar();
        },
        error: (err) => this.falloAccion(err, 'No se pudo desactivar la cuenta.')
      });
      return;
    }

    this.usuarioService.eliminar(usuario.id).subscribe({
      next: () => {
        this.mostrarAviso(`${usuario.nombre_completo} fue eliminado.`);
        this.cargar();
      },
      error: (err) => this.falloAccion(err, 'No se pudo eliminar la cuenta.')
    });
  }

  reactivar(u: UsuarioEquipo) {
    this.usuarioService.reactivar(u.id).subscribe({
      next: () => {
        this.mostrarAviso(`${u.nombre_completo} fue reactivado.`);
        this.cargar();
      },
      error: (err) => this.falloAccion(err, 'No se pudo reactivar la cuenta.')
    });
  }

  private falloAccion(err: any, defecto: string) {
    this.aviso = '';
    this.error = this.mensajeError(err, defecto);
    this.cdr.detectChanges();
  }

  // ---------- Apoyos ----------

  private mostrarAviso(texto: string) {
    this.error = '';
    this.aviso = texto;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.aviso = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  private claveAleatoria(): string {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = new Uint32Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => caracteres[b % caracteres.length]).join('');
  }

  private mensajeError(err: any, porDefecto: string): string {
    if (err?.status === 0) {
      return 'No hay conexión con el servidor. Revisa el internet e intenta de nuevo.';
    }
    const e = err?.error;
    if (e && typeof e === 'object') {
      const partes = Object.values(e).flat().map(String);
      if (partes.length) return partes.join(' ');
    }
    return porDefecto;
  }
}
