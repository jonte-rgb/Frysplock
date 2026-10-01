const MAX_IMAGE_LENGTH = 4 * 1024 * 1024;

function upstreamError(status) {
  if (status === 429 || status === 8) return {
    status: 429, code: 'OCR_LIMIT', error: 'Textläsningstjänstens gräns har nåtts. Försök igen senare.',
  };
  if ([401, 403, 7, 16].includes(status)) return {
    status: 503, code: 'OCR_CONFIGURATION', error: 'Textläsningstjänsten är inte tillgänglig. Kontrollera serverns OCR-inställningar.',
  };
  if (status === 400 || status === 3) return {
    status: 400, code: 'INVALID_IMAGE', error: 'Bilden kunde inte läsas. Välj en annan bild eller ta ett nytt foto.',
  };
  return { status: 502, code: 'OCR_API_ERROR', error: 'Textläsningstjänsten svarade med ett fel. Försök igen senare.' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Endast POST tillåtet.' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ code: 'INVALID_REQUEST', error: 'Bilden kunde inte skickas. Välj bilden igen.' }); }
  }
  const image = body?.image;
  if (typeof image !== 'string' || !image || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    return res.status(400).json({ code: 'INVALID_IMAGE', error: 'Ingen giltig bild skickades.' });
  }
  if (image.length > MAX_IMAGE_LENGTH) {
    return res.status(413).json({ code: 'IMAGE_TOO_LARGE', error: 'Bilden är för stor. Beskär den eller välj en mindre bild.' });
  }
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return res.status(503).json({ code: 'OCR_NOT_CONFIGURED', error: 'Textläsningen är inte konfigurerad på servern.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ requests: [{ image: { content: image }, features: [{ type: 'TEXT_DETECTION' }] }] }),
    });
    if (!response.ok) {
      const error = upstreamError(response.status);
      return res.status(error.status).json({ code: error.code, error: error.error });
    }
    let data;
    try { data = await response.json(); }
    catch (error) {
      if (error?.name === 'AbortError') throw error;
      return res.status(502).json({ code: 'INVALID_OCR_RESPONSE', error: 'Textläsningstjänsten gav ett ogiltigt svar. Försök igen.' });
    }
    const result = data?.responses?.[0];
    if (data?.error || result?.error) {
      const error = upstreamError((data.error || result.error).code);
      return res.status(error.status).json({ code: error.code, error: error.error });
    }
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return res.status(502).json({ code: 'INVALID_OCR_RESPONSE', error: 'Textläsningstjänsten gav ett ofullständigt svar. Försök igen.' });
    }
    const text = result.fullTextAnnotation?.text;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(422).json({ code: 'NO_TEXT', error: 'Ingen text hittades i bilden. Beskär bilden eller ta ett tydligare foto.' });
    }
    return res.status(200).json({ text });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(504).json({ code: 'OCR_TIMEOUT', error: 'Textläsningen tog för lång tid. Försök igen.' });
    }
    // Returnera eller logga aldrig externa felobjekt som kan innehålla den signerade anropsadressen.
    return res.status(502).json({ code: 'OCR_UNAVAILABLE', error: 'Kunde inte nå textläsningstjänsten. Försök igen senare.' });
  } finally { clearTimeout(timeout); }
}
