/**
 * SigFlow Webmail Engine - Interactive Gmail Client Experience
 * Manages Inbox, Sent, Starred, Drafts, full email threads, search & real live sync
 */

import { getActiveAccount } from './storage.js';

let currentFolder = 'inbox';
let selectedEmail = null;
let searchQuery = '';
let isLoading = false;

// In-memory folder caches
const mailboxCache = {
  inbox: [],
  starred: [],
  sent: [],
  drafts: []
};

const LOCAL_SENT_KEY = 'sigflow_sent_emails';

// Pastel avatar color palette modeled on Google Workspace
const AVATAR_COLORS = [
  { bg: '#e8f0fe', color: '#1a73e8' },
  { bg: '#fce8e6', color: '#c5221f' },
  { bg: '#e6f4ea', color: '#137333' },
  { bg: '#fef7e0', color: '#b06000' },
  { bg: '#f3e8fd', color: '#8430ce' },
  { bg: '#e0f2fe', color: '#0369a1' },
  { bg: '#fae8ff', color: '#a21caf' },
  { bg: '#ecfdf5', color: '#047857' },
  { bg: '#fff7ed', color: '#c2410c' },
  { bg: '#f1f5f9', color: '#334155' }
];

/**
 * Decodes RFC 2047 MIME encoded words (=?UTF-8?B?...?= and =?UTF-8?Q?...?=)
 */
export function decodeMimeHeader(raw) {
  if (!raw || typeof raw !== 'string') return '';
  
  // Collapse adjacent encoded-words separated only by whitespace (RFC 2047 section 6.2)
  let text = raw.replace(/(=\?[^?]+\?[bqBQ]\?[^?]+\?=)\s+(=\?[^?]+\?[bqBQ]\?[^?]+\?=)/g, '$1$2');
  text = text.replace(/(=\?[^?]+\?[bqBQ]\?[^?]+\?=)\s+(=\?[^?]+\?[bqBQ]\?[^?]+\?=)/g, '$1$2');

  const rfc2047Regex = /=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g;

  return text.replace(rfc2047Regex, (match, charset, encoding, data) => {
    try {
      const isB = encoding.toUpperCase() === 'B';
      if (isB) {
        // Base64 decode to UTF-8
        const cleanB64 = data.replace(/\s+/g, '');
        const binaryStr = atob(cleanB64);
        const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
        return new TextDecoder(charset || 'utf-8').decode(bytes);
      } else {
        // Quoted-Printable: '_' is space, '=XX' is hex byte
        const replaced = data.replace(/_/g, ' ');
        const bytes = [];
        for (let i = 0; i < replaced.length; i++) {
          if (replaced[i] === '=' && i + 2 < replaced.length) {
            const hex = replaced.substring(i + 1, i + 3);
            const val = parseInt(hex, 16);
            if (!isNaN(val)) {
              bytes.push(val);
              i += 2;
              continue;
            }
          }
          bytes.push(replaced.charCodeAt(i));
        }
        return new TextDecoder(charset || 'utf-8').decode(new Uint8Array(bytes));
      }
    } catch (e) {
      return match;
    }
  });
}

/**
 * Extracts 1-2 letter initials from a display name
 */
export function getSenderInitials(name) {
  if (!name) return '??';
  const clean = name.replace(/[^\w\s]/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase() || 'M';
}

/**
 * Determines avatar color deterministically from sender name/email
 */
export function getAvatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

/**
 * Detects and filters out automated unsubscribe feedback loops, machine tokens, and bounce reports
 */
export function isJunkOrSystemEmail(email) {
  if (!email) return true;
  const sub = decodeMimeHeader(email.subject || '').trim();
  const subLower = sub.toLowerCase();
  const fromLower = (email.from || '').toLowerCase().trim();
  const toLower = (email.to || '').toLowerCase().trim();

  // 1. Unsubscribe tokens / automated 1-click unsubscribe loops
  if (
    subLower.startsWith('unsubscribe') ||
    subLower.startsWith('unsub') ||
    subLower.startsWith('optout') ||
    subLower.startsWith('opt-out') ||
    subLower.includes('list-unsubscribe') ||
    /unsubscribev\d/i.test(subLower) ||
    /^[a-z0-9_\-\.+=]{28,}$/i.test(sub)
  ) {
    return true;
  }

  // 2. Mail delivery subsystems / bounce reports
  if (
    fromLower.includes('mailer-daemon@') ||
    fromLower.includes('postmaster@') ||
    toLower.includes('mailer-daemon@') ||
    toLower.includes('postmaster@') ||
    subLower.includes('delivery status notification') ||
    subLower.includes('mail delivery subsystem') ||
    subLower.includes('undeliverable:')
  ) {
    return true;
  }

  // 3. Unsubscribe addresses in recipient or sender
  if (toLower.includes('unsubscribe') || toLower.includes('bounce') || fromLower.includes('bounce')) {
    return true;
  }

  return false;
}

/**
 * Initializes the webmail client in the Native Inbox Integration section
 */
export function initWebmail() {
  setupFolderNavigation();
  setupSearchFilter();
  setupToolbarActions();
  setupComposeModalEvents();
  loadLocalSentEmails();
  
  const activeAcc = getActiveAccount();
  updateWebmailAccountInfo(activeAcc);
  
  // Initial load
  loadFolderEmails(currentFolder);
}

/**
 * Opens or restores the floating Gmail Compose window
 */
export function openComposeModal(opts = {}) {
  const composeWindow = document.getElementById('gmailComposeWindow');
  if (!composeWindow) return;

  const toInput = document.getElementById('composeToInput');
  const subjectInput = document.getElementById('composeSubjectInput');
  const bodyText = document.getElementById('composeBodyText');

  if (opts.to !== undefined && toInput) toInput.value = opts.to;
  if (opts.subject !== undefined && subjectInput) subjectInput.value = opts.subject;
  if (opts.body !== undefined && bodyText) bodyText.innerHTML = opts.body;

  // Ensure window is restored from minimized state and displayed
  composeWindow.classList.remove('minimized');
  composeWindow.style.display = 'flex';

  // Smooth pop-up animation
  composeWindow.style.animation = 'none';
  void composeWindow.offsetWidth; // Reflow
  composeWindow.style.animation = 'slideUpCompose 0.35s cubic-bezier(0.16, 1, 0.3, 1)';

  // Focus appropriate field
  setTimeout(() => {
    if (toInput && (!toInput.value || toInput.value === 'alex.client@company.com')) {
      toInput.focus();
      toInput.select();
    } else if (bodyText) {
      bodyText.focus();
    }
  }, 120);

  const activeAcc = getActiveAccount();
  window.dispatchEvent(new CustomEvent('sigflow:toast', {
    detail: {
      title: 'Native Gmail Compose Opened',
      message: `Ready to send from ${activeAcc?.email || 'Gmail'}. Your signature card is active.`,
      type: 'info'
    }
  }));
}

/**
 * Sets up Compose button and window controls
 */
function setupComposeModalEvents() {
  const composeBtn = document.getElementById('gmailSimComposeBtn');
  const composeWindow = document.getElementById('gmailComposeWindow');
  const closeBtn = document.getElementById('composeCloseBtn');
  const minimizeBtn = document.getElementById('composeMinimizeBtn');

  if (composeBtn) {
    // Unbind any previous and bind clean opener
    composeBtn.onclick = (e) => {
      e.preventDefault();
      openComposeModal();
    };
  }

  if (closeBtn && composeWindow) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      composeWindow.style.display = 'none';
    };
  }

  if (minimizeBtn && composeWindow) {
    minimizeBtn.onclick = (e) => {
      e.stopPropagation();
      composeWindow.classList.toggle('minimized');
    };
  }
}

/**
 * Updates top bar account badges and profile representation
 */
export function updateWebmailAccountInfo(activeAcc) {
  if (!activeAcc) return;

  // Account email badge in Gmail top bar
  const accountBadge = document.getElementById('gmailConnectedAccountBadge');
  if (accountBadge) {
    const isLive = activeAcc.isLive && (activeAcc.appPassword || activeAcc.oauthToken);
    accountBadge.className = isLive ? 'gmail-account-pill live' : 'gmail-account-pill demo';
    accountBadge.innerHTML = `
      <span class="pill-dot"></span>
      <span class="pill-email">${escapeHtml(activeAcc.email)}</span>
      <span class="pill-status">${isLive ? 'LIVE' : 'DEMO'}</span>
    `;
    accountBadge.title = `Active Mailbox: ${activeAcc.email} (${isLive ? 'Live Sync Active' : 'Demo Mode - Click to connect'})`;
    accountBadge.onclick = () => {
      document.getElementById('accountLoginModal')?.classList.add('active');
    };
  }

  // Top bar user avatar
  const avatarEl = document.getElementById('gmailTopAvatar');
  if (avatarEl) {
    if (activeAcc.avatar) {
      avatarEl.innerHTML = `<img src="${activeAcc.avatar}" alt="${escapeHtml(activeAcc.name || activeAcc.email)}" />`;
    } else {
      const initials = getSenderInitials(activeAcc.name || activeAcc.email || 'AO');
      avatarEl.textContent = initials;
    }
    avatarEl.title = `Google Account: ${activeAcc.name || activeAcc.email} (${activeAcc.email})`;
  }
}

/**
 * Binds sidebar folder click events
 */
function setupFolderNavigation() {
  const navItems = document.querySelectorAll('.gmail-nav-item[data-folder]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const folder = item.dataset.folder;
      if (!folder || folder === currentFolder) return;

      currentFolder = folder;
      selectedEmail = null;

      // Update sidebar active classes
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Update toolbar folder title
      const titleEl = document.getElementById('gmailCurrentFolderTitle');
      if (titleEl) {
        titleEl.textContent = folder.charAt(0).toUpperCase() + folder.slice(1);
      }

      // Hide detail view if open
      closeEmailDetail();

      // Load folder emails
      loadFolderEmails(folder);
    });
  });
}

/**
 * Binds search input for real-time instant filtering
 */
function setupSearchFilter() {
  const searchInput = document.getElementById('gmailSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderEmailList();
    });
  }
}

/**
 * Binds refresh and list toolbar buttons
 */
function setupToolbarActions() {
  const refreshBtn = document.getElementById('gmailRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('spinning');
      loadFolderEmails(currentFolder, true).finally(() => {
        setTimeout(() => refreshBtn.classList.remove('spinning'), 600);
      });
    });
  }

  // Back button inside email reading detail view
  const backBtn = document.getElementById('emailDetailBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      closeEmailDetail();
    });
  }
}

/**
 * Fetches emails from server for given folder and renders them
 */
export async function loadFolderEmails(folder = 'inbox', forceRefresh = false) {
  const activeAcc = getActiveAccount();
  if (!activeAcc) return;

  isLoading = true;
  renderEmailList(); // Displays loading shimmer

  try {
    const res = await fetch('/api/fetch-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        from: activeAcc.email,
        appPassword: activeAcc.appPassword || '',
        oauthToken: activeAcc.oauthToken || '',
        folder: folder,
        limit: 20
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.emails) {
        // Decode MIME headers on all incoming items and exclude automated junk/unsubscribe tokens
        mailboxCache[folder] = (Array.isArray(data.emails) ? data.emails : [data.emails])
          .map(em => ({
            ...em,
            fromName: decodeMimeHeader(em.fromName || ''),
            subject: decodeMimeHeader(em.subject || '(No Subject)'),
            snippet: decodeMimeHeader(em.snippet || '')
          }))
          .filter(em => !isJunkOrSystemEmail(em));
      }
    }
  } catch (err) {
    console.warn('Live fetch error, utilizing cached mail', err);
  } finally {
    isLoading = false;

    // If viewing Sent, merge locally sent emails
    if (folder === 'sent') {
      const localSent = getLocalSentEmails(activeAcc.email);
      const combined = [...localSent, ...(mailboxCache.sent || [])];
      // Deduplicate by id/timestamp
      const seen = new Set();
      mailboxCache.sent = combined
        .filter(em => !isJunkOrSystemEmail(em))
        .filter(em => {
          const key = em.id || (em.subject + em.date);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }

    updateFolderBadges();
    renderEmailList();
  }
}

/**
 * Renders the email rows for the active folder & search query
 */
export function renderEmailList() {
  const container = document.getElementById('gmailEmailListContainer');
  if (!container) return;

  if (isLoading) {
    container.innerHTML = `
      <div class="gmail-loading-state">
        <div class="gmail-spinner"></div>
        <span>Syncing ${currentFolder.toUpperCase()} with ${escapeHtml(getActiveAccount()?.email || 'Mailbox')}...</span>
      </div>
    `;
    return;
  }

  const emails = (mailboxCache[currentFolder] || []).filter(em => !isJunkOrSystemEmail(em));
  const filtered = emails.filter(em => {
    if (!searchQuery) return true;
    const cleanSub = decodeMimeHeader(em.subject || '').toLowerCase();
    const cleanFrom = decodeMimeHeader(em.fromName || em.from || '').toLowerCase();
    const cleanSnippet = decodeMimeHeader(em.snippet || '').toLowerCase();
    return cleanSub.includes(searchQuery) || cleanFrom.includes(searchQuery) || cleanSnippet.includes(searchQuery);
  });

  if (filtered.length === 0) {
    const folderNames = { inbox: 'Inbox', starred: 'Starred', sent: 'Sent Mail', drafts: 'Drafts' };
    container.innerHTML = `
      <div class="gmail-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 12h-6l-2 3h-4l-2-3H2"></path>
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
        </svg>
        <h4>No conversations in ${folderNames[currentFolder] || 'folder'}</h4>
        <p>${searchQuery ? 'No messages match your search filter.' : 'New incoming communications will appear here automatically.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(email => {
    const isUnread = email.isUnread ? 'unread' : '';
    const isStarred = email.isStarred ? 'starred' : '';
    const isSentFolder = currentFolder === 'sent';
    
    // Clean and decode strings
    const rawSender = isSentFolder ? `To: ${email.to || 'Recipient'}` : (email.fromName || email.from || 'Unknown');
    const cleanSender = decodeMimeHeader(rawSender);
    const cleanSubject = decodeMimeHeader(email.subject || '(No Subject)');
    const cleanSnippet = decodeMimeHeader(email.snippet || '');

    // Avatar styling
    const initials = getSenderInitials(cleanSender);
    const avatarColor = getAvatarColor(cleanSender);

    return `
      <div class="gmail-email-row ${isUnread}" data-id="${email.id}">
        <div class="row-select-check" title="Select">
          <input type="checkbox" class="email-select-checkbox" onclick="event.stopPropagation()" />
        </div>
        <div class="row-star-btn ${isStarred}" data-id="${email.id}" title="Star message" onclick="event.stopPropagation(); window.sigflowWebmail.toggleStar('${email.id}')">
          <svg viewBox="0 0 24 24" fill="${email.isStarred ? '#f59e0b' : 'none'}" stroke="${email.isStarred ? '#f59e0b' : 'currentColor'}" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
        <div class="row-avatar" style="background:${avatarColor.bg};color:${avatarColor.color};" title="${escapeHtml(cleanSender)}">
          ${escapeHtml(initials)}
        </div>
        <span class="gmail-email-sender" title="${escapeHtml(email.from || cleanSender)}">${escapeHtml(cleanSender)}</span>
        <div class="gmail-email-content">
          <span class="gmail-email-subject">${escapeHtml(cleanSubject)}</span>
          <span class="gmail-email-dash">&mdash;</span>
          <span class="gmail-email-snippet">${escapeHtml(cleanSnippet)}</span>
        </div>
        <div class="row-hover-actions" onclick="event.stopPropagation()">
          <button class="row-act-btn" title="Mark as ${email.isUnread ? 'read' : 'unread'}" onclick="window.sigflowWebmail.toggleRead('${email.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </button>
          <button class="row-act-btn" title="Delete" onclick="window.sigflowWebmail.deleteEmail('${email.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
        <span class="gmail-email-date">${escapeHtml(email.date || '')}</span>
      </div>
    `;
  }).join('');

  // Add click listeners to rows to open detail view
  container.querySelectorAll('.gmail-email-row').forEach(row => {
    row.addEventListener('click', () => {
      const emailId = row.dataset.id;
      const email = emails.find(e => e.id === emailId);
      if (email) {
        openEmailDetail(email);
      }
    });
  });
}

/**
 * Opens full email detail reading view
 */
export function openEmailDetail(email) {
  selectedEmail = email;
  email.isUnread = false;
  updateFolderBadges();

  const listContainer = document.getElementById('gmailEmailListContainer');
  const detailContainer = document.getElementById('gmailEmailDetailView');
  const toolbarHeader = document.querySelector('.inbox-toolbar-top');

  if (listContainer) listContainer.style.display = 'none';
  if (toolbarHeader) toolbarHeader.style.display = 'none';
  if (!detailContainer) return;

  detailContainer.style.display = 'flex';

  const cleanSenderName = decodeMimeHeader(email.fromName || email.from || 'Unknown');
  const cleanSubject = decodeMimeHeader(email.subject || '(No Subject)');
  const initials = getSenderInitials(cleanSenderName);
  const avatarColor = getAvatarColor(cleanSenderName);

  detailContainer.innerHTML = `
    <!-- Top Action Bar -->
    <div class="detail-action-bar">
      <button class="detail-back-btn" id="emailDetailBackBtn" title="Back to ${currentFolder}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span>Back to ${currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1)}</span>
      </button>

      <div class="detail-top-right-actions">
        <button class="detail-icon-btn ${email.isStarred ? 'starred' : ''}" title="Star message" onclick="window.sigflowWebmail.toggleStar('${email.id}')">
          <svg viewBox="0 0 24 24" fill="${email.isStarred ? '#f59e0b' : 'none'}" stroke="${email.isStarred ? '#f59e0b' : 'currentColor'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
        <button class="detail-icon-btn" title="Reply" onclick="window.sigflowWebmail.replyToEmail('${email.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
        </button>
        <button class="detail-icon-btn" title="Forward" onclick="window.sigflowWebmail.forwardEmail('${email.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 17 20 12 15 7"></polyline><path d="M4 18v-2a4 4 0 0 1 4-4h12"></path></svg>
        </button>
        <button class="detail-icon-btn danger" title="Delete" onclick="window.sigflowWebmail.deleteEmail('${email.id}', true)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>

    <!-- Email Subject -->
    <div class="detail-subject-header">
      <h2>${escapeHtml(cleanSubject)}</h2>
      <span class="detail-folder-tag">${currentFolder.toUpperCase()}</span>
    </div>

    <!-- Sender & Recipient Card -->
    <div class="detail-sender-card">
      <div class="detail-sender-avatar" style="background:${avatarColor.bg};color:${avatarColor.color};">${escapeHtml(initials)}</div>
      <div class="detail-sender-info">
        <div class="detail-sender-name-row">
          <strong>${escapeHtml(cleanSenderName)}</strong>
          <span class="detail-sender-email">&lt;${escapeHtml(email.from || '')}&gt;</span>
        </div>
        <div class="detail-recipient-row">
          <span>to ${escapeHtml(email.to || 'me')}</span>
        </div>
      </div>
      <div class="detail-date-badge">${escapeHtml(email.date || '')}</div>
    </div>

    <!-- Email Body -->
    <div class="detail-body-content">
      ${email.bodyHtml || `<p>${escapeHtml(email.snippet || '')}</p>`}
    </div>

    <!-- Bottom Action Buttons (Reply / Forward) -->
    <div class="detail-bottom-reply-bar">
      <button class="detail-action-btn primary" onclick="window.sigflowWebmail.replyToEmail('${email.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
        <span>Reply</span>
      </button>
      <button class="detail-action-btn" onclick="window.sigflowWebmail.forwardEmail('${email.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 17 20 12 15 7"></polyline><path d="M4 18v-2a4 4 0 0 1 4-4h12"></path></svg>
        <span>Forward</span>
      </button>
    </div>
  `;

  // Re-bind back button
  document.getElementById('emailDetailBackBtn')?.addEventListener('click', closeEmailDetail);
}

/**
 * Closes detail reading view and restores inbox list
 */
export function closeEmailDetail() {
  selectedEmail = null;
  const listContainer = document.getElementById('gmailEmailListContainer');
  const detailContainer = document.getElementById('gmailEmailDetailView');
  const toolbarHeader = document.querySelector('.inbox-toolbar-top');

  if (detailContainer) detailContainer.style.display = 'none';
  if (toolbarHeader) toolbarHeader.style.display = 'flex';
  if (listContainer) listContainer.style.display = 'flex';

  renderEmailList();
}

/**
 * Toggles starred status of an email
 */
export function toggleStar(emailId) {
  for (const folder of Object.keys(mailboxCache)) {
    const item = mailboxCache[folder].find(e => e.id === emailId);
    if (item) {
      item.isStarred = !item.isStarred;
      if (item.isStarred && !mailboxCache.starred.includes(item)) {
        mailboxCache.starred.unshift(item);
      } else if (!item.isStarred) {
        mailboxCache.starred = mailboxCache.starred.filter(e => e.id !== emailId);
      }
    }
  }

  updateFolderBadges();
  if (selectedEmail && selectedEmail.id === emailId) {
    openEmailDetail(selectedEmail);
  } else {
    renderEmailList();
  }
}

/**
 * Toggles unread status of an email
 */
export function toggleRead(emailId) {
  const item = (mailboxCache[currentFolder] || []).find(e => e.id === emailId);
  if (item) {
    item.isUnread = !item.isUnread;
    updateFolderBadges();
    renderEmailList();
  }
}

/**
 * Deletes an email from current folder
 */
export function deleteEmail(emailId, fromDetail = false) {
  if (mailboxCache[currentFolder]) {
    mailboxCache[currentFolder] = mailboxCache[currentFolder].filter(e => e.id !== emailId);
  }
  updateFolderBadges();

  if (fromDetail) {
    closeEmailDetail();
  } else {
    renderEmailList();
  }
}

/**
 * Triggers Compose Modal pre-filled for Replying
 */
export function replyToEmail(emailId) {
  const email = (mailboxCache[currentFolder] || []).find(e => e.id === emailId) || selectedEmail;
  if (!email) return;

  const cleanSub = decodeMimeHeader(email.subject || '').replace(/[\r\n\t]+/g, ' ').trim();
  const replySubject = cleanSub.toLowerCase().startsWith('re:') ? cleanSub : `Re: ${cleanSub}`;
  const replyBody = `
    <p><br/></p>
    <div style="padding-left:12px;border-left:2px solid #cbd5e1;color:#64748b;margin-top:16px;">
      <p>On ${email.date}, &lt;${escapeHtml(email.from || '')}&gt; wrote:</p>
      <div>${decodeMimeHeader(email.snippet || '')}</div>
    </div>
  `;

  openComposeModal({
    to: email.from || '',
    subject: replySubject,
    body: replyBody
  });
}

/**
 * Triggers Compose Modal pre-filled for Forwarding
 */
export function forwardEmail(emailId) {
  const email = (mailboxCache[currentFolder] || []).find(e => e.id === emailId) || selectedEmail;
  if (!email) return;

  const cleanSub = decodeMimeHeader(email.subject || '').replace(/[\r\n\t]+/g, ' ').trim();
  const fwdSubject = cleanSub.toLowerCase().startsWith('fwd:') ? cleanSub : `Fwd: ${cleanSub}`;
  const fwdBody = `
    <p><br/></p>
    <div style="padding-left:12px;border-left:2px solid #cbd5e1;color:#64748b;margin-top:16px;">
      <p>---------- Forwarded message ---------</p>
      <p><strong>From:</strong> ${escapeHtml(decodeMimeHeader(email.fromName || ''))} &lt;${escapeHtml(email.from || '')}&gt;</p>
      <p><strong>Date:</strong> ${escapeHtml(email.date || '')}</p>
      <p><strong>Subject:</strong> ${escapeHtml(cleanSub)}</p>
      <p><strong>To:</strong> ${escapeHtml(email.to || '')}</p>
      <br/>
      <div>${escapeHtml(decodeMimeHeader(email.snippet || ''))}</div>
    </div>
  `;

  openComposeModal({
    to: '',
    subject: fwdSubject,
    body: fwdBody
  });
}

/**
 * Records an email sent via the Compose window into local Sent storage and mailbox
 */
export function recordSentEmail({ to, subject, bodyHtml }) {
  const activeAcc = getActiveAccount();
  const newEmail = {
    id: 'sent-' + Date.now(),
    from: activeAcc.email,
    fromName: activeAcc.name || activeAcc.email.split('@')[0],
    to: to,
    subject: subject,
    snippet: bodyHtml.replace(/<[^>]+>/g, ' ').slice(0, 160),
    bodyHtml: bodyHtml,
    date: 'Just now',
    isStarred: false,
    isUnread: false,
    folder: 'sent'
  };

  // Prepend to memory cache
  if (!mailboxCache.sent) mailboxCache.sent = [];
  mailboxCache.sent.unshift(newEmail);

  // Save to localStorage
  saveLocalSentEmail(activeAcc.email, newEmail);

  updateFolderBadges();

  // If user is currently in Sent folder, refresh list
  if (currentFolder === 'sent') {
    renderEmailList();
  }
}

/**
 * Updates dynamic counter badges in sidebar
 */
function updateFolderBadges() {
  const inboxUnread = (mailboxCache.inbox || []).filter(e => !isJunkOrSystemEmail(e) && e.isUnread).length;
  const inboxBadge = document.querySelector('.gmail-nav-item[data-folder="inbox"] strong');
  if (inboxBadge) {
    inboxBadge.textContent = inboxUnread > 0 ? inboxUnread : '';
    inboxBadge.style.display = inboxUnread > 0 ? 'inline-block' : 'none';
  }

  const sentCount = (mailboxCache.sent || []).filter(e => !isJunkOrSystemEmail(e)).length;
  const sentBadge = document.querySelector('.gmail-nav-item[data-folder="sent"] strong');
  if (sentBadge) {
    sentBadge.textContent = sentCount > 0 ? sentCount : '';
    sentBadge.style.display = sentCount > 0 ? 'inline-block' : 'none';
  }

  const starredCount = (mailboxCache.starred || []).filter(e => !isJunkOrSystemEmail(e)).length;
  const starredBadge = document.querySelector('.gmail-nav-item[data-folder="starred"] strong');
  if (starredBadge) {
    starredBadge.textContent = starredCount > 0 ? starredCount : '';
    starredBadge.style.display = starredCount > 0 ? 'inline-block' : 'none';
  }
}

/**
 * LocalStorage helpers for Sent emails persistence
 */
function getLocalSentEmails(accountEmail) {
  try {
    const raw = localStorage.getItem(`${LOCAL_SENT_KEY}_${accountEmail}`);
    const list = raw ? JSON.parse(raw) : [];
    return list.filter(em => !isJunkOrSystemEmail(em));
  } catch (e) {
    return [];
  }
}

function saveLocalSentEmail(accountEmail, emailObj) {
  try {
    const list = getLocalSentEmails(accountEmail);
    list.unshift(emailObj);
    localStorage.setItem(`${LOCAL_SENT_KEY}_${accountEmail}`, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save sent email', e);
  }
}

function loadLocalSentEmails() {
  const activeAcc = getActiveAccount();
  if (activeAcc) {
    mailboxCache.sent = getLocalSentEmails(activeAcc.email);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

// Attach to window for global onclick access in rendered rows
window.sigflowWebmail = {
  toggleStar,
  toggleRead,
  deleteEmail,
  replyToEmail,
  forwardEmail,
  openCompose: openComposeModal
};
