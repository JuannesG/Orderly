from django.core.management.base import BaseCommand
from restaurantes.models import Restaurante
from menu.models import Categoria, Producto
from menu.models import Adicion


DATOS_MENU = {
    "Arepas": [
        ("Arepa Chorizo Cerdo", "Queso costeño, jamón, maíz tierno", 24000),
        ("Arepa Chicharrón", "Queso costeño, jamón, chicharrón", 28000),
        ("Arepa Ranchesui", "Queso costeño, suiza, ranchera, maíz tierno", 28000),
        ("Arepa Trifásica", "Queso costeño, chorizo, butifarra, chorizo de cerdo, jamón, maíz tierno", 24000),
        ("Arepa Combinada", "Queso costeño, carne, pollo, jamón, maíz tierno", 24000),
        ("Arepa MR LUCHO", "Queso costeño, carne, chicharrón, pollo, jamón, maíz tierno, queso gratinado", 30000),
    ],
    "Asados": [
        ("Ubre", "", 16000),
        ("Chuleta de cerdo", "", 24000),
        ("MR Chuleta de cerdo", "", 34000),
        ("Pechuga asada", "", 30000),
        ("Punta gorda", "", 35000),
        ("Asado Mixto", "Pechuga, punta gorda y lomo de cerdo", 42000),
        ("Lomo de cerdo", "", 28000),
        ("Chicharrón", "", 36000),
        ("Costilla BBQ", "", 36000),
        ("Asado Costeño", "Queso costeño asado, ranchera, lomo de cerdo, yuca, patacón, pico de gallo, chorizo cerdo, suiza", 75000),
    ],
    "Hamburguesas": [
        ("Sencilla", "Carne de la casa, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 26000),
        ("Pollo", "Pollo de la casa, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 26000),
        ("Chorizo Cerdo + Carne", "Carne de la casa, chorizo de cerdo, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 30000),
        ("Carne y Pollo", "Carne de la casa, pollo, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 30000),
        ("Ranchera + Carne", "Carne de la casa, ranchera, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 30000),
        ("Suiza + Carne", "Carne de la casa, suiza, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 30000),
        ("Doble Carne", "Doble porción de carne, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 30000),
        ("Doble Pollo", "Doble porción de pollo, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 30000),
        ("Pitonga", "Doble porción, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 33000),
        ("Hamburguesa MR LUCHO", "Carne de la casa, pollo, tocineta, ensalada, salsa de la casa, queso mozzarella, pepinillo, pan especial y francesa", 33000),
        ("Hamburguesa de la Casa", "Carne de cerdo, chorizo santandereano, queso mozzarella, cebolla caramelizada, salsa de la casa", 33000),
    ],
    "Desgranados": [
        ("Chorizo de Cerdo", "Queso costeño, maíz tierno, lechuga, chorizo de cerdo, patacón o bollo", 28000),
        ("Ranchero", "Queso costeño, maíz tierno, lechuga, ranchera, patacón o bollo", 30000),
        ("Suizo", "Queso costeño, maíz tierno, lechuga, suiza, patacón o bollo", 28000),
        ("Pollo", "Queso costeño, pollo, manguera, lechuga, patacón o bollo", 34000),
        ("Ransuizo", "Queso costeño, maíz tierno, lechuga, ranchera, suiza, patacón o bollo", 34000),
        ("Carne", "Queso costeño, maíz tierno, lechuga, carne, manguera, patacón o bollo", 34000),
        ("Choributi", "Queso costeño, maíz tierno, lechuga, chorizo, butifarra, pollo o carne", 34000),
        ("Chorizo de Cerdo (pollo o carne)", "Queso costeño, maíz tierno, lechuga, chorizo de cerdo, pollo o carne", 34000),
        ("Ranchero (pollo o carne)", "Queso costeño, maíz tierno, lechuga, ranchera, pollo o carne", 36000),
        ("Suiza (pollo o carne)", "Queso costeño, maíz tierno, lechuga, suiza, pollo o carne", 36000),
        ("Pollo y Punta Gorda", "Queso costeño, maíz tierno, lechuga, pollo, carne, patacón o bollo", 36000),
        ("Desgranado Combinado", "Queso costeño, maíz tierno, lechuga, ranchera, suiza, chorizo, butifarra, chorizo de cerdo, patacón o bollo", 50000),
        ("Desgranado MR LUCHO", "Queso costeño, maíz tierno, lechuga, pollo, punta gorda, chorizo, butifarra, francesa, patacón o bollo", 65000),
        ("Desgranado Salvajado", "Queso costeño, maíz tierno, lechuga, francesa, pollo, punta gorda, chorizo, butifarra, patacón o bollo", 75000),
    ],
    "Salchipapas": [
        ("Salchi Sencilla", "Francesa, manguera, queso costeño, lechuga, chongo", 17000),
        ("Salchichoributi", "", 17000),
        ("Salchi Chorizo de Cerdo", "", 25000),
        ("Salchigratinado", "", 25000),
        ("Salchisuiza", "", 25000),
        ("Salchirranchera", "", 28000),
        ("Salchipollo", "", 28000),
        ("Salchitrifásica", "", 28000),
        ("Salchichoributi + Punta Gorda", "", 34000),
        ("Salchichoricerdo + Punta Gorda", "", 34000),
        ("Salchisuiza + Punta Gorda", "", 34000),
        ("SALCHI MR LUCHO", "Francesa, chorizo, butifarra, punta gorda, pollo, queso costeño, lechuga, chongo", 60000),
        ("Salvajada", "Francesa, chorizo, butifarra, punta gorda, pollo, queso costeño, lechuga, chongo (para 4 personas)", 75000),
        ("Mega Cumpleañera", "Para 5 personas", 100000),
        ("Salchi Tocineta", "", 30000),
        ("Salchipollo + Punta Gorda", "", 36000),
        ("Salchicombinada", "", 36000),
        ("Salchisuiza + Ranchera", "", 36000),
    ],
    "Patacones": [
        ("Pataconaso Sencilla", "Chorizo de cerdo, chorizo y butifarra, cebolla, pimentón, maíz tierno, lechuga, queso", 26000),
        ("Pataconaso Mixto", "Ranchera, suiza, pollo, cebolla, pimentón, maíz tierno, lechuga, queso, gratinado", 55000),
        ("Pataconaso Trifásico", "Chorizo cerdo, butifarra, pollo, carne, cebolla, maíz tierno, lechuga, queso, gratinado", 55000),
        ("Pataconaso Combinada", "Pollo y carne", 55000),
        ("PATACONASO MR LUCHO", "Chorizo de cerdo, butifarra, pollo, carne, chicharrón, cebolla, pimentón, maíz tierno, lechuga, queso, gratinado", 72000),
    ],
    "Picadas": [
        ("Picada Choributi", "Chorizo, butifarra y patacón", 10000),
        ("Picada de Chorizo de Cerdo", "Chorizo de cerdo y patacón", 12000),
        ("Picada Mixta", "Chorizo, butifarra, chorizo de cerdo, patacón", 15000),
        ("Picada Mixta + Desgranado", "Chorizo, butifarra, chorizo de cerdo, patacón, queso mozzarella, maíz", 20000),
        ("Picada Combinada", "Francesa, patacón, ranchera, chorizo, chorizo de cerdo, queso, maíz tierno", 34000),
        ("Picada Currambera", "200gr punta gorda, 300gr lomo de cerdo, 200gr pechuga, pico de gallo, yuca, patacón, ensalada maíz tierno, limón, salsa de la casa", 65000),
        ("Picada Ransuipollo", "Ranchera, suiza, pollo, patacón, queso y salsa", 26000),
        ("Picada Pitonga", "Pollo, chorizo de cerdo, chicharrón, yuca, patacón, ensalada", 50000),
        ("Picada Mega Especial", "500gr chicharrón, 500gr costilla, 200gr pechuga, 200gr lomo cerdo, chorizo cerdo, patacón, yuca, pico de gallo, salchicha ranchera asada, suiza asada, salsa", 125000),
    ],
    "Perros": [
        ("Perro Sencillo", "Salchicha, queso costeño, lechuga, pan, chongo", 10000),
        ("Perro Plancha", "Salchicha, queso costeño, lechuga, pan, chongo", 10000),
        ("Perro Choributi", "Chorizo, butifarra, queso costeño, lechuga, pan, chongo", 13000),
        ("Perro Chorizo de Cerdo", "Queso costeño, lechuga, pan, chongo", 15000),
        ("Perro Gemelo", "Doble salchicha, queso costeño, lechuga, pan, chongo", 15000),
        ("Perro Italiano", "Salchicha, queso mozzarella, lechuga, pan, jamón", 17000),
        ("Perro Miti Suizo", "Media suiza, queso mozzarella, lechuga, pan, chongo", 15000),
        ("Perro Pico de Gallo", "Salchicha, pico de gallo de la casa, queso mozzarella, maíz tierno, lechuga, chongo", 15000),
        ("Perro Gratinado", "Salchicha, queso costeño, maíz tierno, lechuga, pan, chongo, queso mozzarella", 15000),
        ("Perro Tocineta", "Salchicha, queso costeño, maíz tierno, tocineta, lechuga, pan, chongo, queso mozzarella", 17000),
        ("Perro Suizo", "Suiza, queso mozzarella, lechuga, pan, chongo", 18000),
        ("Perro Ranchero", "Ranchera, queso mozzarella, lechuga, pan, chongo", 18000),
        ("Perro Pollo", "Pollo, queso mozzarella, lechuga, pan, chongo", 18000),
        ("Perro Italosuizo", "Suiza, queso mozzarella, jamón, lechuga, pan, chongo", 21000),
        ("Perro Suizo + Salami", "Suiza, jamón, queso mozzarella, lechuga, pan, chongo", 21000),
        ("Perro MR LUCHO", "Francesa, chorizo, butifarra, punta gorda, queso costeño, gratinado", 28000),
    ],
    "Pollo Broaster": [
        ("Ala", "", 6000),
        ("Muslo", "", 6000),
        ("Contramuslo", "", 6000),
        ("Pechuga", "", 9000),
    ],
    "Bebidas": [
        ("Personal 400ml", "", 5000),
        ("Litro 1.5L Plástica", "", 10000),
        ("Hit Litro", "", 10000),
        ("Maracuyá", "", 5000),
        ("Corozo", "", 5000),
        ("Ginger", "", 5000),
        ("Bretaña", "", 5000),
        ("Agua", "", 2000),
    ],
    "Platos Especiales": [
        ("Alitas BBQ", "6 und de alitas bbq o picantes, francesa, ensalada", 37000),
        ("Picada Pri Pra", "500gr de chicharrón, 500gr de costilla bbq, chorizo santandereano, ensalada, papa francesa, yuca, patacón, pico de gallo", 85000),
        ("Combo Mini Salchipapa", "3 mini salchipapas empacadas en combo", 30000),
        ("Salchi Especial", "Francesa, pollo, ranchera, gratinado, chorizo de cerdo, salchicha santandereana", 50000),
    ],
    "Burrito": [
        ("Pollo + Punta Gorda", "", 26000),
        ("Suiza + Ranchera", "", 27000),
        ("Suiza y Pollo o Punta Gorda", "", 27000),
        ("Ranchera y Pollo o Punta Gorda", "", 26000),
        ("Chorizo de Cerdo", "", 26000),
    ],
    "Platos Recomendados": [
        ("Salchipapa Costillera", "Francesa, ranchera, 500gr de costilla BBQ, salsa BBQ, salsa de la casa, queso mozzarella, lechuga, chongo", 55000),
        ("Salchipapa Chicharronera", "Francesa, queso gratinado, manguera, 500gr de chicharrón, lechuga, salsa de la casa, chongo", 55000),
        ("Pico de Gallo", "Pico de gallo de la casa, chorizo de cerdo, ranchera, pollo, francesa, tajada de guineo verde, limón, verduras", 55000),
    ],
    "Dulces": [
        ("Fresa con Crema", "", 16000),
        ("Gelatina", "", 12000),
        ("Postre Tres Leches", "", 18000),
        ("Postre Cumpleaños", "", 20000),
    ],
}

DATOS_ADICIONES = [
    ("Francesa", 8000),
    ("Yuca", 4000),
    ("Patacón", 4000),
    ("Gratinado", 10000),
    ("Ranchera", 10000),
    ("Chorizo de Cerdo", 7000),
    ("Suiza", 10000),
    ("Manguera", 5000),
    ("Carne", 12000),
    ("Pollo", 12000),
]

class Command(BaseCommand):
    help = 'Carga el menú completo de Mr Lucho en la base de datos'

    def handle(self, *args, **options):
        restaurante = Restaurante.objects.first()

        if not restaurante:
            self.stdout.write(self.style.ERROR('No hay ningún restaurante creado. Crea uno primero en el admin.'))
            return

        total_categorias = 0
        total_productos = 0

        for nombre_categoria, productos in DATOS_MENU.items():
            categoria, creada = Categoria.objects.get_or_create(
                restaurante=restaurante,
                nombre=nombre_categoria
            )
            if creada:
                total_categorias += 1

            for nombre_producto, descripcion, precio in productos:
                producto, creado = Producto.objects.get_or_create(
                    categoria=categoria,
                    nombre=nombre_producto,
                    defaults={'descripcion': descripcion, 'precio': precio}
                )
                if creado:
                    total_productos += 1

                total_adiciones = 0

        for nombre_adicion, precio in DATOS_ADICIONES:
            adicion, creada = Adicion.objects.get_or_create(
                restaurante=restaurante,
                nombre=nombre_adicion,
                defaults={'precio': precio}
            )
            if creada:
                total_adiciones += 1

        self.stdout.write(self.style.SUCCESS(
            f'Listo: {total_categorias} categorías nuevas, {total_productos} productos nuevos, '
            f'y {total_adiciones} adiciones nuevas creadas.'
        ))