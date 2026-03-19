export function parsePagination(query = {}) {
  const rawLimit = Number.parseInt(String(query.limit ?? "20"), 10);
  const rawOffset = Number.parseInt(String(query.offset ?? "0"), 10);

  const limit = Number.isNaN(rawLimit) ? 20 : Math.max(1, Math.min(rawLimit, 100));
  const offset = Number.isNaN(rawOffset) ? 0 : Math.max(0, rawOffset);

  return { limit, offset };
}

export function badRequest(res, message, details = undefined) {
  return res.status(400).json({ error: { code: "bad_request", message, details } });
}

export function notFound(res, message = "Resource not found") {
  return res.status(404).json({ error: { code: "not_found", message } });
}
