# 0030 · Textos en la pizarra: cajas de texto que se mueven y se giran

**Estado:** aceptada · 2026-10

## Contexto

La pizarra ([decisión 0029](0029-pizarra-y-bocetos.md)) solo dibuja a mano alzada. Al explicar algo sobre el mapa también hace falta escribir ("Parada", "Aquí se llena el bus", "5 min"), y que el texto se pueda poner donde se quiera, girar y mover después de ponerlo (issue #130).

## Decisión

- **Herramienta Texto**, junto a Mano y Lápiz. Con ella tocar el mapa (sin arrastrar) abre un cuadro para escribir (varias líneas, hasta 160 caracteres) y pone el texto en ese punto. El mapa se sigue pudiendo mover arrastrando, porque con Texto la capa del lápiz no cubre el mapa.
- **Un texto se elige tocándolo y entonces se puede:**
  - **Moverlo** arrastrándolo, o con las flechas del teclado (4 px; con Mayús, 16).
  - **Girarlo** arrastrando su manija (se acomoda a múltiplos de 15° cuando está a menos de 4°) o con los botones de girar a la izquierda y a la derecha, de a 15°.
  - **Editarlo**, cambiarle el color y el tamaño (normal de 20 px o grande de 32 px) y borrarlo.
- **Cajas HTML sobre el mapa, no una capa de símbolos del mapa.** Cada texto es un elemento posicionado con `map.project()` y actualizado en el evento `move`, así que se queda pegado a su sitio del mapa. Con HTML el marco, el arrastre, la manija y la edición son nativos; con una capa de símbolos no se podría mover ni girar un texto ya puesto sin construir encima casi lo mismo. El giro se guarda respecto al norte del mapa y en pantalla se muestra `giro − rumbo del mapa`, para que siga pegado también si el mapa se gira.
- **Al guardar, los textos se dibujan sobre la imagen** con un lienzo 2D (`dibujarTextos`): el HTML no sale en el lienzo del mapa. Usa la misma tipografía (Poppins), tamaño, interlineado, color, borde blanco y giro que se ven en pantalla, y espera hasta 2 s a que cargue la tipografía. El borde blanco hace que cualquier color se lea sobre el mapa claro y el oscuro, igual que en los trazos.
- **Deshacer ahora revierte cualquier acción**, no solo el último trazo: un trazo, un texto nuevo, mover, girar, cambiar el color o el tamaño, editar, borrar y borrar todo. El estado es una lista de elementos (trazos y textos, en orden) con instantáneas de las versiones anteriores (hasta 50). Como borrar todo ya se puede deshacer, su confirmación lo dice.
- **Datos:** los textos van en `bocetos.trazos` como puntos de GeoJSON con `{ texto, color, tamano, giro }`, junto a las líneas, en el orden en que se hicieron. **No hace falta una migración**: la tabla solo exige una FeatureCollection. Los bocetos anteriores siguen siendo válidos.

## Descartado

- **Capa de símbolos del mapa (`text-field`):** se dibujaría sola en la captura, pero mover, girar y editar un texto ya puesto exigiría igualmente una caja HTML encima para el marco y la manija, con el texto dibujado dos veces. Además depende de que el mapa base tenga la tipografía que se pida.
- **`html2canvas` u otra librería para capturar el HTML:** más pesada y menos exacta que volver a dibujar unos pocos textos en un lienzo.
- **Edición en el sitio (escribir directamente sobre el texto):** el cuadro de diálogo es más simple y funciona igual en celular, donde el teclado y el arrastre compiten por la pantalla.
- **Cajas con fondo o borde, fuentes a elegir, alinear a un lado, flechas:** quedan para después.

## Consecuencias

- Los textos son HTML, así que con Lápiz o Mano no se pueden mover (no estorban al dibujar ni al mover el mapa). Los marcadores de los lugares siguen sin salir en el pantallazo (decisión 0029).
- Si la tipografía de la app no está cargada al guardar, el texto sale con la del sistema (mismo tamaño y posición, otra letra).
- Con el mapa inclinado (pitch) la posición del texto sigue al mapa, pero el texto no se deforma con la perspectiva.
