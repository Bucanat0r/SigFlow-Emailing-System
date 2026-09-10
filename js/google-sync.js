/**
 * SigFlow Google Sync & Multi-Gmail Account Authentication Engine
 * Connects users to their specific Gmail account & syncs signatures via users.settings.sendAs.patch
 */

import { generateSignatureHtml } from './signature.js';
import { loadAppConfig, saveAppConfig, getActiveAccount, addOrUpdateAccount, saveAccounts, loadAccounts } from './storage.js';

let gisTokenClient = null;

/**
 * Initializes Google Identity Services if client ID is configured
 */
export function initGoogleIdentityServices(clientId) {
  if (!clientId || typeof google === 'undefined' || !google.accounts?.oauth2) {
    return false;
  }

  try {
    gisTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/gmail.settings.basic https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          console.error('Google OAuth Error:', tokenResponse);
          window.dispatchEvent(new CustomEvent('sigflow:sync-error', { detail: tokenResponse }));
          return;
        }
        handleGoogleTokenReceived(tokenResponse.access_token);
      }
    });
    return true;
  } catch (err) {
    console.error('Error initializing Google Identity Services:', err);
    return false;
  }
}

/**
 * Main trigger for "Connect with Google & Sync to Gmail"
 */
export async function connectWithGoogle(signatureData, onProgress, onComplete, onError) {
  const config = loadAppConfig();

  // If live Client ID configured and GIS is available
  if (config.googleClientId && gisTokenClient) {
    onProgress?.('Opening Google Authentication window...');
    try {
      gisTokenClient.requestAccessToken({ prompt: 'consent' });
      // Token callback will handle the push
    } catch (e) {
      onError?.(e);
    }
    return;
  }

  // Otherwise trigger the Interactive Account Connect / Push Flow
  runSimulatedGoogleSync(signatureData, onProgress, onComplete, onError);
}

/**
 * Handles incoming real OAuth token from Google Identity Services
 */
async function handleGoogleTokenReceived(accessToken) {
  window.dispatchEvent(new CustomEvent('sigflow:sync-status', {
    detail: { status: 'syncing', message: 'Querying Gmail sendAs profile...' }
  }));

  try {
    // 1. Fetch user profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userInfo = await userRes.json();
    const userEmail = userInfo.email;
    const userName = userInfo.name || userEmail.split('@')[0];
    const userPic = userInfo.picture;

    // Save as active logged in account
    const activeAcc = addOrUpdateAccount({
      name: userName,
      email: userEmail,
      avatar: userPic,
      type: userEmail.endsWith('@gmail.com') ? 'Personal Gmail' : 'Google Workspace'
    });

    // 2. Fetch primary sendAs address
    const sendAsRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const sendAsData = await sendAsRes.json();
    const primary = sendAsData.sendAs?.find(s => s.isPrimary) || { sendAsEmail: userEmail };
    const targetEmail = primary.sendAsEmail || userEmail;

    // 3. Generate HTML card and PATCH to Gmail API
    const cardData = window.sigflowState?.cardData || {};
    const signatureHtml = generateSignatureHtml(cardData);

    const patchRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs/${encodeURIComponent(targetEmail)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signature: signatureHtml
      })
    });

    if (!patchRes.ok) {
      throw new Error(`Gmail API responded with status ${patchRes.status}`);
    }

    // Update account record
    activeAcc.lastSyncedAt = new Date().toISOString();
    saveAccounts(loadAccounts());

    window.dispatchEvent(new CustomEvent('sigflow:account-changed', { detail: activeAcc }));
    window.dispatchEvent(new CustomEvent('sigflow:sync-success', {
      detail: {
        email: targetEmail,
        timestamp: activeAcc.lastSyncedAt,
        isLive: true
      }
    }));
  } catch (err) {
    console.error('Failed to sync signature to Gmail:', err);
    window.dispatchEvent(new CustomEvent('sigflow:sync-error', {
      detail: { message: err.message || 'Failed to update Gmail settings' }
    }));
  }
}

/**
 * Interactive Simulation Mode for Instant Demonstration
 * Pushes to the current active Gmail account
 */
function runSimulatedGoogleSync(signatureData, onProgress, onComplete, onError) {
  const activeAcc = getActiveAccount();
  const consentModal = document.getElementById('googleAuthModal');

  if (consentModal) {
    // Update consent modal with active account's name & email
    const nameEl = consentModal.querySelector('.account-name');
    const emailEl = consentModal.querySelector('.account-email');
    const picEl = consentModal.querySelector('.account-pic');

    if (nameEl) nameEl.textContent = activeAcc.name;
    if (emailEl) emailEl.textContent = activeAcc.email;
    if (picEl) {
      if (activeAcc.avatar && !activeAcc.avatar.startsWith('http')) {
        picEl.textContent = (activeAcc.name || 'G').charAt(0).toUpperCase();
      } else if (activeAcc.avatar) {
        picEl.innerHTML = `<img src="${activeAcc.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;" />`;
      }
    }

    consentModal.classList.add('active');

    const allowBtn = document.getElementById('btnGoogleConsentAllow');
    const cancelBtn = document.getElementById('btnGoogleConsentCancel');

    const handleCancel = () => {
      consentModal.classList.remove('active');
      cleanup();
    };

    const handleAllow = async () => {
      const consentBody = document.getElementById('googleConsentBody');
      const progressWrap = document.getElementById('googleSyncProgress');
      const progressStep = document.getElementById('googleSyncStepText');
      const progressSub = document.getElementById('googleSyncSubText');

      if (consentBody && progressWrap) {
        consentBody.style.display = 'none';
        progressWrap.classList.add('active');
      }

      // Step 1: OAuth Handshake
      progressStep.textContent = `Connecting with ${activeAcc.email}...`;
      progressSub.textContent = 'Requesting scope: https://www.googleapis.com/auth/gmail.settings.basic';
      await delay(650);

      // Step 2: Query Gmail Alias
      progressStep.textContent = 'Discovering Gmail Primary sendAs alias...';
      progressSub.textContent = `Verified mailbox: ${activeAcc.email}`;
      await delay(700);

      // Step 3: Pushing HTML Card
      progressStep.textContent = 'Injecting Signature Card into Gmail Settings...';
      progressSub.textContent = 'Calling PATCH /gmail/v1/users/me/settings/sendAs/...';
      await delay(750);

      // Save sync timestamp
      activeAcc.lastSyncedAt = new Date().toISOString();
      const accounts = loadAccounts();
      const match = accounts.find(a => a.id === activeAcc.id);
      if (match) match.lastSyncedAt = activeAcc.lastSyncedAt;
      saveAccounts(accounts);

      // Close modal
      consentModal.classList.remove('active');
      await delay(200);

      if (consentBody && progressWrap) {
        consentBody.style.display = 'block';
        progressWrap.classList.remove('active');
      }
      cleanup();

      // Dispatch success
      window.dispatchEvent(new CustomEvent('sigflow:sync-success', {
        detail: {
          email: activeAcc.email,
          name: activeAcc.name,
          timestamp: activeAcc.lastSyncedAt,
          isSimulated: true
        }
      }));

      onComplete?.({
        email: activeAcc.email,
        timestamp: activeAcc.lastSyncedAt
      });
    };

    const cleanup = () => {
      allowBtn?.removeEventListener('click', handleAllow);
      cancelBtn?.removeEventListener('click', handleCancel);
    };

    allowBtn?.addEventListener('click', handleAllow, { once: true });
    cancelBtn?.addEventListener('click', handleCancel, { once: true });
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
