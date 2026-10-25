import { isExpired, withExpiresAt } from "../utils/expiry";
import { useState, useCookie, navigateTo, useRuntimeConfig, reloadNuxtApp } from "#imports";
import { tokensCookieName, cookieOptions, loginPath } from "../shared/constants";
import { getOidcConfig, requestTokens, type OidcConfig } from "../shared/oidc";
import { parsePublicConfig } from "../shared/config";

export type User = any;

// TODO: consider renaming to just "Tokens"
export type TokenSet = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  expires_at: number;
};

const loginUrl = (redirect: string) =>
  `${loginPath}?redirect=${encodeURIComponent(redirect)}`;

export function useAuth() {
  // NOTE: useState is a Nuxt specific SSR friendly Ref
  // cannot be used outside useAuth() composable

  const oidcConfig = useState<OidcConfig>("oidc:config");
  const tokenSet = useState<TokenSet | undefined>("oidc:tokenSet"); // The set of tokens (access, id, refresh)
  const user = useState<User>("oidc:user");
  const refreshTimeout = useState<ReturnType<typeof setTimeout>>("oidc:refreshTimeout"); // To prevent creating multiple timeouts

  const tokensCookie = useCookie<TokenSet | null>(tokensCookieName, cookieOptions);

  const { authority, client_id } = parsePublicConfig(useRuntimeConfig().public);

  function fetchUser() {
    return $fetch<User>(oidcConfig.value.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokenSet.value!.access_token}` },
    });
  }

  function saveTokenSet(newTokens: Omit<TokenSet, "expires_at">) {
    // Refresh responses may omit the refresh or ID token, so the previous ones are kept
    const merged = withExpiresAt({ ...tokenSet.value, ...newTokens });
    tokenSet.value = merged;
    tokensCookie.value = merged;
    return merged;
  }

  async function refreshAccessToken() {
    const newTokens = await requestTokens(oidcConfig.value.token_endpoint, {
      client_id,
      grant_type: "refresh_token",
      refresh_token: tokenSet.value!.refresh_token,
    });
    return saveTokenSet(newTokens);
  }

  function reset() {
    tokensCookie.value = null;
    reloadNuxtApp();
  }

  function scheduleRefresh() {
    // Making sure multiple timeouts do not run concurrently
    clearTimeout(refreshTimeout.value);
    refreshTimeout.value = setTimeout(async () => {
      try {
        await refreshAccessToken();
        scheduleRefresh();
      } catch (error) {
        console.error(error);
        reset();
      }
    }, tokenSet.value!.expires_at - Date.now());
  }

  function login(redirect = "/") {
    return navigateTo(loginUrl(redirect), { external: true });
  }

  function logout() {
    if (!tokenSet.value || !user.value) return;
    const logoutUrl = new URL(oidcConfig.value.end_session_endpoint);
    logoutUrl.searchParams.append("id_token_hint", tokenSet.value.id_token);
    tokensCookie.value = null;
    return navigateTo(logoutUrl.toString(), { external: true });
  }

  // Returns a URL to which the middleware redirects the user if not logged in
  // because this function itself cannot use navigateTo() when called by the middleware
  async function init(redirect: string) {
    // TODO: find way to have this done once for the whole server at startup
    oidcConfig.value ??= await getOidcConfig(authority);

    // Allow token refresh and user fetching to fail, in which case the app is reloaded
    try {
      // Load tokens from cookies only once, refreshing them if needed
      if (!tokenSet.value) {
        if (!tokensCookie.value) return loginUrl(redirect); // TODO: make enforcing login optional
        tokenSet.value = tokensCookie.value;
        if (isExpired(tokenSet.value.expires_at)) await refreshAccessToken();
      }

      // Refresh timeout to be handled client-side
      if (import.meta.client && !refreshTimeout.value) scheduleRefresh();

      user.value ??= await fetchUser();
    } catch (error) {
      console.error(error);
      reset();
      return loginUrl(redirect);
    }
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
