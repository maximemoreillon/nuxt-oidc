import { makeExpiryDate } from "../misc";

export type Options = {
  client_id: string;
  authority: string;
};

export type OidcConfig = {
  token_endpoint: string;
  authorization_endpoint: string;
  userinfo_endpoint: string;
};

export type User = any;

export function useAuth() {
  const oidcCookie = useCookie("oidc");

  // The stuff at .well-known/openid-configuration
  const oidcConfig = useState<OidcConfig>("config");

  // TODO: this needs a new name
  const token = useState("token");

  const user = useState<User>("user");

  // Unused for now
  const options = useState<Options>("options");

  function saveToken(tokenEndpointData: any) {
    const expires_at = makeExpiryDate(tokenEndpointData.expires_in);

    const tokenDataWithExpiresAt = { ...tokenEndpointData, expires_at };

    token.value = tokenDataWithExpiresAt;
    // Can this use cookies?
    oidcCookie.value = tokenDataWithExpiresAt;
  }

  return {
    token,
    oidcConfig,
    user,
    options,
    saveToken,
  };
}
