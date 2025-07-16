import { useAuth } from "../composables/auth";
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
  generateAuthUrl,
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
});

export default defineNuxtRouteMiddleware(async (to, from) => {
  const {
    tokenSet,
    user,
    oidcConfig,
    options,
    refreshTimeoutExists,

    saveTokenSet,
    loadTokenSet,
  } = useAuth();
  // NOTE: if client only: "Cannot destructure property 'access_token' of 'auth.tokenSet.value' as it is undefined.""

  const url = useRequestURL();
  const runtimeConfig = useRuntimeConfig();

  const {
    oidcAuthority: authority,
    oidcClientId: client_id,
    oidcAudience: audience,
  } = publicRuntimeConfigSchema.parse(runtimeConfig.public);

  // Not strictly needed, but might be useful in the future
  options.value = { authority, client_id, audience };

  // Fetching OIDC configuration, to be done only once
  if (!oidcConfig.value) oidcConfig.value = await getOidcConfig(authority);

  const { authorization_endpoint, token_endpoint, userinfo_endpoint } =
    oidcConfig.value;

  const hrefCookie = useCookie("href");
  const oidcCookie = useCookie(cookieName);
  const verifierCookie = useCookie("verifier");

  // TODO: allow customization
  const redirect_uri = url.origin;

  // Try to load tokens from cookies, to be done only once
  // NOTE: will try to refresh if needed
  try {
    if (!tokenSet.value) await loadTokenSet();

    if (tokenSet.value) {
      // Fetch user info, to be done only once
      if (!user.value)
        user.value = await getUser(
          userinfo_endpoint,
          tokenSet.value.access_token
        );

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

      const href = hrefCookie.value || redirect_uri;
      hrefCookie.value = null;
      // TODO: might need to deal with cases where href is not available

      // NOTE: external: true might be important to properly refresh the page
      return navigateTo(href, { external: true });
    }
  } catch (error) {
    console.error(error);
    oidcCookie.value = null;
    verifierCookie.value = null;
  }

  // If no user info and no code in URL, then the user is not logged in and should be sent to the auth URL

  // Keep track of the page the user wanted to go to originally
  hrefCookie.value = url.href;

  const extraQueryParams: { audience?: string } = {};
  if (audience) extraQueryParams.audience = audience;

  const authUrl = await generateAuthUrl({
    authorization_endpoint,
    client_id,
    redirect_uri,
    extraQueryParams,
  });

  return navigateTo(authUrl, { external: true });
});
