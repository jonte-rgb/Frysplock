import { db } from '../db.js';
import { validateProduct } from '../services/productValidation.js';
import { validatePieceCount } from '../utils/numbers.js';
import { addSafeProductAlias } from './products.js';
import { completePick } from '../services/picking.js';

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function validatedRow(row) {
  const product = await db.products.get(row.produktId);
  if (!product || product.aktiv === false) throw new Error('En vald produkt finns inte längre.');
  validateProduct(product);
  return {
    produktId: product.id, antalStyck: validatePieceCount(row.antalStyck), ocrText: row.ocrText ?? null,
    plockad: false, plockatAntal: null,
  };
}

export async function createPickList({ datum, bilder = [], status = 'utkast', rader = [], ignoreradeOcrRader = [] } = {}) {
  if (!['utkast', 'aktiv'].includes(status)) throw new Error('Ogiltig status för en ny plocklista.');
  if (!Array.isArray(rader) || (status === 'aktiv' && rader.length === 0)) {
    throw new Error('Lägg till minst en giltig rad innan listan sparas.');
  }
  return db.transaction('rw', db.products, db.pickLists, db.pickListRows, async () => {
    const rows = [];
    for (const row of rader) rows.push(await validatedRow(row));
    const id = await db.pickLists.add({
      datum: datum || localDate(), bilder, status, ignoreradeOcrRader, skapad: new Date().toISOString(),
    });
    for (const row of rows) await db.pickListRows.add({ ...row, pickListId: id });
    for (const row of rader) {
      if (row.alias) await addSafeProductAlias(row.produktId, row.alias);
    }
    return id;
  });
}

export async function addPickListRow({ pickListId, ...row }) {
  return db.transaction('rw', db.products, db.pickLists, db.pickListRows, async () => {
    const list = await db.pickLists.get(pickListId);
    if (!list || !['utkast', 'aktiv'].includes(list.status)) throw new Error('Listan kan inte ändras.');
    return db.pickListRows.add({ ...await validatedRow(row), pickListId });
  });
}

export async function getPickList(id) {
  return db.pickLists.get(id);
}

export async function getRowsForPickList(pickListId) {
  return db.pickListRows.where('pickListId').equals(pickListId).toArray();
}

export async function markRowPicked(rowId) {
  return completePick({ rowId });
}

export async function updatePickListStatus(id, status) {
  return db.pickLists.update(id, { status });
}

export async function getAllPickLists() {
  const lists = await db.pickLists.toArray();
  return lists.filter((list) => list.status !== 'borttagen');
}

export async function deletePickList(id) {
  return db.transaction('rw', db.pickLists, db.pickListRows, async () => {
    await db.pickListRows.where('pickListId').equals(id).delete();
    return db.pickLists.delete(id);
  });
}
