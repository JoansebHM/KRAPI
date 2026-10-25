/**
 * Enlaces para el teléfono del contacto de un lugar. Los números de Colombia se escriben sin
 * indicativo (300 123 4567); WhatsApp lo necesita, así que se le agrega el 57.
 */
export function enlacesTelefono(telefono: string) {
  const digitos = telefono.replace(/\D/g, '')
  const internacional = telefono.trim().startsWith('+')
  // Celular colombiano: 10 dígitos que empiezan por 3. Un fijo no tiene WhatsApp.
  const celular = internacional || (digitos.length === 10 && digitos.startsWith('3'))
  return {
    llamar: `tel:${internacional ? '+' : ''}${digitos}`,
    whatsapp: celular ? `https://wa.me/${internacional ? digitos : `57${digitos}`}` : null,
  }
}
