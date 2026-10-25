import { isExpired, withExpiresAt } from "../utils/expiry";
import { useState, useCookie, navigateTo, useRuntimeConfig, reloadNuxtApp } from "#imports";
import { cookieOptions, loginPath } from "../shared/constants";
import { getOidcConfig, requestTokens, splitTokens, type OidcConfig } from "../shared/oidc";
import { parsePublicConfig } from "../shared/config";

export type User = any;

// TODO: consider renaming to just "Tokens"
export type TokenSet = {
  access_token: string;
  refresh_token?: string; // Only with the offline_access scope
  id_token?: string;
  expires_in: number;
  expires_at: number;
};

type AccessCookie = ReturnType<typeof splitTokens>["access"];

const loginUrl = (redirect: string) =>
  `${loginPath}?redirect=${encodeURIComponent(redirect)}`;

export function useAuth() {
  // NOTE: useState is a Nuxt specific SSR friendly Ref
  // cannot be used outside useAuth() composable

  const oidcConfig = useState<OidcConfig>("oidc:config");
  const tokenSet = useState<TokenSet | undefined>("oidc:tokenSet"); // The set of tokens (access, id, refresh)
  const user = useState<User>("oidc:user");
  const refreshTimeout = useState<ReturnType<typeof setTimeout>>("oidc:refreshTimeout"); // To prevent creating multiple timeouts

  const { authority, client_id, cookies } = parsePublicConfig(useRuntimeConfig().public);

  const accessCookie = useCookie<AccessCookie | null>(cookies.access, cookieOptions);
  const refreshTokenCookie = useCookie<string | null>(cookies.refresh, cookieOptions);
  const idTokenCookie = useCookie<string | null>(cookies.id, cookieOptions);

  function readCookies(): TokenSet | undefined {
    if (!accessCookie.value) return;
    return {
      ...accessCookie.value,
      refresh_token: refreshTokenCookie.value ?? undefined,
      id_token: idTokenCookie.value ?? undefined,
    };
  }

  // Clears the cookies when called without tokens
  function writeCookies(tokens?: TokenSet) {
    const split = tokens && splitTokens(tokens);
    accessCookie.value = split?.access ?? null;
    refreshTokenCookie.value = split?.refresh ?? null;
    idTokenCookie.value = split?.id ?? null;
  }

  function fetchUser() {
    return $fetch<User>(oidcConfig.value.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokenSet.value!.access_token}` },
    });
  }

  function saveTokenSet(newTokens: Omit<TokenSet, "expires_at">) {
    // Refresh responses may omit the refresh or ID token, so the previous ones are kept
    const merged = withExpiresAt({ ...tokenSet.value, ...newTokens });
    tokenSet.value = merged;
    writeCookies(merged);
    return merged;
  }

  async function refreshAccessToken() {
    const newTokens = await requestTokens(oidcConfig.value.token_endpoint, {
      client_id,
      grant_type: "refresh_token",
      refresh_token: tokenSet.value!.refresh_token ?? "", // Rejected by the provider if missing
    });
    return saveTokenSet(newTokens);
  }

  function reset() {
    writeCookies();
    reloadNuxtApp();
  }

  // Refresh before expiry, 60 seconds early or halfway through for short-lived tokens
  function getRefreshDelay() {
    const { expires_at, expires_in } = tokenSet.value!;
    return expires_at - Date.now() - Math.min(60, expires_in / 2) * 1000;
  }

  function scheduleRefresh(delay = getRefreshDelay()) {
    // Making sure multiple timeouts do not run concurrently
    clearTimeout(refreshTimeout.value);
    refreshTimeout.value = setTimeout(async () => {
      try {
        await refreshAccessToken();
        scheduleRefresh();
      } catch (error) {
        console.error(error);
        // Only log out when the provider rejected the refresh token, retry otherwise (e.g. network down)
        const { statusCode } = error as { statusCode?: number };
        if (statusCode === 400 || statusCode === 401) reset();
        else scheduleRefresh(10000);
      }
    }, delay);
  }

  function login(redirect = "/") {
    return navigateTo(loginUrl(redirect), { external: true });
  }

  function logout() {
    if (!tokenSet.value || !user.value) return;
    const logoutUrl = new URL(oidcConfig.value.end_session_endpoint);
    const { id_token } = tokenSet.value;
    if (id_token) logoutUrl.searchParams.append("id_token_hint", id_token);
    writeCookies();
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
        tokenSet.value = readCookies();
        if (!tokenSet.value) return loginUrl(redirect); // TODO: make enforcing login optional
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
