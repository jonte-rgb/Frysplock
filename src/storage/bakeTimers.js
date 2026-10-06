import { db } from '../db.js';
import { timerEndFromDuration } from '../services/bakeTimer.js';

export async function getAllBakeTimers() {
  const timers = await db.bakeTimers.toArray();
  return timers.sort((a, b) => new Date(a.slutTid) - new Date(b.slutTid));
}

export async function startBakeTimer({ produktId, etikett, minuter }) {
  return db.transaction('rw', db.products, db.bakeTimers, async () => {
    const product = await db.products.get(produktId);
    if (!product || product.aktiv === false) throw new Error('Produkten finns inte längre.');
    const label = typeof etikett === 'string' ? etikett.trim() : '';
    if (!label) throw new Error('Timern måste ha ett namn.');
    const now = Date.now();
    return db.bakeTimers.add({
      produktId,
      produktNamn: product.namn,
      etikett: label,
      startTid: new Date(now).toISOString(),
      slutTid: timerEndFromDuration(minuter, now),
      skapad: new Date(now).toISOString(),
    });
  });
}

export async function deleteBakeTimer(id) {
  await db.bakeTimers.delete(id);
}
