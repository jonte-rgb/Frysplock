import { styckTillPlåtar } from './productUnits.js';
import { parseDecimal } from '../utils/numbers.js';

export const STOCK_EPSILON = 1e-9;
const directions = { plock: -1, inlägg: 1, korrigering: 1, bak: 0 };

export function eventAmountInTrays(event, styckPerPlåt) {
  const amount = parseDecimal(event.antal, 'Lagerhändelsens antal');
  if (event.enhet === 'plåt') return amount;
  if (event.enhet === 'styck') {
    return styckTillPlåtar({
      styckPerPlåt: event.styckPerPlåtVidHändelse ?? styckPerPlåt,
    }, amount);
  }
  throw new Error('En äldre lagerhändelse har en okänd enhet. Saldot kan inte beräknas säkert.');
}

export function stockChange(event, styckPerPlåt) {
  if (!Object.hasOwn(directions, event.typ)) {
    throw new Error('En lagerhändelse har en okänd typ. Saldot kan inte beräknas säkert.');
  }
  // Bakning sker efter att produkten redan lämnat frysen vid plock.
  if (event.typ === 'bak') return 0;
  const amount = eventAmountInTrays(event, styckPerPlåt);
  if (event.typ !== 'korrigering' && amount < 0) {
    throw new Error('En äldre lagerhändelse har ett ogiltigt negativt antal.');
  }
  return directions[event.typ] * amount;
}

export function calculateStock(events, styckPerPlåt) {
  const total = events.reduce((saldo, event) => saldo + stockChange(event, styckPerPlåt), 0);
  if (!Number.isFinite(total)) throw new Error('Saldot kan inte beräknas säkert.');
  return Math.abs(total) < STOCK_EPSILON ? 0 : total;
}

export function canonicalStockEvent(event, styckPerPlåt) {
  if (!Object.hasOwn(directions, event.typ)) throw new Error('Ogiltig lagerhändelsetyp.');
  const antal = eventAmountInTrays(event, styckPerPlåt);
  if (event.typ !== 'korrigering' && antal < 0) {
    throw new Error('Antal i en lagerhändelse får inte vara negativt.');
  }
  return { ...event, antal, enhet: 'plåt' };
}
