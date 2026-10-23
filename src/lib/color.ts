/** true si el color es claro y lo que vaya encima (texto, íconos) debe ser oscuro. */
export function esClaro(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}
