import { db } from '../db.js';
import { parseDecimal } from '../utils/numbers.js';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalMinutes(value, label) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = parseDecimal(value, label);
  if (parsed <= 0) throw new Error(`${label} måste vara större än noll.`);
  return parsed;
}

export async function getBakeProfile(produktId) {
  return db.bakeProfiles.get(produktId);
}

export async function getAllBakeProfiles() {
  return db.bakeProfiles.toArray();
}

export async function saveBakeProfile(produktId, data) {
  return db.transaction('rw', db.products, db.bakeProfiles, async () => {
    const product = await db.products.get(produktId);
    if (!product || product.aktiv === false) throw new Error('Produkten finns inte längre.');

    const profile = {
      produktId,
      temperatur: clean(data.temperatur),
      baktid: clean(data.baktid),
      ånga: clean(data.ånga),
      spjäll: clean(data.spjäll),
      tining: clean(data.tining),
      jäsning: clean(data.jäsning),
      instruktion: clean(data.instruktion),
      tinaTimerMin: optionalMinutes(data.tinaTimerMin, 'Tinings-timer'),
      jäsTimerMin: optionalMinutes(data.jäsTimerMin, 'Jäs-timer'),
      bakaTimerMin: optionalMinutes(data.bakaTimerMin, 'Bak-timer'),
      uppdaterad: new Date().toISOString(),
    };

    await db.bakeProfiles.put(profile);
    return profile;
  });
}
