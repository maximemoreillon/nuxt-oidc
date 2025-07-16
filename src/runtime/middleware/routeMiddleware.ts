import { useAuth, type TokenSet } from "../composables/auth";
import { z } from "zod";
import getOidcConfig from "../shared/getOidcConfig";
import {
  defineNuxtRouteMiddleware,
  navigateTo,
  useCookie,
  useRequestURL,
  useRuntimeConfig,
} from "#imports";
import {
  createTimeoutForTokenRefresh,
  getUser,
  refreshAccessToken,
  retrieveToken,
} from "../oidc";
import { isExpired } from "../misc";
import { cookieName } from "../shared/constants";

const publicRuntimeConfigSchema = z.object({
  oidcAuthority: z.string(),
  oidcClientId: z.string(),
  oidcAudience: z.string().optional(),
  oidcRedirectUri: z.string().optional(),
});

export default defineNuxtRouteMiddleware(async (to, from) => {
  // NOTE: if client only: "Cannot destructure property 'access_token' of 'auth.tokenSet.value' as it is undefined.""

  const {
    tokenSet,
    user,
    oidcConfig,
    options,
    refreshTimeoutExists,

    saveTokenSet,
    login,
  } = useAuth();

  const url = useRequestURL();
  const runtimeConfig = useRuntimeConfig();

  const {
    oidcAuthority: authority,
    oidcClientId: client_id,
    oidcAudience: audience,
    oidcRedirectUri: redirect_uri = url.origin,
  } = publicRuntimeConfigSchema.parse(runtimeConfig.public);

  // Not strictly needed, but might be useful in the future
  options.value = { authority, client_id, audience, redirect_uri };

  // Fetching OIDC configuration, to be done only once
  if (!oidcConfig.value) oidcConfig.value = await getOidcConfig(authority);

  const { token_endpoint, userinfo_endpoint } = oidcConfig.value;

  const oidcCookie = useCookie<TokenSet | null>(cookieName);
  const hrefCookie = useCookie<string | null>("href");
  const verifierCookie = useCookie<string | null>("verifier");

  try {
    // Try to load tokens from cookies, to be done only once
    if (!tokenSet.value) {
      if (oidcCookie.value) tokenSet.value = oidcCookie.value;

      // Perform an initial refresh of the token if needed
      if (tokenSet.value?.expires_at && isExpired(tokenSet.value.expires_at)) {
        const { refresh_token } = tokenSet.value;
        const newTokenSet = await refreshAccessToken({
          token_endpoint,
          client_id,
          refresh_token,
        });
        saveTokenSet(newTokenSet);
      }
    }

    // If tokens available from cookies, create timeout for refresh and fetch user info
    if (tokenSet.value) {
      // Create timeout for token refresh, to be done on the client and only once
      if (!import.meta.server && !refreshTimeoutExists.value) {
        refreshTimeoutExists.value = !!createTimeoutForTokenRefresh(
          {
            token_endpoint,
            tokenSetRef: tokenSet,
            client_id,
          },
          saveTokenSet
        );
      }

      // Fetch user info, to be done only once
      if (!user.value)
        user.value = await getUser(
          userinfo_endpoint,
          tokenSet.value.access_token
        );

      // If user info available at this point, nothing more to be done
      if (user.value) return;
    }

    // If no user info available, user might just haven gotten redirected here after logging in with the OIDC provider
    // In such case, URL should contain a code to verify
    const code = url.searchParams.get("code");

    // TODO: only check for code when on the redirect uri
    // TODO: consider handling this only on a /callback route
    // TODO: consider having this logic in a dedicated page instead of here
    if (code) {
      const data = await retrieveToken({
        token_endpoint,
        code,
        client_id,
        redirect_uri,
      });

      saveTokenSet(data);

      // Navigate the user to wherever they wanted to go originally
      const href = hrefCookie.value || redirect_uri;
      hrefCookie.value = null;

      // NOTE: `external: true` important to properly refresh the page
      return navigateTo(href, { external: true });
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
  return login();
});
