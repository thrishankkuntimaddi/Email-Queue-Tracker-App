# 📧 Email Cooldown Dashboard

> **Real-time email rate-limit tracker — across every device, instantly.**

A Progressive Web App (PWA) built for power users who manage multiple email accounts with platform-imposed send cooldowns. It lets you track which emails are currently live (ready to use), how long before a cooling-down address unlocks, and which address you're actively using — all synced in real time across every device you own.

---

## 📌 Description

Managing dozens of email accounts with staggered cooldown timers is painful. Spreadsheets fall out of sync, sticky notes get lost, and keeping track manually across a phone and a desktop is error-prone.

**Email Cooldown Dashboard** solves this by giving you:

- A single, always-current source of truth for your entire email queue
- Live countdown timers that update every second
- Real-time cross-device sync via Firestore — open it on your phone and your laptop simultaneously and both update instantly
- A "Currently Using" workflow to log which email you're actively sending from and register its new cooldown timestamp when you're done

It is designed to be **fast, minimal, and distraction-free** — installed as a PWA so it feels like a native app on both desktop and mobile.

---

## 🚀 Live Demo

**Deployed on GitHub Pages:**

🔗 [https://thrishankkuntimaddi.github.io/Email-Queue-Tracker-App](https://thrishankkuntimaddi.github.io/Email-Queue-Tracker-App)

> ⚠️ The live app requires a personal Firebase project. Create your own account via the Sign Up page to access all features.

---

## 🧩 Features

### Core Queue Management
- **Live / Cooldown Detection** — emails are automatically classified as `LIVE` (ready) or on cooldown based on their stored timestamp
- **Real-time Countdown Timers** — every email on cooldown shows a live `Xh Ym Zs` countdown, ticking every second
- **Priority Groups** — import emails in named groups (High Priority, Secondary, System, Testing, Backup) separated by `——————` dividers
- **Smart Sorting** — live emails always surface at the top, cooldown emails are sorted by soonest-unlocking first

### "Currently Using" Workflow
- Tap **Use** on any live email to flag it as "currently in use" — synced instantly to all devices
- Enter the platform's cooldown timestamp when done — one keystroke (`Enter`) confirms and resets the email's timer

### Inline Editing
- Edit any email's cooldown timestamp directly in the queue row without leaving the page
- Keyboard shortcuts: `Enter` to save, `Escape` to cancel

### Import & Export
- **Paste Import** — bulk-paste a formatted list (`01 - email@domain.com - 3/12/2026, 1:28 PM`)
- **JSON Backup Upload** — restore from a previously downloaded backup file
- **Export to Clipboard** — copy the entire queue as a formatted plaintext list
- **Download JSON Backup** — save a structured `.json` snapshot of your queue for safekeeping
- **Search** — instant fuzzy-free search/filter across all emails in the queue

### Real-time Cross-Device Sync
- Firestore `onSnapshot` listener pushes updates from any device to all others instantly
- **Optimistic UI** — local state updates immediately; Firestore write happens in the background
- **Offline-first** — IndexedDB persistence keeps the app functional with no network; data syncs when connectivity returns
- **Sync Now** — manual force-fetch button for a hard refresh from Firestore

### Authentication & Security
- Email / password sign-up and sign-in via Firebase Auth
- **Email verification gate** — unverified accounts see a verification wall and cannot access the app
- Data is scoped per user (`users/{uid}/cooldown/data`) — no cross-user data leakage
- Sign out cleans up the Firestore listener and in-memory cache

### Account Management
- Delete Account — permanently wipes the user's Firestore document and Firebase Auth record
- Two-step confirmation for destructive actions (Clear All, Delete Account)

### PWA
- Installable on desktop and mobile (Android / iOS)
- Auto-updating service worker via Workbox
- Firebase endpoints are always fetched `NetworkOnly` — no stale auth tokens or Firestore data from the service worker cache
- Apple-specific meta tags for seamless home-screen install on iOS

### Responsive Layouts
- **Desktop (≥ md)** — all four modules rendered vertically on a single scrollable page
- **Mobile (< md)** — bottom navigation bar with four tabs: Dashboard, Queue, Ready, Settings

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 19](https://react.dev/) |
| **Build Tool** | [Vite 7](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (via `@tailwindcss/vite`) |
| **Backend / Auth** | [Firebase v12](https://firebase.google.com/) — Auth + Firestore |
| **Offline Cache** | Firestore IndexedDB Persistence + Workbox (via `vite-plugin-pwa`) |
| **PWA** | `vite-plugin-pwa` with Workbox |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **UI Primitives** | `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| **Deployment** | GitHub Pages (via `gh-pages` + GitHub Actions) |
| **CI/CD** | GitHub Actions — builds on every push to `main`, injects Firebase secrets, deploys `dist/` |

---

## 📂 Project Structure

```
Email-Queue-Tracker-App/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: build & deploy to GitHub Pages
├── public/
│   ├── email-icon.svg          # App favicon (SVG)
│   ├── pwa-192.png             # PWA icon (192×192)
│   ├── pwa-512.png             # PWA icon (512×512, also maskable)
│   └── apple-touch-icon.png   # iOS home-screen icon
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Auth gate, routing shell, layout (Header, BottomNav)
│   ├── index.css               # Global Tailwind imports + custom CSS
│   ├── assets/                 # Static assets (images, fonts)
│   ├── hooks/
│   │   └── useAppData.js       # Core data hook — Firestore listener + all action functions
│   ├── lib/
│   │   ├── firebase.js         # Firebase app init (Auth + Firestore with persistence)
│   │   ├── auth.js             # Pure Firebase Auth functions (signIn, signUp, signOut, delete)
│   │   ├── db.js               # Firestore data layer (fetch, patch, listen, delete, cache)
│   │   ├── helpers.js          # Time utilities, priority-group map, sorting, import parsers
│   │   └── utils.js            # Tailwind class merge utility (cn)
│   ├── modules/
│   │   ├── login.jsx           # LoginScreen + VerificationWall components
│   │   ├── dashboard.jsx       # Stats cards + "Currently Using" bar
│   │   ├── queue.jsx           # Full email queue table (desktop) + cards (mobile)
│   │   ├── ready.jsx           # Quick-access "Ready to Use" + "Next Unlocking" panels
│   │   └── settings.jsx        # Import, Export, Backup, Sync, Sign Out, Delete Account
│   └── components/
│       └── ui/                 # Shared UI primitives (Radix-based button, etc.)
├── index.html                  # HTML shell with PWA meta tags
├── vite.config.js              # Vite + Tailwind + PWA plugin configuration
├── .env.example                # Environment variable template
└── package.json
```

---

## ⚙️ Installation & Setup

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- A [Firebase](https://console.firebase.google.com/) project with **Authentication** (Email/Password) and **Firestore** enabled

---

### 1. Clone the Repository

```bash
git clone https://github.com/thrishankkuntimaddi/Email-Queue-Tracker-App.git
cd Email-Queue-Tracker-App
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

Open `.env` and add your values (see [Environment Variables](#-environment-variables) below).

### 4. Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

> **Note:** The service worker is disabled in development mode (`devOptions.enabled: false`) to avoid caching side-effects during development.

### 5. Build for Production

```bash
npm run build
```

The production bundle is output to `dist/`.

### 6. Preview Production Build

```bash
npm run preview
```

---

## 🔑 Environment Variables

Create a `.env` file at the project root with the following variables. All values come from your Firebase project's **Project Settings → Your Apps → SDK setup and configuration**.

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (e.g. `your-project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firestore project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket (e.g. `your-project.appspot.com`) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID *(optional)* |

> ⚠️ **Never commit `.env` to version control.** The `.gitignore` already excludes it. For GitHub Actions deployments, add these values as **GitHub Repository Secrets** — the CI workflow injects them at build time.

---

## 🧠 How It Works

### Data Model

All user data lives in a single Firestore document at:

```
users/{uid}/cooldown/data
```

```json
{
  "emails": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "timestamp": "3/17/2026, 10:35:57 PM",
      "order": 0,
      "group": 1,
      "createdAt": "ISO string",
      "updatedAt": "ISO string"
    }
  ],
  "currentUsing": "uuid-or-null",
  "updatedAt": "Firestore ServerTimestamp"
}
```

A timestamp value of `"LIVE"` (or any unparseable/past date) means the email is immediately available.

### Real-time Sync Architecture

```
Device A writes → patchUserData (optimistic local update + Firestore setDoc merge)
                ↓
         Firestore server
                ↓
Device B's onSnapshot fires → UI updates instantly
```

The `listenToUserData` function applies two guards to prevent stale data:
1. **`hasPendingWrites: true`** → skip (this is Device A's own write echoing back)
2. **`fromCache: true` after first snapshot** → skip (stale IndexedDB mid-session)

The first snapshot is always allowed through — even from cache — so mobile users see data instantly from IndexedDB before the network round-trip completes.

### Countdown Timer

A global `setInterval` in `App.jsx` fires every 1 000 ms and updates a `tick` value (set to `Date.now()`). All modules that display countdowns depend on `tick` via `useMemo`, ensuring every countdown re-renders in sync.

### Priority Groups

During a bulk import, emails are separated into groups using `——————` divider lines. Each group gets an incrementing `group` number that maps to a visual priority badge:

| Group | Label | Color |
|---|---|---|
| 1–2 | High Priority | Red |
| 3–4 | Secondary | Amber |
| 5–6 | System | Violet |
| 7 | Testing | Blue |
| 8+ | Backup | Zinc |

### Smart Sort Order

The queue is sorted as follows:
1. **LIVE emails first** — sorted by their `order` field (original import order)
2. **Cooling-down emails next** — sorted ascending by unlock timestamp (soonest first)

---

## 🚧 Challenges & Solutions

| Challenge | Solution |
|---|---|
| **Random sign-outs on mobile / PWA reinstall** | Used `initializeAuth` with an explicit `[indexedDBLocalPersistence, browserLocalPersistence]` chain instead of `getAuth`, so persistence is locked in before any observer fires |
| **Stale Firestore cache overwriting live multi-device edits** | `onSnapshot` guard: after the first snapshot, `fromCache: true` snapshots are suppressed mid-session |
| **`SharedWorker` failure in mobile standalone PWA mode** | Firestore's `persistentMultipleTabManager` (requires `SharedWorker`) is wrapped in a `try/catch` that falls back to `persistentSingleTabManager` |
| **Service worker caching Firebase auth tokens** | Workbox `runtimeCaching` rules set all `googleapis.com` and `firebase.googleapis.com` endpoints to `NetworkOnly` |
| **Cross-device "Currently Using" state** | `currentUsing` is stored alongside `emails` in the same Firestore document and synced via the same `onSnapshot` listener — no second collection needed |
| **Optimistic updates without Firestore delay** | `patchUserData` updates the in-memory `_cache` synchronously before the async `setDoc` call, and `useAppData` mirrors this with local `useState` updates |

---

## 🔮 Future Improvements

- [ ] **Push Notifications** — notify the user when a cooling-down email unlocks
- [ ] **Platform Presets** — auto-detect cooldown duration for popular platforms (e.g., Gmail: 24h, Outlook: 12h)
- [ ] **Analytics Dashboard** — charts showing email usage frequency, average cooldown duration, and recovery time
- [ ] **Team / Shared Queues** — Firestore security rules + invite system to share a queue across multiple users
- [ ] **Drag-and-drop Reordering** — manually reorder email priority within a group
- [ ] **Dark / Light Theme Toggle** — the app is currently dark-only
- [ ] **Audit Log** — per-email timestamp history to track when each address was last used
- [ ] **CSV Import** — accept `.csv` files in addition to the current plaintext paste and JSON backup formats

---

## 📸 UI Overview

| Screen | Description |
|---|---|
| **Login / Sign-up** | Clean dark-themed auth form with email/password fields and a verification wall for unverified accounts |
| **Dashboard** | Three stat cards (LIVE count, On Cooldown count, Next Unlocking) + the "Currently Using" action bar |
| **Ready** | Two-panel view: top 5 live emails with a "Use" button, and the top 5 soonest-unlocking emails with live countdowns |
| **Queue** | Full sortable, searchable list — table layout on desktop, card layout on mobile — with inline edit and delete per row |
| **Settings** | Import (paste or JSON upload), Export to clipboard, Download JSON Backup, Sync Now, Sign Out, and Danger Zone (Clear All, Delete Account) |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and ensure the app builds cleanly: `npm run build`
4. **Lint your code**: `npm run lint`
5. **Commit** with a clear message: `git commit -m "feat: add push notifications for unlocked emails"`
6. **Open a Pull Request** describing your changes

### Guidelines

- Keep the single-document Firestore data model intact — avoid adding new collections unless strictly necessary
- All Firebase reads/writes must go through `src/lib/db.js` — no direct Firestore imports elsewhere
- Maintain the `VITE_*` environment variable naming convention for any new Firebase feature flags
- Test on both desktop and mobile viewport sizes before submitting

---

## 📜 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Thrish Ank Kuntimaddi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">
  Built with ⚡ React + Firebase + Vite · Deployed on GitHub Pages
</div>
