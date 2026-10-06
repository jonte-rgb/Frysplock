import 'fake-indexeddb/auto';
import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db.js';
import { completePick } from '../src/services/picking.js';
import { calculateStock } from '../src/services/stock.js';
import { styckTillPlåtar, plåtarTillStyck } from '../src/services/productUnits.js';
import { findExactProduct } from '../src/services/productValidation.js';
import { addProduct, updateProduct, addSafeProductAlias, clearAllData } from '../src/storage/products.js';
import { createPickList, getRowsForPickList } from '../src/storage/pickLists.js';
import { addStockEvent, getStock, setStock } from '../src/storage/stockEvents.js';
import { parseOcrText } from '../src/utils/parseOcr.js';
import { formatDecimal, parseDecimal } from '../src/utils/numbers.js';

beforeEach(async () => { await clearAllData(); });
after(async () => { await db.delete(); });

async function fixture(antalStyck = 30) {
  const produktId = await addProduct({ namn: 'Kanelbullar', styckPerPlåt: 40 });
  await addStockEvent({ produktId, typ: 'inlägg', antal: 5, enhet: 'plåt' });
  const listId = await createPickList({ status: 'aktiv', rader: [{ produktId, antalStyck }] });
  const [row] = await getRowsForPickList(listId);
  return { produktId, listId, rowId: row.id };
}

test('Styck/plåt-konvertering och svensk decimalhantering', () => {
  assert.equal(styckTillPlåtar({ styckPerPlåt: 40 }, 30), 0.75);
  assert.equal(plåtarTillStyck({ styckPerPlåt: 40 }, 1.5), 60);
  assert.equal(parseDecimal('1,25'), 1.25);
  assert.equal(formatDecimal(1 / 3), '0,33');
  for (const factor of [0, -1, undefined, NaN, Infinity]) {
    assert.throws(() => styckTillPlåtar({ styckPerPlåt: factor }, 30));
  }
});

test('Samma rad ger bara ett lageruttag även vid samtidiga anrop och senare återförsök', async () => {
  const { produktId, listId, rowId } = await fixture();
  const results = await Promise.all([completePick({ rowId }), completePick({ rowId })]);
  assert.equal(results.filter((r) => r.alreadyPicked).length, 1);
  await completePick({ rowId, faktisktSaldo: 999 });
  assert.equal(await db.stockEvents.where('typ').equals('plock').count(), 1);
  assert.equal(await getStock(produktId, 40), 4.25);
  assert.equal((await db.pickListRows.get(rowId)).plockatAntal, 30);
  assert.equal((await db.pickLists.get(listId)).status, 'klar');
});

test('Plock korrigerar saldot efter uttaget och bevarar separata lagerhändelser', async () => {
  const { produktId, rowId } = await fixture();
  await completePick({ rowId, faktisktSaldo: '4,5' });
  const correction = await db.stockEvents.where('typ').equals('korrigering').first();
  assert.equal(correction.antal, 0.25);
  assert.equal(correction.enhet, 'plåt');
  assert.equal(await getStock(produktId, 40), 4.5);
});

test('Äldre styckhändelser och bak påverkar saldokorrigeringen enligt fryslagrets regler', async () => {
  const { produktId, rowId } = await fixture(40);
  await db.stockEvents.add({ produktId, typ: 'inlägg', antal: 80, enhet: 'styck' });
  await db.stockEvents.add({ produktId, typ: 'bak', antal: 100, enhet: 'plåt' });
  await completePick({ rowId, faktisktSaldo: 5.5 });
  assert.equal(await getStock(produktId, 40), 5.5);
  assert.equal((await db.stockEvents.where('typ').equals('korrigering').first()).antal, -0.5);
  assert.equal(calculateStock([{ typ: 'bak', antal: 3, enhet: 'plåt' }], 40), 0);
});

test('Manuell absolut korrigering läser aktuellt saldo i transaktionen', async () => {
  const { produktId } = await fixture();
  await Promise.all([setStock(produktId, 3.5), setStock(produktId, 3.5)]);
  assert.equal(await getStock(produktId, 40), 3.5);
  assert.equal(await db.stockEvents.where('typ').equals('korrigering').count(), 1);
});

test('En aktiv lista sparas med samtliga rader och behåller status aktiv', async () => {
  const produktId = await addProduct({ namn: 'Kanelbullar', styckPerPlåt: 40 });
  const id = await createPickList({ status: 'aktiv', rader: [
    { produktId, antalStyck: 30 }, { produktId, antalStyck: 20 },
  ] });
  assert.equal((await db.pickLists.get(id)).status, 'aktiv');
  assert.equal((await getRowsForPickList(id)).length, 2);
});

test('Fel under andra radens skrivning återställer både listan och tidigare rader', async () => {
  const produktId = await addProduct({ namn: 'Kanelbullar', styckPerPlåt: 40 });
  let writes = 0;
  const failSecondWrite = () => { if (++writes === 2) throw new Error('Simulerat skrivfel'); };
  db.pickListRows.hook('creating', failSecondWrite);
  try {
    await assert.rejects(createPickList({ status: 'aktiv', rader: [
      { produktId, antalStyck: 30 }, { produktId, antalStyck: 20 },
    ] }), /Simulerat skrivfel/);
  } finally { db.pickListRows.hook('creating').unsubscribe(failSecondWrite); }
  assert.equal(await db.pickLists.count(), 0);
  assert.equal(await db.pickListRows.count(), 0);
});

test('Fel under saldokorrigering återställer även uttag och plockstatus', async () => {
  const { produktId, rowId } = await fixture();
  const failCorrection = (_key, event) => {
    if (event.typ === 'korrigering') throw new Error('Simulerat korrigeringsfel');
  };
  db.stockEvents.hook('creating', failCorrection);
  try { await assert.rejects(completePick({ rowId, faktisktSaldo: 3 }), /Simulerat korrigeringsfel/); }
  finally { db.stockEvents.hook('creating').unsubscribe(failCorrection); }
  assert.equal(await getStock(produktId, 40), 5);
  assert.equal((await db.pickListRows.get(rowId)).plockad, false);
  assert.equal(await db.stockEvents.where('typ').equals('plock').count(), 0);
});

test('Tomma och dubbla produktnamn samt ogiltig plåtfaktor blockeras', async () => {
  await assert.rejects(addProduct({ namn: ' ', styckPerPlåt: 40 }));
  for (const factor of [0, -1, '', NaN, Infinity]) {
    await assert.rejects(addProduct({ namn: 'Ogiltig', styckPerPlåt: factor }));
  }
  await addProduct({ namn: 'Kanel bullar', styckPerPlåt: 40 });
  await assert.rejects(addProduct({ namn: '  KANEL   BULLAR ', styckPerPlåt: 20 }), /används redan/);
  assert.equal(await db.products.count(), 1);
  const attempts = await Promise.allSettled([
    addProduct({ namn: 'Vaniljbullar', styckPerPlåt: 30 }),
    addProduct({ namn: ' VANILJBULLAR ', styckPerPlåt: 30 }),
  ]);
  assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(await db.products.count(), 2);
});

test('Om produktens plåtfaktor ändras bevaras äldre styckhändelsers saldo och råvärden', async () => {
  const produktId = await addProduct({ namn: 'Kanelbullar', styckPerPlåt: 40 });
  const eventId = await db.stockEvents.add({ produktId, typ: 'inlägg', antal: 80, enhet: 'styck' });
  await updateProduct(produktId, { styckPerPlåt: 20 });
  assert.equal(await getStock(produktId, 20), 2);
  const event = await db.stockEvents.get(eventId);
  assert.equal(event.enhet, 'plåt');
  assert.equal(event.ursprungligtAntal, 80);
  assert.equal(event.styckPerPlåtVidHändelse, 40);
});

test('Ogiltig äldre data ger fel utan att skapa uttag eller skriva över data', async () => {
  const { produktId, rowId } = await fixture();
  await db.products.update(produktId, { styckPerPlåt: 0 });
  await assert.rejects(completePick({ rowId }), /större än noll/);
  assert.equal((await db.pickListRows.get(rowId)).plockad, false);
  assert.equal(await db.stockEvents.where('typ').equals('plock').count(), 0);
  assert.throws(() => calculateStock([{ typ: 'inlägg', antal: 10, enhet: 'styck' }], 0));
});

test('OCR-format stöds och otolkade/tvetydiga rader finns kvar för manuell granskning', () => {
  const rows = parseOcrText('Kanelbullar 30\n30 Kanelbullar\nKanelbullar 30 st\nOkänd produkt\n30\n30 Rågbröd 2\n---');
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.slice(0, 3).map((r) => [r.namn, r.antal]), [
    ['Kanelbullar', 30], ['Kanelbullar', 30], ['Kanelbullar', 30],
  ]);
  assert.equal(rows[3].ocrText, 'Okänd produkt');
  assert.equal(rows[3].antal, null);
  assert.equal(rows[5].antal, null);
});

test('OCR matchar bara entydiga namn/alias och alias kan inte ta en annan produkts namn', async () => {
  const a = await addProduct({ namn: 'Kanelbullar', styckPerPlåt: 40 });
  const b = await addProduct({ namn: 'Vaniljbullar', styckPerPlåt: 30 });
  assert.equal(await addSafeProductAlias(a, 'Kanelbulle'), true);
  assert.equal(await addSafeProductAlias(a, 'Vaniljbullar'), false);
  const products = await db.products.toArray();
  assert.equal(findExactProduct(products, '  KANELBULLE ').id, a);
  assert.equal(findExactProduct(products, 'Kanelbular'), null);
  assert.equal(findExactProduct([...products, { id: 999, namn: 'Kanelbulle' }], 'Kanelbulle'), null);
  assert.equal((await db.products.get(b)).namn, 'Vaniljbullar');
  const listId = await createPickList({ status: 'aktiv', rader: [{
    produktId: a, antalStyck: 30, alias: 'Kanel-snurror',
  }] });
  assert.equal((await getRowsForPickList(listId))[0].produktId, a);
  assert.ok((await db.products.get(a)).alias.includes('Kanel-snurror'));
});

test('Degrecept skalas proportionellt från vattenmängden', async () => {
  const { scaleDoughRecipe, validateDoughRecipe } = await import('../src/services/recipeScaling.js');
  const recipe = validateDoughRecipe({
    namn: 'Vetebröd', basVatten: '10', vattenEnhet: 'l',
    ingredienser: [
      { namn: 'Mjöl', mängd: '16', enhet: 'kg' },
      { namn: 'Jäst', mängd: '0,5', enhet: 'kg' },
    ],
  });
  const scaled = scaleDoughRecipe(recipe, '15');
  assert.equal(scaled.faktor, 1.5);
  assert.equal(scaled.ingredienser[0].mängd, 24);
  assert.equal(scaled.ingredienser[1].mängd, 0.75);
  assert.throws(() => scaleDoughRecipe(recipe, 0), /större än noll/);
});

test('Baktimer sparar en absolut sluttid och kan återställas efter att appen varit stängd', async () => {
  const { timerEndFromDuration, describeTimer } = await import('../src/services/bakeTimer.js');
  const now = new Date('2026-10-06T02:00:00Z').getTime();
  const end = timerEndFromDuration(30, now);
  assert.equal(end, '2026-10-06T02:30:00.000Z');
  assert.equal(describeTimer(end, now + 10 * 60_000).text, '20:00 kvar');
  assert.equal(describeTimer(end, now + 35 * 60_000).text, 'klar för 5:00 sedan');
});

test('Bakprofil och flera produkttimers sparas utan att påverka fryslagret', async () => {
  const { saveBakeProfile, getBakeProfile } = await import('../src/storage/bakeProfiles.js');
  const { startBakeTimer, getAllBakeTimers } = await import('../src/storage/bakeTimers.js');
  const produktId = await addProduct({ namn: 'Kanelbullar', styckPerPlåt: 40 });
  await addStockEvent({ produktId, typ: 'inlägg', antal: 5, enhet: 'plåt' });
  await saveBakeProfile(produktId, {
    temperatur: '210 °C', baktid: '11–13 min', jäsning: '45–60 min',
    jäsTimerMin: 50, bakaTimerMin: 12,
  });
  await startBakeTimer({ produktId, etikett: 'Jäsning', minuter: 50 });
  await startBakeTimer({ produktId, etikett: 'Bakning', minuter: 12 });
  assert.equal((await getBakeProfile(produktId)).temperatur, '210 °C');
  assert.equal((await getAllBakeTimers()).length, 2);
  assert.equal(await getStock(produktId, 40), 5);
  assert.equal(await db.stockEvents.count(), 1);
});
