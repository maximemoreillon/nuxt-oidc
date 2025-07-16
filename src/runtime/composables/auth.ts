import { isExpired, makeExpiryDate } from "../misc";
import { useState, useCookie, navigateTo } from "#imports";
import {
  generateAuthUrl,
  generateLogoutUrl,
  refreshAccessToken,
} from "../oidc";
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

export type Options = {
  authority: string;
  client_id: string;
  audience?: string;
  redirect_uri: string;
};

export function useAuth() {
  const oidcCookie = useCookie<TokenSet>(cookieName);

  // NOTE: useState is a Nuxt specific SSR friendly Ref
  // cannot be used outside useAuth()

  // The stuff at .well-known/openid-configuration
  const oidcConfig = useState<OidcConfig>("config");

  // TODO: consider renaming to "tokens"
  const tokenSet = useState<TokenSet>("tokenSet");

  const user = useState<User>("user");

  // Not necessary but useful
  const options = useState<Options>("options");

  const refreshTimeoutExists = useState<boolean>("refreshTimeoutExists");

  // TODO: check if can be taken out of the composable
  function saveTokenSet(tokenEndpointData: TokenSet) {
    const expires_at = makeExpiryDate(tokenEndpointData.expires_in);
    const tokenDataWithExpiresAt = { ...tokenEndpointData, expires_at };
    tokenSet.value = tokenDataWithExpiresAt;
    oidcCookie.value = tokenDataWithExpiresAt;
  }

  // TODO: check if can be taken out of the composable
  async function loadTokenSet() {
    if (!oidcCookie?.value) return;

    tokenSet.value = oidcCookie.value;
    // Refresh if needed
    if (tokenSet.value?.expires_at && isExpired(tokenSet.value.expires_at)) {
      const data = await refreshAccessToken(
        oidcConfig.value.token_endpoint,
        options.value.client_id,
        tokenSet.value.refresh_token
      );
      saveTokenSet(data);
    }
  }

  async function login() {
    const { audience, client_id, redirect_uri } = options.value;
    const { authorization_endpoint } = oidcConfig.value;
    const extraQueryParams: { audience?: string } = {};
    if (audience) extraQueryParams.audience = audience;

    const authUrl = generateAuthUrl({
      authorization_endpoint,
      client_id,
      redirect_uri,
      extraQueryParams,
    });

    return navigateTo(authUrl, { external: true });
  }

  function logout() {
    if (!tokenSet.value || !user.value) return;
    const { end_session_endpoint } = oidcConfig.value;
    const { id_token } = tokenSet.value;
    const logoutUrl = generateLogoutUrl({ end_session_endpoint, id_token });
    return navigateTo(logoutUrl, { external: true });
  }

  return {
    tokenSet,
    oidcConfig,
    user,

    // Not really useful to the user
    options,

    // Not really useful to the user
    refreshTimeoutExists,

    login,
    logout,

    // Not really useful to the user
    saveTokenSet,
    loadTokenSet,
  };
}
