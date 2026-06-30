// One-time (idempotent) upload of Luna's STATIC email assets to S3:
//   - luna-avatar.jpg          (masthead avatar, real JPEG)
//   - natal-wheel-stamp-48.png (footer mark, rasterized from wordmark-mark.svg)
//   - constellation-watermark-600x88.png (masthead bg, rasterized from constellation.svg)
// Run once after S3 is configured (and again only if these source assets change):
//   npx tsx scripts/upload-luna-static-assets.ts
// The per-day sky maps are uploaded separately by build-luna-batch.ts.
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, type Browser } from 'playwright';
import { s3Configured, uploadPublicAsset } from '../server/lib/s3Upload.ts';

if (!s3Configured()) {
  console.error('❌ S3 not configured: set AWS_REGION, S3_BUCKET, ASSET_BASE_URL (+ AWS keys) in .env');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const A = path.resolve(__dirname, '../docs/kit/luna-voss-emails/assets');

async function rasterizeSvg(browser: Browser, svgFile: string): Promise<Buffer> {
  const svg = readFileSync(path.join(A, svgFile), 'utf8');
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:0">${svg}</body></html>`);
  const el = await page.$('svg');
  if (!el) throw new Error(`no <svg> found in ${svgFile}`);
  const png = await el.screenshot({ omitBackground: true, type: 'png' });
  await page.close();
  return png;
}

const browser = await chromium.launch();

// 1. Avatar — real JPEG, upload as-is.
const avatar = readFileSync(path.join(A, 'luna-avatar.jpg'));
console.log('avatar    →', await uploadPublicAsset('luna/luna-avatar.jpg', avatar, 'image/jpeg'));

// 2. Footer stamp — rasterize the 48×48 wordmark mark (transparent).
const stamp = await rasterizeSvg(browser, 'wordmark-mark.svg');
console.log('stamp     →', await uploadPublicAsset('luna/natal-wheel-stamp-48.png', stamp, 'image/png'));

// 3. Masthead watermark — rasterize the constellation (transparent, used as bg).
const watermark = await rasterizeSvg(browser, 'constellation.svg');
console.log('watermark →', await uploadPublicAsset('luna/constellation-watermark-600x88.png', watermark, 'image/png'));

await browser.close();
console.log('\n✅ Static Luna assets uploaded to S3.');
