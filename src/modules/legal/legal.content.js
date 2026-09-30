import { getLegalConfig } from "./legal.config.js";

const section = (title, paragraphs) => {
  const body = paragraphs.map((p) => `<p>${p}</p>`).join("\n");
  return `<section><h2>${title}</h2>${body}</section>`;
};

export const getPrivacyPolicySections = () => {
  const { companyName, supportEmail, lastUpdated } = getLegalConfig();
  return {
    title: "Privacy Policy",
    lastUpdated,
    sectionsHtml: [
      section("Introduction", [
        `This Privacy Policy describes how ${companyName} ("we", "us") collects, uses, and protects personal information when you use our mobile application, websites, and related services (the "Services").`,
      ]),
      section("Information we collect", [
        "Account information such as name, email address, and password (stored securely using hashing).",
        "Subscription and payment metadata processed through Stripe (we do not store full card numbers on our servers).",
        "Usage data including course progress, wellness tracker entries, goals, tasks, and notifications you create in the app.",
        "Support messages you send through our support form or inquiry endpoints.",
      ]),
      section("How we use information", [
        "To provide and improve the Services, including subscriptions, courses, webinars, and coaching features.",
        "To authenticate you, prevent fraud, and keep your account secure.",
        "To respond to support requests and send service-related communications.",
        "To comply with legal obligations and enforce our Terms & Conditions.",
      ]),
      section("Sharing", [
        "We use trusted processors such as payment providers (Stripe), cloud hosting, and email delivery services. They may only process data on our instructions.",
        "We do not sell your personal information.",
      ]),
      section("Retention & deletion", [
        "We retain data while your account is active and as needed for legal, billing, or security purposes.",
        `You may delete your account in the app (Settings → Delete account) or via the authenticated API endpoint documented on our <a href="/account-deletion">Account deletion</a> page. After deletion, personal data is removed or anonymized except where retention is required by law.`,
      ]),
      section("Your rights", [
        "Depending on your location, you may have rights to access, correct, export, or delete your data. Contact us to exercise these rights.",
      ]),
      section("Contact", [
        `Questions about this policy: <a href="mailto:${supportEmail}">${supportEmail}</a>.`,
      ]),
    ].join("\n"),
  };
};

export const getTermsSections = () => {
  const { companyName, supportEmail, lastUpdated } = getLegalConfig();
  return {
    title: "Terms & Conditions",
    lastUpdated,
    sectionsHtml: [
      section("Agreement", [
        `By creating an account or using ${companyName} Services, you agree to these Terms & Conditions. If you do not agree, do not use the Services.`,
      ]),
      section("Accounts", [
        "You must provide accurate information and keep your credentials confidential.",
        "You are responsible for activity under your account.",
        "We may suspend or terminate accounts that violate these Terms or applicable law.",
      ]),
      section("Subscriptions & payments", [
        "Paid plans renew according to the billing cycle shown at checkout unless canceled before renewal.",
        "Refunds are handled according to our payment provider rules and applicable law.",
        "Digital content access may end when a subscription is canceled or expires.",
      ]),
      section("Acceptable use", [
        "Do not misuse the Services, attempt unauthorized access, scrape content, or infringe intellectual property.",
        "Course, webinar, and coaching materials are licensed for personal use only unless we agree otherwise in writing.",
      ]),
      section("Disclaimer", [
        'Wellness, coaching, and educational content is for informational purposes and is not medical or professional advice. Consult qualified professionals for health or financial decisions.',
      ]),
      section("Limitation of liability", [
        "To the fullest extent permitted by law, we are not liable for indirect or consequential damages arising from use of the Services.",
      ]),
      section("Changes", [
        "We may update these Terms. Material changes will be reflected on this page with an updated date.",
      ]),
      section("Contact", [
        `Legal or billing questions: <a href="mailto:${supportEmail}">${supportEmail}</a>.`,
      ]),
    ].join("\n"),
  };
};

export const getSupportSections = () => {
  const { companyName, supportEmail } = getLegalConfig();
  return {
    title: "Support",
    sectionsHtml: [
      section("How we can help", [
        `The ${companyName} team can assist with account access, billing, courses, webinars, coaching, and technical issues.`,
      ]),
      section("Email", [
        `<a href="mailto:${supportEmail}">${supportEmail}</a> — include your account email and a short description of the issue.`,
      ]),
      section("Response time", [
        "We aim to respond within 2 business days. Urgent billing issues are prioritized.",
      ]),
    ].join("\n"),
  };
};

export const getAccountDeletionSections = () => {
  const { companyName, supportEmail } = getLegalConfig();
  return {
    title: "Account deletion",
    sectionsHtml: [
      section("Overview", [
        `You can permanently delete your ${companyName} account and associated personal data.`,
        "Deletion is irreversible. You will lose access to subscriptions, course progress, tracker data, and purchases tied to the account.",
      ]),
      section("In the app (recommended)", [
        `Open the ${companyName} app → Settings → Account → Delete account.`,
        "Confirm your password when prompted. Active subscriptions are canceled before the account is removed.",
      ]),
      section("API (for integrated clients)", [
        "Authenticated users may call <code>DELETE /api/v1/users/me</code> with JSON body <code>{ \"password\": \"your-password\" }</code> and header <code>Authorization: Bearer &lt;token&gt;</code>.",
      ]),
      section("Cannot sign in?", [
        `Email <a href="mailto:${supportEmail}">${supportEmail}</a> from the address on your account and request manual deletion. We may ask you to verify ownership.`,
      ]),
      section("Related policies", [
        '<a href="/privacy-policy">Privacy Policy</a> · <a href="/terms-and-conditions">Terms & Conditions</a> · <a href="/support">Support</a>',
      ]),
    ].join("\n"),
  };
};
