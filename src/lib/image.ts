import { contrastRatio, nearestPalette, rgbToHex } from "./engine";
import type { BrandLibrary, ImageAnalysis } from "./types";

/** Finds the main colours of an image in the browser (no upload to any server). */
export function analyzeImage(dataUrl: string, lib: BrandLibrary): Promise<ImageAnalysis> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 120;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not available"));
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      // 1) Bucket pixels (5 bits per channel).
      const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
        e.r += r; e.g += g; e.b += b; e.n += 1;
        buckets.set(key, e);
        total++;
      }
      // 2) Merge similar buckets into colour clusters.
      const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
      const clusters: { r: number; g: number; b: number; n: number }[] = [];
      for (const s of sorted) {
        const c = [s.r / s.n, s.g / s.n, s.b / s.n];
        const hit = clusters.find((k) => {
          const kc = [k.r / k.n, k.g / k.n, k.b / k.n];
          return Math.hypot(c[0] - kc[0], c[1] - kc[1], c[2] - kc[2]) < 48;
        });
        if (hit) { hit.r += s.r; hit.g += s.g; hit.b += s.b; hit.n += s.n; }
        else clusters.push({ ...s });
      }
      const colors = clusters
        .sort((a, b) => b.n - a.n)
        .slice(0, 5)
        .map((k) => {
          const hex = rgbToHex(k.r / k.n, k.g / k.n, k.b / k.n);
          const near = nearestPalette(hex, lib);
          return { hex, share: k.n / Math.max(1, total), nearest: near.name, nearestHex: near.hex, distance: Math.round(near.distance) };
        });

      // 3) Best contrast between the main colours (proxy for "can text on this be read?").
      const main = colors.filter((c) => c.share >= 0.08);
      const pool = main.length >= 2 ? main : colors.slice(0, 2);
      let contrast = 1;
      for (let i = 0; i < pool.length; i++)
        for (let j = i + 1; j < pool.length; j++) contrast = Math.max(contrast, contrastRatio(pool[i].hex, pool[j].hex));
      resolve({ colors, contrast: Math.round(contrast * 10) / 10 });
    };
    img.onerror = () => reject(new Error("Could not read this image"));
    img.src = dataUrl;
  });
}

/** Shrinks big uploads so they fit in browser storage. */
export function shrinkImage(file: File, maxSide = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not available"));
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("Not an image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/** A built-in demo banner that is deliberately off-brand (neon colours, low contrast). */
export function makeSampleBanner(): string {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 300;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#FF2DA8"; // neon pink - not in the palette
  ctx.fillRect(0, 0, 600, 300);
  ctx.fillStyle = "#FF6FC4"; // light pink on pink - low contrast
  ctx.fillRect(0, 190, 600, 110);
  ctx.font = "bold 54px sans-serif";
  ctx.fillStyle = "#FF8AD0";
  ctx.fillText("MEGA SALE", 140, 130);
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("GlowLab Serum", 190, 255);
  return c.toDataURL("image/png");
}
