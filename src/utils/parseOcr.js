export function parseOcrText(text) {
  const rader = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Matcha "Namn ... siffra" – namnet kan innehålla bokstäver, siffror, bindestreck
    const match = trimmed.match(/^(.+?)\s+(\d+)\s*$/);
    if (!match) continue;

    const namn = match[1].trim();
    const antal = Number(match[2]);

    if (namn.length < 2 || antal <= 0) continue;

    rader.push({ namn, antal });
  }

  return rader;
}