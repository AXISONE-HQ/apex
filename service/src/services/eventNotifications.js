import { logger } from "../lib/logger.js";

export const eventNotifications = {
  async notifyEventCreated({ orgId, event, actorUserId }) {
    try {
      logger.info(
        {
          type: "event.created",
          orgId,
          eventId: event.id,
          teamId: event.team_id ?? event.teamId ?? null,
          eventType: event.type,
          actorUserId,
        },
        "event notification: created"
      );
    } catch (err) {
      logger.error(
        {
          type: "event.notification_failed",
          orgId,
          eventId: event.id,
          error: err?.message,
        },
        "failed to log event notification"
      );
    }
  },
};
