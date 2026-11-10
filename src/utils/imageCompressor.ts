/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Client-side image compression utility
 * Constraints:
 * - Max dimension: 1024px
 * - Quality: ~0.7 JPEG
 * - Max target size: ~200KB
 */
export async function compressImage(file: File): Promise<{
  dataUrl: string;
  sizeKb: number;
  hash: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('ไม่สามารถสร้าง canvas context ได้'));
          return;
        }

        // Fill white background in case of transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.7;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // If above 220KB, compress further down to 0.55
        let sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        if (sizeKb > 220) {
          quality = 0.55;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        }

        // Fast hash for anti-cheat duplicate detection
        const hash = computeSimpleHash(dataUrl);

        resolve({ dataUrl, sizeKb, hash });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Simple 32-bit FNV-1a style hash of sample data bytes
 */
export function computeSimpleHash(str: string): string {
  let hash = 2166136261;
  // Sample every N characters for quick hashing without blocking UI thread
  const step = Math.max(1, Math.floor(str.length / 500));
  for (let i = 0; i < str.length; i += step) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}
