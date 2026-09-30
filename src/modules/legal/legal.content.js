import { getLegalConfig } from "./legal.config.js";

const section = (title, paragraphs) => {
  const body = paragraphs.map((p) => `<p>${p}</p>`).join("\n");
  return `<section><h2>${title}</h2>${body}</section>`;
};

const listSection = (title, items) => {
  const body = `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  return `<section><h2>${title}</h2>${body}</section>`;
};

export const getPrivacyPolicySections = () => {
  const { companyName, supportEmail, lastUpdated } = getLegalConfig();
  return {
    title: "Privacy Policy",
    lastUpdated,
    sectionsHtml: [
      section("Introduction", [
        `${companyName} ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>") respects your privacy. This Privacy Policy explains what personal information we collect, how we use and protect it, and the choices available to you when you use our mobile application, websites, admin tools, and related services (collectively, the "<strong>Services</strong>").`,
        "By accessing or using the Services, you acknowledge that you have read and understood this Privacy Policy.",
      ]),
      listSection("Information we collect", [
        "<strong>Account data</strong> — name, email address, profile details, and authentication credentials (passwords are stored using industry-standard hashing; we never store plain-text passwords).",
        "<strong>Subscription and billing data</strong> — plan type, billing history, and payment status. Card details are processed by Stripe; we do not store full payment card numbers on our servers.",
        "<strong>Product usage data</strong> — course enrollments and progress, wellness tracker entries, goals, tasks, notifications, webinar registrations, and coaching-related activity within the app.",
        "<strong>Communications</strong> — messages you send through support forms, inquiry endpoints, or email correspondence with our team.",
        "<strong>Technical data</strong> — device type, app version, and log information used for security, troubleshooting, and service improvement (where applicable).",
      ]),
      listSection("How we use your information", [
        "Provide, operate, and maintain the Services, including subscriptions, courses, webinars, coaching, and account features.",
        "Authenticate users, prevent fraud and abuse, and maintain the security of our systems.",
        "Process payments and manage subscriptions through our payment partners.",
        "Respond to support requests and send important service-related notices.",
        "Improve the Services, fix errors, and develop new features.",
        "Comply with applicable law, enforce our Terms &amp; Conditions, and protect our rights and users.",
      ]),
      section("Legal bases (where applicable)", [
        "Where required by law (for example, in the European Economic Area or United Kingdom), we process personal data based on one or more of the following: performance of a contract with you, legitimate interests in operating and improving the Services, compliance with legal obligations, and your consent where consent is required.",
      ]),
      section("Sharing and disclosure", [
        "We share personal information only with trusted service providers that help us operate the Services—such as payment processing (Stripe), cloud hosting, database services, email delivery, and media storage. These providers may process data only on our instructions and subject to appropriate safeguards.",
        "We may disclose information if required by law, court order, or governmental request, or when we believe disclosure is necessary to protect rights, safety, or the integrity of the Services.",
        "<strong>We do not sell your personal information.</strong>",
      ]),
      section("International transfers", [
        "Your information may be processed in countries other than your own. Where we transfer data internationally, we take steps designed to ensure an appropriate level of protection consistent with applicable law.",
      ]),
      section("Data retention", [
        "We retain personal information for as long as your account is active or as needed to provide the Services, resolve disputes, enforce agreements, and meet legal, tax, or accounting requirements.",
        "When you delete your account, we delete or anonymize personal data unless retention is required or permitted by law. See our Account deletion page for step-by-step instructions.",
      ]),
      listSection("Your privacy rights", [
        "Depending on your location, you may have the right to access, correct, update, export, restrict, or delete your personal information.",
        "You may withdraw consent where processing is based on consent, without affecting the lawfulness of processing before withdrawal.",
        "You may lodge a complaint with a supervisory authority in your jurisdiction.",
        `To exercise your rights, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>. We may need to verify your identity before fulfilling a request.`,
      ]),
      section("Children's privacy", [
        "The Services are not directed to children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us so we can take appropriate action.",
      ]),
      section("Changes to this policy", [
        "We may update this Privacy Policy from time to time. When we make material changes, we will update the \"Last updated\" date at the top of this page. Your continued use of the Services after changes become effective constitutes acceptance of the revised policy.",
      ]),
      section("Contact us", [
        `For privacy-related questions or requests, email <a href="mailto:${supportEmail}">${supportEmail}</a>. Please include sufficient detail for us to identify your account and respond promptly.`,
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
      section("Agreement to terms", [
        `These Terms &amp; Conditions ("<strong>Terms</strong>") govern your access to and use of the Services provided by ${companyName}. By creating an account, purchasing a subscription, or otherwise using the Services, you agree to be bound by these Terms and our Privacy Policy.`,
        "If you do not agree, you must not access or use the Services.",
      ]),
      listSection("Eligibility and accounts", [
        "You must be at least the age of majority in your jurisdiction (or have verifiable parental consent where required) to use the Services.",
        "You agree to provide accurate, current, and complete registration information and to keep your login credentials confidential.",
        "You are responsible for all activity that occurs under your account. Notify us immediately if you suspect unauthorized access.",
        "We may suspend or terminate accounts that violate these Terms, applicable law, or that pose a security or abuse risk.",
      ]),
      listSection("Subscriptions, billing, and refunds", [
        "Paid subscriptions renew automatically at the interval and price shown at checkout unless you cancel before the renewal date through your account or app store settings, as applicable.",
        "Fees are processed by our payment partners. You authorize us and our processors to charge applicable fees and taxes.",
        "Except where required by law or explicitly stated at purchase, fees are non-refundable once a billing period has begun. Chargebacks or payment disputes may result in suspension of access.",
        "We may change subscription pricing or features with reasonable notice where required by law; continued use after the effective date may constitute acceptance.",
      ]),
      listSection("License and acceptable use", [
        "Subject to these Terms and your active subscription (where applicable), we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Services for personal, non-commercial purposes.",
        "Course, webinar, coaching, and other materials are protected by intellectual property laws. You may not copy, redistribute, resell, publicly display, or create derivative works except as expressly permitted.",
        "You agree not to misuse the Services, including attempting to bypass security, scrape or harvest data, interfere with other users, upload malicious code, or use the Services for unlawful purposes.",
      ]),
      section("Wellness and educational content", [
        "Content offered through the Services—including wellness tracking, coaching, and educational materials—is provided for general information and personal development purposes only. It does not constitute medical, mental health, legal, or financial advice. Always seek advice from qualified professionals for decisions that affect your health, safety, or finances.",
      ]),
      section("Third-party services", [
        "The Services may integrate with or link to third-party platforms (for example, payment processors or app stores). Your use of those services is subject to their terms and privacy policies; we are not responsible for third-party services.",
      ]),
      section("Disclaimer of warranties", [
        'The Services are provided on an "as is" and "as available" basis to the fullest extent permitted by law. We disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee uninterrupted or error-free operation.',
      ]),
      section("Limitation of liability", [
        `To the maximum extent permitted by applicable law, ${companyName} and its affiliates, officers, and employees shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising from your use of the Services.`,
        "Our total liability for any claim arising out of these Terms or the Services shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or one hundred U.S. dollars (USD $100), whichever is greater, except where such limitation is prohibited by law.",
      ]),
      section("Indemnification", [
        `You agree to indemnify and hold harmless ${companyName} from claims, damages, and expenses (including reasonable legal fees) arising from your misuse of the Services or violation of these Terms.`,
      ]),
      section("Changes to these Terms", [
        "We may modify these Terms at any time. Material changes will be reflected on this page with an updated date. If you continue using the Services after changes take effect, you accept the revised Terms.",
      ]),
      section("Governing law and contact", [
        `These Terms are governed by applicable law in the jurisdiction where ${companyName} operates, without regard to conflict-of-law principles, except where mandatory consumer protections in your country apply.`,
        `For questions about these Terms, billing, or your account, contact <a href="mailto:${supportEmail}">${supportEmail}</a>.`,
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
        `The ${companyName} support team assists with account access, password and login issues, subscription and billing questions, course and webinar access, coaching bookings, mobile app troubleshooting, and data or privacy requests.`,
      ]),
      listSection("Before you contact us", [
        "Sign in and check in-app Settings for subscription status, notification preferences, and account options.",
        "Note any error messages, screenshots, or steps that reproduce the issue.",
        "Use the email address registered on your account so we can verify ownership quickly.",
      ]),
      section("Email support", [
        `Send your request to <a href="mailto:${supportEmail}">${supportEmail}</a>. Include your full name, account email, a clear subject line, and a detailed description of the issue. For billing matters, you may include the last four digits of the payment method or a receipt reference (never send full card numbers).`,
      ]),
      section("Response times", [
        "We aim to acknowledge support requests within one (1) business day and to resolve most issues within three (3) business days. Complex billing or technical cases may require additional time; we will keep you informed of progress.",
      ]),
      section("Account deletion and privacy", [
        "To delete your account, follow the instructions on our Account deletion page or use the in-app delete flow. For privacy rights requests, refer to our Privacy Policy and email us from your registered address.",
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
        `You may permanently delete your ${companyName} account and associated personal data at any time. Deletion is <strong>irreversible</strong>.`,
        "After deletion, you will lose access to active subscriptions, course progress, wellness tracker history, goals, tasks, notifications, and purchase records linked to the account. Any unused paid period may be forfeited according to our Terms &amp; Conditions and applicable app store policies.",
      ]),
      listSection("Delete your account in the app (recommended)", [
        `Open the ${companyName} mobile app.`,
        "Go to <strong>Settings → Account → Delete account</strong>.",
        "Review the confirmation message, enter your password when prompted, and confirm deletion.",
        "Active subscriptions are canceled as part of the deletion process where supported by your platform.",
      ]),
      section("Delete via API (developers and integrated clients)", [
        "Authenticated users may delete their account by sending an authorized request to:",
        "<code>DELETE /api/v1/users/me</code> with header <code>Authorization: Bearer &lt;access_token&gt;</code> and JSON body <code>{ \"password\": \"your-account-password\" }</code>.",
        "A successful response indicates that deletion has been initiated or completed according to our backend policy.",
      ]),
      section("If you cannot sign in", [
        `Email <a href="mailto:${supportEmail}">${supportEmail}</a> from the email address associated with your account and request manual account deletion. For your security, we may ask you to verify identity before processing the request.`,
      ]),
      section("Data after deletion", [
        "We delete or anonymize personal data within a reasonable period after confirmed deletion, except where we must retain certain records for legal, tax, fraud prevention, or dispute resolution purposes, as described in our Privacy Policy.",
      ]),
      section("Questions", [
        `Contact <a href="mailto:${supportEmail}">${supportEmail}</a> if you need help with deletion or have concerns about remaining data.`,
      ]),
    ].join("\n"),
  };
};
