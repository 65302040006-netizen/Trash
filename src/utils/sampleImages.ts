/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Generates canvas-based JPEG data URLs for sample testing
function createSampleImage(isBefore: boolean): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - School Lawn / Pavement
  ctx.fillStyle = isBefore ? '#84CC16' : '#22C55E';
  ctx.fillRect(0, 0, 400, 400);

  // Concrete pathway
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(0, 260, 400, 140);

  // Grass blades
  ctx.strokeStyle = isBefore ? '#65A30D' : '#16A34A';
  ctx.lineWidth = 3;
  for (let i = 10; i < 390; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 260);
    ctx.lineTo(i + 5, 240);
    ctx.stroke();
  }

  if (isBefore) {
    // Plastic bottles & snack wrapper on ground
    // Bottle 1
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(120, 280, 50, 25);
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(170, 285, 10, 15);

    // Bottle 2
    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(200, 310, 45, 22);

    // Snack bag
    ctx.fillStyle = '#F43F5E';
    ctx.fillRect(260, 290, 40, 35);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(270, 300, 20, 15);

    // Stamp text
    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('ก่อนเก็บ: ขยะตกค้างบริเวณลาน', 30, 60);
  } else {
    // Clean Green Trash Can on Clean Pavement
    ctx.fillStyle = '#059669';
    ctx.fillRect(160, 180, 80, 140);
    ctx.fillStyle = '#047857';
    ctx.fillRect(150, 170, 100, 20);

    // Recycle symbol
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('♻', 185, 255);

    // Stamp text
    ctx.fillStyle = '#065F46';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('หลังเก็บ: สะอาดเรียบร้อยในถังขยะ', 30, 60);
  }

  // School timestamp badge
  ctx.fillStyle = '#00000088';
  ctx.fillRect(20, 350, 360, 35);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px sans-serif';
  ctx.fillText(
    `Trash Point • ${isBefore ? 'BEFORE' : 'AFTER'} • โรงเรียนสีเขียว`,
    35,
    373
  );

  return canvas.toDataURL('image/jpeg', 0.8);
}

export const getSampleBeforePhoto = (): string => createSampleImage(true);
export const getSampleAfterPhoto = (): string => createSampleImage(false);
