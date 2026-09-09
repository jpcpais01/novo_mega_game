import { createServer } from "node:http";
import { loadEnv, createServer as createViteServer } from "vite";
import type { VercelRequest, VercelResponse } from "./types.js";
import { handle } from "./handler.js";
Object.assign(process.env, loadEnv("development", process.cwd(), ""));
const api = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 3_200_000) {
      res.writeHead(413);
      res.end('{"error":"Image is too large."}');
      return;
    }
  }
  const request = req as VercelRequest;
  try {
    request.body = body ? JSON.parse(body) : undefined;
  } catch {
    res.writeHead(400);
    res.end('{"error":"Invalid JSON."}');
    return;
  }
  const response = res as unknown as VercelResponse;
  response.status = (code: number) => {
    res.statusCode = code;
    return response;
  };
  response.json = (data: unknown) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
    return response;
  };
  await handle(req.url?.split("/")[2] || "", request, response);
});
api.listen(3001, "127.0.0.1");
const vite = await createViteServer();
await vite.listen();
vite.printUrls();
process.on("SIGINT", () => {
  api.close();
  void vite.close();
  process.exit();
});
