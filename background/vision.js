/* Remove artwork outside large light areas while retaining dark text inside them.
 * Flood-fill at quarter resolution, then fill each component's scanline interior.
 * This removes balloon outlines and spikes without thresholding away thin glyphs.
 */
function speechMask(source) {
  const step = 4, width = Math.ceil(source.width / step), height = Math.ceil(source.height / step);
  const small = document.createElement('canvas'); small.width = width; small.height = height;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const seen = new Uint8Array(width * height), queue = new Int32Array(width * height);
  const light = i => pixels[i * 4] > 220 && pixels[i * 4 + 1] > 220 && pixels[i * 4 + 2] > 220;
  const regions = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || !light(start)) continue;
    let head = 0, tail = 1, minX = width, maxX = 0, minY = height, maxY = 0;
    queue[0] = start; seen[start] = 1;
    const left = new Int32Array(height).fill(width), right = new Int32Array(height).fill(-1);
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      left[y] = Math.min(left[y], x); right[y] = Math.max(right[y], x);
      for (const next of [x > 0 ? i - 1 : -1, x + 1 < width ? i + 1 : -1, y > 0 ? i - width : -1, y + 1 < height ? i + width : -1]) {
        if (next >= 0 && !seen[next] && light(next)) { seen[next] = 1; queue[tail++] = next; }
      }
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    if (w >= 18 && h >= 9 && tail >= 180 && tail / (w * h) > 0.28) regions.push({ left, right, minY, maxY });
  }
  const mask = document.createElement('canvas'); mask.width = source.width; mask.height = source.height;
  const out = mask.getContext('2d'); out.fillStyle = 'white'; out.fillRect(0, 0, mask.width, mask.height);
  out.save(); out.beginPath();
  const sx = source.width / width, sy = source.height / height;
  for (const region of regions) {
    for (let y = region.minY + 2; y <= region.maxY - 2; y++) {
      // Erode by two cells and neighboring rows so black boundary spikes stay out.
      const x0 = Math.max(region.left[y - 1], region.left[y], region.left[y + 1]) + 2;
      const x1 = Math.min(region.right[y - 1], region.right[y], region.right[y + 1]) - 2;
      if (x1 > x0) out.rect(x0 * sx, y * sy, (x1 - x0) * sx, sy + 0.5);
    }
  }
  out.clip(); out.drawImage(source, 0, 0); out.restore();
  small.width = small.height = 1;
  return mask;
}

function strengthenInk(source) {
  // Tesseract's automatic threshold can discard light gray words when the same
  // line also contains black text. Darken the ink smoothly, leaving white white.
  const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const curve = Uint8Array.from({ length: 256 }, (_, value) => Math.round(255 * (value / 255) ** 3));
  for (let i = 0; i < image.data.length; i += 4) {
    const gray = Math.round(0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2]);
    image.data[i] = image.data[i + 1] = image.data[i + 2] = curve[gray];
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function textBackground(pixels, width, height, box) {
  // Measure the ORIGINAL image around a word, never the artificially whitened mask.
  const margin = 5;
  const x0 = Math.max(0, Math.floor(box.x0) - margin), x1 = Math.min(width - 1, Math.ceil(box.x1) + margin);
  const y0 = Math.max(0, Math.floor(box.y0) - margin), y1 = Math.min(height - 1, Math.ceil(box.y1) + margin);
  let light = 0, dark = 0, count = 0, sum = 0, squares = 0;
  for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
    if (x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1) continue;
    const i = (y * width + x) * 4;
    if (pixels[i] > 205 && pixels[i + 1] > 205 && pixels[i + 2] > 205) light++;
    if (pixels[i] < 55 && pixels[i + 1] < 55 && pixels[i + 2] < 55) dark++;
    const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3; sum += gray; squares += gray * gray;
    count++;
  }
  const variance = squares / Math.max(1, count) - (sum / Math.max(1, count)) ** 2;
  return { light: light / Math.max(1, count), dark: dark / Math.max(1, count), uniform: count > 0 && variance < 400 };
}

function readableLines(data, source, minConfidence, crop = false) {
  const pixels = source.getContext('2d').getImageData(0, 0, source.width, source.height).data;
  const out = [];
  for (const line of data.lines || []) {
    const candidates = (line.words || [line]).filter(w => w.text.trim() && w.bbox).map(word => ({ text: word.text, confidence: word.confidence, bbox: word.bbox, background: textBackground(pixels, source.width, source.height, word.bbox) }));
    const supported = candidates.map(word => {
      if (word.confidence < 40 || !/[\p{L}\p{N}]/u.test(word.text)) return false;
      if (crop) return true;
      const letters = (word.text.match(/[\p{L}\p{N}]/gu) || []).length;
      if (letters <= 4 && word.confidence < 75 && candidates.length <= 1 && /^[\p{Script=Latin}\d\s\p{P}]+$/u.test(word.text)) return false;
      const bg = word.background;
      // Isolated short marks in the artwork can look like highly confident words.
      // Sentence words have neighboring evidence; a lone short word needs a cleaner background.
      const lightThreshold = candidates.length === 1 && letters <= 4 ? 0.85 : 0.70;
      return bg.light >= lightThreshold || (bg.dark >= 0.83 && word.confidence >= 60) || (bg.uniform && word.confidence >= 65);
    });
    if (!supported.some(Boolean) || (!crop && line.confidence < minConfidence && supported.filter(Boolean).length < 2)) continue;
    // A weak name, short word or sentence ending is still part of a supported
    // line. Grow from reliable words using baseline/spacing, not an English dictionary.
    for (let pass = 0; pass < candidates.length; pass++) {
      for (let i = 0; i < candidates.length; i++) {
        if (supported[i]) continue;
        const word = candidates[i], b = word.bbox, h = b.y1 - b.y0;
        if (word.confidence < 5 || !/[\p{L}\p{N}.,!?؟…'’"-]/u.test(word.text)) continue;
        if (!crop && word.background.light < 0.40 && word.background.dark < 0.5 && !word.background.uniform) continue;
        supported[i] = candidates.some((other, j) => {
          if (!supported[j]) return false;
          const a = other.bbox, oh = a.y1 - a.y0;
          const y = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
          const gap = Math.max(0, a.x0 - b.x1, b.x0 - a.x1);
          return y / Math.min(h, oh) > 0.5 && Math.max(h, oh) / Math.min(h, oh) < 2.2 && gap < Math.max(h, oh) * 3;
        });
      }
    }
    const words = candidates.filter((_, i) => supported[i]).map(({ background, ...word }) => word);
    if (!words.some(word => /[\p{L}\p{N}]/u.test(word.text))) continue;
    out.push({ words, text: words.map(w => w.text).join(' '), confidence: words.reduce((sum, w) => sum + w.confidence, 0) / words.length,
      bbox: { x0: Math.min(...words.map(w => w.bbox.x0)), y0: Math.min(...words.map(w => w.bbox.y0)), x1: Math.max(...words.map(w => w.bbox.x1)), y1: Math.max(...words.map(w => w.bbox.y1)) } });
  }
  return out;
}
