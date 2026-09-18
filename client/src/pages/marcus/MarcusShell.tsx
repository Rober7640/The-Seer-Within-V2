import type { ReactNode } from 'react'
import { marcusAsset } from './assets'
import './marcus.css'

// 08 Marcus — shared page chrome, ported from
// improve-v1/v1-one-time-BEs/local/08-marcus/client/shared.js
// (`CHROME`, `renderMasthead`, `renderFooter`, `shell`) and
// improve-v1/v1-one-time-BEs/local/08-marcus/client/index.html (the shell markup:
// `<main class="sheet paper"><header class="masthead">…<div id="app">…<footer class="footer">`).
//
// Markup and class names are ported exactly so marcus.css's selectors (all
// scoped under `.m8`, see that file's header) keep applying. `.m8` itself is
// the new part — the local file styled a bare <body>; here it plays that role
// so the look can't leak into the rest of the app.
//
// The local build renders the masthead/footer dateline as two independent
// calls (`shell()` defaults the footer's to 'Local review build' when the page
// passes none) — that fallback string is local-harness-only copy, so here both
// spots just share one optional `dateline` prop and fall back to '' together.

const CHROME = { name: 'Marcus Stone', role: 'Daily Tarot Reader', brand: 'The Seer Within' } as const

export default function MarcusShell({
  dateline,
  children,
}: {
  dateline?: string
  children: ReactNode
}) {
  const line = dateline ?? ''
  return (
    <div className="m8">
      <main className="sheet paper">
        <header className="masthead">
          <img
            className="portrait"
            src={marcusAsset('portrait')}
            alt={CHROME.name}
            width={64}
            height={64}
          />
          <div className="mast-name">{CHROME.name}</div>
          <div className="mast-role">{CHROME.role}</div>
          <div className="rule-scotch" aria-hidden="true" />
          <div className="dateline label">
            <span>{line}</span>
            <span>{CHROME.brand}</span>
          </div>
        </header>
        <div id="app" aria-live="polite">
          {children}
        </div>
        <footer className="footer">
          <div className="rule-folio" aria-hidden="true" />
          <div className="dateline label">
            <span>{CHROME.name} · {CHROME.brand}</span>
            <span>{line}</span>
          </div>
        </footer>
      </main>
    </div>
  )
}

/**
 * Mirrors the local harness's `error(e)` / `clearError()` pair
 * (client/shared.js) — one `<p class="error" role="alert">` that is hidden
 * when there is nothing to show.
 */
export function MarcusError({ message }: { message: string | null }) {
  return (
    <p className="error" role="alert" hidden={!message}>
      {message ?? ''}
    </p>
  )
}

/** Ports client/shared.js's `money(n)` — cents to "$35.00". */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
