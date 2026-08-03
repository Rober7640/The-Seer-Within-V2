// One-time (idempotent) upload of Aiden's avatar to S3, mirroring
// scripts/upload-luna-static-assets.ts. Run once after S3 is configured:
//   npx tsx scripts/upload-aiden-avatar.ts
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { s3Configured, uploadPublicAsset } from '../server/lib/s3Upload.ts';

if (!s3Configured()) {
  console.error('S3 not configured: set AWS_REGION, S3_BUCKET, ASSET_BASE_URL (+ AWS keys) in .env');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const avatar = readFileSync(path.resolve(__dirname, '../uploads/avatars/aiden-powers.png'));
const url = await uploadPublicAsset('aiden/aiden-avatar.png', avatar, 'image/png');
console.log('avatar →', url);
