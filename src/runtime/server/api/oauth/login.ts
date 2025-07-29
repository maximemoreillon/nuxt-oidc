// NOTE: this handler is currently unused
import { defineEventHandler } from "h3";
import publicRuntimeConfigSchema from "../../../shared/publicRuntimeConfigSchema";
import { redirectPath, verifierCookieName } from "../../../shared/constants";
import { createPkcePair } from "../../../utils/pkce";
import { oidcConfig } from "../../oidcConfig";
import { useRuntimeConfig } from "#imports";

const runtimeConfig = useRuntimeConfig();
const { oidcClientId, oidcAudience } = publicRuntimeConfigSchema.parse(
  runtimeConfig.public
);

export default defineEventHandler(async (event) => {
  // Fetching OIDC config only once

  if (!oidcConfig) throw new Error("Missing OIDC config");

  const { authorization_endpoint } = oidcConfig;
  const { origin } = getRequestURL(event);
  const redirect_uri = `${origin}${redirectPath}`;

  const { verifier, challenge } = createPkcePair();
  setCookie(event, verifierCookieName, verifier);

  const authUrl = new URL(authorization_endpoint);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", oidcClientId);
  authUrl.searchParams.append("scope", "openid profile offline_access"); // TODO: customizable
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("code_challenge", challenge);
  authUrl.searchParams.append("redirect_uri", redirect_uri);
  if (oidcAudience) authUrl.searchParams.append("audience", oidcAudience);

  return await sendRedirect(event, authUrl.toString());
});
