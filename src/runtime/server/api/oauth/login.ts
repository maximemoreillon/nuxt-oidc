// NOTE: this is currently unused
import { defineEventHandler } from "h3";
import getOidcConfig from "../../../shared/getOidcConfig";
import publicRuntimeConfigSchema from "../../../shared/publicRuntimeConfigSchema";
import { redirectPath, verifierCookieName } from "../../../shared/constants";
import { createPkcePair } from "../../../utils/pkce";

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();

  const { oidcAuthority, oidcClientId, oidcAudience } =
    publicRuntimeConfigSchema.parse(runtimeConfig.public);

  const { authorization_endpoint } = await getOidcConfig(oidcAuthority); // PROBLEM: Will access OIDC provider each time

  const { origin } = getRequestURL(event);
  const redirect_uri = `${origin}${redirectPath}`;

  const { verifier, challenge } = createPkcePair();
  setCookie(event, verifierCookieName, verifier);

  // TODO: make an external function
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
