import { logger } from "../lib/logger.js";

export const eventCalendarSync = {
  async syncEventCreated({ orgId, event, actorUserId }) {
    try {
      logger.info(
        {
          type: "event.calendar_sync_created",
          orgId,
          eventId: event.id,
          teamId: event.team_id ?? event.teamId ?? null,
          eventType: event.type,
          actorUserId,
        },
        "event calendar sync noop"
      );
    } catch (err) {
      logger.error(
        {
          type: "event.calendar_sync_failed",
          orgId,
          eventId: event.id,
          error: err?.message,
        },
        "failed to log calendar sync"
      );
    }
  },
};
