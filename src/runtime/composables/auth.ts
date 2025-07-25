import { isExpired, makeExpiryDate } from "../utils/expiry";
import {
  useState,
  useCookie,
  navigateTo,
  useRuntimeConfig,
  useRequestURL,
} from "#imports";
import { cookieName } from "../shared/constants";
import { createPkcePair } from "../utils/pkce";
import getOidcConfig from "../shared/getOidcConfig";
import publicRuntimeConfigSchema from "../shared/publicRuntimeConfigSchema";
import type { CookieOptions } from "#app";

export type OidcConfig = {
  token_endpoint: string;
  authorization_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
};

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

  const oidcCookie = useCookie<TokenSet | null>(cookieName, {
    maxAge: 31536000,
  });
  const hrefCookie = useCookie<string | null>("href");
  const verifierCookie = useCookie<string | null>("verifier");

  const runtimeConfig = useRuntimeConfig();
  const url = useRequestURL();

  function saveTokenSet(newTokenSet: TokenSet) {
    // For internal use only, should not be used by the user
    // Is here and not in a different file because accessing the tokenSet Ref
    const expires_at = makeExpiryDate(newTokenSet.expires_in);
    const tokenDataWithExpiresAt = { ...newTokenSet, expires_at };
    tokenSet.value = tokenDataWithExpiresAt;
    oidcCookie.value = tokenDataWithExpiresAt;
  }

  function generateAuthUrl() {
    const { authorization_endpoint } = oidcConfig.value;

    const { client_id, redirect_uri, audience } = parseRuntimeConfig();

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

  async function retrieveToken(code: string) {
    const { token_endpoint } = oidcConfig.value;
    const { client_id, redirect_uri } = parseRuntimeConfig();

    const code_verifier = verifierCookie.value;
    if (!code_verifier) throw new Error("Missing verifier");

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

    verifierCookie.value = null;

    if (!response.ok) {
      const text = await response.text();
      console.error(text);
      throw new Error(text);
    }

    return await response.json();
  }

  async function getUser() {
    const { access_token } = tokenSet.value;
    const { userinfo_endpoint } = oidcConfig.value;
    const init: RequestInit = {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    };
    const response = await fetch(userinfo_endpoint, init);

    if (!response.ok)
      throw new Error(`Error fetching user ${await response.text()}`);
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
    if (!response.ok)
      throw new Error(`Error refreshing token ${await response.text()}`);

    return await response.json();
  }

  function createTimeoutForTokenRefresh(callback: Function) {
    const { expires_at } = tokenSet.value;
    if (!expires_at) throw new Error("No expires_at in tokenSet");

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
      oidcRedirectUri: redirect_uri = url.origin,
    } = publicRuntimeConfigSchema.parse(runtimeConfig.public);

    return { authority, client_id, audience, redirect_uri };
  }

  async function init() {
    // This returns a URL to which the middleware redirects the user to
    // because this function itself cannot use navigateTo() when called by the middleware

    // Fetching OIDC configuration, to be done only once
    if (!oidcConfig.value) {
      const { authority } = parseRuntimeConfig();
      oidcConfig.value = await getOidcConfig(authority);
    }

    try {
      // Try to load tokens from cookies, to be done only once
      if (!tokenSet.value) {
        if (oidcCookie.value) tokenSet.value = oidcCookie.value;
      }

      // If tokens available from cookies, create timeout for refresh and fetch user info
      if (tokenSet.value) {
        // Refresh to be handled client-side
        if (!import.meta.server) {
          // Refresh access token if needed
          const { expires_at } = tokenSet.value;
          if (expires_at && isExpired(expires_at)) {
            console.log("Token was expired, refreshing");
            const newTokenSet = await refreshAccessToken();
            saveTokenSet(newTokenSet);
            refreshTimeout.value = createTimeoutForTokenRefresh(saveTokenSet);
          }

          // Create timeout for token refresh, to be done on the client and only once
          if (!refreshTimeout.value)
            refreshTimeout.value = createTimeoutForTokenRefresh(saveTokenSet);
        }

        // Fetch user info, to be done only once
        if (!user.value) user.value = await getUser();

        // If user info available at this point, nothing more to be done
        if (user.value) return;
      }

      // If no user info available, user might just haven gotten redirected here after logging in with the OIDC provider
      // In such case, URL should contain a code to verify
      const code = url.searchParams.get("code");

      // TODO: only check for code when on the redirect uri
      if (code) {
        const tokens = await retrieveToken(code);
        saveTokenSet(tokens);

        // Navigate the user to wherever they wanted to go originally
        const href = hrefCookie.value || parseRuntimeConfig().redirect_uri;
        hrefCookie.value = null;

        // Get the middleware to navigate to href
        return href;
      }
    } catch (error) {
      console.error(error);
      // In case of error, clear most cookies
      oidcCookie.value = null;
      verifierCookie.value = null;
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

    init, // passed to the middleware
  };
}
