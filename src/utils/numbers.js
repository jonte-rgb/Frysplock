const decimalFormatter = new Intl.NumberFormat('sv-SE', {
  useGrouping: false,
  maximumFractionDigits: 2,
});

export function parseDecimal(value, label = 'Värdet') {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) {
      throw new Error(`${label} måste vara ett giltigt tal.`);
    }
    value = Number(text.replace(',', '.'));
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} måste vara ett giltigt tal.`);
  }
  return value;
}

export function formatDecimal(value) {
  try { value = parseDecimal(value); } catch { return '–'; }
  const formatted = decimalFormatter.format(value);
  return formatted === '-0' || formatted === '−0' ? '0' : formatted;
}

export function validatePieceCount(value) {
  const count = parseDecimal(value, 'Antal styck');
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error('Antal styck måste vara ett positivt heltal.');
  }
  return count;
}

export function validateStockCount(value) {
  const count = parseDecimal(value, 'Saldo');
  if (count < 0) throw new Error('Faktiskt saldo får inte vara negativt.');
  return count;
}
