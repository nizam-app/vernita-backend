import { getLegalConfig } from "./legal.config.js";

const nav = `
<nav class="legal-nav">
  <a href="/privacy-policy">Privacy</a>
  <a href="/terms-and-conditions">Terms</a>
  <a href="/support">Support</a>
  <a href="/account-deletion">Account deletion</a>
</nav>`;

export const renderLegalPage = ({ title, lastUpdated, bodyHtml, extraHead = "", extraBody = "" }) => {
  const { companyName } = getLegalConfig();
  const updatedLine = lastUpdated ? `<p class="meta">Last updated: ${lastUpdated}</p>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — ${companyName}</title>
  <style>
    :root { color-scheme: light; --bg: #f8fafc; --card: #fff; --text: #0f172a; --muted: #475569; --accent: #355e3b; --border: #e2e8f0; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: var(--bg); color: var(--text); line-height: 1.6; }
    header { background: var(--card); border-bottom: 1px solid var(--border); padding: 16px 20px; }
    header .brand { font-weight: 700; color: var(--accent); }
    .legal-nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 0.9rem; }
    .legal-nav a { color: var(--accent); text-decoration: none; }
    .legal-nav a:hover { text-decoration: underline; }
    main { max-width: 720px; margin: 0 auto; padding: 28px 20px 48px; }
    article { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
    h1 { font-size: 1.75rem; margin: 0 0 8px; }
    .meta { color: var(--muted); font-size: 0.9rem; margin: 0 0 20px; }
    h2 { font-size: 1.1rem; margin: 24px 0 8px; }
    p { margin: 0 0 12px; color: var(--muted); }
    a { color: var(--accent); }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
    label { display: block; font-weight: 600; font-size: 0.9rem; margin: 12px 0 4px; color: var(--text); }
    input, textarea, select { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; font: inherit; }
    textarea { min-height: 120px; resize: vertical; }
    button { margin-top: 16px; background: var(--accent); color: #fff; border: none; border-radius: 10px; padding: 12px 20px; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .form-status { margin-top: 12px; font-size: 0.9rem; }
    .form-status.ok { color: var(--accent); }
    .form-status.err { color: #b91c1c; }
    footer { text-align: center; padding: 24px; color: var(--muted); font-size: 0.85rem; }
  </style>
  ${extraHead}
</head>
<body>
  <header>
    <div class="brand">${companyName}</div>
    ${nav}
  </header>
  <main>
    <article>
      <h1>${title}</h1>
      ${updatedLine}
      <div class="legal-body">${bodyHtml}</div>
      ${extraBody}
    </article>
  </main>
  <footer>© ${new Date().getFullYear()} ${companyName}</footer>
</body>
</html>`;
};

export const supportFormHtml = () => {
  const { supportEmail } = getLegalConfig();
  return `
<form id="support-form" class="support-form">
  <label for="fullName">Full name</label>
  <input id="fullName" name="fullName" required maxlength="200" />

  <label for="email">Email</label>
  <input id="email" name="email" type="email" required maxlength="320" />

  <label for="phoneNumber">Phone</label>
  <input id="phoneNumber" name="phoneNumber" required maxlength="50" />

  <label for="serviceInterestedIn">Topic</label>
  <select id="serviceInterestedIn" name="serviceInterestedIn" required>
    <option value="Account & login">Account & login</option>
    <option value="Billing & subscription">Billing & subscription</option>
    <option value="Courses & content">Courses & content</option>
    <option value="Technical issue">Technical issue</option>
    <option value="Account deletion">Account deletion</option>
    <option value="Other">Other</option>
  </select>

  <label for="message">Message</label>
  <textarea id="message" name="message" required maxlength="5000"></textarea>

  <input type="hidden" name="source" value="support-page" />
  <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true" />

  <button type="submit">Send message</button>
  <p class="form-status" id="support-status" role="status"></p>
  <p class="meta">Or email us directly at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
</form>
<script src="/legal-assets/support-form.js" defer></script>`;
};
