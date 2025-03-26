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

  const redirect_uri = url.origin;

  const { oidcAuthority: authority, oidcClientId: client_id } =
    runtimeConfig.public;

  //  This would work
  if (!auth.oidcConfig.value)
    auth.oidcConfig.value = await getOidcConfig(authority);

  const { authorization_endpoint, token_endpoint } = auth.oidcConfig.value;

  const oidcCookie = useCookie("oidc");
  const hrefCookie = useCookie("href");

  if (oidcCookie.value) {
    const { access_token, refresh_token } = oidcCookie.value as any;
    const user = await getUser(oidcConfig, access_token);

    if (user) {
      // TODO: Deal with refresh
      // createTimeoutForTokenExpiry(oidcConfig, client_id, refresh_token);
      // Reaching this point means the user can access the app

      // TODO: This is just a test
      const auth = useAuth();
      auth.oidcAuthData.value = { user, access_token, refresh_token };
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

    saveOidcData(data); // THis works

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
