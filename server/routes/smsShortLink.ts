// Short links for the SMS texts (Joel, 24 Nov 2026: "shorten" — every character in
// a text costs money). server/lib/smsSender.ts puts these in texts 2 and 3:
//
//   /s/<step>/<token>  → /magic-auth?t=<token>&<utm>   her one-tap login into the Evelyn chat
//   /s/<step>          → /evelyn?<utm>                 fallback: the public Evelyn lander
//
// This only REDIRECTS. It never checks or uses the token itself — /magic-auth does
// that exactly as before, so login rules are unchanged. Anything that doesn't look
// like one of our links gets the home page.
import type { Express, Request, Response } from "express";
import { smsUtm, type SmsStep } from "../lib/smsSender";

const STEP_RE = /^[23]$/;
const TOKEN_RE = /^[A-Za-z0-9]{8,64}$/;

export function smsShortLinkTarget(step: string, token?: string): string {
  if (!STEP_RE.test(step)) return "/";
  const utm = smsUtm(Number(step) as SmsStep);
  if (token === undefined) return `/evelyn?${utm}`;
  if (!TOKEN_RE.test(token)) return `/evelyn?${utm}`;
  return `/magic-auth?t=${token}&${utm}`;
}

export function registerSmsShortLinks(app: Express): void {
  app.get("/s/:step/:token", (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    res.redirect(302, smsShortLinkTarget(String(req.params.step), String(req.params.token)));
  });
  app.get("/s/:step", (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    res.redirect(302, smsShortLinkTarget(String(req.params.step)));
  });
}
