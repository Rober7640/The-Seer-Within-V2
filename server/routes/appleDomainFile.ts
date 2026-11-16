/**
 * Apple Pay domain verification file for the Payments.AI checkout.
 *
 * Payments.AI (Tim, 27 Oct 2026): they switch Apple Pay on once this exact file is
 * served at
 *   https://www.theseerwithin.com/.well-known/apple-developer-merchantid-domain-association
 * with HTTP 200 and NO redirect. No Apple developer account or certificates on our side.
 *
 * Why a dedicated route: express.static skips dot-folders (`.well-known`) by default,
 * so a file under client/public would fall through to the SPA and Apple would get
 * our homepage HTML (200, wrong content) — which is what that URL returns today.
 *
 * The file itself comes from Payments.AI (it is tied to THEIR Apple merchant id) —
 * paste it, byte for byte, into APPLE_DOMAIN_ASSOCIATION below. Until then this route
 * answers 404, never the homepage, so nobody can mistake it for verified.
 */
import type { Express, Request, Response } from 'express';

export const APPLE_DOMAIN_FILE_PATH = '/.well-known/apple-developer-merchantid-domain-association';

/** Exact contents of the file Payments.AI supplies. Empty = not received yet. */
export const APPLE_DOMAIN_ASSOCIATION = '';

export function appleDomainFileHandler(contents: string) {
  return (_req: Request, res: Response) => {
    if (!contents) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.status(200).type('text/plain').set('Cache-Control', 'public, max-age=3600').send(contents);
  };
}

export function registerAppleDomainFile(app: Express, contents = APPLE_DOMAIN_ASSOCIATION): void {
  // Also the ".txt" spelling some providers hand out; Apple itself asks for the bare name.
  app.get([APPLE_DOMAIN_FILE_PATH, `${APPLE_DOMAIN_FILE_PATH}.txt`], appleDomainFileHandler(contents));
}
