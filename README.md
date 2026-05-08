# Payment Tracker — Progressive Web App (PWA)

This folder contains the **App Version** of the Payment Tracker. It has been converted into a Progressive Web App (PWA) using a `manifest.json` and a Service Worker (`sw.js`). Because all security features are handled dynamically via Google Apps Script and Secret Keys, this code is 100% safe to host publicly.

## Step 1: Deploy via GitHub Pages

To install the app on your phone, you first need to host it on the internet securely (HTTPS). GitHub Pages is the easiest and free way to do this.

### Deployment Steps:
1. **Create a GitHub Repository**: Go to [GitHub](https://github.com/) and create a new **Public** repository (e.g., `payment-tracker-app`).
2. **Upload Files**: Upload **all the files** from this `app/` folder (including `index.html`, `script.js`, `style.css`, `manifest.json`, `sw.js`, etc.) into your new GitHub repository.
3. **Enable GitHub Pages**:
   - In your GitHub repository, click on the **Settings** tab.
   - On the left sidebar, scroll down and click on **Pages**.
   - Under the "Build and deployment" section, find the **Branch** dropdown.
   - Change it from "None" to **main** (or `master`), and click **Save**.
4. **Get Your URL**: Wait about 1-2 minutes. Refresh the Settings > Pages tab. You will see a message at the top saying: *"Your site is live at `https://[your-username].github.io/[repo-name]/`"*. 

---

## Step 2: Install the App on your Phone

Because this is a PWA, it can be installed natively on your mobile phone, acting exactly like an app downloaded from the Play Store (full screen, offline caching, app drawer icon).

### Installation Steps:
1. **Open the Link**: Open your newly created GitHub Pages URL (from Step 1) in the **Google Chrome** browser on your Android phone.
2. **Install**:
   - Wait a few seconds for the site to load.
   - You should see a prompt at the bottom of the screen saying **"Add PayTrack to Home screen"**.
   - If the prompt doesn't appear automatically, tap the **three dots menu** (top right) in Chrome and select **"Install app"** or **"Add to Home screen"**.
3. **Done!**: The app is now installed. You can close Chrome and launch the tracker directly from your phone's app drawer or home screen!

## Files in this Folder:
- `index.html` — Updated with the Web Manifest link and Service Worker registration.
- `manifest.json` — Tells the phone the app name, colors, and display preferences.
- `sw.js` — Caches the files so the app framework opens instantly, even if you briefly lose internet connection.
- `icon.svg` — The app icon that will appear on your phone's home screen.
- `style.css` & `script.js` — The core logic and styles synced perfectly with your security architecture.
