// Should this really be an auth middleware?
import { makeExpiryDate } from "./misc";
import {
  getOidcConfig,
  getUser,
  refreshAccessToken,
  generateAuthUrl,
  retrieveToken,
  createTimeoutForTokenExpiry,
  saveOidcData,
} from "./oidc";
import { useAuth } from "./composables/auth";

// TODO: replace with composable
// let oidcConfig: any;

export default defineNuxtRouteMiddleware(async (to, from) => {
  // for some reason, this runs only once when the user accesses the page and not when clicking NuxtLinks

  console.log("ROUTE MIDDLEWARE HAS RUN");

  const runtimeConfig = useRuntimeConfig();
  const url = useRequestURL();
  const auth = useAuth();

  // Parsing runtime config
  // TODO: consider storing in composable
  const { oidcAuthority: authority, oidcClientId: client_id } =
    runtimeConfig.public;

  const redirect_uri = url.origin;

  // TODO: Maybe this does not need to be a composable actually
  if (!auth.oidcConfig.value)
    auth.oidcConfig.value = await getOidcConfig(authority);

  const { authorization_endpoint, token_endpoint, userinfo_endpoint } =
    auth.oidcConfig.value;

  // TODO: this should probably use the composable
  const oidcCookie = useCookie("oidc");

  const hrefCookie = useCookie("href");

  if (oidcCookie.value) {
    const { access_token, refresh_token } = oidcCookie.value as any;

    const user = await getUser(userinfo_endpoint, access_token);

    if (user) {
      // TODO: Deal with refresh
      createTimeoutForTokenExpiry(token_endpoint, client_id, refresh_token);

      auth.user.value = user;

      return;
    }
  }

  const code = url.searchParams.get("code");

  if (code) {
    const data = await retrieveToken({
      token_endpoint,
      code,
      client_id,
      redirect_uri,
    });

    auth.saveToken(data);

    const href = hrefCookie.value;
    hrefCookie.value = null;
    navigateTo(href, { external: true });
    return;
  }

  hrefCookie.value = url.href;
  const authUrl = await generateAuthUrl({
    authorization_endpoint,
    client_id,
    redirect_uri,
  });

  navigateTo(authUrl, { external: true });
});
