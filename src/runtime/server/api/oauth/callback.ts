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
import { cookieOptions, legacyTokensCookieName } from "../../../shared/constants";
import { withExpiresAt } from "../../../utils/expiry";
import { getRedirectUri, requestTokens, splitTokens } from "../../../shared/oidc";
import { parsePublicConfig } from "../../../shared/config";
import { useOidcConfig } from "../../oidcConfig";

export default defineEventHandler(async (event) => {
  const { client_id, cookies } = parsePublicConfig(useRuntimeConfig(event).public);
  const { code, state, error, error_description } = getQuery(event);

  const code_verifier = getCookie(event, cookies.verifier);
  const expectedState = getCookie(event, cookies.state);
  const href = getCookie(event, cookies.href);
  deleteCookie(event, cookies.verifier);
  deleteCookie(event, cookies.state);
  deleteCookie(event, cookies.href);

  if (error)
    throw createError({ statusCode: 401, statusMessage: String(error_description ?? error) });
  if (typeof code !== "string")
    throw createError({ statusCode: 400, statusMessage: "Missing code" });
  if (!code_verifier)
    throw createError({ statusCode: 400, statusMessage: "Missing verifier" });
  if (!state || state !== expectedState)
    throw createError({ statusCode: 400, statusMessage: "Invalid state" });

  const { token_endpoint } = await useOidcConfig();

  const tokens = await requestTokens(token_endpoint, {
    code,
    code_verifier,
    redirect_uri: getRedirectUri(getRequestURL(event).origin),
    client_id,
    grant_type: "authorization_code",
  });

  const { access, refresh, id } = splitTokens(withExpiresAt(tokens));
  setCookie(event, cookies.access, JSON.stringify(access), cookieOptions);
  if (refresh) setCookie(event, cookies.refresh, refresh, cookieOptions);
  if (id) setCookie(event, cookies.id, id, cookieOptions);
  deleteCookie(event, legacyTokensCookieName);

  return sendRedirect(event, href ?? "/");
});
