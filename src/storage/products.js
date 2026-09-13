import { db } from '../db';

export async function addProduct({ namn, styckPerPlåt, alias = [] }) {
  return await db.products.add({
    namn,
    styckPerPlåt,
    alias,
    aktiv: true,
    skapad: new Date().toISOString(),
  });
}

export async function getProduct(id) {
  return await db.products.get(id);
}

export async function getAllProducts() {
  const alla = await db.products.toArray();
  return alla.filter((p) => p.aktiv !== false);
}
export async function updateProduct(id, changes) {
  return await db.products.update(id, changes);
}

export async function findProductByName(namn) {
  const products = await db.products.toArray();
  return products.find(
    (p) => p.namn.toLowerCase() === namn.toLowerCase()
  );
}
export async function clearAllData() {
  await db.products.clear();
  await db.stockEvents.clear();
  await db.pickLists.clear();
  await db.pickListRows.clear();
}