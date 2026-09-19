# Drive Semantic Search

Client-side web app to sign in with Google, browse/sync Drive metadata, pin files offline, encrypt local notes, and find likely duplicates.

**Live:** https://awasthisach.github.io/Drive-Semantic-Search-Web/

## Features

- **Google Drive** — OAuth, My Drive / All drives / Shared Drive corpus, type filters, upload, trash, move, folders, star
- **Token lifecycle** — expiry, silent refresh, revoke on sign-out
- **Offline pin** — binary or Docs export → IndexedDB (200MB / 80 entries LRU) + SHA-256; preview from cache
- **Vault** — PBKDF2 310k + AES-GCM via Web Worker (main-thread fallback), IndexedDB ciphertext
- **Duplicates** — size/name candidates; SHA-256 after pin
- **Search** — keyword + metadata ranking (not neural embeddings)
- **PWA** — Vite PWA shell

## Package manager

**npm only** (`packageManager: npm@10`). Do not commit `bun.lock` / `yarn.lock`. CI runs `npm install` + `npm run lint` + `npm test` + `npm run build`.

## Scripts

- `npm run dev` — local
- `npm run lint` — `tsc --noEmit`
- `npm test` — vitest unit tests
- `npm run build` — production

## Honest limits

- Not vector/embedding search
- Broad `drive` OAuth scope (list + mutate)
- Access token in `sessionStorage` (SPA constraint)
- Vault unlock is passphrase-based client-side only
- Pagination capped (~10k) with truncation banner

## Stack

React 19, Vite 6, Tailwind 4, Firebase Auth + GIS, Drive API v3, IndexedDB, Web Crypto + Worker.
