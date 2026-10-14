# AutoDox AI — Personal Information Vault & Autofill Companion

AutoDox helps you organize your personal information and fill compatible online forms more easily.

Save your information once, then use the AutoDox browser extension to fill matching form fields with your approval.

## ✨ Features

- **Personal Information Vault:** Store and manage your personal information securely.
- **Organized Information:** Keep your saved personal details, addresses, and documents organized in one place.
- **Form Autofill:** Fill compatible online forms using your saved information with intelligent heuristic matching.
- **User-Controlled Filling:** Review information and approve autofill actions before anything is entered.
- **Website and Extension:** Manage your information on the web application and access it seamlessly through the browser extension.

## 🌐 AutoDox Website

Visit the website to create an account or sign in:

**[https://auto-dox.vercel.app](https://auto-dox.vercel.app)**

## 📥 Download AutoDox

**[Download AutoDox v1.0.0](https://github.com/Afnanshaik12/AutoDox/releases/tag/v1.0.0)**

Follow the installation instructions below to get started.

## 🛠️ Installation Guide

> **Important:** AutoDox is currently distributed through GitHub and is not published on the Chrome Web Store. You must install the extension manually using Developer mode.

### Step 1: Download the extension

1. Open the [AutoDox Releases page](https://github.com/Afnanshaik12/AutoDox/releases/tag/v1.0.0).
2. Scroll down to the **Assets** section.
3. Click **AutoDox-extension.zip**.
4. Wait for the download to finish.

**Tip:** Download `AutoDox-extension.zip`, not the source-code ZIP files.

### Step 2: Extract the downloaded file

1. Open your computer's **Downloads** folder.
2. Find `AutoDox-extension.zip`.
3. Extract or unzip the file:
   - **Windows:** Right-click the ZIP file and select **Extract All**.
   - **macOS:** Double-click the ZIP file.
4. Remember where the extracted folder is located.

### Step 3: Open your browser's Extensions page

1. Open Google Chrome or Brave.
2. Type the following into the address bar:

   `chrome://extensions`

3. Press **Enter**.

### Step 4: Enable Developer mode

On the Extensions page, find the **Developer mode** switch in the top-right corner and turn it on.

### Step 5: Install AutoDox

1. Click **Load unpacked**.
2. Navigate to your **Downloads** folder.
3. Find and select the **extracted AutoDox folder**.
4. Click **Select Folder** or **Open**, depending on your computer.

**💡 Tip:** Select the extracted AutoDox folder—the folder created when you unzipped the download. Do not select the ZIP file itself, and do not open the folder to select individual files.

AutoDox should now appear on your browser's Extensions page.

### Step 6: Open AutoDox

1. Click the puzzle-piece icon in your browser toolbar.
2. Find AutoDox in the extensions list.
3. Pin AutoDox if you want its icon to remain visible.
4. Click the AutoDox icon to open it.

### Step 7: Sign in to your account

1. Visit the [AutoDox website](https://auto-dox.vercel.app).
2. Create an account if you don't already have one.
3. Open the AutoDox extension.
4. Sign in using your AutoDox account credentials.

Use the same account for the website and extension.

## 📝 How to Use AutoDox

### 1. Save your information

Open the AutoDox website and sign in.

Add the personal information you want to reuse, such as your name, email address, phone number, or other supported details.

### 2. Open an online form

Visit a website containing a form you want to fill in.

### 3. Open the extension

Click the AutoDox icon in your browser toolbar.

Make sure you are signed in and your saved information is available.

### 4. Autofill the form

Click **Autofill This Form**.

AutoDox will attempt to match the form fields with the information saved in your vault.

### 5. Review the completed form

Check the inserted information and correct any missing or incorrect values.

**Important:** Autofill may not recognize every website or form field. Always review the information before submitting a form. AutoDox does not submit forms automatically.

## 🧪 Testing with the Interactive Demo Form

AutoDox includes a bundled testbed form (`demo-form.html`) with realistic **Job Application** and **KYC Identity Verification** fields:

1. Open `demo-form.html` in your browser (drag and drop the file into Chrome, or navigate to it directly).
2. Open the AutoDox extension popup.
3. Ensure you have information saved in your vault.
4. Click **Autofill This Form** to watch the inputs populate in real time!

## 🔒 Privacy and Security

- Use AutoDox only on devices and accounts you trust.
- Store only information you are comfortable saving in your account.
- Review information inserted into forms before submitting them.
- Never share your account password or other sensitive authentication details.
- Sign out when using a shared computer.

Please refer to the project's privacy policy for details about how personal information is handled.

## ❓ Troubleshooting

### AutoDox does not appear in my browser

1. Open `chrome://extensions`.
2. Check that AutoDox is enabled.
3. If it is missing, repeat the installation instructions.
4. Make sure you selected the extracted AutoDox folder, not the ZIP file.

### I cannot sign in

1. Check that you entered the correct account credentials.
2. Make sure your internet connection is working.
3. Try signing in through the [AutoDox website](https://auto-dox.vercel.app).
4. If the problem continues, contact the project maintainer.

### Autofill does not work

1. Confirm that you are signed in.
2. Make sure your vault contains the information you need.
3. Try a supported form with clearly labelled fields.
4. Check the form manually after autofill because some fields may not be recognized automatically.

### How do I update AutoDox?

When a newer release becomes available:

1. Download the latest `AutoDox-extension.zip` from the [Releases page](https://github.com/Afnanshaik12/AutoDox/releases).
2. Extract the downloaded ZIP into a folder.
3. Open `chrome://extensions`.
4. Remove the old AutoDox installation if necessary.
5. Click **Load unpacked**.
6. Select the newly extracted AutoDox folder.
7. Sign in again if prompted.

Your saved account information is separate from the extension files, but confirm that it is still available after updating.

## 🐛 Reporting a Problem

If you encounter an issue, open an issue in this GitHub repository and explain:

- What you were trying to do.
- What happened instead.
- Any error message you received.
- Which browser you are using.

**Never include passwords, API keys, personal documents, or other sensitive information in a GitHub issue.**

## 💻 Developer Guide & Local Setup

For developers wanting to build, test, or contribute to AutoDox:

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+
- A modern Chromium-based browser (Chrome, Brave, Edge, Arc)

### 1. Clone the repository

```bash
git clone https://github.com/Afnanshaik12/AutoDox.git
cd AutoDox
```

### 2. Install dependencies

```bash
# Install root dependencies (React, Vite, extension build scripts)
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### 3. Environment configuration

Copy the example environment configuration in `server/`:

```bash
cp server/.env.example server/.env
```

Configure the following variables in `server/.env`:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous public key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for backend admin operations)
- `GEMINI_API_KEY`: Google Gemini API key (for intelligent document parsing)

To set up your database tables, run the SQL script in `server/schema.sql` inside your Supabase SQL Editor, then verify connectivity:

```bash
npm run check:supabase
```

### 4. Run development servers

```bash
# Terminal 1: Run frontend web dashboard (http://localhost:5173)
npm run dev

# Terminal 2: Run backend API server (http://localhost:5001)
npm run server:dev
```

### 5. Build the browser extension

```bash
npm run build
```

This compiles:
1. React bundles for `popup.html` and `options.html` into `dist/`
2. Service worker into `dist/background.js`
3. Isolated content script into `dist/content.js`
4. Manifest and assets into `dist/`

Load the `dist/` folder into `chrome://extensions` with **Developer mode** enabled to test your custom build.

### 6. Run automated tests

```bash
npm test
```

## 🗂️ Project Structure

```text
AutoDox/
├── public/                 # Extension manifest and static assets
│   ├── manifest.json       # Chrome Manifest V3 declaration
│   └── icons/              # Extension icons (16, 48, 128px)
├── src/
│   ├── background/         # Service worker (lifecycle & local settings)
│   ├── content/            # Isolated content script (form DOM observer & filler)
│   ├── popup/              # React extension popup view & components
│   ├── options/            # Extension settings & policy views
│   ├── web/                # Web application dashboard & auth views
│   └── utils/              # Heuristic field matcher & storage utilities
├── server/
│   ├── src/                # Express API server & routes
│   ├── validators/         # Request validation schemas (Zod)
│   ├── tests/              # Backend and extension API unit tests
│   └── schema.sql          # Supabase PostgreSQL schema
├── scripts/                # esbuild & packaging scripts
├── demo-form.html          # Interactive test form for autofill verification
├── vite.config.js          # Vite multi-page bundler configuration
└── package.json            # Project manifest & build scripts
```

## 🧰 Technology

AutoDox is built using modern technologies:
- **Frontend / Extension UI**: React 18, Vite, Lucide Icons
- **Backend API**: Node.js, Express, Zod
- **Database & Authentication**: Supabase (PostgreSQL & Supabase Auth)
- **Extension Architecture**: Chrome Extensions Manifest V3 (IIFE isolated content script, esbuild)

## 📦 Distribution

AutoDox is currently distributed through GitHub and requires manual browser-extension installation. It is not currently available through the Chrome Web Store.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
