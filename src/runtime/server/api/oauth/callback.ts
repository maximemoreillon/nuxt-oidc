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

import {
  tokensCookieName,
  hrefCookieName,
  verifierCookieName,
  cookieOptions,
  redirectPath,
} from "../../../shared/constants";
import { getTokensWithExpiresAt } from "../../../utils/expiry";
import { oidcConfig } from "../../oidcConfig";
import publicRuntimeConfigSchema from "../../../shared/publicRuntimeConfigSchema";

const querySchema = z.object({ code: z.string() });
const runtimeConfig = useRuntimeConfig();
const { oidcClientId: client_id } = publicRuntimeConfigSchema.parse(
  runtimeConfig.public
);

export default defineEventHandler(async (event) => {
  if (!oidcConfig) throw new Error("Missing OIDC config");
  const { code } = querySchema.parse(getQuery(event));
  const { origin } = getRequestURL(event);

  const code_verifier = getCookie(event, verifierCookieName);
  if (!code_verifier)
    throw createError({ statusCode: 400, statusMessage: "Missing verifier" });

  const { token_endpoint } = oidcConfig;
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

  const href = getCookie(event, hrefCookieName);
  if (href) return await sendRedirect(event, href);
  return await sendRedirect(event, "/");
});
