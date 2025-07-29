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
import { z } from "zod";
import getOidcConfig from "../../../shared/getOidcConfig";
import publicRuntimeConfigSchema from "../../../shared/publicRuntimeConfigSchema";
import {
  tokensCookieName,
  hrefCookieName,
  verifierCookieName,
  cookieOptions,
  redirectPath,
} from "../../../shared/constants";
import { getTokensWithExpiresAt } from "../../../utils/expiry";

const querySchema = z.object({ code: z.string() });

export default defineEventHandler(async (event) => {
  const { code } = querySchema.parse(getQuery(event));
  const { origin } = getRequestURL(event);

  const runtimeConfig = useRuntimeConfig();

  const { oidcAuthority, oidcClientId: client_id } =
    publicRuntimeConfigSchema.parse(runtimeConfig.public);

  const code_verifier = getCookie(event, verifierCookieName);
  if (!code_verifier)
    throw createError({ statusCode: 400, statusMessage: "Missing verifier" });

  const { token_endpoint } = await getOidcConfig(oidcAuthority); // PROBLEM: Will access OIDC provider each time

  const redirect_uri = `${origin}${redirectPath}`;

  const body = new URLSearchParams({
    code,
    code_verifier,
    redirect_uri,
    client_id,
    grant_type: "authorization_code",
  });

  const init: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  };

  const response = await fetch(token_endpoint, init);

  deleteCookie(event, verifierCookieName);

  if (!response.ok) {
    const text = await response.text();
    console.error(text);
    throw new Error(text);
  }

  const tokens = await response.json();

  const tokensWithExpiresAt = getTokensWithExpiresAt(tokens);
  setCookie(
    event,
    tokensCookieName,
    JSON.stringify(tokensWithExpiresAt),
    cookieOptions
  );

  // TODO: redirect to page the user wanted to see originally
  // TODO: href to just be path
  // const href = getCookie(event, hrefCookieName);
  // if (href) return await sendRedirect(event, href);
  return await sendRedirect(event, "/");
});
