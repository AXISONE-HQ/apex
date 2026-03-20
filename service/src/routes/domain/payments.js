import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";

const router = Router();

router.get("/fees", requireSession, requirePermission("payments.page.view"), async (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

router.get("/invoices", requireSession, requirePermission("payments.page.view"), async (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

router.post("/invoices/:id/checkout", requireSession, requirePermission("payments.function.pay"), async (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

router.post("/webhooks/stripe", async (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

export default router;
