import { makeExpiryDate } from "../misc";
import { useState, useCookie, navigateTo } from "#imports";
import { generateLogoutUrl } from "../oidc";

type Options = {
  client_id: string;
  authority: string;
};

type OidcConfig = {
  token_endpoint: string;
  authorization_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
};

type User = any;

export type TokenSet = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: string;
  expires_at?: string;
};

export function useAuth() {
  const oidcCookie = useCookie("oidc");

  // The stuff at .well-known/openid-configuration
  const oidcConfig = useState<OidcConfig>("config");

  // Maybe cookie only is good enough, but this is nice for the user to get the token
  const tokenSet = useState<TokenSet>("tokenSet");

  const user = useState<User>("user");

  // Might not be needed
  const options = useState<Options>("options");

  function loadTokenSet() {
    const tokenData = oidcCookie.value as TokenSet | undefined | null;
    if (!tokenData) return;
    tokenSet.value = tokenData;
  }

  function saveTokenSet(tokenEndpointData: any) {
    const expires_at = makeExpiryDate(tokenEndpointData.expires_in);
    const tokenDataWithExpiresAt = { ...tokenEndpointData, expires_at };
    tokenSet.value = tokenDataWithExpiresAt;
    oidcCookie.value = tokenDataWithExpiresAt;
  }

  function logout() {
    const { end_session_endpoint } = oidcConfig.value;
    const { id_token } = tokenSet.value;
    const logoutUrl = generateLogoutUrl({ end_session_endpoint, id_token });
    navigateTo(logoutUrl, { external: true });
  }

  return {
    tokenSet,
    oidcConfig,
    user,
    options,
    loadTokenSet,
    saveTokenSet,
    logout,
  };
}
