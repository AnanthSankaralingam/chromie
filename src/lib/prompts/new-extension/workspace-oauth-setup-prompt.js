/**
 * Instructions to add to the explanation when Workspace APIs are used
 * This tells users how to set up OAuth credentials
 */

export const WORKSPACE_OAUTH_SETUP_EXPLANATION = `

## ⚠️ IMPORTANT: One-Time OAuth Setup Required

This extension uses Google Workspace APIs and requires OAuth 2.0 authentication. You need to complete a **one-time setup** (5-10 minutes) before the extension will work.

### Quick Setup Steps:

**Step 1: Load Your Extension**
1. Go to \`chrome://extensions/\`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked** and select this extension folder
4. **Copy the Extension ID** (you'll need this in Step 4)

**Step 2: Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Name it (e.g., "My Extension") and click **Create**

**Step 3: Enable Required APIs**
1. Go to **APIs & Services** → **Library**
2. Search for and enable the APIs this extension uses (see manifest.json for the list)

**Step 4: Create OAuth Client ID**
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External**, click **Create**
3. Fill in app name, your email, and click **Save and Continue**
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Choose **Chrome extension**
7. Paste your Extension ID from Step 1
8. Click **Create** and **copy the Client ID**

**Step 5: Update manifest.json**
1. Open \`manifest.json\` in this extension folder
2. Find \`"client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com"\`
3. Replace with your actual Client ID
4. Save and reload the extension in \`chrome://extensions/\`

**Step 6: Add Yourself as Test User**
1. Back in Google Cloud Console → **OAuth consent screen**
2. Scroll to **Test users** → **Add Users**
3. Add your Gmail address and save

**Step 7: Sign In!**
1. Click the extension icon
2. Click "Sign in with Google"
3. Approve the permissions
4. Done! 🎉

### Need Help?
- Full guide: See OAUTH_SETUP.md in this extension folder
- Stuck? [Contact support](mailto:support@chromie.dev)

---
`;

export const WORKSPACE_OAUTH_SETUP_FILE = `# OAuth Setup Guide

## Overview

This Chrome extension uses Google Workspace APIs and requires OAuth 2.0 authentication. You must complete this one-time setup before the extension will work.

**Time required:** 5-10 minutes  
**Prerequisites:** A Google account

---

## Step-by-Step Setup

### 1. Load Your Extension

1. Open Chrome and go to \`chrome://extensions/\`
2. Enable **Developer mode** (toggle switch in the top right)
3. Click **Load unpacked**
4. Select this extension folder
5. **IMPORTANT:** Copy the Extension ID (it looks like: \`abcdefghijklmnopqrstuvwxyz123456\`)
   - You'll need this in Step 4

---

### 2. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account
3. Click **Select a project** → **New Project**
4. Enter a project name (e.g., "My Calendar Extension")
5. Click **Create**
6. Wait for the project to be created (takes a few seconds)

---

### 3. Enable Required APIs

Check your \`manifest.json\` file to see which Google APIs this extension uses. Enable them:

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for each required API (e.g., "Google Calendar API")
3. Click on the API and click **Enable**

**Common APIs:**
- Gmail API - for email access
- Google Drive API - for file access
- Google Calendar API - for calendar access
- Google Sheets API - for spreadsheet access
- Google Docs API - for document access
- Google Tasks API - for task management

---

### 4. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace organization)
3. Click **Create**
4. Fill in the required fields:
   - **App name:** Your extension name
   - **User support email:** Your email address
   - **Developer contact information:** Your email address
5. Click **Save and Continue**
6. On the Scopes page, click **Save and Continue** (scopes are already in manifest.json)
7. On the Test users page, click **Save and Continue** (we'll add test users next)
8. Click **Back to Dashboard**

---

### 5. Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: Select **Chrome extension**
4. **Item ID:** Paste the Extension ID you copied in Step 1
5. Click **Create**
6. You'll see a dialog with your Client ID
7. **COPY the Client ID** (looks like: \`123456789-abcdef...xyz.apps.googleusercontent.com\`)

---

### 6. Update Extension with Your Client ID

1. Open the \`manifest.json\` file in this extension folder (use any text editor)
2. Find this section:
   \`\`\`json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     "scopes": [...]
   }
   \`\`\`
3. Replace \`YOUR_CLIENT_ID.apps.googleusercontent.com\` with your actual Client ID
4. Save the file
5. Go back to \`chrome://extensions/\` and click the **Reload** button on your extension

---

### 7. Add Yourself as Test User

Since your OAuth consent screen is in testing mode, you need to add your email as a test user:

1. Go back to **APIs & Services** → **OAuth consent screen**
2. Scroll down to the **Test users** section
3. Click **+ ADD USERS**
4. Enter your Gmail address
5. Click **Save**

**Note:** Without this step, you'll get an "Access blocked" error when trying to sign in.

---

### 8. Test Your Extension

1. Click your extension icon in Chrome
2. You should see a "Sign in with Google" button
3. Click the button
4. A Google sign-in window will appear
5. Select your account
6. Review and approve the permissions
7. You should be signed in and the extension should now work! 🎉

---

## Troubleshooting

### "Access blocked" Error

**Problem:** Getting "Error 403: access_denied" when signing in

**Solution:** Make sure you added your email address as a test user (Step 7)

---

### "Invalid Client ID" Error

**Problem:** Extension shows "OAuth2 client ID is invalid"

**Solution:** 
1. Double-check that you copied the entire Client ID
2. Make sure there are no extra spaces or quotes in manifest.json
3. Make sure you selected "Chrome extension" (not "Web application") when creating the OAuth client

---

### Wrong Extension ID

**Problem:** OAuth client was created with the wrong Extension ID

**Solution:**
1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth client
3. Update the Extension ID
4. Save changes

---

### APIs Not Enabled

**Problem:** Getting API errors after signing in

**Solution:** Make sure you enabled all the APIs that the extension uses (Step 3)

---

## For Production Use

If you want to publish this extension publicly:

1. Go to **OAuth consent screen**
2. Click **Publish App**
3. For sensitive scopes (Gmail, Drive, etc.), you'll need to submit for Google verification
   - This takes 1-2 weeks
   - Required for >100 users
4. Once verified, anyone can use your extension without being added as a test user

---

## Need Help?

- [Google Cloud Console](https://console.cloud.google.com)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- Contact: support@chromie.dev

---

## Security Notes

- Never share your OAuth Client ID secret (though Chrome extensions use client ID only)
- Your Client ID is safe to include in the extension
- Users can revoke access anytime from their Google Account settings
- OAuth tokens are managed securely by Chrome
`;

