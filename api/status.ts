import type { VercelRequest, VercelResponse } from "../server/types.js";
import { handle } from "../server/handler.js";
export default (req: VercelRequest, res: VercelResponse) =>
  handle("status", req, res);
