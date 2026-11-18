import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { laneForRequestUrl, renderLaneHtml } from "./lib/laneHtml";

// `distPath` is a parameter only so the lane HTML test can point this at a fixture
// directory; production calls serveStatic(app) exactly as before.
export function serveStatic(app: Express, distPath: string = path.resolve(__dirname, "public")) {
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  const indexPath = path.resolve(distPath, "index.html");
  // Read once, on the first belief-lane request — nothing else ever needs the text.
  let indexHtml: string | null = null;

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (req, res) => {
    // Belief lane (/fb?lane=<id>): Meta reads the server HTML, so a lane page gets its
    // own title, description and visible copy (server/lib/laneHtml.ts). Every other
    // request — including /fb with no lane or an unknown one — takes today's
    // sendFile below, untouched, so its bytes and headers are exactly as before.
    const lane = laneForRequestUrl(req.originalUrl);
    if (lane) {
      if (indexHtml === null) indexHtml = fs.readFileSync(indexPath, "utf-8");
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(renderLaneHtml(indexHtml, lane));
      return;
    }
    res.sendFile(indexPath);
  });
}
