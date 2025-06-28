import { useAuth } from "../composables/auth";
import { getOidcConfig } from "../common";
import { generateAuthUrl, retrieveToken, getUser } from "../oidc";
import { z } from "zod";
import {
  defineNuxtRouteMiddleware,
  navigateTo,
  useCookie,
  useRequestURL,
  useRuntimeConfig,
} from "#imports";

const publicRuntimeConfigSchema = z.object({
  oidcAuthority: z.string(),
  oidcClientId: z.string(),
  oidcAudience: z.string().optional(),
});

export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();
  if (auth.user.value) return;

  // TODO: consider having this whole code as a function in the composable

  const runtimeConfig = useRuntimeConfig();
  const url = useRequestURL();

  // Parsing runtime config and storing in composable
  const {
    oidcAuthority: authority,
    oidcClientId: client_id,
    oidcAudience: audience,
  } = publicRuntimeConfigSchema.parse(runtimeConfig.public);

  auth.options.value = { client_id, authority };

  const redirect_uri = url.origin;

  // TODO: Maybe this does not need to be a composable actually
  // But it's easier that way
  // Otherwise, could also make everything a composable
  if (!auth.oidcConfig.value)
    auth.oidcConfig.value = await getOidcConfig(authority);

  const { authorization_endpoint, token_endpoint, userinfo_endpoint } =
    auth.oidcConfig.value;

  auth.loadTokenSetFromCookies();

  if (auth.tokenSet.value) {
    const { access_token } = auth.tokenSet.value;

    const user = await getUser(userinfo_endpoint, access_token);

    if (user) {
      // TODO: consider saving user info in session of nuxt-auth-utils

      auth.user.value = user;

      // Until here, kind of OK but this gets sketchy
      auth.createTimeoutForTokenRefresh(
        {
          token_endpoint,
          tokenSetRef: auth.tokenSet,
          client_id: auth.options.value.client_id,
        },
        auth.saveTokenSet
      );

      return;
    }
  }

  const hrefCookie = useCookie("href");

  // If no user info available, maybe the user just got redirected after logging in with the OIDC provider
  // In such case, URL should contain a code to verify
  // TODO: consider having this logic in a dedicated page instead of here
  const code = url.searchParams.get("code");

  if (code) {
    const data = await retrieveToken({
      token_endpoint,
      code,
      client_id: auth.options.value.client_id,
      redirect_uri,
    });

    auth.saveTokenSet(data);

    const href = hrefCookie.value;
    hrefCookie.value = null;
    // TODO: might need to deal with cases where href is not available
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
    client_id: auth.options.value.client_id,
    redirect_uri,
    extraQueryParams,
  });

  navigateTo(authUrl, { external: true });
});
