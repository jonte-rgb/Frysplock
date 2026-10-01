import { db } from '../db.js';
import { calculateStock, canonicalStockEvent, STOCK_EPSILON } from '../services/stock.js';
import { validateStockCount } from '../utils/numbers.js';

export async function addStockEvent({ produktId, typ, antal, enhet = 'plåt', källa }) {
  return db.transaction('rw', db.products, db.stockEvents, async () => {
    const product = await db.products.get(produktId);
    if (!product) throw new Error('Produkten finns inte längre.');
    const event = canonicalStockEvent({ typ, antal, enhet }, product.styckPerPlåt);
    return db.stockEvents.add({
      ...event, produktId, källa, styckPerPlåtVidHändelse: product.styckPerPlåt,
      tidpunkt: new Date().toISOString(),
    });
  });
}

export async function getEventsForProduct(produktId) {
  return db.stockEvents.where('produktId').equals(produktId).toArray();
}

export async function getStock(produktId, styckPerPlåt) {
  return calculateStock(await getEventsForProduct(produktId), styckPerPlåt);
}

export async function setStock(produktId, value) {
  const target = validateStockCount(value);
  return db.transaction('rw', db.products, db.stockEvents, async () => {
    const product = await db.products.get(produktId);
    if (!product) throw new Error('Produkten finns inte längre.');
    const difference = target - await getStock(produktId, product.styckPerPlåt);
    if (!Number.isFinite(difference)) throw new Error('Korrigeringen skulle ge ett ogiltigt saldo.');
    if (Math.abs(difference) > STOCK_EPSILON) {
      await db.stockEvents.add({
        produktId, typ: 'korrigering', antal: difference, enhet: 'plåt',
        källa: 'manuell justering', tidpunkt: new Date().toISOString(),
      });
    }
    return target;
  });
}

export async function getAllEvents() {
  return db.stockEvents.toArray();
}

export async function getEventsForProductSorted(produktId) {
  const events = await getEventsForProduct(produktId);
  return events.sort((a, b) => new Date(b.tidpunkt) - new Date(a.tidpunkt));
}
