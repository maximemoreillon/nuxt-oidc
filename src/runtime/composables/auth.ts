import { makeExpiryDate } from "../misc";
import { useState, useCookie, navigateTo } from "#imports";
import { generateLogoutUrl } from "../oidc";
import { cookieName } from "../shared/constants";

type OidcConfig = {
  token_endpoint: string;
  authorization_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
};

type User = any;

// TODO: consider renaming Tokens
export type TokenSet = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: string;
  expires_at?: string | Date;
};

export function useAuth() {
  const oidcCookie = useCookie<TokenSet>(cookieName);

  // NOTE: useState statements cannot be used outside useAuth()

  // The stuff at .well-known/openid-configuration
  const oidcConfig = useState<OidcConfig>("config");

  // TODO: consider renaming to "tokens"
  const tokenSet = useState<TokenSet>("tokenSet");

  const user = useState<User>("user");

  const refreshTimeoutExists = useState<boolean>(
    "refreshTimeoutExists",
    () => false
  );

  function saveTokenSet(tokenEndpointData: TokenSet) {
    const expires_at = makeExpiryDate(tokenEndpointData.expires_in);
    const tokenDataWithExpiresAt = { ...tokenEndpointData, expires_at };
    tokenSet.value = tokenDataWithExpiresAt;
    oidcCookie.value = tokenDataWithExpiresAt;
  }

  function loadTokenSet() {
    if (!oidcCookie?.value) return;
    tokenSet.value = oidcCookie.value;
  }

  function logout() {
    if (!tokenSet.value || !user.value) return;
    const { end_session_endpoint } = oidcConfig.value;
    const { id_token } = tokenSet.value;
    const logoutUrl = generateLogoutUrl({ end_session_endpoint, id_token });
    navigateTo(logoutUrl, { external: true });
  }

  return {
    tokenSet,
    oidcConfig,
    user,

    // Not really useful to the user
    refreshTimeoutExists,

    logout,

    // Not really useful to the user
    saveTokenSet,
    loadTokenSet,
  };
}
