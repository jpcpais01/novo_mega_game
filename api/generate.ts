import type { VercelRequest, VercelResponse } from "../server/types";
import { handle } from "../server/handler";
export default (req: VercelRequest, res: VercelResponse) =>
  handle("generate", req, res);
