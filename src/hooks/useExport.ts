import html2canvas from 'html2canvas';
import type { Table } from '@/types/table';
import { tableBounds } from '@/utils/geometry';

export async function exportToPng(canvasRootId: string, tables: Table[]): Promise<void> {
  const el = document.getElementById(canvasRootId);
  if (!el) return;

  if (tables.length === 0) {
    alert('No tables to export.');
    return;
  }

  // Calculate bounding box of all tables
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const table of tables) {
    const b = tableBounds(table);
    if (b.left < minX) minX = b.left;
    if (b.top < minY) minY = b.top;
    if (b.right > maxX) maxX = b.right;
    if (b.bottom > maxY) maxY = b.bottom;
  }

  const padding = 40;
  minX -= padding;
  minY -= padding;

  // Temporarily override transform to fit content
  const originalTransform = el.style.transform;
  el.style.transform = `translate(${-minX}px, ${-minY}px) scale(1)`;
  el.style.transformOrigin = '0 0';

  try {
    const canvas = await html2canvas(el, {
      backgroundColor: '#f9fafb',
      scale: 2,
      useCORS: true,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      x: 0,
      y: 0,
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-seating-chart.png';
    a.click();
  } finally {
    el.style.transform = originalTransform;
  }
}
