import type { TokenSet } from "../composables/auth";
import { redirectPath } from "./constants";

// The stuff at .well-known/openid-configuration
export type OidcConfig = {
  issuer: string;
  token_endpoint: string;
  authorization_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
};

export const getOidcConfig = (authority: string) =>
  $fetch<OidcConfig>(`${authority}/.well-known/openid-configuration`);

export const getRedirectUri = (origin: string) => `${origin}${redirectPath}`;

// Used for both the authorization code exchange and token refresh
export const requestTokens = (
  token_endpoint: string,
  params: Record<string, string>
) =>
  $fetch<Omit<TokenSet, "expires_at">>(token_endpoint, {
    method: "POST",
    body: new URLSearchParams(params),
  });
