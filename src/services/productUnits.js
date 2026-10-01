export function styckTillPlåtar(produkt, styck) {
  if (!produkt?.styckPerPlåt) return 0;
  return styck / produkt.styckPerPlåt;
}

export function plåtarTillStyck(produkt, plåtar) {
  if (!produkt?.styckPerPlåt) return 0;
  return plåtar * produkt.styckPerPlåt;
}

export function avrundaPlåtar(plåtar) {
  return Math.round(plåtar * 10) / 10;
}