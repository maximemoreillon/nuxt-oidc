import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  createError,
  defineEventHandler,
  getCookie,
  getHeader,
  getRequestURL,
  type H3Event,
} from "h3";
import { useRuntimeConfig } from "#imports";
import { oauthRoutes } from "../../shared/constants";
import { parsePublicConfig } from "../../shared/config";
import { useOidcConfig } from "../oidcConfig";

// NOTE: this server middleware works independently from the front-end logic such as route middleware

// Created once, caches the signing keys
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getToken(event: H3Event, cookieName: string): string | undefined {
  const accessCookie = getCookie(event, cookieName);
  if (!accessCookie) return getHeader(event, "Authorization")?.split(" ")[1];
  try {
    return JSON.parse(accessCookie).access_token;
  } catch {
    return undefined;
  }
}

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event);

  // Only deal with API routes, except the oauth ones (login, callback)
  if (!pathname.startsWith("/api/") || pathname.startsWith(`${oauthRoutes}/`)) return;

  const { audience, cookies } = parsePublicConfig(useRuntimeConfig(event).public);

  const token = getToken(event, cookies.access);
  if (!token)
    throw createError({
      statusCode: 401,
      statusMessage: "Token not found in either cookie or authorization header",
    });

  const { issuer, jwks_uri } = await useOidcConfig();
  jwks ??= createRemoteJWKSet(new URL(jwks_uri));

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    event.context.user = payload;
  } catch {
    throw createError({ statusCode: 401, statusMessage: "Invalid token" });
  }
});
