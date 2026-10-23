import {
  Baby, Banknote, BedDouble, Beer, Bike, BookOpen, Briefcase, Building2, Bus, Camera, Car, Church, Clapperboard,
  Coffee, Construction, Croissant, CupSoda, Dumbbell, Flower2, Fuel, Gem, GraduationCap, Hammer, Hospital, Hotel,
  House, IceCreamCone, Landmark, Laptop, MapPin, Martini, Music, Palette, PawPrint, Pill, Pizza, Recycle, Sandwich,
  School, Scissors, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, Sparkles, SquareParking, Stethoscope, Store,
  Ticket, Trees, UtensilsCrossed, Volleyball, Wine, Wrench, type LucideIcon,
} from 'lucide-react'

/**
 * Catálogo de íconos para las categorías (Lucide, licencia ISC).
 * En la base de datos se guarda la clave (por ejemplo 'cafe'); aquí se traduce a su dibujo.
 * Para agregar un ícono: importarlo de lucide-react y añadir una entrada con una clave nueva.
 * No cambies claves existentes: las categorías guardadas las usan.
 */
export interface IconoCatalogo {
  clave: string
  nombre: string
  /** Otras palabras con las que se puede buscar. */
  palabras: string
  Icono: LucideIcon
}

export const ICONOS_CATEGORIA: IconoCatalogo[] = [
  { clave: 'cafe', nombre: 'Café', palabras: 'cafetería tinto coffee', Icono: Coffee },
  { clave: 'restaurante', nombre: 'Restaurante', palabras: 'comida almuerzo cubiertos', Icono: UtensilsCrossed },
  { clave: 'comida-rapida', nombre: 'Comida rápida', palabras: 'sándwich hamburguesa perro', Icono: Sandwich },
  { clave: 'pizzeria', nombre: 'Pizzería', palabras: 'pizza italiana', Icono: Pizza },
  { clave: 'panaderia', nombre: 'Panadería', palabras: 'pan pastelería repostería', Icono: Croissant },
  { clave: 'heladeria', nombre: 'Heladería', palabras: 'helado postre', Icono: IceCreamCone },
  { clave: 'bebidas', nombre: 'Bebidas', palabras: 'jugo gaseosa refresco', Icono: CupSoda },
  { clave: 'bar', nombre: 'Bar', palabras: 'cerveza pola licor', Icono: Beer },
  { clave: 'vinos', nombre: 'Vinos', palabras: 'vino licorera', Icono: Wine },
  { clave: 'discoteca', nombre: 'Discoteca', palabras: 'coctel rumba fiesta noche', Icono: Martini },
  { clave: 'hotel', nombre: 'Hotel', palabras: 'hotelería hospedaje', Icono: Hotel },
  { clave: 'hostal', nombre: 'Hostal', palabras: 'alojamiento cama airbnb', Icono: BedDouble },
  { clave: 'tienda', nombre: 'Tienda', palabras: 'comercio local negocio', Icono: Store },
  { clave: 'compras', nombre: 'Compras', palabras: 'bolsa boutique almacén', Icono: ShoppingBag },
  { clave: 'supermercado', nombre: 'Supermercado', palabras: 'mercado víveres carrito minimercado', Icono: ShoppingCart },
  { clave: 'ropa', nombre: 'Ropa', palabras: 'moda prendas calzado', Icono: Shirt },
  { clave: 'joyeria', nombre: 'Joyería', palabras: 'joyas accesorios', Icono: Gem },
  { clave: 'peluqueria', nombre: 'Peluquería', palabras: 'barbería corte belleza', Icono: Scissors },
  { clave: 'estetica', nombre: 'Estética', palabras: 'spa uñas belleza', Icono: Sparkles },
  { clave: 'farmacia', nombre: 'Farmacia', palabras: 'droguería medicamentos', Icono: Pill },
  { clave: 'salud', nombre: 'Salud', palabras: 'médico consultorio clínica odontología', Icono: Stethoscope },
  { clave: 'hospital', nombre: 'Hospital', palabras: 'urgencias clínica', Icono: Hospital },
  { clave: 'gimnasio', nombre: 'Gimnasio', palabras: 'gym ejercicio pesas', Icono: Dumbbell },
  { clave: 'deporte', nombre: 'Deporte', palabras: 'cancha fútbol balón', Icono: Volleyball },
  { clave: 'educacion', nombre: 'Educación', palabras: 'universidad instituto academia', Icono: GraduationCap },
  { clave: 'colegio', nombre: 'Colegio', palabras: 'escuela', Icono: School },
  { clave: 'libreria', nombre: 'Librería', palabras: 'libros biblioteca papelería', Icono: BookOpen },
  { clave: 'iglesia', nombre: 'Iglesia', palabras: 'templo religión parroquia', Icono: Church },
  { clave: 'entidad-publica', nombre: 'Entidad pública', palabras: 'gobierno institución alcaldía', Icono: Landmark },
  { clave: 'edificio', nombre: 'Edificio', palabras: 'torre oficinas centro comercial', Icono: Building2 },
  { clave: 'vivienda', nombre: 'Vivienda', palabras: 'casa residencial hogar apartamento', Icono: House },
  { clave: 'oficina', nombre: 'Oficina', palabras: 'empresa coworking trabajo', Icono: Briefcase },
  { clave: 'tecnologia', nombre: 'Tecnología', palabras: 'computadores celulares electrónica', Icono: Laptop },
  { clave: 'taller', nombre: 'Taller', palabras: 'reparación mecánica servicio técnico', Icono: Wrench },
  { clave: 'ferreteria', nombre: 'Ferretería', palabras: 'herramientas materiales', Icono: Hammer },
  { clave: 'obra', nombre: 'Obra', palabras: 'construcción', Icono: Construction },
  { clave: 'vehiculos', nombre: 'Vehículos', palabras: 'carro concesionario lavadero', Icono: Car },
  { clave: 'gasolinera', nombre: 'Gasolinera', palabras: 'combustible estación servicio', Icono: Fuel },
  { clave: 'transporte', nombre: 'Transporte', palabras: 'bus paradero metro', Icono: Bus },
  { clave: 'bicicletas', nombre: 'Bicicletas', palabras: 'cicla ciclovía', Icono: Bike },
  { clave: 'parqueadero', nombre: 'Parqueadero', palabras: 'parqueo estacionamiento', Icono: SquareParking },
  { clave: 'parque', nombre: 'Parque', palabras: 'zona verde árboles naturaleza', Icono: Trees },
  { clave: 'mascotas', nombre: 'Mascotas', palabras: 'veterinaria perro gato', Icono: PawPrint },
  { clave: 'floristeria', nombre: 'Floristería', palabras: 'flores vivero', Icono: Flower2 },
  { clave: 'musica', nombre: 'Música', palabras: 'concierto instrumentos', Icono: Music },
  { clave: 'arte', nombre: 'Arte', palabras: 'galería cultura', Icono: Palette },
  { clave: 'cine', nombre: 'Cine y teatro', palabras: 'teatro entretenimiento', Icono: Clapperboard },
  { clave: 'fotografia', nombre: 'Fotografía', palabras: 'foto estudio', Icono: Camera },
  { clave: 'banco', nombre: 'Banco', palabras: 'cajero dinero finanzas', Icono: Banknote },
  { clave: 'eventos', nombre: 'Eventos', palabras: 'boletas entradas', Icono: Ticket },
  { clave: 'infantil', nombre: 'Infantil', palabras: 'niños guardería bebés jardín', Icono: Baby },
  { clave: 'reciclaje', nombre: 'Reciclaje', palabras: 'basura residuos', Icono: Recycle },
  { clave: 'seguridad', nombre: 'Seguridad', palabras: 'vigilancia policía cai', Icono: ShieldCheck },
  { clave: 'lugar', nombre: 'Lugar', palabras: 'pin genérico otro', Icono: MapPin },
]

const PORDEFECTO = ICONOS_CATEGORIA[ICONOS_CATEGORIA.length - 1]

/** Ícono de una clave guardada. Si no hay o no se reconoce, el genérico (pin). */
export function iconoDe(clave: string | null | undefined): IconoCatalogo {
  return ICONOS_CATEGORIA.find((icono) => icono.clave === clave) ?? PORDEFECTO
}

/**
 * Sugiere un ícono a partir del nombre de la categoría ("Panadería" → croissant).
 * Busca palabras completas en el nombre y las palabras clave de cada ícono.
 */
export function sugerirIcono(nombreCategoria: string, normalizar: (texto: string) => string): string | null {
  const palabras = normalizar(nombreCategoria)
    .split(/[^a-z0-9ñ]+/)
    .filter((palabra) => palabra.length >= 3)
    // También en singular: "restaurantes" → "restaurante", "bares" → "bar".
    .flatMap((palabra) => [palabra, palabra.replace(/es$/, ''), palabra.replace(/s$/, '')])
  if (palabras.length === 0) return null
  const coincide = ICONOS_CATEGORIA.find(({ clave, nombre, palabras: claves }) => {
    const opciones = normalizar(`${nombre} ${claves}`).split(/\s+/)
    return clave !== 'lugar' && palabras.some((palabra) => opciones.includes(palabra))
  })
  return coincide?.clave ?? null
}
