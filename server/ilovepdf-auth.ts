import jwt from "jsonwebtoken";

const API_URL = "api.ilovepdf.com";
// iLovePDF rejects tokens whose iat is too close to server time.
const TIME_DELAY_SECONDS = 5;

export function createILovePdfToken(): string {
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
  const secretKey = process.env.ILOVEPDF_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new Error("ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY must be configured");
  }

  const timeNow = Date.now() / 1000;
  return jwt.sign(
    {
      jti: publicKey,
      iss: API_URL,
      iat: timeNow - TIME_DELAY_SECONDS,
    },
    secretKey
  );
}

export async function handleTokenRequest(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const token = createILovePdfToken();
    return Response.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create token";
    return Response.json({ error: message }, { status: 500 });
  }
}
