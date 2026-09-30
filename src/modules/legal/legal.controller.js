import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { getLegalConfig } from "./legal.config.js";
import {
  getAccountDeletionSections,
  getPrivacyPolicySections,
  getSupportSections,
  getTermsSections,
} from "./legal.content.js";
import { renderLegalPage, supportFormHtml } from "./legal.template.js";

const pageHandlers = {
  privacy: () => {
    const { title, lastUpdated, sectionsHtml } = getPrivacyPolicySections();
    return renderLegalPage({ title, lastUpdated, bodyHtml: sectionsHtml });
  },
  terms: () => {
    const { title, lastUpdated, sectionsHtml } = getTermsSections();
    return renderLegalPage({ title, lastUpdated, bodyHtml: sectionsHtml });
  },
  support: () => {
    const { title, sectionsHtml } = getSupportSections();
    return renderLegalPage({
      title,
      bodyHtml: sectionsHtml,
      extraBody: supportFormHtml(),
    });
  },
  accountDeletion: () => {
    const { title, sectionsHtml } = getAccountDeletionSections();
    return renderLegalPage({ title, bodyHtml: sectionsHtml });
  },
};

export const sendPrivacyPage = catchAsync(async (req, res) => {
  res.type("html").send(pageHandlers.privacy());
});

export const sendTermsPage = catchAsync(async (req, res) => {
  res.type("html").send(pageHandlers.terms());
});

export const sendSupportPage = catchAsync(async (req, res) => {
  res.type("html").send(pageHandlers.support());
});

export const sendAccountDeletionPage = catchAsync(async (req, res) => {
  res.type("html").send(pageHandlers.accountDeletion());
});

export const getLegalIndex = catchAsync(async (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  const config = getLegalConfig();

  return sendResponse(res, {
    statusCode: 200,
    message: "Legal & support links",
    data: {
      companyName: config.companyName,
      supportEmail: config.supportEmail,
      lastUpdated: config.lastUpdated,
      pages: {
        privacyPolicy: `${base}/privacy-policy`,
        termsAndConditions: `${base}/terms-and-conditions`,
        support: `${base}/support`,
        accountDeletion: `${base}/account-deletion`,
      },
      api: {
        deleteAccount: "DELETE /api/v1/users/me",
      },
    },
  });
});

export const getLegalDocument = (type) =>
  catchAsync(async (req, res) => {
    const map = {
      privacy: getPrivacyPolicySections,
      terms: getTermsSections,
      support: getSupportSections,
      "account-deletion": getAccountDeletionSections,
    };
    const loader = map[type];
    if (!loader) {
      return sendResponse(res, { statusCode: 404, message: "Not found", data: null });
    }
    const doc = loader();
    return sendResponse(res, {
      statusCode: 200,
      message: "OK",
      data: doc,
    });
  });
