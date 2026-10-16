// Generate real sample Soulmate Initials PDFs, so the product can be eyeballed.
//
//   npx tsx server/scripts/soulmate-reading-sample.ts            # all fixtures
//   npx tsx server/scripts/soulmate-reading-sample.ts jade       # one fixture
//
// Writes PDFs (and the HTML, for quick iteration) to ./samples/ . Uses the real
// Claude prose, so it needs ANTHROPIC_API_KEY in the environment.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import { generateReadingPdf, type ReadingOrder } from '../lib/soulmateReading/index';

const FIXTURES: Record<string, ReadingOrder> = {
  'rose-quartz': {
    sessionId: 'cs_sample_rosequartz_0001',
    firstName: 'Priya',
    dateOfBirth: '1990-04-12',
    stone: 'Rose Quartz',
    bump: true,
  },
  jade: {
    sessionId: 'cs_sample_jade_0002',
    firstName: 'Mara',
    dateOfBirth: '1985-07-23',
    stone: 'Jade',
    bump: false,
  },
  garnet: {
    // 1988-11-29 → a master-number-flavoured chart, to exercise reduction.
    sessionId: 'cs_sample_garnet_0003',
    firstName: 'Delphine',
    dateOfBirth: '1988-11-29',
    stone: 'Garnet',
    bump: true,
  },
};

async function run() {
  const which = process.argv[2];
  const names = which ? [which] : Object.keys(FIXTURES);
  const outDir = path.resolve('samples');
  await mkdir(outDir, { recursive: true });

  for (const name of names) {
    const order = FIXTURES[name];
    if (!order) {
      console.error(`Unknown fixture "${name}". Options: ${Object.keys(FIXTURES).join(', ')}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`\n⟳ Generating "${name}" (${order.firstName}, ${order.stone}${order.bump ? ' + stone charge' : ''})…`);
    const t0 = Date.now();
    const { pdf, html, meta } = await generateReadingPdf(order);
    const pdfPath = path.join(outDir, `soulmate-${name}.pdf`);
    const htmlPath = path.join(outDir, `soulmate-${name}.html`);
    await writeFile(pdfPath, pdf);
    await writeFile(htmlPath, html);
    console.log(
      `✓ ${name}: initials ${meta.initials.first}·${meta.initials.last} · ` +
        `cards [${meta.draw.map((d) => d.card).join(', ')}] · ` +
        `portrait ${meta.prose.portrait.split(/\s+/).length} words · ` +
        `${(pdf.length / 1024).toFixed(0)} KB · ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
    console.log(`  → ${pdfPath}`);
  }
}

run().catch((err) => {
  console.error('\n✗ sample generation failed:', err);
  process.exit(1);
});
