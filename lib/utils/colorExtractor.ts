/**
 * High-performance, TV-optimized dominant ambient color extractor.
 * Samples images onto an off-screen 32x32 canvas and computes the most vibrant
 * dominant ambient color scaled to dark cinematic contrast (~47% brightness).
 */

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

// Default warm golden amber matching the hero showcase in Figma
export const DEFAULT_AMBIENT_RGB: RGBColor = { r: 64, g: 35, b: 11 };

// In-memory cache to guarantee 0ms overhead on re-visits or carousel loops
const colorCache = new Map<string, RGBColor>();

export async function extractDominantAmbientColor(imageUrl?: string): Promise<RGBColor> {
  if (!imageUrl || typeof window === "undefined") {
    return DEFAULT_AMBIENT_RGB;
  }

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      const timeoutId = setTimeout(() => {
        resolve(DEFAULT_AMBIENT_RGB);
      }, 1500);

      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(DEFAULT_AMBIENT_RGB);
            return;
          }

          ctx.drawImage(img, 0, 0, 32, 32);
          const imageData = ctx.getImageData(0, 0, 32, 32).data;

          const colorBuckets: Record<string, { r: number; g: number; b: number; count: number; weight: number }> = {};

          for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];

            // Quantize RGB to 16-level steps
            const qr = Math.round(r / 16) * 16;
            const qg = Math.round(g / 16) * 16;
            const qb = Math.round(b / 16) * 16;
            const key = `${qr},${qg},${qb}`;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max === 0 ? 0 : (max - min) / max;
            const brightness = max / 255;

            // Filter out near-black or blown-out white
            if (brightness < 0.1 || brightness > 0.95) continue;

            // Prioritize saturated/vibrant hues over dull grey
            const weight = 1 + sat * 3.5;

            if (!colorBuckets[key]) {
              colorBuckets[key] = { r: 0, g: 0, b: 0, count: 0, weight: 0 };
            }

            colorBuckets[key].r += r;
            colorBuckets[key].g += g;
            colorBuckets[key].b += b;
            colorBuckets[key].count += 1;
            colorBuckets[key].weight += weight;
          }

          let bestBucket: { r: number; g: number; b: number; count: number; weight: number } | null = null;
          let maxWeight = 0;

          for (const key in colorBuckets) {
            if (colorBuckets[key].weight > maxWeight) {
              maxWeight = colorBuckets[key].weight;
              bestBucket = colorBuckets[key];
            }
          }

          if (bestBucket && bestBucket.count > 0) {
            const avgR = bestBucket.r / bestBucket.count;
            const avgG = bestBucket.g / bestBucket.count;
            const avgB = bestBucket.b / bestBucket.count;

            // Scale to ~47% brightness for deep ambient glow matching Figma design
            const ambientColor: RGBColor = {
              r: Math.round(avgR * 0.47),
              g: Math.round(avgG * 0.47),
              b: Math.round(avgB * 0.47),
            };

            colorCache.set(imageUrl, ambientColor);
            resolve(ambientColor);
          } else {
            resolve(DEFAULT_AMBIENT_RGB);
          }
        } catch {
          // Canvas tainted or CORS failure fallback
          resolve(DEFAULT_AMBIENT_RGB);
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(DEFAULT_AMBIENT_RGB);
      };

      img.src = imageUrl;
    } catch {
      resolve(DEFAULT_AMBIENT_RGB);
    }
  });
}
