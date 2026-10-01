import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/ocr.js';
import { cropPixels, selectionFromPoints } from '../src/utils/images.js';

let originalKey;
before(() => { originalKey = process.env.GOOGLE_VISION_API_KEY; process.env.GOOGLE_VISION_API_KEY = 'test-key'; });
after(() => {
  if (originalKey === undefined) delete process.env.GOOGLE_VISION_API_KEY;
  else process.env.GOOGLE_VISION_API_KEY = originalKey;
});

async function request(mockFetch, body = { image: 'dGVzdA==' }, method = 'POST') {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  const res = {
    statusCode: 200, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  try { await handler({ method, body }, res); return res; }
  finally { globalThis.fetch = originalFetch; }
}

test('Beskärning begränsas till bilden och fungerar i båda dragriktningarna', () => {
  const crop = selectionFromPoints({ x: 0.8, y: 0.9 }, { x: 0.2, y: 0.1 });
  const pixels = cropPixels(crop, 1000, 2000);
  assert.deepEqual(pixels, { x: 200, y: 200, width: 600, height: 1600 });
  assert.deepEqual(cropPixels({ x: -0.1, y: 0, width: 1.5, height: 1 }, 1000, 1000), {
    x: 0, y: 0, width: 1000, height: 1000,
  });
  assert.throws(() => cropPixels({ x: 0, y: 0, width: 0, height: 1 }, 1000, 1000));
});

test('OCR returnerar text vid ett giltigt svar', async () => {
  const res = await request(async () => new Response(JSON.stringify({ responses: [{ fullTextAnnotation: { text: 'Kanelbullar 30' } }] })));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.text, 'Kanelbullar 30');
});

test('OCR skiljer en bild utan text från ett API-fel', async () => {
  const empty = await request(async () => new Response(JSON.stringify({ responses: [{}] })));
  assert.equal(empty.statusCode, 422);
  assert.equal(empty.body.code, 'NO_TEXT');
  const apiError = await request(async () => new Response(JSON.stringify({ responses: [{ error: { code: 13, message: 'Extern detalj' } }] })));
  assert.equal(apiError.statusCode, 502);
  assert.equal(apiError.body.code, 'OCR_API_ERROR');
});

test('OCR hanterar externa HTTP-fel utan att exponera externa svar eller nycklar', async () => {
  const forbidden = await request(async () => new Response('hemlig extern feltext', { status: 403 }));
  assert.equal(forbidden.statusCode, 503);
  assert.equal(forbidden.body.code, 'OCR_CONFIGURATION');
  assert.ok(!JSON.stringify(forbidden.body).includes('hemlig'));
  assert.ok(!JSON.stringify(forbidden.body).includes('test-key'));
  const limited = await request(async () => new Response('', { status: 429 }));
  assert.equal(limited.statusCode, 429);
});

test('OCR hanterar ogiltigt svar, nätverksfel och timeout begripligt', async () => {
  const invalid = await request(async () => new Response('<html>fel</html>'));
  assert.equal(invalid.body.code, 'INVALID_OCR_RESPONSE');
  const incomplete = await request(async () => new Response('{}'));
  assert.equal(incomplete.body.code, 'INVALID_OCR_RESPONSE');
  const network = await request(async () => { throw new TypeError('https://example.invalid/?key=test-key'); });
  assert.equal(network.body.code, 'OCR_UNAVAILABLE');
  assert.ok(!JSON.stringify(network.body).includes('test-key'));
  const timeout = await request(async () => { throw new DOMException('Timed out', 'AbortError'); });
  assert.equal(timeout.statusCode, 504);
});

test('Ogiltiga OCR-anrop skickas inte vidare till Google', async () => {
  let calls = 0;
  const mock = async () => { calls++; throw new Error('Ska inte anropas'); };
  assert.equal((await request(mock, {})).statusCode, 400);
  assert.equal((await request(mock, { image: '***' })).statusCode, 400);
  assert.equal((await request(mock, { image: 'A'.repeat(4 * 1024 * 1024 + 1) })).statusCode, 413);
  assert.equal((await request(mock, {}, 'GET')).statusCode, 405);
  assert.equal(calls, 0);
});
