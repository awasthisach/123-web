# Perfect VVF — Secure Drive, Storage Scanner & Privacy Vault

[![Deploy to GitHub Pages](https://github.com/awasthisach/Web-The-Perfect-VVF/actions/workflows/deploy.yml/badge.svg)](https://github.com/awasthisach/Web-The-Perfect-VVF/actions/workflows/deploy.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**Perfect VVF (Virtual Vault & Files)** is an all-in-one cloud and local storage management suite. It connects directly with your personal **Google Drive** using client-side OAuth 2.0, provides **AI-powered semantic search**, scans **Phone Memory & SD Card** storage for duplicate or unbacked-up files, and safeguards your most sensitive documents in a **Zero-Knowledge AES-256 encrypted Privacy Vault**.

---

## 🌐 Live Deployments

- **GitHub Pages**: [https://awasthisach.github.io/Web-The-Perfect-VVF/](https://awasthisach.github.io/Web-The-Perfect-VVF/)
- **AI Studio Web App**: [https://ais-pre-y3xuzxdnayshpet3dy7dlt-608230001000.asia-southeast1.run.app](https://ais-pre-y3xuzxdnayshpet3dy7dlt-608230001000.asia-southeast1.run.app)

---

## ✨ Key Features

### 1. Google Drive Cloud Synchronization
- **Direct Client-Side OAuth 2.0**: Securely authenticate with your Google account without routing tokens through third-party servers.
- **Drive Explorer**: Browse folders, inspect metadata, view file previews, and search across nested directories.
- **Batch Operations & Reorganization**: Move single or multiple files to specific folders, create new folders on the fly, or move items to trash.

### 2. AI Semantic Search
- **Natural Language Querying**: Locate documents and images using contextual descriptions (e.g., *"tax documents"*, *"quarterly presentation"*, *"confidential agreement"*).
- **Multi-Source Filtering**: Search simultaneously across Google Drive, local storage, and cached files.
- **Instant Actions**: Move, preview, or encrypt files directly from search results.

### 3. Device Storage & SD Card Scanner
- **Phone Memory & SD Card Scanning**: Analyze device storage footprints, pinpoint massive media files, and locate unbacked-up data.
- **Smart Duplicate Finder**: Identify duplicate files by checksum, filename, and size to reclaim storage.
- **One-Tap Cloud Backup**: Move discovered local files directly into Google Drive folders.

### 4. Zero-Knowledge Privacy Vault
- **Client-Side AES-GCM (256-bit)**: Encrypt sensitive files locally using the browser's native Web Crypto API before saving or exporting.
- **Passphrase-Derived Keys**: Keys are derived in-memory using PBKDF2 with SHA-256. Plaintext data never touches any external database or server.
- **Encrypted Export & Import**: Securely backup your encrypted vault container as portable JSON.

### 5. Multi-Device Viewport Emulator & Responsive Audit
- **Interactive Device Simulation**: Test the application inside Mobile (iPhone, Pixel), Tablet (iPad), and Desktop frames with custom scaling and orientation toggles.
- **Real-Time Layout Audit**: Verify touch target accessibility, viewport constraints, and WCAG AA color contrast compliance.

### 6. Offline-Ready & PWA Support
- **IndexedDB Caching**: Access recently viewed files even when offline.
- **Progressive Web App (PWA)**: Installable directly to your home screen or desktop with service worker offline caching.

---

## 🔒 Security & Privacy Architecture

- **No Server Credential Storage**: All Google OAuth tokens remain strictly inside client browser memory (session state) and expire automatically.
- **Zero-Knowledge Architecture**: The Privacy Vault encrypts and decrypts files locally via the standard Web Crypto API (`SubtleCrypto`). Neither your passphrase nor your decrypted files are transmitted over the network.
- **Isolated User Context**: Each user accesses only their own authenticated Google Drive; no cross-user file access or shared persistence is possible.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 20.x recommended)
- `npm` or `bun`

### Installation & Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/awasthisach/Web-The-Perfect-VVF.git
cd Web-The-Perfect-VVF

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### Production Build

```bash
# Compile and bundle static assets into /dist
npm run build

# Preview production build locally
npm run preview
```

---

## ⚙️ CI/CD Deployment (GitHub Pages)

This repository includes an automated GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys static assets to **GitHub Pages** on every push to `main` or `master`.

### One-Time Activation on GitHub:
1. Navigate to your repository **Settings** → **Pages** (`https://github.com/awasthisach/Web-The-Perfect-VVF/settings/pages`).
2. Under **Build and deployment**, set **Source** to **`GitHub Actions`**.
3. Re-run the deployment workflow under the **Actions** tab to publish the site at:
   ```
   https://awasthisach.github.io/Web-The-Perfect-VVF/
   ```

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animation**: [Motion](https://motion.dev/)
- **Cryptography**: Native Web Crypto API (`AES-GCM`, `PBKDF2`, `SHA-256`)
- **Cloud APIs**: Google Identity Services (GIS) & Google Drive REST API v3

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
