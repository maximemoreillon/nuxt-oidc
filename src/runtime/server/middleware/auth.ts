import createJwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";
import { createError, defineEventHandler, getCookie, getHeader } from "h3";
import { oauthRoutes, tokensCookieName } from "../../shared/constants";
import { oidcConfig } from "../oidcConfig";

// Create a single, reusable JWKS client
// TODO: there must be nicer ways to do this

let jwksClient: createJwksClient.JwksClient;

export default defineEventHandler(async (event) => {
  if (!oidcConfig) throw new Error("Missing OIDC config");
  // NOTE: this server middleware works independently from the front-end logic such as route middleware
  // The only shared logic is getOidcConfig

  const { path } = event;

  // Allowing access to oauth server routes, namely callback
  if (path.startsWith(oauthRoutes)) return;

  // // Only deal with API routes
  if (!path.startsWith("/api")) return;
  if (!jwksClient) {
    // Create client if it does not exist yet
    const { jwks_uri } = oidcConfig;
    jwksClient = createJwksClient({
      jwksUri: jwks_uri,
      cache: true,
      rateLimit: true,
    });
  }

  let token: string | undefined;

  const oidcCookie = getCookie(event, tokensCookieName);

  if (oidcCookie) token = JSON.parse(oidcCookie).access_token;
  else token = getHeader(event, "Authorization")?.split(" ")[1];

  if (!token)
    throw createError({
      statusCode: 401,
      statusMessage: "Token not found in either cookie or authorization header",
    });

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded)
    throw createError({
      statusCode: 401,
      statusMessage: "Decoded token is null",
    });

  const kid = decoded.header?.kid;
  if (!kid)
    throw createError({
      statusCode: 401,
      statusMessage: "kid missing in token",
    });

  const key = await jwksClient.getSigningKey(kid);

  const verified = jwt.verify(token, key.getPublicKey());

  // TODO: handle cases where verification failed

  (event.context as any).user = verified;
});
