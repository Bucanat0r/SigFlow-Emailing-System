/**
 * SigFlow Storage Module - LocalStorage State & Multi-Account Persistence
 * Stores accounts, credentials, and live status
 */

const STORAGE_KEY = 'sigflow_card_data';
const CONFIG_KEY = 'sigflow_app_config';
const ACCOUNTS_KEY = 'sigflow_google_accounts';

export const defaultSignatureData = {
  // Personal & Professional
  fullName: 'Alex Carter',
  pronouns: 'he/him',
  jobTitle: 'Head of product and partnerships',
  department: '',
  company: 'QuantumScale AI',
  tagline: '',

  // Contact Details
  email: 'alex.carter@quantumscale.io',
  phone: '+1 (415) 890-2341',
  mobile: '',
  website: 'quantumscale.io',
  address: '',

  // Media - Initials badge by default (0 KB image weight) or photo headshot
  showAvatar: true,
  avatarType: 'initials', // 'initials' or 'photo'
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80',
  showLogo: false,
  logoUrl: '',
  avatarShape: 'circle', // 'circle', 'rounded', 'square'

  // Call-To-Action & Badges - Default OFF for maximum email deliverability
  showCtaButton: false,
  ctaText: '📅 Book a 15-min Discovery Call',
  ctaUrl: 'https://calendly.com/alex-quantumscale/15min',

  showPromoBanner: false,
  promoText: '🚀 What’s New: Quantum Engine 3.0 is now live for enterprise teams',
  promoUrl: 'https://quantumscale.io/release-v3',

  showDisclaimer: true,
  disclaimerText: 'Please consider the environment before printing this email.',

  // Social Links
  socials: {
    linkedin: 'https://linkedin.com/in/alexcarter-demo',
    twitter: 'https://x.com/alexcarter_ai',
    github: 'https://github.com/quantumscale',
    youtube: '',
    instagram: ''
  },

  // Styling & Themes
  theme: 'executive', // 'executive', 'minimalist', 'gradient', 'corporate', 'compact'
  accentColor: '#2563eb',
  textColor: '#0f172a',
  fontFamily: 'Inter, -apple-system, sans-serif'
};

export const defaultAccounts = [
  {
    id: 'acc-demo',
    name: 'Alex Carter (Demo)',
    email: 'alex.carter@quantumscale.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80',
    type: 'Google Workspace',
    isActive: true,
    isLive: false,
    isDemo: true,
    appPassword: '',
    oauthToken: '',
    lastSyncedAt: new Date().toISOString()
  }
];

export const defaultAppConfig = {
  googleClientId: '',
  demoMode: true,
  rememberLogin: true,
  activeAccountId: '',
  themePreference: 'light',
  autoSyncOnEdit: true
};

export function cleanMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/ðŸ“…/g, '📅')
    .replace(/ðŸš€/g, '🚀')
    .replace(/ðŸŒ±/g, '🌱')
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, '“')
    .replace(/â€/g, '”')
    .replace(/â€/g, '”')
    .replace(/â€¢/g, '•')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/Â /g, ' ')
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã±/g, 'ñ');
}

export function sanitizeCardData(data) {
  if (!data) return {};
  const copy = { ...data };
  for (const key of Object.keys(copy)) {
    if (typeof copy[key] === 'string') {
      copy[key] = cleanMojibake(copy[key]);
    } else if (typeof copy[key] === 'object' && copy[key] !== null) {
      copy[key] = { ...copy[key] };
      for (const subKey of Object.keys(copy[key])) {
        if (typeof copy[key][subKey] === 'string') {
          copy[key][subKey] = cleanMojibake(copy[key][subKey]);
        }
      }
    }
  }
  return copy;
}

export function loadSignatureData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSignatureData };
    const parsed = JSON.parse(raw);
    const merged = { ...defaultSignatureData, ...parsed };
    return sanitizeCardData(merged);
  } catch (e) {
    return { ...defaultSignatureData };
  }
}

export function saveSignatureData(data) {
  try {
    const cleaned = sanitizeCardData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to save signature data', e);
  }
}

export function loadAppConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...defaultAppConfig };
    return { ...defaultAppConfig, ...JSON.parse(raw) };
  } catch (e) {
    return { ...defaultAppConfig };
  }
}

export function saveAppConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save app config', e);
  }
}

export function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    let accounts = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(accounts) || !accounts.length) {
      accounts = [...defaultAccounts];
    }

    // Ensure the Demo Account is always present in the switcher list
    const hasDemo = accounts.some(a => a.isDemo || a.id === 'acc-demo' || a.id === 'acc-1' || a.email === 'alex.carter@quantumscale.io');
    if (!hasDemo) {
      accounts.unshift({
        id: 'acc-demo',
        name: 'Alex Carter (Demo)',
        email: 'alex.carter@quantumscale.io',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80',
        type: 'Google Workspace',
        isActive: false,
        isLive: false,
        isDemo: true,
        appPassword: '',
        oauthToken: '',
        lastSyncedAt: new Date().toISOString()
      });
    }

    return accounts;
  } catch (e) {
    return [...defaultAccounts];
  }
}

export function saveAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts', e);
  }
}

export function getActiveAccount() {
  const accounts = loadAccounts();
  const config = loadAppConfig();

  // If rememberLogin is on and we have a preferred active account ID
  if (config.rememberLogin !== false && config.activeAccountId) {
    const matched = accounts.find(a => a.id === config.activeAccountId);
    if (matched) return matched;
  }

  // Otherwise find currently active account
  return accounts.find(a => a.isActive) || accounts.find(a => a.isLive) || accounts[0];
}

export function setActiveAccount(accountId) {
  const accounts = loadAccounts();
  accounts.forEach(a => {
    a.isActive = (a.id === accountId || a.email.toLowerCase() === accountId.toLowerCase());
  });
  saveAccounts(accounts);

  const active = accounts.find(a => a.isActive);
  if (active) {
    const config = loadAppConfig();
    config.activeAccountId = active.id;
    saveAppConfig(config);
  }
  return active;
}

export function removeAccount(accountId) {
  const accounts = loadAccounts();
  const filtered = accounts.filter(a => a.id !== accountId && a.email.toLowerCase() !== accountId.toLowerCase());

  // Never delete demo account completely
  const hasDemo = filtered.some(a => a.isDemo || a.id === 'acc-demo' || a.id === 'acc-1' || a.email === 'alex.carter@quantumscale.io');
  if (!hasDemo) {
    filtered.unshift({ ...defaultAccounts[0], isActive: !filtered.some(a => a.isActive) });
  }

  if (!filtered.some(a => a.isActive)) {
    filtered[0].isActive = true;
  }

  saveAccounts(filtered);
  const active = filtered.find(a => a.isActive);
  const config = loadAppConfig();
  if (config.activeAccountId === accountId) {
    config.activeAccountId = active ? active.id : '';
    saveAppConfig(config);
  }
  return active;
}

export function addOrUpdateAccount({ name, email, avatar, type = 'Gmail', appPassword = '', isLive = false, oauthToken = '', cardData = null }) {
  const accounts = loadAccounts();
  const existing = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
  const isAccountLive = Boolean(isLive || appPassword || oauthToken);

  if (existing) {
    existing.name = name || existing.name;
    existing.avatar = avatar || existing.avatar;
    existing.isActive = true;
    existing.isLive = isAccountLive;
    existing.isDemo = false;
    if (appPassword) existing.appPassword = appPassword;
    if (oauthToken) existing.oauthToken = oauthToken;
    if (cardData) existing.cardData = cardData;
    existing.lastSyncedAt = new Date().toISOString();

    accounts.forEach(a => { if (a.id !== existing.id) a.isActive = false; });
  } else {
    accounts.forEach(a => a.isActive = false);
    const newId = 'acc-' + Date.now();
    accounts.push({
      id: newId,
      name: name || email.split('@')[0],
      email: email,
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=1a73e8&color=fff`,
      type: type,
      isActive: true,
      isLive: isAccountLive,
      isDemo: false,
      appPassword: appPassword,
      oauthToken: oauthToken,
      cardData: cardData,
      lastSyncedAt: new Date().toISOString()
    });
  }

  saveAccounts(accounts);
  const active = accounts.find(a => a.isActive);

  // Update app config with preferred active account
  const config = loadAppConfig();
  config.activeAccountId = active.id;
  saveAppConfig(config);

  return active;
}
