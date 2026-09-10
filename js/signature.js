import { sanitizeCardData } from './storage.js';

/**
 * SigFlow Signature Generator - Clean & Minimalistic Email Cards
 * Outputs 100% compliant inline table markup optimized for zero spam triggers
 * Matches the simple, elegant aesthetic with initials badge and monochrome icons
 */

// Clean monochrome minimalist social icons (self-contained Base64 SVG data URIs - zero network latency, zero broken images)
const SOCIAL_ICONS = {
  linkedin: {
    name: 'LinkedIn',
    svgData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTYgOGE2IDYgMCAwIDEgNiA2djdoLTR2LTdhMiAyIDAgMCAwLTItMiAyIDIgMCAwIDAtMiAydjdoLTR2LTdhNiA2IDAgMCAxIDYtNnoiPjwvcGF0aD48cmVjdCB4PSIyIiB5PSI5IiB3aWR0aD0iNCIgaGVpZ2h0PSIxMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjQiIGN5PSI0IiByPSIyIj48L2NpcmNsZT48L3N2Zz4='
  },
  twitter: {
    name: 'X',
    svgData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNSIgaGVpZ2h0PSIxNSIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNjQ3NDhiIj48cGF0aCBkPSJNMTguMjQ0IDIuMjVoMy4zMDhsLTcuMjI3IDguMjYgOC41MDIgMTEuMjRIMTYuMTdsLTUuMjE0LTYuODE3TDQuOTkgMjEuNzVIMS42OGw3LjczLTguODM1TDEuMjU0IDIuMjVIOC4wOGw0LjcxMyA2LjIzMXptLTEuMTYxIDE3LjUyaDEuODMzTDcuMDg0IDQuMTI2SDUuMTE3eiIvPjwvc3ZnPg=='
  },
  github: {
    name: 'GitHub',
    svgData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOSAxOWMtNSAxLjUtNS0yLjUtNy0zbTE0IDZ2LTMuODdhMy4zNyAzLjM3IDAgMCAwLS45NC0yLjYxYzMuMTQtLjM1IDYuNDQtMS41NCA2LjQ0LTdBNS40NCA1LjQ0IDAgMCAwIDIwIDQuNzcgNS4wNyA1LjA3IDAgMCAwIDE5LjkxIDFTMTguNzMuNjUgMTYgMi40OGExMy4zOCAxMy4zOCAwIDAgMC03IDBDNi4yNy42NSA1LjA5IDEgNS4wOSAxQTUuMDcgNS4wNyAwIDAgMCA1IDQuNzdhNS40NCA1LjQ0IDAgMCAwLTEuNSAzLjc4YzAgNS40MiAzLjMgNi42MSA2LjQ0IDdBMy4zNyAzLjM3IDAgMCAwIDkgMTguMTNWMjIiPjwvcGF0aD48L3N2Zz4='
  },
  instagram: {
    name: 'Instagram',
    svgData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHJ4PSI1IiByeT0iNSI+PC9yZWN0PjxwYXRoIGQ9Ik0xNiAxMS4zN0E0IDQgMCAxIDEgMTIuNjMgOCA0IDQgMCAwIDEgMTYgMTEuMzd6Ij48L3BhdGg+PGxpbmUgeDE9IjE3LjUiIHkxPSI2LjUiIHgyPSIxNy41MSIgeTI9IjYuNSI+PC9saW5lPjwvc3ZnPg=='
  },
  youtube: {
    name: 'YouTube',
    svgData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjIuNTQgNi40MmEyLjc4IDIuNzggMCAwIDAtMS45NC0yQzE4Ljg4IDQgMTIgNCAxMiA0cy02Ljg4IDAtOC42LjQ2YTIuNzggMi43OCAwIDAgMC0xLjk0IDJBMjkgMjkgMCAwIDAgMSAxMS43NWEyOSAyOSAwIDAgMCAuNDYgNS4zM0EyLjc4IDIuNzggMCAwIDAgMy40IDE5YzEuNzIuNDYgOC42LjQ2IDguNi40NnM2Ljg4IDAgOC42LS40NmEyLjc4IDIuNzggMCAwIDAgMS45NC0yIDI5IDI5IDAgMCAwIC40Ni01LjI1IDI5IDI5IDAgMCAwLS40Ni01LjMzeiI+PC9wYXRoPjxwb2x5Z29uIHBvaW50cz0iOS43NSAxNS4wMiAxNS41IDExLjc1IDkuNzUgOC40OCA5Ljc1IDE1LjAyIj48L3BvbHlnb24+PC9zdmc+'
  }
};

/**
 * Computes uppercase initials from a full name (e.g. "Alex Carter" -> "AC")
 */
function getInitials(name) {
  if (!name) return 'AC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generates email-safe HTML based on data and chosen theme
 */
export function generateSignatureHtml(raw) {
  const data = sanitizeCardData(raw || {});
  const theme = data.theme || 'executive';
  const accent = data.accentColor || '#2563eb';
  const font = data.fontFamily || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // All themes share the clean, minimalist aesthetic with tailored variations
  switch (theme) {
    case 'minimalist':
      return renderMinimalistTheme(data, accent, font);
    case 'gradient':
      return renderGradientTheme(data, accent, font);
    case 'corporate':
      return renderCorporateTheme(data, accent, font);
    case 'compact':
      return renderCompactTheme(data, accent, font);
    case 'executive':
    default:
      return renderExecutiveTheme(data, accent, font);
  }
}

/**
 * Generates a clean, readable text/plain MIME version of the signature
 */
export function generateSignaturePlainText(raw) {
  const d = sanitizeCardData(raw || {});
  const lines = [];

  const nameLine = [d.fullName, d.pronouns ? `(${d.pronouns})` : ''].filter(Boolean).join(' ');
  if (nameLine) lines.push(nameLine);

  const roleParts = [d.jobTitle, d.department].filter(Boolean);
  const companyParts = [d.company, d.tagline].filter(Boolean);
  const titleAndCompany = [roleParts.join(' | '), companyParts.join(' - ')].filter(Boolean).join(', ');
  if (titleAndCompany) lines.push(titleAndCompany);

  const contactLines = [];
  if (d.email) contactLines.push(`Email: ${d.email}`);
  if (d.phone || d.mobile) contactLines.push(`Tel: ${d.phone || d.mobile}`);
  if (d.website) contactLines.push(`Web: ${d.website.replace(/^https?:\/\//, '')}`);
  if (d.address) contactLines.push(`Address: ${d.address}`);

  if (contactLines.length) {
    lines.push('');
    lines.push(...contactLines);
  }

  // Active social links
  if (d.socials) {
    const socialLines = [];
    for (const [platform, url] of Object.entries(d.socials)) {
      if (url && SOCIAL_ICONS[platform]) {
        socialLines.push(`${SOCIAL_ICONS[platform].name}: ${url}`);
      }
    }
    if (socialLines.length) {
      lines.push('');
      lines.push(...socialLines);
    }
  }

  // CTA button fallback if enabled
  if (d.showCtaButton && d.ctaText && d.ctaUrl) {
    lines.push('');
    lines.push(`${d.ctaText}: ${d.ctaUrl}`);
  }

  // Promo announcement banner if enabled
  if (d.showPromoBanner && d.promoText) {
    lines.push('');
    lines.push(d.promoText + (d.promoUrl ? ` (${d.promoUrl})` : ''));
  }

  // Legal/Eco disclaimer if enabled
  if (d.showDisclaimer && d.disclaimerText) {
    lines.push('');
    lines.push(d.disclaimerText);
  }

  return lines.join('\n').trim();
}

/**
 * Renders avatar: either the sleek initials badge (0 KB) or user's photo
 */
function renderAvatarHtml(d, size = 38) {
  if (d.showAvatar === false) return '';

  if (d.avatarType === 'photo' && d.avatarUrl) {
    const shapeRadius = d.avatarShape === 'circle' ? '50%' : d.avatarShape === 'rounded' ? '8px' : '3px';
    return `<img src="${d.avatarUrl}" alt="${d.fullName}" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border-radius:${shapeRadius};object-fit:cover;" />`;
  }

  // Initials badge circle (matches screenshot: deep navy background with bright cyan text)
  const initials = getInitials(d.fullName);
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="width:${size}px;height:${size}px;border-radius:50%;background-color:#072b4f;border-collapse:collapse;">
      <tr>
        <td align="center" valign="middle" style="width:${size}px;height:${size}px;border-radius:50%;background-color:#072b4f;color:#38bdf8;font-size:13px;font-weight:700;font-family:Arial,Helvetica,sans-serif;text-align:center;line-height:${size}px;padding:0;letter-spacing:0.02em;">
          ${initials}
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Renders company logo if toggled on and provided
 */
function renderCompanyLogoHtml(d) {
  if (d.showLogo === false || !d.logoUrl) return '';
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:4px;margin-bottom:6px;">
      <tr>
        <td valign="middle">
          <img src="${d.logoUrl}" alt="${d.company || 'Company Logo'}" style="display:block;max-height:36px;max-width:160px;height:auto;width:auto;border:0;outline:none;" />
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Theme 1: Executive Modern (Ultra-clean, minimalistic layout matching user screenshot)
 */
function renderExecutiveTheme(d, accent, font) {
  const showAvatar = d.showAvatar !== false;
  const avatarHtml = renderAvatarHtml(d, 38);
  const logoHtml = renderCompanyLogoHtml(d);
  const socialsHtml = renderSocialBadgesHtml(d.socials);

  const titlePart = [d.jobTitle, d.department].filter(Boolean).join(' | ');
  const subtitle = [titlePart, d.company].filter(Boolean).join(', ');

  return `
<!-- SigFlow Card: Minimalist Executive -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${font};max-width:540px;width:100%;line-height:1.45;border-collapse:collapse;">
  <!-- Header: Avatar + Name / Title -->
  <tr>
    <td style="padding-bottom:10px;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          ${showAvatar ? `
          <td valign="middle" style="padding-right:12px;width:40px;">
            ${avatarHtml}
          </td>` : ''}
          <td valign="middle">
            <div style="font-size:15px;font-weight:700;color:#0f172a;line-height:1.25;">
              ${d.fullName} ${d.pronouns ? `<span style="font-size:13px;font-weight:400;color:#64748b;">(${d.pronouns})</span>` : ''}
            </div>
            ${subtitle ? `
            <div style="font-size:13px;font-weight:400;color:#64748b;margin-top:2px;line-height:1.25;">
              ${subtitle}
            </div>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Contact Information Rows -->
  <tr>
    <td style="padding-bottom:8px;">
      <table cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#475569;line-height:1.55;border-collapse:collapse;">
        ${d.email ? `
        <tr>
          <td style="padding:2px 0;vertical-align:middle;">
            <span style="display:inline-block;width:18px;color:#64748b;font-size:13px;vertical-align:middle;">&#9993;</span>
            <a href="mailto:${d.email}" style="color:#475569;text-decoration:none;font-weight:400;vertical-align:middle;">${d.email}</a>
          </td>
        </tr>` : ''}
        ${d.phone || d.mobile ? `
        <tr>
          <td style="padding:2px 0;vertical-align:middle;">
            <span style="display:inline-block;width:18px;color:#64748b;font-size:13px;vertical-align:middle;">&#9742;</span>
            <a href="tel:${d.phone || d.mobile}" style="color:#475569;text-decoration:none;font-weight:400;vertical-align:middle;">${d.phone || d.mobile}</a>
          </td>
        </tr>` : ''}
        ${d.website ? `
        <tr>
          <td style="padding:2px 0;vertical-align:middle;">
            <span style="display:inline-block;width:18px;color:#64748b;font-size:13px;vertical-align:middle;">&#127760;</span>
            <a href="${d.website.startsWith('http') ? d.website : 'https://' + d.website}" target="_blank" style="color:#475569;text-decoration:none;font-weight:400;vertical-align:middle;">${d.website.replace(/^https?:\/\//, '')}</a>
          </td>
        </tr>` : ''}
      </table>
    </td>
  </tr>

  ${logoHtml ? `
  <!-- Company Brand Logo -->
  <tr>
    <td style="padding-bottom:10px;">
      ${logoHtml}
    </td>
  </tr>` : ''}

  <!-- Social Icons Row -->
  ${socialsHtml ? `
  <tr>
    <td style="padding-bottom:12px;padding-top:2px;">
      ${socialsHtml}
    </td>
  </tr>` : ''}

  <!-- Optional Calendar Booking CTA Button -->
  ${d.showCtaButton && d.ctaText ? `
  <tr>
    <td style="padding-bottom:10px;">
      <a href="${d.ctaUrl || '#'}" target="_blank" style="display:inline-block;padding:5px 12px;background-color:${accent};color:#ffffff;text-decoration:none;border-radius:4px;font-size:11px;font-weight:600;">
        ${d.ctaText}
      </a>
    </td>
  </tr>` : ''}

  <!-- Optional Promotional Banner -->
  ${d.showPromoBanner && d.promoText ? `
  <tr>
    <td style="padding-bottom:10px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f8fafc;border-left:3px solid ${accent};border-radius:0 4px 4px 0;">
        <tr>
          <td style="padding:6px 10px;font-size:11px;color:#334155;">
            <a href="${d.promoUrl || '#'}" target="_blank" style="color:#0f172a;text-decoration:none;">
              ${d.promoText}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>` : ''}

  <!-- Optional Disclaimer with Top Border Divider -->
  ${d.showDisclaimer && d.disclaimerText ? `
  <tr>
    <td style="border-top:1px solid #e2e8f0;padding-top:8px;margin-top:8px;">
      <div style="font-size:11px;color:#94a3b8;line-height:1.4;">
        ${d.disclaimerText}
      </div>
    </td>
  </tr>` : ''}
</table>
`.trim();
}

/**
 * Theme 2: Minimalist Tech
 */
function renderMinimalistTheme(d, accent, font) {
  return renderExecutiveTheme(d, accent, font);
}

/**
 * Theme 3: Vibrant Gradient
 */
function renderGradientTheme(d, accent, font) {
  const showAvatar = d.showAvatar !== false;
  const avatarHtml = renderAvatarHtml(d, 38);
  const logoHtml = renderCompanyLogoHtml(d);
  const socialsHtml = renderSocialBadgesHtml(d.socials);
  const titlePart = [d.jobTitle, d.department].filter(Boolean).join(' | ');
  const subtitle = [titlePart, d.company].filter(Boolean).join(', ');

  return `
<!-- SigFlow Card: Vibrant Minimal -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${font};max-width:540px;width:100%;line-height:1.45;border-collapse:collapse;">
  <tr>
    <td style="height:2px;background:linear-gradient(90deg, ${accent} 0%, #38bdf8 100%);margin-bottom:10px;"></td>
  </tr>
  <tr>
    <td style="padding:10px 0;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          ${showAvatar ? `
          <td valign="middle" style="padding-right:12px;width:40px;">
            ${avatarHtml}
          </td>` : ''}
          <td valign="middle">
            <div style="font-size:15px;font-weight:700;color:#0f172a;line-height:1.25;">
              ${d.fullName} ${d.pronouns ? `<span style="font-size:13px;font-weight:400;color:#64748b;">(${d.pronouns})</span>` : ''}
            </div>
            ${subtitle ? `
            <div style="font-size:13px;font-weight:400;color:#64748b;margin-top:2px;">
              ${subtitle}
            </div>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom:8px;">
      <table cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#475569;line-height:1.55;">
        ${d.email ? `<tr><td style="padding:2px 0;"><span style="display:inline-block;width:18px;color:#64748b;">&#9993;</span> <a href="mailto:${d.email}" style="color:#475569;text-decoration:none;">${d.email}</a></td></tr>` : ''}
        ${d.phone || d.mobile ? `<tr><td style="padding:2px 0;"><span style="display:inline-block;width:18px;color:#64748b;">&#9742;</span> <a href="tel:${d.phone || d.mobile}" style="color:#475569;text-decoration:none;">${d.phone || d.mobile}</a></td></tr>` : ''}
        ${d.website ? `<tr><td style="padding:2px 0;"><span style="display:inline-block;width:18px;color:#64748b;">&#127760;</span> <a href="${d.website.startsWith('http') ? d.website : 'https://' + d.website}" target="_blank" style="color:#475569;text-decoration:none;">${d.website.replace(/^https?:\/\//, '')}</a></td></tr>` : ''}
      </table>
    </td>
  </tr>
  ${logoHtml ? `<tr><td style="padding-bottom:8px;">${logoHtml}</td></tr>` : ''}
  ${socialsHtml ? `<tr><td style="padding-bottom:12px;">${socialsHtml}</td></tr>` : ''}
  ${d.showDisclaimer && d.disclaimerText ? `<tr><td style="border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#94a3b8;">${d.disclaimerText}</td></tr>` : ''}
</table>
`.trim();
}

/**
 * Theme 4: Corporate Classic
 */
function renderCorporateTheme(d, accent, font) {
  return renderExecutiveTheme(d, accent, font);
}

/**
 * Theme 5: Compact Pill
 */
function renderCompactTheme(d, accent, font) {
  const showAvatar = d.showAvatar !== false;
  const avatarHtml = renderAvatarHtml(d, 32);
  const logoHtml = renderCompanyLogoHtml(d);

  return `
<!-- SigFlow Card: Compact Pill -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${font};max-width:480px;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:24px;padding:6px 14px;">
  <tr>
    ${showAvatar ? `
    <td valign="middle" style="padding:6px 8px 6px 10px;">
      ${avatarHtml}
    </td>` : ''}
    <td valign="middle" style="padding:6px 12px 6px 4px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.2;">${d.fullName}</div>
      <div style="font-size:11px;color:#64748b;line-height:1.2;">${d.jobTitle} &bull; <strong style="color:#475569;">${d.company}</strong></div>
    </td>
    <td valign="middle" style="padding:6px 14px 6px 8px;border-left:1px solid #e2e8f0;">
      <a href="mailto:${d.email}" style="color:#475569;text-decoration:none;font-size:11px;font-weight:500;">${d.email}</a>
    </td>
    ${logoHtml ? `
    <td valign="middle" style="padding:6px 10px;border-left:1px solid #e2e8f0;">
      ${logoHtml}
    </td>` : ''}
  </tr>
</table>
`.trim();
}

/**
 * Helper to render clean monochrome minimalist social icons
 */
function renderSocialBadgesHtml(socials) {
  if (!socials) return '';
  const cells = [];

  for (const [platform, url] of Object.entries(socials)) {
    if (url && SOCIAL_ICONS[platform]) {
      const item = SOCIAL_ICONS[platform];
      cells.push(`
        <td style="padding-right:8px;vertical-align:middle;">
          <a href="${url}" target="_blank" style="display:inline-block;text-decoration:none;" title="${item.name}">
            <img src="${item.svgData}" alt="${item.name}" width="16" height="16" style="display:block;width:16px;height:16px;border:0;outline:none;" />
          </a>
        </td>
      `);
    }
  }

  if (!cells.length) return '';

  return `
    <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;vertical-align:middle;border-collapse:collapse;">
      <tr>
        ${cells.join('')}
      </tr>
    </table>
  `.trim();
}
