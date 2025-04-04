import createJwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";
// import { getOidcConfig } from "../oidc";
import { createError, defineEventHandler, getHeader } from "h3";
import { useRuntimeConfig } from "#imports";
import { getOidcConfig } from "../common";

// PROBLEM: cannot get jwksUri from runtimeConfig
let jwksClient: createJwksClient.JwksClient;

export default defineEventHandler(async (event) => {
  // Only deal with API routes
  if (!event.node.req.url?.startsWith("/api")) {
    return;
  }

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

  const authorizationHeader = getHeader(event, "Authorization");

  if (!authorizationHeader) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authorization header not set",
    });
  }

  const token = authorizationHeader.split(" ")[1];

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) throw new Error(`Decoded token is null`);

  const kid = decoded?.header?.kid;
  if (!kid) throw new Error("Missing token kid");

  const key = await jwksClient.getSigningKey(kid);

  const verified = jwt.verify(token, key.getPublicKey());

  // TODO: handle cases where verification failed

  (event.context as any).user = verified;
});
