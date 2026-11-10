/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

/**
 * Format ISO date string or Date object to Thai short date (e.g., "15 ก.พ. 69")
 */
export function formatThaiDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  // Get date in Bangkok timezone
  const bkkDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d);

  const day = bkkDate.find((p) => p.type === 'day')?.value || '1';
  const monthIdx = parseInt(bkkDate.find((p) => p.type === 'month')?.value || '1', 10) - 1;
  const gregorianYear = parseInt(bkkDate.find((p) => p.type === 'year')?.value || '2026', 10);
  const thaiBuddhistYear = (gregorianYear + 543) % 100; // e.g. 2569 -> 69

  return `${day} ${THAI_MONTHS_SHORT[monthIdx]} ${thaiBuddhistYear}`;
}

/**
 * Format ISO date string or Date object to Thai full date (e.g., "15 กุมภาพันธ์ พ.ศ. 2569")
 */
export function formatThaiFullDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const bkkDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d);

  const day = bkkDate.find((p) => p.type === 'day')?.value || '1';
  const monthIdx = parseInt(bkkDate.find((p) => p.type === 'month')?.value || '1', 10) - 1;
  const gregorianYear = parseInt(bkkDate.find((p) => p.type === 'year')?.value || '2026', 10);
  const thaiBuddhistYear = gregorianYear + 543;

  return `${day} ${THAI_MONTHS_FULL[monthIdx]} พ.ศ. ${thaiBuddhistYear}`;
}

/**
 * Format Thai date with time (e.g., "15 ก.พ. 69, 14:30 น.")
 */
export function formatThaiDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const datePart = formatThaiDate(d);
  const timeFormatter = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${datePart}, ${timeFormatter.format(d)} น.`;
}

/**
 * Get current date key in Bangkok time (YYYY-MM-DD)
 */
export function getBangkokTodayString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // Returns YYYY-MM-DD
}
