const formatoNumero = new Intl.NumberFormat('es-CO')

/** 1234 → '1.234' (como se escribe en Colombia). */
export const numero = (valor: number) => formatoNumero.format(valor)
