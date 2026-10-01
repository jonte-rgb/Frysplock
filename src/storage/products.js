import { db } from '../db.js';
import {
  cleanProductName, normalizeProductName, productUsesName, validateProduct,
} from '../services/productValidation.js';
import { canonicalStockEvent } from '../services/stock.js';

function checkUniqueName(products, product) {
  if (products.some((other) => other.id !== product.id && productUsesName(other, product.namn))) {
    throw new Error('Produktnamnet används redan som namn eller alias. Välj den befintliga produkten.');
  }
}

export async function addProduct(data) {
  const product = validateProduct({ ...data, id: undefined });
  return db.transaction('rw', db.products, async () => {
    checkUniqueName(await db.products.toArray(), product);
    const id = await db.products.add({
      namn: product.namn, styckPerPlåt: product.styckPerPlåt, alias: [],
      aktiv: true, skapad: new Date().toISOString(),
    });
    for (const alias of Array.isArray(data.alias) ? data.alias : []) {
      await addSafeProductAlias(id, alias);
    }
    return id;
  });
}

export async function getProduct(id) {
  return db.products.get(id);
}

export async function getAllProducts() {
  const products = await db.products.toArray();
  return products.filter((product) => product.aktiv !== false);
}

export async function updateProduct(id, changes) {
  return db.transaction('rw', db.products, db.stockEvents, async () => {
    const existing = await db.products.get(id);
    if (!existing) throw new Error('Produkten finns inte längre.');
    const product = validateProduct({ ...existing, ...changes, id });
    checkUniqueName(await db.products.toArray(), product);

    if (product.styckPerPlåt !== existing.styckPerPlåt) {
      const events = await db.stockEvents.where('produktId').equals(id).toArray();
      for (const event of events) {
        if (event.enhet !== 'styck' || event.typ === 'bak') continue;
        // Frys äldre omräkningar innan produktens faktor ändras. Behåll råvärden för spårning.
        const converted = canonicalStockEvent(event, existing.styckPerPlåt);
        await db.stockEvents.update(event.id, {
          antal: converted.antal, enhet: 'plåt',
          ursprungligtAntal: event.antal, ursprungligEnhet: event.enhet,
          styckPerPlåtVidHändelse: event.styckPerPlåtVidHändelse ?? existing.styckPerPlåt,
        });
      }
    }
    await db.products.update(id, {
      namn: product.namn, styckPerPlåt: product.styckPerPlåt,
      ...(typeof changes.aktiv === 'boolean' ? { aktiv: changes.aktiv } : {}),
    });
    return 1;
  });
}

export async function addSafeProductAlias(productId, value) {
  const alias = cleanProductName(value);
  if (alias.length < 2 || alias.length > 120 || !/\p{L}/u.test(alias)) return false;
  return db.transaction('rw', db.products, async () => {
    const products = await db.products.toArray();
    const product = products.find((p) => p.id === productId && p.aktiv !== false);
    if (!product) throw new Error('Produkten finns inte längre.');
    if (productUsesName(product, alias)) return false;
    if (products.some((p) => p.id !== productId && productUsesName(p, alias))) return false;
    await db.products.update(productId, {
      alias: [...(Array.isArray(product.alias) ? product.alias : []), alias],
    });
    return true;
  });
}

export async function findProductByName(namn) {
  const products = await getAllProducts();
  const matches = products.filter((p) => normalizeProductName(p.namn) === normalizeProductName(namn));
  return matches.length === 1 ? matches[0] : undefined;
}

export async function clearAllData() {
  return db.transaction('rw', db.products, db.stockEvents, db.pickLists, db.pickListRows, async () => {
    await db.products.clear();
    await db.stockEvents.clear();
    await db.pickLists.clear();
    await db.pickListRows.clear();
  });
}
