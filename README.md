# AutoDox AI — Chrome Extension Foundation

AutoDox AI is a secure, privacy-first Chrome Extension (Manifest V3) for intelligent document processing and real-time form autofill. 

This repository delivers the **robust architectural foundation and intelligent autofill engine** of the extension:
- **Manifest V3** compliant configuration with minimal permissions (`storage`, `activeTab`).
- **Real-Time Semantic Form Autofill Engine**: Client-side heuristic matcher (`src/utils/fieldMatcher.js`) supporting synonyms, autocompletes, label inference, and smart decomposition (e.g. splitting Full Legal Name into First/Last name).
- **React & Framework DOM Compatibility**: Sets native prototype property descriptors and triggers synthetic `focus`, `input`, `change`, and `blur` events for modern single-page applications.
- **In-Page Visual Feedback & Undo History**: Live field outlines, subtle emerald green success pulses, in-page toast feedback, and one-click undo restoration.
- **Interactive Test Form Page**: Bundled `demo-form.html` testbed with realistic Job Application and KYC Identity forms for live demonstration.
- **React + Vite** powered popup and options interfaces with Deep Blue & White modern UI design system.

---

## Project Structure

```text
autodox-ai/
├── public/
│   ├── manifest.json              # Chrome Manifest V3 declaration
│   └── icons/                     # 16x16, 48x48, and 128x128 extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── src/
│   ├── background/
│   │   └── index.js               # Service worker (lifecycle & local settings)
│   ├── content/
│   │   └── index.js               # Standby content script (isolated DOM bridge)
│   ├── popup/
│   │   ├── components/
│   │   │   ├── Header.jsx         # AutoDox AI branding & status indicator
│   │   │   ├── Navigation.jsx     # Tab navigation bar with badge counters
│   │   │   ├── DashboardView.jsx  # System health, metrics & quick actions
│   │   │   ├── UploadView.jsx     # Document dropzone & local ingestion queue
│   │   │   ├── VaultView.jsx      # Attribute manager, search & copy controls
│   │   │   ├── AutofillAssistantView.jsx # Tab inspection & safety toggles
│   │   │   └── PrivacySettingsView.jsx   # Zero-telemetry policies & backup
│   │   ├── Popup.jsx              # Main popup application controller
│   │   ├── Popup.css              # Design system styles
│   │   └── index.jsx              # Popup React DOM entry point
│   ├── options/
│   │   ├── Options.jsx            # Extension settings & policy manager
│   │   ├── Options.css            # Options page layout
│   │   └── index.jsx              # Options React DOM entry point
│   ├── styles/
│   │   └── index.css              # Global tokens & CSS reset
│   └── utils/
│       └── storage.js             # chrome.storage.local wrapper with fallback
├── scripts/
│   ├── build-scripts.js           # Bundles background & content scripts (IIFE)
│   └── generate-icons.js          # Node.js PNG icon generator
├── popup.html                     # Extension popup HTML entry
├── options.html                   # Extension options HTML entry
├── vite.config.js                 # Vite bundler configuration
├── package.json                   # Dependencies & npm scripts
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Google Chrome** (or any Chromium browser: Brave, Edge, Arc)

---

## Installation & Build Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Extension Icons (Optional if already generated)
```bash
node scripts/generate-icons.js
```

### 3. Build the Extension
```bash
npm run build
```

This compiles:
1. `popup.html` and `options.html` with React bundles into `dist/`
2. `background.js` (Service Worker) into `dist/background.js`
3. `content.js` (Standalone IIFE script) into `dist/content.js`
4. Copies `manifest.json` and `icons/` into `dist/`

---

## How to Load into Chrome (Load Unpacked)

1. Open **Google Chrome**.
2. Navigate to `chrome://extensions/` in the URL bar.
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left corner, click the **Load unpacked** button.
5. In the file picker, select the **`dist`** folder inside this project directory:
   ```text
   c:\Users\gadeg\hackothon (2)\dist
   ```
6. Click **Select Folder**.
7. **AutoDox AI** will appear in your extensions list.
8. Click the puzzle icon in Chrome's toolbar and pin **AutoDox AI** to test the popup interface.
9. Open the interactive test form in Chrome:
   - Click the **"Test Form"** button inside the AutoDox AI popup (Autofill tab), or navigate directly to `file:///c:/Users/gadeg/hackothon%20(2)/dist/demo-form.html` (or `http://localhost:5173/demo-form.html` if running `npm run dev`).
10. In the AutoDox popup, click **"Scan & Match Form Fields"**, review the matched attributes, and click **"Autofill Matched Fields"** to watch the inputs fill instantly!

---

## Privacy & Security Principles

- **Zero Telemetry**: No document contents or form values are sent across external networks.
- **Minimal Permissions**: Operates strictly using `storage` (local browser database) and `activeTab` (user-initiated click context).
- **Content Script Isolation**: The content script remains completely passive and idle until the user explicitly requests inspection from the extension popup.
