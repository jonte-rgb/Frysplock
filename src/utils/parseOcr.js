export function parseOcrText(text) {
  return String(text ?? '').split(/\r?\n/).flatMap((line) => {
    const raw = line.trim();
    // Tomrader och bildseparatorer saknar produktinnehåll. All annan text visas för granskning.
    if (!raw || /^[-—_=]{3,}$/.test(raw)) return [];
    const trailing = raw.match(/^(.+?)\s+(\d+)\s*(?:st\.?|styck)?\s*$/i);
    const leading = raw.match(/^(\d+)\s+(?:st\.?\s+)?(.+?)$/i);
    if (trailing && !leading) {
      return [{ namn: trailing[1].trim(), antal: Number(trailing[2]), ocrText: raw }];
    }
    if (leading && !trailing) {
      return [{ namn: leading[2].trim(), antal: Number(leading[1]), ocrText: raw }];
    }
    return [{
      namn: raw, antal: null, ocrText: raw,
      varning: trailing && leading
        ? 'Flera möjliga antal. Kontrollera produkt och antal.'
        : 'Produkt och antal kunde inte tolkas säkert.',
    }];
  });
}
