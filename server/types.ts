import type { IncomingMessage, ServerResponse } from "node:http";
// Structural types used by both Vercel's Node runtime and the local dev adapter.
export type VercelRequest = IncomingMessage & { body: unknown };
export type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => VercelResponse;
};
