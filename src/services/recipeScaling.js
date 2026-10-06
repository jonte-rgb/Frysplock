import { parseDecimal } from '../utils/numbers.js';

function cleanText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function validateDoughRecipe(recipe) {
  const namn = cleanText(recipe?.namn);
  if (!namn) throw new Error('Degreceptet måste ha ett namn.');

  const basVatten = parseDecimal(recipe?.basVatten, 'Vatten i grundrecept');
  if (basVatten <= 0) throw new Error('Vatten i grundrecept måste vara större än noll.');

  const vattenEnhet = cleanText(recipe?.vattenEnhet) || 'l';
  const råIngredienser = Array.isArray(recipe?.ingredienser) ? recipe.ingredienser : [];
  if (råIngredienser.length === 0) throw new Error('Lägg till minst en ingrediens i receptet.');

  const ingredienser = råIngredienser.map((ing, index) => {
    const ingNamn = cleanText(ing?.namn);
    if (!ingNamn) throw new Error(`Ingrediens ${index + 1} saknar namn.`);
    const mängd = parseDecimal(ing?.mängd, `Mängd för ${ingNamn}`);
    if (mängd < 0) throw new Error(`Mängd för ${ingNamn} får inte vara negativ.`);
    const enhet = cleanText(ing?.enhet);
    if (!enhet) throw new Error(`Enhet saknas för ${ingNamn}.`);
    return { namn: ingNamn, mängd, enhet };
  });

  return { ...recipe, namn, basVatten, vattenEnhet, ingredienser };
}

export function scaleDoughRecipe(recipe, vattenMängd) {
  const valid = validateDoughRecipe(recipe);
  const vatten = parseDecimal(vattenMängd, 'Vattenmängd');
  if (vatten <= 0) throw new Error('Vattenmängden måste vara större än noll.');
  const faktor = vatten / valid.basVatten;

  return {
    faktor,
    vatten: { namn: 'Vatten', mängd: vatten, enhet: valid.vattenEnhet },
    ingredienser: valid.ingredienser.map((ing) => ({
      ...ing,
      mängd: ing.mängd * faktor,
    })),
  };
}
