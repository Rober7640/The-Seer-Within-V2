/**
 * Test the migration drip Email 1 for a single user.
 * Usage: npx tsx scripts/test-migration-drip.ts
 */
import 'dotenv/config';
import { sendMigrationEmail1 } from '../server/lib/migrationDripProcessor';

async function main() {
  console.log('Triggering migration drip Email 1 (limit: 1)...\n');
  const stats = await sendMigrationEmail1(1);
  console.log('\nResult:', JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
