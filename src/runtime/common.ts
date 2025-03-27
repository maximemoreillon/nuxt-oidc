export async function getOidcConfig(authority: string) {
  const openIdConfigUrl = `${authority}/.well-known/openid-configuration`;
  const response = await fetch(openIdConfigUrl);
  // TODO: improve
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}
