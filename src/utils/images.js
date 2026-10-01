function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Bilden kunde inte läsas. Välj en annan bild.'));
    image.src = dataUrl;
  });
}

function imageCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Bilden kunde inte bearbetas på den här enheten.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  return { canvas, context };
}

export async function readImageFile(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) {
    throw new Error('Välj en bildfil.');
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Bildfilen kunde inte öppnas.'));
    reader.readAsDataURL(file);
  });
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, 1500 / image.naturalWidth, 3000 / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const { canvas, context } = imageCanvas(width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

const clamp = (value) => Math.min(1, Math.max(0, value));

export function selectionFromPoints(start, end) {
  const left = Math.min(clamp(start.x), clamp(end.x));
  const top = Math.min(clamp(start.y), clamp(end.y));
  return {
    x: left, y: top,
    width: Math.max(clamp(start.x), clamp(end.x)) - left,
    height: Math.max(clamp(start.y), clamp(end.y)) - top,
  };
}

export function cropPixels(selection, width, height) {
  if (![selection.x, selection.y, selection.width, selection.height, width, height].every(Number.isFinite)
    || selection.width <= 0 || selection.height <= 0 || width < 1 || height < 1) {
    throw new Error('Markera en större del av bilden.');
  }
  const x = Math.min(width - 1, Math.floor(clamp(selection.x) * width));
  const y = Math.min(height - 1, Math.floor(clamp(selection.y) * height));
  const right = Math.min(width, Math.max(x + 1, Math.ceil(clamp(selection.x + selection.width) * width)));
  const bottom = Math.min(height, Math.max(y + 1, Math.ceil(clamp(selection.y + selection.height) * height)));
  return { x, y, width: right - x, height: bottom - y };
}

export async function cropImage(base64, selection) {
  const image = await loadImage(`data:image/jpeg;base64,${base64}`);
  const crop = cropPixels(selection, image.naturalWidth, image.naturalHeight);
  const { canvas, context } = imageCanvas(crop.width, crop.height);
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
}
