import { useRuntimeConfig } from "#imports";
import {
  createError,
  defineEventHandler,
  getQuery,
  getRequestURL,
  getCookie,
  deleteCookie,
  setCookie,
  sendRedirect,
} from "h3";
import {
  tokensCookieName,
  hrefCookieName,
  stateCookieName,
  verifierCookieName,
  cookieOptions,
} from "../../../shared/constants";
import { withExpiresAt } from "../../../utils/expiry";
import { getRedirectUri, requestTokens } from "../../../shared/oidc";
import { parsePublicConfig } from "../../../shared/config";
import { useOidcConfig } from "../../oidcConfig";

export default defineEventHandler(async (event) => {
  const { code, state, error, error_description } = getQuery(event);

  const code_verifier = getCookie(event, verifierCookieName);
  const expectedState = getCookie(event, stateCookieName);
  const href = getCookie(event, hrefCookieName);
  deleteCookie(event, verifierCookieName);
  deleteCookie(event, stateCookieName);
  deleteCookie(event, hrefCookieName);

  if (error)
    throw createError({ statusCode: 401, statusMessage: String(error_description ?? error) });
  if (typeof code !== "string")
    throw createError({ statusCode: 400, statusMessage: "Missing code" });
  if (!code_verifier)
    throw createError({ statusCode: 400, statusMessage: "Missing verifier" });
  if (!state || state !== expectedState)
    throw createError({ statusCode: 400, statusMessage: "Invalid state" });

  const { client_id } = parsePublicConfig(useRuntimeConfig(event).public);
  const { token_endpoint } = await useOidcConfig();

  const tokens = await requestTokens(token_endpoint, {
    code,
    code_verifier,
    redirect_uri: getRedirectUri(getRequestURL(event).origin),
    client_id,
    grant_type: "authorization_code",
  });

  setCookie(event, tokensCookieName, JSON.stringify(withExpiresAt(tokens)), cookieOptions);

  return sendRedirect(event, href ?? "/");
});
