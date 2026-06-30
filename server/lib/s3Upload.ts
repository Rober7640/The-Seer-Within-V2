// Minimal S3 uploader for Luna email assets (sky maps, avatars).
// Public-read bucket: objects are served at `${ASSET_BASE_URL}/<key>` with no
// signing — email images must have permanent, non-expiring URLs.
//
// Required env (see .env.example):
//   AWS_REGION            e.g. us-east-1
//   AWS_ACCESS_KEY_ID     IAM user with s3:PutObject on the bucket
//   AWS_SECRET_ACCESS_KEY
//   S3_BUCKET             dotless bucket name, e.g. luna-assets
//   ASSET_BASE_URL        public base, e.g. https://luna-assets.s3.us-east-1.amazonaws.com
//
// Credentials are read by the AWS SDK's default provider chain (env vars), so
// they are never passed in code.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const BASE = process.env.ASSET_BASE_URL?.replace(/\/+$/, '');

let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) {
    if (!REGION) throw new Error('[s3Upload] AWS_REGION is not set');
    _client = new S3Client({ region: REGION });
  }
  return _client;
}

/** True only when every piece needed to upload + build a public URL is present. */
export function s3Configured(): boolean {
  return Boolean(REGION && BUCKET && BASE);
}

/**
 * Upload a buffer to the public bucket and return its permanent public URL.
 * Sets a long, immutable cache header (per-day keys never change once written).
 * No ACL is set — public access comes from the bucket policy, which is the
 * modern default (most buckets block object ACLs).
 */
export async function uploadPublicAsset(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  if (!s3Configured()) {
    throw new Error('[s3Upload] not configured: set AWS_REGION, S3_BUCKET, ASSET_BASE_URL');
  }
  await client().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${BASE}/${key}`;
}
