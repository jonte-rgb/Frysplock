import { db } from '../db';
import { styckTillPlåtar } from './productUnits';

export async function completePick({ rowId, produkt, antalStyck, faktisktSaldo }) {
  return await db.transaction('rw', db.stockEvents, db.pickListRows, async () => {
    const plåtarAttPlocka = styckTillPlåtar(produkt, antalStyck);

    // 1. Logga plocket
    await db.stockEvents.add({
      produktId: produkt.id,
      typ: 'plock',
      antal: plåtarAttPlocka,
      enhet: 'plåt',
      källa: 'plocklista',
      sourceType: 'pickListRow',
      sourceId: rowId,
      tidpunkt: new Date().toISOString(),
    });

    // 2. Om användaren angett faktiskt saldo och det avviker, logga korrigering
    if (faktisktSaldo !== null && faktisktSaldo !== undefined) {
      // Hämta nuvarande saldo EFTER plocket
      const allaEvents = await db.stockEvents
        .where('produktId')
        .equals(produkt.id)
        .toArray();

      let saldo = 0;
      for (const e of allaEvents) {
        if (e.typ === 'plock') saldo -= e.antal;
        else if (e.typ === 'inlägg') saldo += e.antal;
        else if (e.typ === 'bak') saldo -= e.antal;
        else if (e.typ === 'korrigering') saldo += e.antal;
      }

      const skillnad = faktisktSaldo - saldo;
      if (Math.abs(skillnad) > 0.001) {
        await db.stockEvents.add({
          produktId: produkt.id,
          typ: 'korrigering',
          antal: skillnad,
          enhet: 'plåt',
          källa: 'plocklista',
          sourceType: 'pickListRow',
          sourceId: rowId,
          tidpunkt: new Date().toISOString(),
        });
      }
    }

    // 3. Markera raden som plockad
    await db.pickListRows.update(rowId, {
      plockad: true,
      plockatAntal: antalStyck,
    });
  });
}