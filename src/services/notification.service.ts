import { Expo, type ExpoPushMessage, type ExpoPushSuccessTicket } from "expo-server-sdk";
import config from "../config/env.js";
import logger from "../utils/logger.js";

const expo = new Expo(
  config.EXPO_ACCESS_TOKEN ? { accessToken: config.EXPO_ACCESS_TOKEN } : {}
);

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotifications(
  tokens: string[],
  payload: PushPayload
): Promise<ExpoPushSuccessTicket[]> {
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return [];

  const messages: ExpoPushMessage[] = validTokens.map((token) => {
    const msg: ExpoPushMessage = {
      to: token,
      title: payload.title,
      body: payload.body,
      sound: "default",
      priority: "high",
    };
    if (payload.data !== undefined) {
      msg.data = payload.data;
    }
    return msg;
  });

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushSuccessTicket[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of ticketChunk) {
        if (ticket.status === "ok") {
          tickets.push(ticket);
        } else {
          logger.warn(`[Push]: Ticket error: ${ticket.message}`);
        }
      }
    } catch (err) {
      logger.error(`[Push]: Failed to send chunk: ${err}`);
    }
  }

  return tickets;
}
