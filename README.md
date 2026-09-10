# SigFlow - Approach 2 (Native Gmail Inbox Integration)

> **"Instead of forcing users to log into an unfamiliar dashboard every time they need to write an email, they click 'Connect with Google' once. Your app generates the card and pushes it straight into their native Gmail or Google Workspace settings. From that moment on, whenever they open Gmail on the web, their signature card is already attached."**

---

## 🌟 Key Features

1. **Approach 2 (Inbox Integration) Engine**:
   - **One-Click Native Push**: Uses official Google Identity Services (GIS) and Google Workspace Gmail REST API (`PATCH https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs/{email}`).
   - **Interactive Demo Simulator**: Works right out of the box with an authentic Google OAuth simulation dialog, animated API handshake, and live feedback without requiring API credentials upfront.
   - **Real Google Cloud Sync**: Seamlessly accepts custom Google Cloud Client IDs for direct production sync to your real Gmail inbox.

2. **Pixel-Accurate Native Gmail Web Simulator**:
   - Recreates the iconic Gmail web interface (`mail.google.com`) with the red **"Compose"** button, sidebar folders, and inbox message list.
   - Shows the floating **Gmail Compose Window** where your signature card is rendered *directly at the bottom of the email compose window*, exactly as Gmail users see it when writing emails.

3. **Visual Card Studio**:
   - **Personal & Role Attributes**: Name, pronouns, job title, department, company, tagline.
   - **Direct Contact**: Email, phone, mobile/WhatsApp, website, physical office address.
   - **Media Assets**: Preset executive avatars, custom portrait file upload (Data URL), company logo upload, avatar shape toggles (circle, rounded, square).
   - **Action Modules & CTAs**:
     - Direct calendar booking button (Calendly, Cal.com, HubSpot)
     - Promotional announcement banner ("🚀 What's New")
     - Eco & legal confidentiality disclaimer
   - **Social Networks**: LinkedIn, X (Twitter), GitHub, YouTube, Instagram with verified email-friendly icons.
   - **5 Themes**: *Executive Modern*, *Minimalist Tech*, *Vibrant Gradient*, *Corporate Classic*, *Compact Pill*.
   - **Custom Accent Colors & Email-Safe Typography**.

4. **Bulletproof HTML Output**:
   - Outputs 100% compliant, nested `<table>` markup with inline styles (`style="..."`), explicit image dimensions, and web-safe fallbacks.
   - Tested for Gmail Web, Gmail iOS/Android, Apple Mail, and Outlook.
   - Built-in **"Copy HTML"** and **"Copy Rich Formatted Signature"** clipboard fallbacks.

---

## 🚀 Quick Start (Local Server)

Run the included zero-dependency PowerShell server:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```

Then open your browser to:
[http://localhost:3000](http://localhost:3000)

---

## 🔑 Setting Up Real Google Workspace / Gmail API (Optional)

To push signature cards to your real Gmail inbox:
1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project or select an existing one.
3. Enable the **Gmail API** (APIs & Services > Enable APIs > Gmail API).
4. Configure the **OAuth Consent Screen**:
   - User type: External or Internal (for Google Workspace)
   - Add scope: `https://www.googleapis.com/auth/gmail.settings.basic`
5. Create an **OAuth Client ID**:
   - Application Type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000` (and your production domain)
6. In SigFlow, click **"Google Settings"** in the top navigation bar, paste your **Client ID**, and click **"Save & Apply"**.
