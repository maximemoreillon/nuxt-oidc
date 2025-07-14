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
  retrieveToken,
} from "../oidc";

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

  if (!oidcConfig.value) oidcConfig.value = await getOidcConfig(authority);

  const { authorization_endpoint, token_endpoint, userinfo_endpoint } =
    oidcConfig.value;

  if (!tokenSet.value) loadTokenSet();

  if (tokenSet.value) {
    if (!user.value)
      user.value = await getUser(
        userinfo_endpoint,
        tokenSet.value.access_token
      );

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

    if (user.value) return;
  }

  // If no user info available, maybe the user just got redirected after logging in with the OIDC provider
  // In such case, URL should contain a code to verify
  // TODO: consider handling this only on a /callback route
  // TODO: consider having this logic in a dedicated page instead of here

  const hrefCookie = useCookie("href");

  const redirect_uri = url.origin;
  const code = url.searchParams.get("code");

  if (code) {
    const data = await retrieveToken({
      token_endpoint,
      code,
      client_id,
      redirect_uri,
    });

    saveTokenSet(data);

    const href = hrefCookie.value;
    hrefCookie.value = null;
    // TODO: might need to deal with cases where href is not available

    // NOTE: external: true might be important to properly refresh the page
    navigateTo(href, { external: true });
    return;
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

  navigateTo(authUrl, { external: true });
});
