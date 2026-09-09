import type { VercelRequest, VercelResponse } from "./types";
import { ZodError } from "zod";
import { ApiError, authorize, status, generate, analyze } from "./core";
export async function handle(
  route: string,
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (route === "status" && req.method === "GET")
      return res.status(200).json(status());
    if (req.method !== "POST") {
      res.setHeader("Allow", route === "status" ? "GET" : "POST");
      throw new ApiError(405, "Method not allowed.");
    }
    authorize(req.headers["x-hatchery-code"]);
    const data =
      route === "generate"
        ? await generate(req.body)
        : route === "analyze"
          ? await analyze(req.body)
          : null;
    if (!data) throw new ApiError(404, "Not found.");
    return res.status(200).json(data);
  } catch (error) {
    return res
      .status(
        error instanceof ApiError
          ? error.status
          : error instanceof ZodError
            ? 400
            : 502,
      )
      .json({
        error:
          error instanceof ZodError
            ? "Invalid hatch request."
            : error instanceof Error
              ? error.message
              : "Hatching failed. Please try again.",
      });
  }
}
