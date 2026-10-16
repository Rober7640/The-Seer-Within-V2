// Fetch the seven card images and render the HTML to a PDF — locally, via the
// Playwright Chromium that already ships with this repo. No external PDF
// service is needed to produce the deliverable; the HTML is identical to what a
// hosted renderer (e.g. PDFShift) would consume, so the operator can swap in
// theirs on the n8n side without touching the document.

import type { DrawnCard } from './draw';

/**
 * Fetch each card's art and return a slug → data-URI map. A card whose image
 * can't be fetched maps to null so the template draws a styled placeholder
 * instead of a broken image — never a silent hole (02 lesson 9).
 */
export async function resolveCardImages(
  draw: DrawnCard[],
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  await Promise.all(
    draw.map(async (c) => {
      try {
        const res = await fetch(c.imageUrl);
        if (!res.ok) {
          out[c.slug] = null;
          return;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const type = res.headers.get('content-type') || 'image/jpeg';
        out[c.slug] = `data:${type};base64,${buf.toString('base64')}`;
      } catch {
        out[c.slug] = null;
      }
    }),
  );
  return out;
}

/**
 * Render a full HTML document to a print-A4 PDF buffer.
 *
 * Playwright is imported lazily so this module can be pulled into the server
 * bundle (for `buildReading`, which never renders) without requiring the
 * `playwright` package at boot — it ships only as a dev dependency and is not
 * installed on the deployed app. Local CLI/tests still render as before.
 */
export async function renderPdf(html: string): Promise<Buffer> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}
