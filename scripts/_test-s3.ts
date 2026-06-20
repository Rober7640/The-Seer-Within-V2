// Quick connectivity check for the S3 asset setup.
// Uploads a tiny test PNG, then fetches it back over HTTPS to confirm the
// bucket policy makes it publicly readable. Run after filling the AWS_* /
// S3_BUCKET / ASSET_BASE_URL vars in .env:
//   npx tsx scripts/_test-s3.ts
import 'dotenv/config';
import { s3Configured, uploadPublicAsset } from '../server/lib/s3Upload.ts';

if (!s3Configured()) {
  console.error('❌ S3 not configured. Set AWS_REGION, S3_BUCKET, ASSET_BASE_URL (and AWS keys) in .env');
  process.exit(1);
}

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const key = 'luna/_conntest.png';
console.log(`Uploading test object → ${key} ...`);
const url = await uploadPublicAsset(key, PNG, 'image/png');
console.log('✓ Upload succeeded. Public URL:');
console.log('  ' + url);

console.log('\nFetching it back over HTTPS to verify public read ...');
const res = await fetch(url, { method: 'GET' });
const ct = res.headers.get('content-type');
if (res.ok && ct?.startsWith('image/')) {
  console.log(`✓ HTTP ${res.status}, Content-Type: ${ct}`);
  console.log('\n✅ S3 is correctly configured and publicly readable. Email images will resolve.');
} else {
  console.error(`❌ HTTP ${res.status}, Content-Type: ${ct}`);
  console.error('   Upload worked but the object is not publicly readable — check the bucket policy / Block Public Access.');
  process.exit(1);
}
