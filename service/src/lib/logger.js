export const logger = {
  info(payload, message = "") {
    if (process.env.NODE_ENV === "test") return;
    console.info(message, payload);
  },
  error(payload, message = "") {
    if (process.env.NODE_ENV === "test") return;
    console.error(message, payload);
  },
};
