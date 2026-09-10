/**
 * SigFlow Main Application Coordinator
 * Binds UI studio controls, handles Google OAuth sync, real email sending, and live credentials
 */

import {
  loadSignatureData,
  saveSignatureData,
  loadAppConfig,
  saveAppConfig,
  defaultSignatureData,
  loadAccounts,
  saveAccounts,
  getActiveAccount,
  setActiveAccount,
  addOrUpdateAccount
} from './storage.js';
import { generateSignatureHtml } from './signature.js';
import { initSimulator, renderAllViews, setViewMode, updateSimulatorAccountInfo } from './simulator.js';
import { connectWithGoogle, initGoogleIdentityServices } from './google-sync.js';

// Application State
const state = {
  cardData: loadSignatureData(),
  config: loadAppConfig(),
  accounts: loadAccounts(),
  activeAccount: getActiveAccount()
};

// Expose state globally for event hooks
window.sigflowState = state;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Apply saved or default theme (Light mode default)
  applyTheme(state.config.themePreference || 'light');

  // Initialize Simulator Views (Card, Gmail, HTML)
  initSimulator();

  // Populate UI Form Fields from State
  populateFormFields();

  // Bind All Form Inputs & Change Handlers
  bindFormInputs();

  // Bind Avatar & Logo Handlers
  bindMediaUploaders();

  // Bind Themes & Color Presets
  bindThemeAndColorPickers();

  // Bind Google OAuth & Sync Actions
  bindGoogleIntegration();

  // Bind Account Switcher & Login Modal
  bindAccountLoginSystem();

  // Bind Real Gmail Web Launcher Shortcuts
  bindRealGmailWebShortcuts();

  // Bind Copy & Export Actions
  bindCopyActions();

  // Bind Modals & Setup Wizard
  bindModals();

  // Bind Theme Switcher Toggle
  bindThemeToggle();

  // Setup Global Toast Notifications Listener
  setupToastListener();

  // Initial Render of All Views
  renderAllViews(state.cardData);

  // Update Initial Sync UI State
  updateSyncStatusUI();

  // Init Google Identity Services if client ID saved
  if (state.config.googleClientId) {
    initGoogleIdentityServices(state.config.googleClientId);
  }

  // Optimize any existing oversized portrait or logo media from previous sessions
  optimizeExistingCardMedia(state.cardData);
}

/**
 * Applies Light or Dark theme to the document
 */
function applyTheme(theme) {
  state.config.themePreference = theme;
  saveAppConfig(state.config);

  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  // Update theme toggle icon
  const toggleBtn = document.getElementById('btnThemeToggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = (theme === 'dark')
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    toggleBtn.title = (theme === 'dark') ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

function bindThemeToggle() {
  const toggleBtn = document.getElementById('btnThemeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = state.config.themePreference || 'light';
      const next = (current === 'dark') ? 'light' : 'dark';
      applyTheme(next);
      showToast('Theme Updated', `Switched to ${next} mode.`, 'info');
    });
  }
}

/**
 * Populates studio form inputs with loaded state
 */
function populateFormFields() {
  const d = state.cardData;

  setInputValue('inputFullName', d.fullName);
  setInputValue('inputPronouns', d.pronouns);
  setInputValue('inputJobTitle', d.jobTitle);
  setInputValue('inputDepartment', d.department);
  setInputValue('inputCompany', d.company);
  setInputValue('inputTagline', d.tagline);

  setInputValue('inputEmail', d.email);
  setInputValue('inputPhone', d.phone);
  setInputValue('inputMobile', d.mobile);
  setInputValue('inputWebsite', d.website);
  setInputValue('inputAddress', d.address);

  setCheckboxValue('toggleAvatar', d.showAvatar !== false);
  setCheckboxValue('toggleLogo', d.showLogo !== false);

  setCheckboxValue('toggleCta', Boolean(d.showCtaButton));
  setInputValue('inputCtaText', d.ctaText);
  setInputValue('inputCtaUrl', d.ctaUrl);

  setCheckboxValue('togglePromo', Boolean(d.showPromoBanner));
  setInputValue('inputPromoText', d.promoText);
  setInputValue('inputPromoUrl', d.promoUrl);

  setCheckboxValue('toggleDisclaimer', d.showDisclaimer);
  setInputValue('inputDisclaimerText', d.disclaimerText);

  setInputValue('inputLinkedin', d.socials?.linkedin || '');
  setInputValue('inputTwitter', d.socials?.twitter || '');
  setInputValue('inputGithub', d.socials?.github || '');
  setInputValue('inputYoutube', d.socials?.youtube || '');
  setInputValue('inputInstagram', d.socials?.instagram || '');

  // Theme cards active state
  document.querySelectorAll('.theme-card-option').forEach(card => {
    card.classList.toggle('selected', card.dataset.theme === d.theme);
  });

  // Accent color active state
  setInputValue('inputCustomColor', d.accentColor);
  document.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.color.toLowerCase() === d.accentColor.toLowerCase());
  });

  // Client ID
  setInputValue('inputGoogleClientId', state.config.googleClientId || '');
}

/**
 * Binds input events for live instant preview
 */
function bindFormInputs() {
  const tabBtns = document.querySelectorAll('.studio-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-pane').forEach(p => {
        p.classList.toggle('active', p.id === tabTarget);
      });
    });
  });

  const fieldBindings = [
    { id: 'inputFullName', key: 'fullName' },
    { id: 'inputPronouns', key: 'pronouns' },
    { id: 'inputJobTitle', key: 'jobTitle' },
    { id: 'inputDepartment', key: 'department' },
    { id: 'inputCompany', key: 'company' },
    { id: 'inputTagline', key: 'tagline' },
    { id: 'inputEmail', key: 'email' },
    { id: 'inputPhone', key: 'phone' },
    { id: 'inputMobile', key: 'mobile' },
    { id: 'inputWebsite', key: 'website' },
    { id: 'inputAddress', key: 'address' },
    { id: 'inputCtaText', key: 'ctaText' },
    { id: 'inputCtaUrl', key: 'ctaUrl' },
    { id: 'inputPromoText', key: 'promoText' },
    { id: 'inputPromoUrl', key: 'promoUrl' },
    { id: 'inputDisclaimerText', key: 'disclaimerText' }
  ];

  fieldBindings.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        state.cardData[key] = e.target.value;
        onCardDataUpdated();
      });
    }
  });

  const toggleBindings = [
    { id: 'toggleAvatar', key: 'showAvatar' },
    { id: 'toggleLogo', key: 'showLogo' },
    { id: 'toggleCta', key: 'showCtaButton' },
    { id: 'togglePromo', key: 'showPromoBanner' },
    { id: 'toggleDisclaimer', key: 'showDisclaimer' }
  ];

  toggleBindings.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        state.cardData[key] = e.target.checked;
        onCardDataUpdated();
      });
    }
  });

  const socialInputs = ['Linkedin', 'Twitter', 'Github', 'Youtube', 'Instagram'];
  socialInputs.forEach(net => {
    const el = document.getElementById(`input${net}`);
    if (el) {
      el.addEventListener('input', (e) => {
        state.cardData.socials[net.toLowerCase()] = e.target.value;
        onCardDataUpdated();
      });
    }
  });

  const resetBtn = document.getElementById('btnResetDefault');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset your signature card to default sample template?')) {
        state.cardData = { ...defaultSignatureData };
        saveSignatureData(state.cardData);
        populateFormFields();
        renderAllViews(state.cardData);
        showToast('Template Reset', 'Signature card has been reset to defaults.', 'info');
      }
    });
  }
}

/**
 * Compresses an image File or Blob using HTML5 Canvas
 * Resizes down to maxWidth/maxHeight while preserving aspect ratio, outputs lightweight JPEG/PNG Data URL
 */
export function compressImageFile(file, maxWidth = 240, maxHeight = 240, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      compressDataUrl(event.target.result, maxWidth, maxHeight, quality)
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses a Data URL image string via HTML5 Canvas
 */
export function compressDataUrl(dataUrl, maxWidth = 240, maxHeight = 240, quality = 0.85) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string') return resolve(dataUrl);
    if (!dataUrl.startsWith('data:image/')) return resolve(dataUrl);
    if (dataUrl.startsWith('data:image/svg+xml')) return resolve(dataUrl);

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Default to JPEG to keep size minuscule (~15-25 KB)
      const isPng = dataUrl.startsWith('data:image/png');
      let result = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);

      // If PNG is still too large (> 80 KB), fallback to JPEG
      if (isPng && result.length > 80000) {
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result);
    };
    img.onerror = () => resolve(dataUrl); // Fallback to original if canvas fails
    img.src = dataUrl;
  });
}

/**
 * Auto-optimizes any existing oversized data URLs in state from previous uploads
 */
export async function optimizeExistingCardMedia(cardData) {
  let changed = false;
  // If avatar is data URL larger than 60KB (~45KB binary), compress it
  if (cardData.avatarUrl && cardData.avatarUrl.startsWith('data:image/') && cardData.avatarUrl.length > 60000) {
    cardData.avatarUrl = await compressDataUrl(cardData.avatarUrl, 240, 240, 0.85);
    changed = true;
  }
  // If logo is data URL larger than 50KB, compress it
  if (cardData.logoUrl && cardData.logoUrl.startsWith('data:image/') && cardData.logoUrl.length > 50000) {
    cardData.logoUrl = await compressDataUrl(cardData.logoUrl, 240, 100, 0.85);
    changed = true;
  }
  if (changed) {
    onCardDataUpdated();
    console.log('[SigFlow] Automatically optimized oversized signature media to lightweight data URIs.');
  }
}

/**
 * Binds Avatar and Logo image handling
 */
function bindMediaUploaders() {
  const presetBtns = document.querySelectorAll('.avatar-preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const img = btn.querySelector('img');
      if (img) {
        state.cardData.avatarUrl = img.src;
        onCardDataUpdated();
      }
    });
  });

  const avatarFileInput = document.getElementById('avatarFileInput');
  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // Auto-compress avatar: max 240x240 px (~15-25 KB, sharp Retina for 76x76 display)
          showToast('Processing Portrait', 'Optimizing and compressing portrait image...', 'info');
          const compressedUrl = await compressImageFile(file, 240, 240, 0.85);
          state.cardData.avatarUrl = compressedUrl;
          presetBtns.forEach(b => b.classList.remove('selected'));
          onCardDataUpdated();
          showToast('Avatar Updated', 'Portrait optimized and loaded into signature (lightweight & email-safe).', 'success');
        } catch (err) {
          console.error('Image compression failed:', err);
          showToast('Image Error', 'Failed to process image file.', 'error');
        }
      }
    });
  }

  const logoFileInput = document.getElementById('logoFileInput');
  if (logoFileInput) {
    logoFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // Auto-compress logo: max 240x100 px (~10-20 KB)
          showToast('Processing Logo', 'Optimizing and compressing company logo...', 'info');
          const compressedUrl = await compressImageFile(file, 240, 100, 0.85);
          state.cardData.logoUrl = compressedUrl;
          onCardDataUpdated();
          showToast('Logo Updated', 'Company logo optimized and loaded into signature.', 'success');
        } catch (err) {
          console.error('Logo compression failed:', err);
          showToast('Image Error', 'Failed to process logo file.', 'error');
        }
      }
    });
  }

  const shapeRadios = document.querySelectorAll('input[name="avatarShape"]');
  shapeRadios.forEach(radio => {
    if (radio.value === state.cardData.avatarShape) radio.checked = true;
    radio.addEventListener('change', (e) => {
      state.cardData.avatarShape = e.target.value;
      onCardDataUpdated();
    });
  });
}

/**
 * Binds Theme selection and Color Palette Pickers
 */
function bindThemeAndColorPickers() {
  const themeCards = document.querySelectorAll('.theme-card-option');
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const theme = card.dataset.theme;
      state.cardData.theme = theme;
      onCardDataUpdated();
      showToast('Theme Changed', `Applied "${card.querySelector('.theme-card-name')?.textContent}" design layout.`, 'info');
    });
  });

  const colorSwatches = document.querySelectorAll('.color-swatch-btn');
  const customColorInput = document.getElementById('inputCustomColor');

  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      const color = swatch.dataset.color;
      state.cardData.accentColor = color;
      if (customColorInput) customColorInput.value = color;
      onCardDataUpdated();
    });
  });

  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      const color = e.target.value;
      state.cardData.accentColor = color;
      colorSwatches.forEach(s => s.classList.remove('selected'));
      onCardDataUpdated();
    });
  }

  const fontSelect = document.getElementById('selectFontFamily');
  if (fontSelect) {
    fontSelect.value = state.cardData.fontFamily;
    fontSelect.addEventListener('change', (e) => {
      state.cardData.fontFamily = e.target.value;
      onCardDataUpdated();
    });
  }
}

/**
 * Email Provider Resolver for UI badges, App Password instructions, and links
 */
export function detectEmailProvider(email) {
  if (!email || !email.includes('@')) {
    return {
      id: 'generic',
      name: 'Email Provider',
      badgeBg: '#f1f5f9',
      badgeColor: '#475569',
      helpUrl: '',
      helpLabel: '',
      instructions: 'Enter your email address above to view setup instructions for your provider.'
    };
  }

  const domain = email.split('@').pop().toLowerCase().trim();

  // Yahoo Mail / AOL / Rocketmail / Ymail
  if (domain.includes('yahoo.') || domain.includes('ymail.com') || domain.includes('rocketmail.com') || domain.includes('myyahoo.')) {
    return {
      id: 'yahoo',
      name: 'Yahoo Mail',
      badgeBg: '#f3e8ff',
      badgeColor: '#6b21a8',
      helpUrl: 'https://login.yahoo.com/account/security',
      helpLabel: 'Get Yahoo App Password ↗',
      instructions: '1. Go to <a href="https://login.yahoo.com/account/security" target="_blank">login.yahoo.com/account/security</a>.<br/>2. Scroll down to <strong>App Passwords</strong> and click <strong>Generate app password</strong>.<br/>3. Enter "SigFlow" and paste the generated password here.'
    };
  }

  // Microsoft Outlook / Hotmail / Live / Office 365
  if (domain.includes('outlook.') || domain.includes('hotmail.') || domain.includes('live.') || domain.includes('msn.com') || domain.includes('office365.')) {
    return {
      id: 'outlook',
      name: 'Microsoft Outlook',
      badgeBg: '#e0f2fe',
      badgeColor: '#0369a1',
      helpUrl: 'https://account.live.com/proofs/manage/additional',
      helpLabel: 'Get Microsoft App Password ↗',
      instructions: '1. Go to <a href="https://account.live.com/proofs/manage/additional" target="_blank">account.live.com Security Options</a>.<br/>2. Under <strong>App passwords</strong>, click <em>Create a new app password</em>.<br/>3. Paste the generated password here.'
    };
  }

  // Apple iCloud / Me / Mac
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return {
      id: 'icloud',
      name: 'Apple iCloud',
      badgeBg: '#f1f5f9',
      badgeColor: '#334155',
      helpUrl: 'https://appleid.apple.com/account/manage',
      helpLabel: 'Get Apple App-Specific Password ↗',
      instructions: '1. Sign in to <a href="https://appleid.apple.com/account/manage" target="_blank">appleid.apple.com</a>.<br/>2. Under <em>Sign-In and Security</em>, click <strong>App-Specific Passwords</strong>.<br/>3. Generate a password for "SigFlow" and paste it here.'
    };
  }

  // Zoho Mail
  if (domain.includes('zoho.')) {
    return {
      id: 'zoho',
      name: 'Zoho Mail',
      badgeBg: '#fef3c7',
      badgeColor: '#92400e',
      helpUrl: 'https://accounts.zoho.com',
      helpLabel: 'Get Zoho App Password ↗',
      instructions: '1. Go to <a href="https://accounts.zoho.com" target="_blank">accounts.zoho.com</a> > Security > App Passwords.<br/>2. Generate a new password named "SigFlow" and paste it here.'
    };
  }

  // Google Gmail / Google Workspace
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return {
      id: 'gmail',
      name: 'Google Gmail',
      badgeBg: '#fee2e2',
      badgeColor: '#991b1b',
      helpUrl: 'https://myaccount.google.com/apppasswords',
      helpLabel: 'Get Google App Password ↗',
      instructions: '1. Go to <a href="https://myaccount.google.com/apppasswords" target="_blank">myaccount.google.com/apppasswords</a>.<br/>2. Name it "SigFlow" and click <strong>Create</strong>.<br/>3. Paste the 16-letter code here to activate live sending.'
    };
  }

  // Custom Domain
  return {
    id: 'custom',
    name: domain ? `Custom Mail (${domain})` : 'Custom Email',
    badgeBg: '#e2e8f0',
    badgeColor: '#1e293b',
    helpUrl: '',
    helpLabel: '',
    instructions: 'Enter your mailbox password or app-specific password provided by your mail provider.'
  };
}

/**
 * Multi-Account Multi-Provider Login & Live Credentials Setup System
 */
function bindAccountLoginSystem() {
  const accountBtn = document.getElementById('btnUserAccount');
  const accountModal = document.getElementById('accountLoginModal');
  const closeAccountBtn = document.getElementById('btnCloseAccountModal');
  const addAccountForm = document.getElementById('addAccountForm');
  const testCredsBtn = document.getElementById('btnTestCredentials');
  const emailInput = document.getElementById('loginEmailInput');
  const badge = document.getElementById('detectedProviderBadge');
  const helpLink = document.getElementById('appPasswordHelpLink');
  const instructions = document.getElementById('appPasswordInstructions');
  const appPasswordLabel = document.getElementById('appPasswordLabel');

  function updateProviderUI(email) {
    const prov = detectEmailProvider(email);
    if (badge) {
      badge.textContent = prov.name;
      badge.style.background = prov.badgeBg;
      badge.style.color = prov.badgeColor;
    }
    if (helpLink) {
      if (prov.helpUrl) {
        helpLink.href = prov.helpUrl;
        helpLink.textContent = prov.helpLabel;
        helpLink.style.display = 'inline-block';
      } else {
        helpLink.style.display = 'none';
      }
    }
    if (instructions) {
      instructions.innerHTML = prov.instructions;
    }
    if (appPasswordLabel) {
      appPasswordLabel.textContent = `${prov.name} App Password`;
    }
  }

  if (emailInput) {
    emailInput.addEventListener('input', (e) => {
      updateProviderUI(e.target.value.trim());
    });
  }

  // Clicking provider pills filters or prefills
  document.querySelectorAll('.provider-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const pType = pill.dataset.provider;
      if (pType === 'yahoo' && emailInput && !emailInput.value) {
        emailInput.value = 'user@yahoo.com';
        updateProviderUI(emailInput.value);
      } else if (pType === 'outlook' && emailInput && !emailInput.value) {
        emailInput.value = 'user@outlook.com';
        updateProviderUI(emailInput.value);
      } else if (pType === 'gmail' && emailInput && !emailInput.value) {
        emailInput.value = 'user@gmail.com';
        updateProviderUI(emailInput.value);
      } else if (pType === 'icloud' && emailInput && !emailInput.value) {
        emailInput.value = 'user@icloud.com';
        updateProviderUI(emailInput.value);
      } else if (pType === 'zoho' && emailInput && !emailInput.value) {
        emailInput.value = 'user@zoho.com';
        updateProviderUI(emailInput.value);
      }
    });
  });

  if (accountBtn && accountModal) {
    accountBtn.addEventListener('click', () => {
      renderAccountList();
      accountModal.classList.add('active');
      if (emailInput && emailInput.value) {
        updateProviderUI(emailInput.value.trim());
      }
    });
  }

  if (closeAccountBtn && accountModal) {
    closeAccountBtn.addEventListener('click', () => {
      accountModal.classList.remove('active');
    });
  }

  // Handle Form Submission: Save Account & Activate Live Mode
  if (addAccountForm) {
    addAccountForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('loginNameInput');
      const pwdInput = document.getElementById('loginAppPasswordInput');

      const email = emailInput?.value.trim();
      const name = nameInput?.value.trim() || email?.split('@')[0];
      const appPassword = pwdInput?.value.trim() || '';

      if (!email || !email.includes('@')) {
        showToast('Invalid Email', 'Please enter a valid email address (e.g. name@yahoo.com or name@gmail.com).', 'error');
        return;
      }

      const prov = detectEmailProvider(email);
      const isLive = !!appPassword;

      const updated = addOrUpdateAccount({
        name: name,
        email: email,
        appPassword: appPassword,
        isLive: isLive,
        type: prov.name
      });

      state.activeAccount = updated;
      state.cardData.email = updated.email;
      state.cardData.fullName = updated.name;
      saveSignatureData(state.cardData);

      populateFormFields();
      renderAllViews(state.cardData);
      updateSyncStatusUI();
      updateSimulatorAccountInfo();

      accountModal?.classList.remove('active');

      if (isLive) {
        showToast(
          `🟢 LIVE ${prov.name.toUpperCase()} ACTIVATED!`,
          `Connected to ${updated.email}. Clicking "Send" will deliver real emails to actual recipients!`,
          'success'
        );
      } else {
        showToast('Account Switched', `Active mailbox set to ${updated.email} (Demo Mode).`, 'info');
      }
    });
  }

  // Test Live Credentials Button
  if (testCredsBtn) {
    testCredsBtn.addEventListener('click', async () => {
      const fromEmail = emailInput?.value.trim();
      const pwdInput = document.getElementById('loginAppPasswordInput');
      const appPassword = pwdInput?.value.trim();

      if (!fromEmail || !appPassword) {
        showToast('Missing Info', 'Please enter your email and App Password to test the connection.', 'error');
        return;
      }

      const prov = detectEmailProvider(fromEmail);
      testCredsBtn.disabled = true;
      testCredsBtn.textContent = `Connecting to ${prov.name}...`;

      try {
        const res = await fetch('/api/test-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: fromEmail, appPassword: appPassword })
        });

        if (res.status === 404) {
          throw new Error('Static Host: Direct SMTP connection requires the local server or Google OAuth sync. Use "Sync to Gmail" to connect your account!');
        }

        let data = {};
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error(`Server returned status ${res.status}: ${res.statusText}`);
        }

        if (res.ok && data.success) {
          showToast(`✅ ${prov.name} Verified!`, data.message || `Test confirmation was delivered to ${fromEmail}.`, 'success');
        } else {
          throw new Error(data.error || 'Authentication failed. Check your App Password.');
        }
      } catch (err) {
        showToast('Connection Test Failed', err.message, 'error');
      } finally {
        testCredsBtn.disabled = false;
        testCredsBtn.textContent = 'Test Connection';
      }
    });
  }

  window.addEventListener('sigflow:account-changed', (e) => {
    state.activeAccount = e.detail;
    updateSyncStatusUI();
    updateSimulatorAccountInfo();
  });
}

function renderAccountList() {
  const container = document.getElementById('accountSelectorList');
  if (!container) return;

  const accounts = loadAccounts();

  container.innerHTML = accounts.map(acc => `
    <div class="account-selector-item ${acc.isActive ? 'active' : ''}" data-acc-id="${acc.id}">
      <div class="account-item-left">
        <div class="account-item-avatar">
          ${acc.avatar ? `<img src="${acc.avatar}" alt="" />` : (acc.name || 'G').charAt(0).toUpperCase()}
        </div>
        <div class="account-item-info">
          <span class="account-item-name">${acc.name}</span>
          <span class="account-item-email">
            ${acc.email} &bull; ${acc.isLive ? '🟢 LIVE' : '🟡 DEMO'}
          </span>
        </div>
      </div>
      <div>
        ${acc.isActive
          ? `<span class="account-active-badge">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
               Active
             </span>`
          : `<button class="btn btn-secondary" style="font-size:0.75rem;padding:4px 10px;" data-switch-id="${acc.id}">Switch</button>`}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-switch-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const accId = btn.dataset.switchId;
      const newActive = setActiveAccount(accId);
      if (newActive) {
        state.activeAccount = newActive;
        state.cardData.email = newActive.email;
        state.cardData.fullName = newActive.name;
        saveSignatureData(state.cardData);

        populateFormFields();
        renderAllViews(state.cardData);
        updateSyncStatusUI();
        updateSimulatorAccountInfo();
        renderAccountList();

        document.getElementById('accountLoginModal')?.classList.remove('active');
        showToast('Account Switched', `Active account: ${newActive.email} (${newActive.isLive ? 'LIVE' : 'DEMO'})`, 'info');
      }
    });
  });
}

/**
 * Binds 1-Click Launchers into Real Native Gmail Web
 */
function bindRealGmailWebShortcuts() {
  const triggerNativeCompose = () => {
    const toInput = document.getElementById('composeToInput');
    const subjectInput = document.getElementById('composeSubjectInput');
    const bodyEditable = document.getElementById('composeBodyText');

    const to = toInput?.value.trim() || '';
    const su = subjectInput?.value.trim() || '';
    const bodyText = bodyEditable?.innerText || '';

    const webGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(bodyText)}`;
    window.open(webGmailUrl, '_blank');
  };

  document.getElementById('btnLaunchNativeGmailCompose')?.addEventListener('click', triggerNativeCompose);
  document.getElementById('btnOpenInWebGmailLink')?.addEventListener('click', triggerNativeCompose);
  document.getElementById('btnOpenWebGmailDirectly')?.addEventListener('click', () => {
    document.getElementById('accountLoginModal')?.classList.remove('active');
    triggerNativeCompose();
  });
}

/**
 * Binds the core "Connect with Google" Approach 2 features
 */
function bindGoogleIntegration() {
  const googleBtns = [
    document.getElementById('btnHeroConnectGoogle'),
    document.getElementById('btnHeaderConnectGoogle'),
    document.getElementById('btnQuickSyncToGmail')
  ];

  googleBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        handleConnectGoogleClick();
      });
    }
  });

  window.addEventListener('sigflow:sync-success', (e) => {
    const detail = e.detail;
    state.activeAccount = getActiveAccount();
    updateSyncStatusUI();
    updateSimulatorAccountInfo();

    setViewMode('gmail');

    showToast(
      'Successfully Pushed to Native Gmail!',
      `Signature card is now active for ${detail.email}. Configured for your Gmail account.`,
      'success'
    );
  });

  window.addEventListener('sigflow:sync-error', (e) => {
    showToast('Sync Failed', e.detail?.message || 'Could not push to Gmail. Check your connection or API permissions.', 'error');
  });
}

function handleConnectGoogleClick() {
  connectWithGoogle(
    state.cardData,
    (msg) => {
      showToast('Inbox Integration', msg, 'info');
    },
    (res) => {
      // Completed
    },
    (err) => {
      showToast('Error', err.message || 'Connection interrupted', 'error');
    }
  );
}

/**
 * Updates UI headers, badges, and sync indicator pills
 */
function updateSyncStatusUI() {
  const activeAcc = getActiveAccount();
  const isConn = !!activeAcc?.lastSyncedAt;
  const isLive = !!activeAcc?.isLive;
  const targetEmail = activeAcc?.email || state.cardData.email;

  // Header Account Button
  const userAccountBtn = document.getElementById('btnUserAccount');
  if (userAccountBtn && activeAcc) {
    const avatarContainer = userAccountBtn.querySelector('.user-avatar-mini');
    const nameEl = userAccountBtn.querySelector('.user-account-name');
    const emailEl = userAccountBtn.querySelector('.user-account-email');
    const badgeEl = userAccountBtn.querySelector('.user-account-badge');

    if (avatarContainer) {
      if (activeAcc.avatar) {
        avatarContainer.innerHTML = `<img src="${activeAcc.avatar}" alt="" />`;
      } else {
        avatarContainer.textContent = (activeAcc.name || 'G').charAt(0).toUpperCase();
      }
    }
    if (nameEl) nameEl.textContent = activeAcc.name;
    if (emailEl) emailEl.textContent = activeAcc.email;
    if (badgeEl) {
      badgeEl.textContent = isLive ? '🟢 LIVE' : '🟡 DEMO';
      badgeEl.style.color = isLive ? '#15803d' : '#b45309';
      badgeEl.style.background = isLive ? '#dcfce7' : '#fef3c7';
    }
  }

  // Header Sync Pill
  const headerPill = document.getElementById('headerSyncPill');
  const headerText = document.getElementById('headerSyncText');
  if (headerPill && headerText) {
    headerPill.className = `sync-status-pill ${isLive ? 'status-connected' : ''}`;
    headerText.textContent = isLive ? `Live Gmail Active (${targetEmail})` : `Synced (Demo): ${targetEmail}`;
  }

  // Hero Connect Buttons
  const heroBtn = document.getElementById('btnHeroConnectGoogle');
  if (heroBtn) {
    if (isLive) {
      heroBtn.classList.add('connected');
      heroBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>Live Mail Dispatcher Active &bull; ${targetEmail}</span>
      `;
    } else {
      heroBtn.classList.remove('connected');
      heroBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        <span>Connect with Google &amp; Sync to Gmail</span>
      `;
    }
  }

  // Footer status bar
  const syncStatusText = document.getElementById('syncStatusDesc');
  const syncIconBox = document.getElementById('syncStatusIconBox');
  if (syncStatusText && syncIconBox) {
    if (isLive) {
      syncIconBox.classList.add('connected');
      syncStatusText.textContent = `🟢 LIVE GMAIL ACTIVE: Real emails dispatched via smtp.gmail.com from ${targetEmail}`;
    } else {
      syncIconBox.classList.remove('connected');
      syncStatusText.textContent = `🟡 DEMO MODE: Connect your Gmail App Password to enable real live email delivery to inboxes.`;
    }
  }
}

/**
 * Binds Copy HTML and Copy Rich Text clipboard buttons
 */
function bindCopyActions() {
  const copyHtmlBtns = [
    document.getElementById('btnCopyHtml'),
    document.getElementById('btnCopyHtmlModal')
  ];

  copyHtmlBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', async () => {
        const html = generateSignatureHtml(state.cardData);
        try {
          await navigator.clipboard.writeText(html);
          showToast('HTML Copied!', 'Raw email-client HTML copied to your clipboard.', 'success');
        } catch (e) {
          showToast('Copy Failed', 'Please select and copy the code manually.', 'error');
        }
      });
    }
  });

  const copyRichBtn = document.getElementById('btnCopyRich');
  if (copyRichBtn) {
    copyRichBtn.addEventListener('click', async () => {
      const html = generateSignatureHtml(state.cardData);
      try {
        const blob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([state.cardData.fullName + ' - ' + state.cardData.jobTitle], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob
        });
        await navigator.clipboard.write([item]);
        showToast('Rich Signature Copied!', 'You can now paste (Ctrl+V / Cmd+V) directly into Gmail settings.', 'success');
      } catch (e) {
        await navigator.clipboard.writeText(html);
        showToast('HTML Copied', 'HTML copied to clipboard.', 'info');
      }
    });
  }
}

/**
 * Binds Settings & Setup Wizard Modal
 */
function bindModals() {
  const setupBtn = document.getElementById('btnOpenSetupGuide');
  const setupModal = document.getElementById('setupGuideModal');
  const closeSetupBtn = document.getElementById('btnCloseSetupGuide');
  const saveClientIdBtn = document.getElementById('btnSaveClientId');

  if (setupBtn && setupModal) {
    setupBtn.addEventListener('click', () => {
      setupModal.classList.add('active');
    });
  }

  if (closeSetupBtn && setupModal) {
    closeSetupBtn.addEventListener('click', () => {
      setupModal.classList.remove('active');
    });
  }

  if (saveClientIdBtn) {
    saveClientIdBtn.addEventListener('click', () => {
      const input = document.getElementById('inputGoogleClientId');
      if (input) {
        const clientId = input.value.trim();
        state.config.googleClientId = clientId;
        saveAppConfig(state.config);

        if (clientId) {
          initGoogleIdentityServices(clientId);
          showToast('Client ID Saved', 'Google Identity Services client initialized.', 'success');
        } else {
          showToast('Client ID Cleared', 'Switched to standard SMTP / Demo mode.', 'info');
        }
        setupModal?.classList.remove('active');
      }
    });
  }
}

/**
 * Handles updates to card data: save to storage and re-render views
 */
function onCardDataUpdated() {
  saveSignatureData(state.cardData);
  renderAllViews(state.cardData);
}

/**
 * Global Toast System
 */
function setupToastListener() {
  window.addEventListener('sigflow:toast', (e) => {
    const { title, message, type } = e.detail;
    showToast(title, message, type);
  });
}

function showToast(title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  };

  toast.innerHTML = `
    ${iconMap[type] || iconMap.info}
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Helpers
function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function setCheckboxValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}
