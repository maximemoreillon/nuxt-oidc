export type OidcConfig = {
  token_endpoint: string;
  authorization_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
};

export default async function (authority: string) {
  const openIdConfigUrl = `${authority}/.well-known/openid-configuration`;
  const response = await fetch(openIdConfigUrl);
  if (!response.ok) throw new Error(`Failed to fetch OIDC config`);
  return await response.json();
}
