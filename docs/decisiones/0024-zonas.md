# 0024 · Zonas: tipo, comentarios y recorridos

**Estado:** aceptada · 2026-10 · Refs #15

## Contexto

Las zonas existían en la base de datos (polígonos dentro de Manila) pero no se podían crear. El equipo las necesita para dos cosas: saber **de qué es** cada área del barrio (comercial, residencial…) y registrar **los recorridos**: cada vez que alguien cubre una manzana o una calle, qué encontró. Las zonas que se asignan en una salida son otra cosa ([decisión 0025](0025-salidas-y-asignaciones.md)).

## Decisión

- **Una sola zona** junta las dos cosas: su **tipo** (opcional), sus **comentarios** y su **histórico de recorridos**. Así no hay dos polígonos encimados para la misma manzana.
- **Tipo de zona:** una lista administrable con color (`tipos_zona`), como las categorías de los puntos. Las zonas se pintan en el mapa con ese color; sin tipo, en lila. Cualquier cuenta activa crea y edita tipos; solo un admin los borra (las zonas quedan sin tipo).
- **Comentarios** (`comentarios_zona`): cada uno guarda quién lo escribió y cuándo. Lo borra quien lo escribió o un admin. Las zonas no tienen fotos propias: las fotos van en los recorridos.
- **Recorridos:** son estudios de la zona, iguales a los de un punto (fecha, horas, participantes, notas y evidencias) pero **sin "a quién se entrevistó"**.
- **Locales adentro:** la ficha muestra los puntos dentro de la zona o sobre su borde (`locales_en_zona()`), con poca información (nombre y fecha de su último estudio) y un botón **"Ver"** para ir a su ficha.
- **Dibujo:** con la misma mira del punto: "Agregar esquina", "Deshacer" y "Terminar", viendo la forma y el área. No deja terminar con menos de 3 esquinas, fuera de Manila, con lados cruzados o con menos de **20 m²** (la base de datos también lo exige). Para cambiar la forma, se **redibuja completa**.
- **Sin estado activa/cerrada:** una zona se archiva y se recupera, y se borra solo si no tiene estudios.

## Descartado

- **Zonas informativas y de recorrido por separado:** duplica polígonos.
- **Arrastrar las esquinas para editar la forma:** difícil con el dedo en celular y mucho más trabajo; redibujar basta.
- **Notas en lugar de comentarios:** los comentarios dicen quién y cuándo, y la información de la zona se va sumando.

## Consecuencias

- Al crear un punto o una zona, el "+" pregunta cuál.
- La regla de 20 m² puede rechazar una zona que se ve bien a un zoom muy lejano: hay que acercar el mapa.
