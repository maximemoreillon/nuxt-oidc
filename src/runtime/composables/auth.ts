import { getTokensWithExpiresAt, isExpired } from "../utils/expiry";
import {
  useState,
  useCookie,
  navigateTo,
  useRuntimeConfig,
  useRequestURL,
} from "#imports";
import {
  tokensCookieName,
  redirectPath,
  verifierCookieName,
  cookieOptions,
  hrefCookieName,
} from "../shared/constants";
import { createPkcePair } from "../utils/pkce";
import getOidcConfig, { type OidcConfig } from "../shared/getOidcConfig";
import publicRuntimeConfigSchema from "../shared/publicRuntimeConfigSchema";

export type User = any;

// TODO: consider renaming to just "Tokens"
export type TokenSet = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: string;
  expires_at?: string | Date;
};

export function useAuth() {
  // NOTE: useState is a Nuxt specific SSR friendly Ref
  // cannot be used outside useAuth() composable

  const oidcConfig = useState<OidcConfig>("config"); // The stuff at .well-known/openid-configuration
  const tokenSet = useState<TokenSet>("tokenSet"); // The set of tokens (access, id, refresh)
  const user = useState<User>("user");
  const refreshTimeout = useState<NodeJS.Timeout>("refreshTimeout"); // To prevent creating multiple timeouts

  const hrefCookie = useCookie<string | null>(hrefCookieName);
  const verifierCookie = useCookie<string | null>(verifierCookieName);
  const tokensCookie = useCookie<TokenSet | null>(
    tokensCookieName,
    cookieOptions
  );

  const runtimeConfig = useRuntimeConfig();
  const url = useRequestURL();
  const redirect_uri = `${url.origin}${redirectPath}`;

  function generateAuthUrl() {
    const { authorization_endpoint } = oidcConfig.value;

    const { client_id, audience } = parseRuntimeConfig();

    const { verifier, challenge } = createPkcePair();

    const authUrl = new URL(authorization_endpoint);

    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", client_id);
    authUrl.searchParams.append("scope", "openid profile offline_access"); // TODO: customizable
    authUrl.searchParams.append("code_challenge_method", "S256");
    authUrl.searchParams.append("code_challenge", challenge);
    authUrl.searchParams.append("redirect_uri", redirect_uri);

    // TODO: allow for more than just audience
    if (audience) authUrl.searchParams.append("audience", audience);
    // if (extraQueryParams) {
    //   Object.keys(extraQueryParams).forEach((key) => {
    //     authUrl.searchParams.append(key, extraQueryParams[key]);
    //   });
    // }

    verifierCookie.value = verifier;

    return authUrl.toString();
  }

  async function fetchUser() {
    const { access_token } = tokenSet.value;
    const { userinfo_endpoint } = oidcConfig.value;
    const init: RequestInit = {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    };
    const response = await fetch(userinfo_endpoint, init);

    if (!response.ok) {
      tokensCookie.value = null;
      throw new Error(`Error fetching user ${await response.text()}`);
    }
    return await response.json();
  }

  async function refreshAccessToken() {
    const { token_endpoint } = oidcConfig.value;
    const { client_id } = parseRuntimeConfig();
    const { refresh_token } = tokenSet.value;

    const body = new URLSearchParams({
      client_id,
      grant_type: "refresh_token",
      refresh_token,
    });

    const init: RequestInit = {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    };

    const response = await fetch(token_endpoint, init);

    // TODO: reset everything and send user to login
    if (!response.ok)
      throw new Error(`Error refreshing token ${await response.text()}`);

    return await response.json();
  }

  function saveTokenSet(newTokenSet: TokenSet) {
    // Used as refresh timeout callback
    const tokenDataWithExpiresAt = getTokensWithExpiresAt(newTokenSet);
    tokenSet.value = tokenDataWithExpiresAt;
    tokensCookie.value = tokenDataWithExpiresAt;
  }

  function reset() {
    tokensCookie.value = null;
    reloadNuxtApp();
  }

  function createTimeoutForTokenRefresh(callback: Function) {
    const { expires_at } = tokenSet.value;
    if (!expires_at) {
      throw new Error("No expires_at in tokenSet");
    }

    const expiryDate = new Date(expires_at);
    const timeLeft = expiryDate.getTime() - Date.now();
    // const timeLeft = 10000; // For testing

    // Making sure multiple timeouts do not run concurrently
    if (refreshTimeout.value) clearTimeout(refreshTimeout.value);
    return setTimeout(async () => {
      const newTokenSet = await refreshAccessToken();

      callback(newTokenSet);

      createTimeoutForTokenRefresh(callback);
    }, timeLeft);
  }

  function generateLogoutUrl() {
    const { id_token } = tokenSet.value;
    const { end_session_endpoint } = oidcConfig.value;
    const logoutUrl = new URL(end_session_endpoint);

    logoutUrl.searchParams.append("id_token_hint", id_token);

    return logoutUrl.toString();
  }

  async function login() {
    const authUrl = generateAuthUrl();
    return navigateTo(authUrl, { external: true });
  }

  function logout() {
    if (!tokenSet.value || !user.value) return;
    const logoutUrl = generateLogoutUrl();
    return navigateTo(logoutUrl, { external: true });
  }

  function parseRuntimeConfig() {
    const {
      oidcAuthority: authority,
      oidcClientId: client_id,
      oidcAudience: audience,
    } = publicRuntimeConfigSchema.parse(runtimeConfig.public);

    return { authority, client_id, audience };
  }

  async function init() {
    // This returns a URL to which the middleware redirects the user to
    // because this function itself cannot use navigateTo() when called by the middleware

    // Fetching OIDC configuration, to be done only once
    // TODO: find way to have this done once for the whole server at startup
    if (!oidcConfig.value) {
      const { authority } = parseRuntimeConfig();
      oidcConfig.value = await getOidcConfig(authority);
    }

    // Allow token refresh and user fetching to fail, in which case the app is reloaded
    try {
      // Try to load tokens from cookies, to be done only once
      if (!tokenSet.value) {
        if (tokensCookie.value) {
          tokenSet.value = tokensCookie.value;

          // Initial refresh of the access token if needed
          const { expires_at } = tokenSet.value;
          if (expires_at && isExpired(expires_at)) {
            console.info("Token was expired, refreshing");
            const newTokenSet = await refreshAccessToken();
            saveTokenSet(newTokenSet);
          }
        }
      }

      // If tokens available from cookies, create timeout for refresh and fetch user info
      if (tokenSet.value) {
        // Refresh timeout to be handled client-side
        if (!import.meta.server) {
          // Create timeout for token refresh, to be done on the client and only once
          if (!refreshTimeout.value)
            refreshTimeout.value = createTimeoutForTokenRefresh(saveTokenSet);
        }

        // Fetch user info, to be done only once
        if (!user.value) user.value = await fetchUser();

        // If user info available at this point, nothing more to be done
        if (user.value) return;
      }
    } catch (error) {
      console.error(error);
      reset();
    }

    // If no user info and no code in URL, then the user is not logged in and should be sent to the auth URL

    // Keep track of the page the user wanted to go to originally
    hrefCookie.value = url.href;

    // TODO: make enforcing login optional
    return generateAuthUrl();
  }

  return {
    tokenSet,
    oidcConfig,
    user,

    login,
    logout,
    refreshAccessToken,

    init, // For the middleware
  };
}
