import { db } from '../db';

export async function addStockEvent({ produktId, typ, antal, enhet, källa }) {
  return await db.stockEvents.add({
    produktId,
    typ, // 'plock', 'inlägg', 'bak', 'korrigering'
    antal,
    enhet, // 'plåt' eller 'styck'
    källa,
    tidpunkt: new Date().toISOString(),
  });
}

export async function getEventsForProduct(produktId) {
  return await db.stockEvents
    .where('produktId')
    .equals(produktId)
    .toArray();
}

export async function getStock(produktId, styckPerPlåt) {
  const events = await getEventsForProduct(produktId);
  let saldo = 0;

  for (const e of events) {
    let antal = e.antal;
    if (e.enhet === 'styck' && styckPerPlåt) {
      antal = antal / styckPerPlåt; // omvandla till plåtar
    }
    if (e.typ === 'plock') saldo -= antal;
    else if (e.typ === 'inlägg') saldo += antal;
    else if (e.typ === 'bak') saldo -= antal;
    else if (e.typ === 'korrigering') saldo += antal; // korrigering kan vara + eller -
  }

  return saldo;
}