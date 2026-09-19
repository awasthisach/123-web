# Drive Semantic Search

Client-side web app to sign in with Google, browse/sync Drive metadata, pin files offline, encrypt local notes, and find likely duplicates.

**Live:** https://awasthisach.github.io/Drive-Semantic-Search-Web/

## Features

- **Google Drive** — OAuth sign-in, list (~10k with pagination), type filters, upload, trash, move, folders, star
- **Token lifecycle** — expiry tracking, silent refresh, revoke on sign-out
- **Offline pin** — binary download or Docs/Sheets/Slides export into IndexedDB + SHA-256; preview from cache
- **Vault** — client-side encrypted notes (PBKDF2 + AES-GCM) in IndexedDB
- **Duplicates** — size/name candidates; SHA-256 groups after offline pin
- **Search** — keyword + metadata ranking (not neural embeddings)
- **PWA** — installable shell via Vite PWA

## Honest limits

- Search is **not** vector/embedding semantic search
- Full-Drive content indexing of every file byte is not done (API cost / quota)
- Scope uses `drive` for list + mutate; tighten only if product requirements allow
- Device “storage scanner” is limited by browser sandbox (File System Access where available)

## Setup

1. Enable Google Drive API + OAuth client (Web) for your domain
2. Set Authorized JavaScript origins / redirect URIs for local + GitHub Pages
3. Configure `firebase-applet-config.json` / OAuth client ID used by the app
4. `npm install && npm run dev`

## Scripts

- `npm run dev` — local
- `npm run lint` — `tsc --noEmit`
- `npm run build` — production

## Stack

React, Vite, Tailwind, Firebase Auth + Google Identity Services, Drive API v3, IndexedDB, Web Crypto.
