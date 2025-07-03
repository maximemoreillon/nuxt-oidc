import createJwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";
// import { getOidcConfig } from "../oidc";
import { createError, defineEventHandler, getHeader } from "h3";
import { useRuntimeConfig } from "#imports";
import getOidcConfig from "../shared/getOidcConfig";

// Create a single, reusable JWKS client
// TODO: there must be nicer ways to do this
let jwksClient: createJwksClient.JwksClient;

export default defineEventHandler(async (event) => {
  // NOTE: this server middleware works independently from the front-end logic such as route middleware
  // The only shared logic is getOidcConfig

  // Only deal with API routes
  if (!event.node.req.url?.startsWith("/api")) return;

  // Create client if it does not exist yet
  if (!jwksClient) {
    const runtimeConfig = useRuntimeConfig();

    const { oidcAuthority: authority } = runtimeConfig.public;
    if (!authority) throw new Error("Missing oidcAuthority in runtimeConfig");
    const { jwks_uri } = await getOidcConfig(authority as string);

    jwksClient = createJwksClient({
      jwksUri: jwks_uri,
      cache: true,
      rateLimit: true,
    });
  }

  let token: string | undefined;

  const oidcCookie = getCookie(event, "oidc");

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

  const kid = decoded?.header?.kid;
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
