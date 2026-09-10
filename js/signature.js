import { sanitizeCardData } from './storage.js';

/**
 * SigFlow Signature Generator - Clean & Minimalistic Email Cards
 * Outputs 100% compliant inline table markup optimized for zero spam triggers
 * Matches the simple, elegant aesthetic with initials badge and monochrome icons
 */

// Clean monochrome minimalist social icons (self-contained SVG data URIs - zero network latency, zero spam triggers)
const SOCIAL_ICONS = {
  linkedin: {
    name: 'LinkedIn',
    svgData: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"%3E%3C/path%3E%3Crect x="2" y="9" width="4" height="12"%3E%3C/rect%3E%3Ccircle cx="4" cy="4" r="2"%3E%3C/circle%3E%3C/svg%3E'
  },
  twitter: {
    name: 'X',
    svgData: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="%2364748b"%3E%3Cpath d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/%3E%3C/svg%3E'
  },
  github: {
    name: 'GitHub',
    svgData: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"%3E%3C/path%3E%3C/svg%3E'
  },
  instagram: {
    name: 'Instagram',
    svgData: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="2" y="2" width="20" height="20" rx="5" ry="5"%3E%3C/rect%3E%3Cpath d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"%3E%3C/path%3E%3Cline x1="17.5" y1="6.5" x2="17.51" y2="6.5"%3E%3C/line%3E%3C/svg%3E'
  },
  youtube: {
    name: 'YouTube',
    svgData: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"%3E%3C/path%3E%3Cpolygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"%3E%3C/polygon%3E%3C/svg%3E'
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
 * Theme 1: Executive Modern (Ultra-clean, minimalistic layout matching user screenshot)
 */
function renderExecutiveTheme(d, accent, font) {
  const showAvatar = d.showAvatar !== false;
  const avatarHtml = renderAvatarHtml(d, 38);
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
