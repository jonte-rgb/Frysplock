import { db } from '../db.js';
import { validateDoughRecipe } from '../services/recipeScaling.js';

export async function getAllDoughRecipes() {
  const recipes = await db.doughRecipes.toArray();
  return recipes.sort((a, b) => a.namn.localeCompare(b.namn, 'sv-SE'));
}

export async function saveDoughRecipe(data) {
  const recipe = validateDoughRecipe(data);
  const now = new Date().toISOString();
  return db.transaction('rw', db.doughRecipes, async () => {
    const all = await db.doughRecipes.toArray();
    const normalized = recipe.namn.toLocaleLowerCase('sv-SE');
    if (all.some((other) => other.id !== recipe.id && other.namn.toLocaleLowerCase('sv-SE') === normalized)) {
      throw new Error('Det finns redan ett degrecept med det namnet.');
    }
    if (recipe.id) {
      const existing = await db.doughRecipes.get(recipe.id);
      if (!existing) throw new Error('Degreceptet finns inte längre.');
      await db.doughRecipes.put({ ...existing, ...recipe, uppdaterad: now });
      return recipe.id;
    }
    return db.doughRecipes.add({
      namn: recipe.namn,
      basVatten: recipe.basVatten,
      vattenEnhet: recipe.vattenEnhet,
      ingredienser: recipe.ingredienser,
      skapad: now,
      uppdaterad: now,
    });
  });
}

export async function deleteDoughRecipe(id) {
  await db.doughRecipes.delete(id);
}
