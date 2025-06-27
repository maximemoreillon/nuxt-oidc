import { makeExpiryDate } from "../misc";
import { useState, useCookie, navigateTo, type Ref } from "#imports";
import { generateLogoutUrl, refreshAccessToken } from "../oidc";

type Options = {
  client_id: string;
  authority: string;
};

type OidcConfig = {
  token_endpoint: string;
  authorization_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
};

type User = any;

export type TokenSet = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: string;
  expires_at?: string;
};

export function useAuth() {
  const oidcCookie = useCookie("oidc");

  // The stuff at .well-known/openid-configuration
  const oidcConfig = useState<OidcConfig>("config");

  // Maybe cookie only is good enough, but this is nice for the user to get the token
  const tokenSet = useState<TokenSet>("tokenSet");

  const user = useState<User>("user");

  // Might not be needed
  const options = useState<Options>("options");

  function loadTokenSet() {
    const tokenData = oidcCookie.value as TokenSet | undefined | null;
    if (!tokenData) return;
    tokenSet.value = tokenData;
  }

  function saveTokenSet(tokenEndpointData: any) {
    const expires_at = makeExpiryDate(tokenEndpointData.expires_in);
    const tokenDataWithExpiresAt = { ...tokenEndpointData, expires_at };
    tokenSet.value = tokenDataWithExpiresAt;
    oidcCookie.value = tokenDataWithExpiresAt;
  }

  function saveUser(u: User) {
    user.value = u;

    // TODO: createTimeout here?
  }

  function createTimeoutForTokenRefresh(
    {
      token_endpoint,
      client_id,
      tokenSetRef,
    }: {
      token_endpoint: string;
      client_id: string;
      tokenSetRef: Ref;
    },
    cb: Function
  ) {
    // Prevent execution on server
    if (import.meta.server) return;

    // This function is tricky because it cannot use useAuth or useCookie as those cannot be used in the setTimeout Callback
    // Hence passing token_endpoint, client_id and tokenSetRef as arguments

    const { expires_at } = tokenSetRef.value;
    if (!expires_at) {
      console.error("No expires_at in tokenSet");
      return;
    }

    const expiryDate = new Date(tokenSetRef.value.expires_at);
    const timeLeft = expiryDate.getTime() - Date.now();
    // const timeLeft = 5000;

    // Passing tokenSetRef because it is a ref and it will be updated in the callback
    setTimeout(async () => {
      const data = await refreshAccessToken(
        token_endpoint,
        client_id,
        tokenSetRef.value.refresh_token
      );

      cb(data);

      createTimeoutForTokenRefresh(
        {
          token_endpoint,
          client_id,
          tokenSetRef,
        },
        cb
      );
    }, timeLeft);
  }

  function logout() {
    const { end_session_endpoint } = oidcConfig.value;
    const { id_token } = tokenSet.value;
    const logoutUrl = generateLogoutUrl({ end_session_endpoint, id_token });
    navigateTo(logoutUrl, { external: true });
  }

  return {
    tokenSet,
    oidcConfig,
    user,
    options,
    loadTokenSet,
    saveTokenSet,
    logout,
    saveUser,
    createTimeoutForTokenRefresh,
  };
}
