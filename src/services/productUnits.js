import { parseDecimal } from '../utils/numbers.js';

function conversionFactor(produkt) {
  const factor = parseDecimal(produkt?.styckPerPlåt, 'Styck per plåt');
  if (factor <= 0) throw new Error('Styck per plåt måste vara större än noll.');
  return factor;
}

export function styckTillPlåtar(produkt, styck) {
  const result = parseDecimal(styck, 'Antal styck') / conversionFactor(produkt);
  if (!Number.isFinite(result)) throw new Error('Antalet kan inte omvandlas till plåtar.');
  return result;
}

export function plåtarTillStyck(produkt, plåtar) {
  const result = parseDecimal(plåtar, 'Antal plåtar') * conversionFactor(produkt);
  if (!Number.isFinite(result)) throw new Error('Antalet kan inte omvandlas till styck.');
  return result;
}

export function avrundaPlåtar(plåtar) {
  return Math.round(plåtar * 10) / 10;
}
