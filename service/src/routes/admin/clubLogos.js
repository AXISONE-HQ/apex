import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { badRequest } from "../domain/_helpers.js";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_LOGO_BYTES,
  newClubLogoObjectPath,
  signV4ReadUrl,
  signV4UploadUrl,
  headObject,
} from "../../lib/gcs.js";
import { updateOrganizationProfile } from "../../repositories/organizationsRepo.js";

const router = Router({ mergeParams: true });

function requireOrgId(req, res) {
  const orgId = req.params.orgId;
  if (!orgId) {
    badRequest(res, "orgId required");
    return null;
  }
  return orgId;
}

// POST /admin/clubs/:orgId/logo/upload-url
// Body: { contentType: "image/png" }
router.post(
  "/:orgId/logo/upload-url",
  requireSession,
  requirePermission("admin.clubs.logo.upload", (req) => ({ type: "organization", id: req.params.orgId })),
  async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { contentType } = req.body || {};
    if (!contentType || typeof contentType !== "string") {
      return badRequest(res, "contentType required");
    }
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return res.status(400).json({ error: "unsupported_content_type" });
    }

    const objectPath = newClubLogoObjectPath({ orgId, contentType });
    if (!objectPath) return res.status(400).json({ error: "invalid_content_type" });

    const uploadUrl = await signV4UploadUrl({ objectPath, contentType, expiresMinutes: 15 });

    return res.status(200).json({
      bucket: process.env.CLUB_LOGO_BUCKET || "apex-v1-488611-assets",
      objectPath,
      uploadUrl,
      requirements: {
        contentType,
        maxBytes: MAX_LOGO_BYTES,
        method: "PUT",
      },
    });
  }
);

// POST /admin/clubs/:orgId/logo/confirm
// Body: { objectPath: "club-logos/<orgId>/<uuid>.<ext>" }
router.post(
  "/:orgId/logo/confirm",
  requireSession,
  requirePermission("admin.clubs.logo.upload", (req) => ({ type: "organization", id: req.params.orgId })),
  async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { objectPath } = req.body || {};
    if (!objectPath || typeof objectPath !== "string") {
      return badRequest(res, "objectPath required");
    }

    const expectedPrefix = `club-logos/${orgId}/`;
    if (!objectPath.startsWith(expectedPrefix)) {
      return res.status(400).json({ error: "invalid_object_path_prefix" });
    }

    // HEAD/metadata checks
    let meta;
    try {
      meta = await headObject({ objectPath });
    } catch {
      return res.status(404).json({ error: "object_not_found" });
    }

    if (meta.size > MAX_LOGO_BYTES) {
      return res.status(400).json({ error: "file_too_large", maxBytes: MAX_LOGO_BYTES, size: meta.size });
    }
    if (!ALLOWED_IMAGE_TYPES.has(meta.contentType)) {
      return res.status(400).json({ error: "invalid_content_type", allowed: [...ALLOWED_IMAGE_TYPES] });
    }

    const updated = await updateOrganizationProfile({ id: orgId, logo_object_path: objectPath });
    if (!updated) return res.status(404).json({ error: "org_not_found" });

    return res.status(200).json({
      ok: true,
      orgId,
      logo_object_path: objectPath,
      verified: { size: meta.size, contentType: meta.contentType },
    });
  }
);

// GET /admin/clubs/:orgId/logo/read-url
// No query param: always signs the org's persisted logo_object_path.
router.get(
  "/:orgId/logo/read-url",
  requireSession,
  requirePermission("admin.clubs.logo.read", (req) => ({ type: "organization", id: req.params.orgId })),
  async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    // Fetch org logo pointer. Note: this avoids letting callers sign arbitrary objects.
    const { getOrganizationById } = await import("../../repositories/organizationsRepo.js");
    const org = await getOrganizationById(orgId);
    if (!org) return res.status(404).json({ error: "org_not_found" });

    const objectPath = org.logo_object_path;
    if (!objectPath) {
      return res.status(404).json({ error: "no_logo" });
    }

    // Fail fast if object missing
    try {
      await headObject({ objectPath });
    } catch {
      return res.status(404).json({ error: "object_not_found" });
    }

    const url = await signV4ReadUrl({ objectPath, expiresMinutes: 60 });
    return res.status(200).json({ url, expiresMinutes: 60 });
  }
);

export default router;
