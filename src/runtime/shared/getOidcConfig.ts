export default async function (authority: string) {
  const openIdConfigUrl = `${authority}/.well-known/openid-configuration`;
  const response = await fetch(openIdConfigUrl);
  if (!response.ok) throw new Error(`Failed to fetch OIDC config`);
  return await response.json();
}
