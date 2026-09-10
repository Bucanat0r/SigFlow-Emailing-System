/**
 * SigFlow Simulator Module - Dual View Studio & Native Gmail Simulator
 * Handles real-time DOM rendering of signature cards & real email dispatching
 */

import { generateSignatureHtml, generateSignaturePlainText } from './signature.js';
import { getActiveAccount } from './storage.js';
import { initWebmail, updateWebmailAccountInfo, recordSentEmail, loadFolderEmails, openComposeModal } from './webmail.js';
import { compressImageFile } from './app.js';

let currentView = 'gmail'; // 'gmail', 'card', 'html'
let currentSurface = 'light';
let lastActiveEmail = '';

/**
 * Initializes the simulator views and interactive tabs
 */
export function initSimulator() {
  setupViewTabs();
  setupSurfaceToggle();
  setupGmailInteractiveElements();
  updateSimulatorAccountInfo();
  initWebmail();
}

/**
 * Updates simulator UI with current active account details
 */
export function updateSimulatorAccountInfo() {
  const activeAcc = getActiveAccount();
  if (!activeAcc) return;

  updateWebmailAccountInfo(activeAcc);

  // If active account changed, reload mailbox emails
  if (lastActiveEmail && lastActiveEmail !== activeAcc.email) {
    loadFolderEmails('inbox', true);
  }
  lastActiveEmail = activeAcc.email;

  // Gmail top right account avatar
  const avatarEl = document.querySelector('.gmail-user-avatar');
  if (avatarEl) {
    if (activeAcc.avatar) {
      avatarEl.innerHTML = `<img src="${activeAcc.avatar}" alt="${activeAcc.name}" style="width:100%;height:100%;object-fit:cover;" />`;
    } else {
      avatarEl.textContent = (activeAcc.name || 'G').charAt(0).toUpperCase();
    }
    avatarEl.title = `Google Account: ${activeAcc.name} (${activeAcc.email})`;
  }

  // Compose window sender indicator
  const syncBadge = document.querySelector('.compose-sync-badge');
  if (syncBadge) {
    if (activeAcc.isLive) {
      syncBadge.className = 'compose-sync-badge live-active';
      syncBadge.style.background = '#dcfce7';
      syncBadge.style.color = '#15803d';
      syncBadge.style.borderColor = '#86efac';
      syncBadge.innerHTML = `
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:4px;"></span>
        🟢 LIVE GMAIL ACTIVE &bull; ${activeAcc.email}
      `;
    } else {
      syncBadge.className = 'compose-sync-badge';
      syncBadge.style.background = '#fef3c7';
      syncBadge.style.color = '#92400e';
      syncBadge.style.borderColor = '#fde68a';
      syncBadge.innerHTML = `
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#d97706;margin-right:4px;"></span>
        🟡 DEMO MODE &bull; ${activeAcc.email} (Click to Go Live)
      `;
      syncBadge.style.cursor = 'pointer';
      syncBadge.onclick = () => {
        document.getElementById('accountLoginModal')?.classList.add('active');
      };
    }
  }
}

/**
 * Updates all views with the latest signature card data
 */
export function renderAllViews(cardData) {
  const html = generateSignatureHtml(cardData);

  // 1. Update Standalone Card Preview
  const cardContainer = document.getElementById('signatureCardPreview');
  if (cardContainer) {
    cardContainer.innerHTML = html;
  }

  // 2. Update Injected Signature in Native Gmail Compose Window
  const gmailInjected = document.getElementById('gmailInjectedSignature');
  if (gmailInjected) {
    gmailInjected.innerHTML = html;
  }

  // 3. Update HTML Code Inspector
  const htmlCodeBox = document.getElementById('htmlCodeOutput');
  if (htmlCodeBox) {
    htmlCodeBox.textContent = html;
  }

  // 4. Synchronize draft-level add-on buttons
  syncDraftAddonButtons(cardData);

  // Ensure compose window is visible
  const composeWindow = document.getElementById('gmailComposeWindow');
  if (composeWindow && composeWindow.style.display === 'none') {
    composeWindow.style.display = 'flex';
  }
}

/**
 * Updates the visual On/Off state of draft add-on buttons in the Compose Window
 */
export function syncDraftAddonButtons(cardData) {
  const ctaBtn = document.getElementById('btnToggleDraftCta');
  const ctaStatus = document.getElementById('statusDraftCta');
  if (ctaBtn && ctaStatus) {
    const isCtaOn = Boolean(cardData?.showCtaButton);
    ctaBtn.classList.toggle('active', isCtaOn);
    ctaStatus.textContent = isCtaOn ? 'On' : 'Off';
  }

  const promoBtn = document.getElementById('btnToggleDraftPromo');
  const promoStatus = document.getElementById('statusDraftPromo');
  if (promoBtn && promoStatus) {
    const isPromoOn = Boolean(cardData?.showPromoBanner);
    promoBtn.classList.toggle('active', isPromoOn);
    promoStatus.textContent = isPromoOn ? 'On' : 'Off';
  }
}

/**
 * Sets up tab switching between Card Preview, Gmail Simulator, and HTML Code
 */
function setupViewTabs() {
  const buttons = document.querySelectorAll('.preview-mode-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      setViewMode(mode);
    });
  });
}

export function setViewMode(mode) {
  currentView = mode;

  // Update button active classes
  document.querySelectorAll('.preview-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Toggle view containers
  const cardView = document.getElementById('viewCard');
  const gmailView = document.getElementById('viewGmail');
  const htmlView = document.getElementById('viewHtml');
  const surfaceToggle = document.getElementById('surfaceToggle');

  if (cardView) cardView.style.display = (mode === 'card') ? 'flex' : 'none';
  if (gmailView) {
    gmailView.style.display = (mode === 'gmail') ? 'flex' : 'none';
    if (mode === 'gmail') {
      const composeWindow = document.getElementById('gmailComposeWindow');
      if (composeWindow && composeWindow.style.display === 'none') {
        composeWindow.style.display = 'flex';
      }
    }
  }
  if (htmlView) htmlView.style.display = (mode === 'html') ? 'block' : 'none';
  if (surfaceToggle) surfaceToggle.style.display = (mode === 'card') ? 'flex' : 'none';
}

/**
 * Surface Background Toggle (Light / Dark mode canvas preview)
 */
function setupSurfaceToggle() {
  const toggleBtn = document.getElementById('btnToggleSurface');
  const previewCanvas = document.getElementById('previewCanvas');
  const surfaceLabel = document.getElementById('surfaceLabel');

  if (toggleBtn && previewCanvas) {
    toggleBtn.addEventListener('click', () => {
      currentSurface = currentSurface === 'light' ? 'dark' : 'light';
      previewCanvas.classList.toggle('dark-surface', currentSurface === 'dark');
      if (surfaceLabel) {
        surfaceLabel.textContent = currentSurface === 'dark' ? 'Dark Background' : 'Light Canvas';
      }
    });
  }
}

/**
 * Adds authentic micro-interactions to the Gmail Web Compose Simulator
 */
function setupGmailInteractiveElements() {
  const composeBtn = document.getElementById('gmailSimComposeBtn');
  const composeWindow = document.getElementById('gmailComposeWindow');
  const closeBtn = document.getElementById('composeCloseBtn');
  const minimizeBtn = document.getElementById('composeMinimizeBtn');
  const sendBtn = document.getElementById('gmailSimSendBtn');

  // Make sure compose window is open by default
  if (composeWindow) {
    composeWindow.style.display = 'flex';
  }

  // Re-open / animate compose window
  if (composeBtn) {
    composeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openComposeModal();
    });
  }

  // Close / Minimize compose
  if (closeBtn && composeWindow) {
    closeBtn.addEventListener('click', () => {
      composeWindow.style.display = 'none';
    });
  }

  if (minimizeBtn && composeWindow) {
    minimizeBtn.addEventListener('click', () => {
      composeWindow.classList.toggle('minimized');
    });
  }

  // Per-message add-on toggles (Calendar Booking CTA & Promo Banner)
  const draftCtaBtn = document.getElementById('btnToggleDraftCta');
  if (draftCtaBtn) {
    draftCtaBtn.addEventListener('click', () => {
      const cardData = window.sigflowState?.cardData;
      if (cardData) {
        cardData.showCtaButton = !cardData.showCtaButton;
        const toggleCtaCheckbox = document.getElementById('toggleCta');
        if (toggleCtaCheckbox) toggleCtaCheckbox.checked = cardData.showCtaButton;
        renderAllViews(cardData);
      }
    });
  }

  const draftPromoBtn = document.getElementById('btnToggleDraftPromo');
  if (draftPromoBtn) {
    draftPromoBtn.addEventListener('click', () => {
      const cardData = window.sigflowState?.cardData;
      if (cardData) {
        cardData.showPromoBanner = !cardData.showPromoBanner;
        const togglePromoCheckbox = document.getElementById('togglePromo');
        if (togglePromoCheckbox) togglePromoCheckbox.checked = cardData.showPromoBanner;
        renderAllViews(cardData);
      }
    });
  }

  // Intercept paste in compose body to auto-compress pasted images and prevent massive payloads
  const bodyEditable = document.getElementById('composeBodyText');
  if (bodyEditable && !bodyEditable.dataset.pasteBound) {
    bodyEditable.dataset.pasteBound = 'true';
    bodyEditable.addEventListener('paste', async (e) => {
      const items = (e.clipboardData || window.clipboardData)?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              try {
                // Compress pasted screenshot/image to max 600x600 px to stay well under size limits
                const compressed = await compressImageFile(file, 600, 600, 0.82);
                document.execCommand('insertImage', false, compressed);
              } catch (err) {
                console.error('Failed to compress pasted image', err);
              }
              return;
            }
          }
        }
      }
    });
  }

  // REAL SEND / LIVE DISPATCH BUTTON
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const activeAcc = getActiveAccount();
      const toInput = document.getElementById('composeToInput');
      const subjectInput = document.getElementById('composeSubjectInput');
      const bodyEditable = document.getElementById('composeBodyText');

      const rawTo = toInput?.value.trim();
      if (!rawTo) {
        window.dispatchEvent(new CustomEvent('sigflow:toast', {
          detail: {
            title: 'Missing Recipient',
            message: 'Please enter at least one recipient email address.',
            type: 'error'
          }
        }));
        if (toInput) {
          toInput.focus();
          toInput.style.borderColor = '#ef4444';
          setTimeout(() => { toInput.style.borderColor = ''; }, 3000);
        }
        return;
      }

      // Parse and validate multiple recipients (separated by comma or semicolon)
      const recipientList = rawTo.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const invalidRecipients = recipientList.filter(email => !emailRegex.test(email));

      if (invalidRecipients.length > 0) {
        window.dispatchEvent(new CustomEvent('sigflow:toast', {
          detail: {
            title: 'Invalid Recipient Address',
            message: `"${invalidRecipients.join(', ')}" is not a valid email address. Please enter valid email addresses.`,
            type: 'error'
          }
        }));
        if (toInput) {
          toInput.focus();
          toInput.style.borderColor = '#ef4444';
          toInput.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.2)';
          setTimeout(() => {
            toInput.style.borderColor = '';
            toInput.style.boxShadow = '';
          }, 3500);
        }
        return;
      }

      const toEmail = recipientList.join(', ');
      const rawSub = subjectInput?.value || '';
      const subject = rawSub.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Following up on our chat';

      // Extract the user's message
      let userTypedHtml = bodyEditable?.innerHTML?.trim() || '';
      if (userTypedHtml === '<p><br></p>' || userTypedHtml === '<p></p>' || userTypedHtml === '<br>') {
        userTypedHtml = '<p>Hi there,</p><p>Great connecting earlier today. Let me know if you have any questions on your end.</p><p>Best regards,</p>';
      }

      const cardData = window.sigflowState?.cardData || {};
      const signatureCardHtml = generateSignatureHtml(cardData);

      // Email body contains the message followed by a subtle divider and the signature card
      const fullEmailHtml = `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#202124;line-height:1.5;">
          ${userTypedHtml}
          <div style="margin:18px 0 16px;border-top:1px solid #e2e8f0;"></div>
          ${signatureCardHtml}
        </div>
      `.trim();

      // Generate matching text/plain MIME alternative so the email is never HTML-only
      const userPlainText = bodyEditable?.innerText?.trim() || 'Hi there,\n\nGreat connecting earlier today. Let me know if you have any questions on your end.\n\nBest regards,';
      const signaturePlainText = generateSignaturePlainText(cardData);
      const fullPlainText = [userPlainText, signaturePlainText].filter(Boolean).join('\n\n---\n');

      // Pre-flight Size Guard: Prevent "Message too large" bounces from Yahoo / Gmail
      const payloadSizeBytes = new Blob([fullEmailHtml]).size;
      if (payloadSizeBytes > 12 * 1024 * 1024) {
        const mb = (payloadSizeBytes / (1024 * 1024)).toFixed(1);
        window.dispatchEvent(new CustomEvent('sigflow:toast', {
          detail: {
            title: 'Message Too Large to Send',
            message: `Your email is ${mb} MB. Yahoo, Google, and Outlook reject incoming emails over 20-25 MB. Please reduce image sizes before sending.`,
            type: 'error'
          }
        }));
        return;
      }

      // Check if active account has Live credentials configured
      if (activeAcc.isLive && (activeAcc.appPassword || activeAcc.oauthToken)) {
        const originalText = sendBtn.innerHTML;
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<span>Sending...</span>`;

        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              from: activeAcc.email,
              senderName: activeAcc.name,
              to: toEmail,
              subject: subject,
              bodyHtml: fullEmailHtml,
              plainText: fullPlainText,
              appPassword: activeAcc.appPassword,
              oauthToken: activeAcc.oauthToken
            })
          });

          if (res.status === 404) {
            // Static web deployment fallback
            recordSentEmail({ to: toEmail, subject: subject, bodyHtml: fullEmailHtml });
            window.dispatchEvent(new CustomEvent('sigflow:toast', {
              detail: {
                title: '⚡ Static Web Mode: Simulated Sent',
                message: `Email captured in local simulator. For direct SMTP relay, use Google Sync or the local server.`,
                type: 'info'
              }
            }));
            return;
          }

          let data = {};
          try {
            data = await res.json();
          } catch (jsonErr) {
            throw new Error(`Server returned unexpected status ${res.status}: ${res.statusText}`);
          }

          if (res.ok && data.success) {
            recordSentEmail({ to: toEmail, subject: subject, bodyHtml: fullEmailHtml });

            const recipientCount = recipientList.length;
            const recipientSummary = recipientCount > 1 ? `${recipientCount} recipients (${toEmail})` : toEmail;

            window.dispatchEvent(new CustomEvent('sigflow:toast', {
              detail: {
                title: '✅ REAL EMAIL DELIVERED!',
                message: `Dispatched from ${activeAcc.email} to ${recipientSummary} with multipart MIME.`,
                type: 'success'
              }
            }));
          } else {
            throw new Error(data.error || 'Failed to dispatch email.');
          }
        } catch (err) {
          window.dispatchEvent(new CustomEvent('sigflow:toast', {
            detail: {
              title: 'Sending Failed',
              message: err.message || 'Could not send through SMTP. Please verify your App Password and settings.',
              type: 'error'
            }
          }));
        } finally {
          sendBtn.disabled = false;
          sendBtn.innerHTML = originalText;
        }
      } else {
        // Active account is in Demo Mode
        window.dispatchEvent(new CustomEvent('sigflow:toast', {
          detail: {
            title: '⚠️ Currently in Demo Mode',
            message: `To send REAL live emails to Yahoo, Outlook, Gmail, or iCloud inboxes, connect your account with an App Password. Opening setup now...`,
            type: 'info'
          }
        }));

        setTimeout(() => {
          document.getElementById('accountLoginModal')?.classList.add('active');
        }, 500);
      }
    });
  }
}
