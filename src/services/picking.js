import { db } from '../db.js';
import { styckTillPlåtar } from './productUnits.js';
import { validateProduct } from './productValidation.js';
import { STOCK_EPSILON } from './stock.js';
import { getStock } from '../storage/stockEvents.js';
import { validatePieceCount, validateStockCount } from '../utils/numbers.js';

export async function completePick({ rowId, faktisktSaldo = null }) {
  return db.transaction('rw', db.products, db.stockEvents, db.pickListRows, db.pickLists, async () => {
    const row = await db.pickListRows.get(rowId);
    if (!row) throw new Error('Plockraden finns inte längre.');
    // Läs status från databasen under samma skrivlås som lageruttaget.
    if (row.plockad) return { alreadyPicked: true };
    const list = await db.pickLists.get(row.pickListId);
    if (!list || list.status === 'borttagen' || list.status === 'klar') {
      throw new Error('Plocklistan är inte längre tillgänglig för plock.');
    }
    const storedProduct = await db.products.get(row.produktId);
    if (!storedProduct || storedProduct.aktiv === false) throw new Error('Produkten är inte tillgänglig.');
    const product = validateProduct(storedProduct);
    const antalStyck = validatePieceCount(row.antalStyck);
    const plåtarAttPlocka = styckTillPlåtar(product, antalStyck);
    const target = faktisktSaldo === null ? null : validateStockCount(faktisktSaldo);
    const tidpunkt = new Date().toISOString();
    const source = { sourceType: 'pickListRow', sourceId: rowId, källa: 'plocklista' };
    // Kontrollera också äldre historik innan något nytt uttag kan sparas.
    const saldoEfterPlock = await getStock(product.id, product.styckPerPlåt) - plåtarAttPlocka;
    if (!Number.isFinite(saldoEfterPlock)) throw new Error('Plocket skulle ge ett ogiltigt saldo.');
    await db.stockEvents.add({
      ...source, produktId: product.id, typ: 'plock', antal: plåtarAttPlocka,
      enhet: 'plåt', styckPerPlåtVidHändelse: product.styckPerPlåt, tidpunkt,
    });
    if (target !== null) {
      const difference = target - saldoEfterPlock;
      if (!Number.isFinite(difference)) throw new Error('Korrigeringen skulle ge ett ogiltigt saldo.');
      if (Math.abs(difference) > STOCK_EPSILON) {
        await db.stockEvents.add({
          ...source, produktId: product.id, typ: 'korrigering', antal: difference,
          enhet: 'plåt', tidpunkt,
        });
      }
    }
    await db.pickListRows.update(rowId, {
      plockad: true, plockatAntal: antalStyck, plockadTidpunkt: tidpunkt,
    });
    const rows = await db.pickListRows.where('pickListId').equals(row.pickListId).toArray();
    await db.pickLists.update(row.pickListId, { status: rows.every((r) => r.plockad) ? 'klar' : 'aktiv' });
    return { alreadyPicked: false, saldo: target ?? saldoEfterPlock };
  });
}
