import { parseDecimal } from '../utils/numbers.js';

export function cleanProductName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function normalizeProductName(value) {
  return cleanProductName(value).normalize('NFKC').toLocaleLowerCase('sv-SE');
}

export function validateProduct(product) {
  const namn = cleanProductName(product?.namn);
  if (!namn) throw new Error('Produktnamn får inte vara tomt.');
  const styckPerPlåt = parseDecimal(product?.styckPerPlåt, 'Styck per plåt');
  if (styckPerPlåt <= 0) throw new Error('Styck per plåt måste vara större än noll.');
  return { ...product, namn, styckPerPlåt };
}

export function productUsesName(product, name) {
  const normalized = normalizeProductName(name);
  return Boolean(normalized) && (
    normalizeProductName(product.namn) === normalized ||
    (Array.isArray(product.alias) && product.alias.some(
      (alias) => normalizeProductName(alias) === normalized
    ))
  );
}

export function findExactProduct(products, name) {
  const matches = products.filter((product) =>
    product.aktiv !== false && productUsesName(product, name)
  );
  // Äldre dubbletter och alias-krockar får aldrig avgöras med "första träffen".
  return matches.length === 1 ? matches[0] : null;
}
