import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Router } from "express";
import {
  getLegalDocument,
  getLegalIndex,
  sendAccountDeletionPage,
  sendPrivacyPage,
  sendSupportPage,
  sendTermsPage,
} from "./legal.controller.js";

const router = Router();

router.get("/", getLegalIndex);
router.get("/privacy", getLegalDocument("privacy"));
router.get("/terms", getLegalDocument("terms"));
router.get("/support", getLegalDocument("support"));
router.get("/account-deletion", getLegalDocument("account-deletion"));

const legalDir = path.dirname(fileURLToPath(import.meta.url));

export const legalPageRouter = Router();
legalPageRouter.use("/legal-assets", express.static(legalDir));
legalPageRouter.get("/privacy-policy", sendPrivacyPage);
legalPageRouter.get("/terms-and-conditions", sendTermsPage);
legalPageRouter.get("/support", sendSupportPage);
legalPageRouter.get("/account-deletion", sendAccountDeletionPage);

export default router;
