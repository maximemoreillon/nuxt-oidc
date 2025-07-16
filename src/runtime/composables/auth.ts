import { makeExpiryDate } from "../misc";
import { useState, useCookie, navigateTo } from "#imports";
import { generateAuthUrl, generateLogoutUrl } from "../oidc";
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
  // NOTE: useState is a Nuxt specific SSR friendly Ref
  // cannot be used outside useAuth()

  const oidcConfig = useState<OidcConfig>("config"); // The stuff at .well-known/openid-configuration
  const tokenSet = useState<TokenSet>("tokenSet"); // The set of tokens (access, id, refresh)
  const user = useState<User>("user");
  const refreshTimeoutExists = useState<boolean>("refreshTimeoutExists"); // To prevent creating multiple timeouts
  const options = useState<Options>("options"); // TODO: Not necessary but used in login

  const oidcCookie = useCookie<TokenSet>(cookieName);

  function saveTokenSet(newTokenSet: TokenSet) {
    // For internal use only, should not be used by the user
    // Is here and not in a different file because accessing the tokenSet Ref
    const expires_at = makeExpiryDate(newTokenSet.expires_in);
    const tokenDataWithExpiresAt = { ...newTokenSet, expires_at };
    tokenSet.value = tokenDataWithExpiresAt;
    oidcCookie.value = tokenDataWithExpiresAt;
  }

  async function login() {
    // This is just a wrapper around generateAuthUrl
    // TODO: Could think of just using useRuntimeConfig() here but redirect_uri needs to match
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

    options, // Not really useful to the user

    refreshTimeoutExists, // Not really useful to the user

    login,
    logout,

    saveTokenSet, // Not really useful to the user
  };
}
