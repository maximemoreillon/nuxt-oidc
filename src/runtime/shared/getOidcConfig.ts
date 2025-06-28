export default async function (authority: string) {
  const openIdConfigUrl = `${authority}/.well-known/openid-configuration`;
  const response = await fetch(openIdConfigUrl);
  // TODO: improve
  if (!response.ok) {
    console.error(`Failed to fetch OIDC config`);
    return null;
  }
  try {
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}
