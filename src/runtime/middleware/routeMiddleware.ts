import { type TokenSet, useAuth } from "../composables/auth";
import { getOidcConfig } from "../common";
import {
  createTimeoutForTokenRefresh,
  generateAuthUrl,
  retrieveToken,
  getUser,
} from "../oidc";
import {
  defineNuxtRouteMiddleware,
  navigateTo,
  useCookie,
  useRequestURL,
  useRuntimeConfig,
} from "#imports";

export default defineNuxtRouteMiddleware(async (to, from) => {
  // for some reason, this runs only once when the user accesses the page and not when clicking NuxtLinks

  const runtimeConfig = useRuntimeConfig();
  const url = useRequestURL();
  const auth = useAuth();

  // Parsing runtime config and storing in composable
  const { oidcAuthority: authority, oidcClientId: client_id } =
    runtimeConfig.public;

  if (!authority || !client_id) {
    console.error("Missing oidcAuthority or oidcClientId in runtimeConfig");
    return;
  }

  auth.options.value = { client_id, authority } as any;

  const redirect_uri = url.origin;

  // TODO: Maybe this does not need to be a composable actually
  // But it's easier that way
  if (!auth.oidcConfig.value)
    auth.oidcConfig.value = await getOidcConfig(auth.options.value.authority);

  const { authorization_endpoint, token_endpoint, userinfo_endpoint } =
    auth.oidcConfig.value;

  auth.loadTokenSet();

  const hrefCookie = useCookie("href");

  if (auth.tokenSet.value) {
    const { access_token } = auth.tokenSet.value;

    const user = await getUser(userinfo_endpoint, access_token);

    if (user) {
      auth.user.value = user;

      createTimeoutForTokenRefresh(
        {
          token_endpoint,
          tokenSet: auth.tokenSet.value,
          client_id: auth.options.value.client_id,
        },
        auth.saveTokenSet
      );

      return;
    }
  }

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
    navigateTo(href, { external: true });
    return;
  }

  hrefCookie.value = url.href;
  const authUrl = await generateAuthUrl({
    authorization_endpoint,
    client_id: auth.options.value.client_id,
    redirect_uri,
  });

  navigateTo(authUrl, { external: true });
});
