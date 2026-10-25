import { defineEventHandler, getQuery, getRequestURL, sendRedirect, setCookie } from "h3";
import { useRuntimeConfig } from "#imports";
import { flowCookieOptions } from "../../../shared/constants";
import { parsePublicConfig } from "../../../shared/config";
import { getRedirectUri } from "../../../shared/oidc";
import { useOidcConfig } from "../../oidcConfig";

// NOTE: PKCE is done server-side because crypto.subtle is unavailable in browsers on plain HTTP
const base64Url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const randomString = () => base64Url(crypto.getRandomValues(new Uint8Array(32)));

export default defineEventHandler(async (event) => {
  const { client_id, audience, scope, cookies } = parsePublicConfig(useRuntimeConfig(event).public);
  const { authorization_endpoint } = await useOidcConfig();

  const verifier = randomString();
  const challenge = base64Url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  );
  const state = randomString();

  setCookie(event, cookies.verifier, verifier, flowCookieOptions);
  setCookie(event, cookies.state, state, flowCookieOptions);

  // Keep track of the page the user wanted to go to originally, only allowing same-origin paths
  const { redirect } = getQuery(event);
  if (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//"))
    setCookie(event, cookies.href, redirect, flowCookieOptions);

  const authUrl = new URL(authorization_endpoint);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", client_id);
  authUrl.searchParams.append("scope", scope);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("code_challenge", challenge);
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("redirect_uri", getRedirectUri(getRequestURL(event).origin));
  if (audience) authUrl.searchParams.append("audience", audience);

  return sendRedirect(event, authUrl.toString());
});
