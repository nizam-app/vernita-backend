import { Router } from "express";
import {
  adminCreateCoachingPackage,
  adminDeleteCoachingPackage,
  adminGetCoachingPackageById,
  adminGetCoachingPackages,
  adminGetPackagePurchases,
  adminToggleCoachingPackageFeatured,
  adminToggleCoachingPackagePublish,
  adminUpdateCoachingPackage,
} from "./coaching.controller.js";

const router = Router();

router.route("/packages").post(adminCreateCoachingPackage).get(adminGetCoachingPackages);

router
  .route("/packages/:id")
  .get(adminGetCoachingPackageById)
  .patch(adminUpdateCoachingPackage)
  .delete(adminDeleteCoachingPackage);

router.patch("/packages/:id/publish", adminToggleCoachingPackagePublish);
router.patch("/packages/:id/feature", adminToggleCoachingPackageFeatured);
router.get("/packages/:id/purchases", adminGetPackagePurchases);

export default router;

