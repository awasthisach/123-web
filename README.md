# Drive Semantic Search Web

Client-side Google Drive browser with metadata search, a prototype privacy vault, and device-storage demo UI.

**Live:** [https://awasthisach.github.io/Drive-Semantic-Search-Web/](https://awasthisach.github.io/Drive-Semantic-Search-Web/)

> **Honest scope:** This is a **prototype / demo**, not a production backup or zero-knowledge vault product. See limitations below.

---

## What works today

- **Google Sign-In (OAuth)** via Google Identity Services + Firebase helper
- **Drive metadata sync** (`files.list`) with type filters (All / Docs / PDF / Photos / Videos / Sheets) and pagination (up to ~2000 items)
- **Keyword / heuristic search** over filename, tags, and summaries (not ML embeddings)
- **Privacy Vault (text notes)** — AES-256-GCM via Web Crypto; passphrase chosen by you (nothing hard-coded)
- **Local-only** file list items from the Upload button (metadata in memory, **not** uploaded to Drive)

## What does *not* work / is demo-only

| UI label | Reality |
|----------|---------|
| “Upload” / “Backed up to Google Drive” | Local React state only — no `files.create` upload |
| Device Storage Scanner | Mock / picker metadata demo — not full phone filesystem wipe |
| “Encrypt to Vault” from device scan | Disabled — no file bytes to encrypt |
| “AI Semantic Search” | Deterministic keyword scoring, not embeddings/LLM |
| IndexedDB offline file cache | **Not implemented** for user files (PWA may cache app shell only) |
| Zero-knowledge multi-device vault | Passphrase never leaves the browser, but vault data is **not** persisted across refresh |

---

## Security notes

- OAuth access token is kept in memory + `sessionStorage` (cleared when the tab session ends). Treat XSS as full Drive access risk while signed in.
- Scope used: `https://www.googleapis.com/auth/drive` (list + mutate). Prefer signing out when finished.
- Vault KDF: PBKDF2-HMAC-SHA-256, **310,000** iterations → AES-GCM-256.
- **Never** reuse a demo passphrase. Choose your own (≥ 8 characters).

---

## Getting started

```bash
git clone https://github.com/awasthisach/Drive-Semantic-Search-Web.git
cd Drive-Semantic-Search-Web
npm install
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run build
npm run preview
```

Deploy: GitHub Actions → GitHub Pages on push to `main`.

Configure OAuth client (Google Cloud Console):

- Authorized JavaScript origins: your Pages origin + `http://localhost:3000`
- Enable **Google Drive API**
- Put client id in `firebase-applet-config.json` → `oAuthClientId`

---

## Tech stack

- React 19 + Vite + TypeScript + Tailwind CSS v4
- Firebase Auth helpers + Google Identity Services
- Google Drive REST API v3
- Web Crypto API (PBKDF2 + AES-GCM)

---

## License

MIT
