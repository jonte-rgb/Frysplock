import Dexie from 'dexie';

export const db = new Dexie('FrysplockDB');

db.version(1).stores({
  products: '++id, namn, aktiv',
  stockEvents: '++id, produktId, typ, tidpunkt',
  pickLists: '++id, datum, status',
  pickListRows: '++id, pickListId, produktId',
});

db.version(2).stores({
  products: '++id, namn, aktiv',
  stockEvents: '++id, produktId, typ, tidpunkt, sourceId',
  pickLists: '++id, datum, status',
  pickListRows: '++id, pickListId, produktId',
});

db.version(3).stores({
  products: '++id, namn, aktiv',
  stockEvents: '++id, produktId, typ, tidpunkt, sourceId',
  pickLists: '++id, datum, status',
  pickListRows: '++id, pickListId, produktId',
  doughRecipes: '++id, namn',
  bakeProfiles: 'produktId',
  bakeTimers: '++id, produktId, slutTid, skapad',
});
