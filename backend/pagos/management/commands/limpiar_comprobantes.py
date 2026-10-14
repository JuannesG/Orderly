from datetime import timedelta

import cloudinary.uploader
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from pagos.models import Pago


class Command(BaseCommand):
    help = (
        'Borra los comprobantes de pagos ya aceptados o rechazados con más de '
        'N días. El pago y el pedido se conservan; solo se elimina la imagen.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dias', type=int, default=None,
            help='Días a conservar (por defecto, COMPROBANTES_DIAS).',
        )
        parser.add_argument(
            '--simular', action='store_true',
            help='Muestra qué se borraría, sin borrar nada.',
        )

    def handle(self, *args, **opciones):
        dias = opciones['dias'] if opciones['dias'] is not None else settings.COMPROBANTES_DIAS
        limite = timezone.now() - timedelta(days=dias)

        pagos = Pago.objects.filter(
            estado_verificacion__in=['aceptado', 'rechazado'],
            pedido__creado_en__lt=limite,
        ).filter(
            (Q(comprobante__isnull=False) & ~Q(comprobante='')) |
            (Q(comprobante_url__isnull=False) & ~Q(comprobante_url=''))
        )

        borrados = 0
        for pago in pagos:
            if opciones['simular']:
                self.stdout.write(f'Se borraría el comprobante del pago {pago.id}')
                borrados += 1
                continue

            try:
                if pago.comprobante:
                    pago.comprobante.delete(save=False)

                if pago.comprobante_url:
                    if not settings.USAR_CLOUDINARY:
                        self.stdout.write(self.style.WARNING(
                            f'Pago {pago.id}: tiene imagen en Cloudinary pero '
                            'CLOUDINARY_URL no está configurado; se omite.'
                        ))
                        continue
                    cloudinary.uploader.destroy(
                        f'comprobantes/{pago.id}', resource_type='image'
                    )
                    pago.comprobante_url = None

                pago.save(update_fields=['comprobante', 'comprobante_url'])
                borrados += 1
            except Exception as error:
                self.stdout.write(self.style.ERROR(
                    f'Pago {pago.id}: no se pudo borrar ({error})'
                ))

        accion = 'por borrar' if opciones['simular'] else 'borrados'
        self.stdout.write(self.style.SUCCESS(
            f'Comprobantes {accion}: {borrados} (más de {dias} días)'
        ))