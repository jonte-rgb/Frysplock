import { db } from '../db';

export async function createPickList({ datum, bilder = [] }) {
  return await db.pickLists.add({
    datum: datum || new Date().toISOString().split('T')[0],
    bilder,
    status: 'utkast',
    skapad: new Date().toISOString(),
  });
}

export async function addPickListRow({ pickListId, produktId, antalStyck, ocrText }) {
  return await db.pickListRows.add({
    pickListId,
    produktId,
    antalStyck,
    ocrText,
    plockad: false,
    plockatAntal: null,
  });
}

export async function getPickList(id) {
  return await db.pickLists.get(id);
}

export async function getRowsForPickList(pickListId) {
  return await db.pickListRows.where('pickListId').equals(pickListId).toArray();
}

export async function markRowPicked(rowId, plockatAntal) {
  return await db.pickListRows.update(rowId, {
    plockad: true,
    plockatAntal,
  });
}

export async function updatePickListStatus(id, status) {
  return await db.pickLists.update(id, { status });
}
export async function getAllPickLists() {
  const alla = await db.pickLists.toArray();
  return alla.filter((l) => l.status !== 'borttagen');
}

export async function deletePickList(id) {
  const rows = await db.pickListRows.where('pickListId').equals(id).toArray();
  for (const row of rows) {
    await db.pickListRows.delete(row.id);
  }
  return await db.pickLists.delete(id);
}