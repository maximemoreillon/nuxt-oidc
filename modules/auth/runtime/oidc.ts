export async function getOidcConfig(authority: string) {
  const openIdConfigUrl = `${authority}/.well-known/openid-configuration`;
  const response = await fetch(openIdConfigUrl);
  // TODO: improve
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch (error) {
    console.error(error);
  }
}

export async function getUser(oidcConfig: any, token: string) {
  const { userinfo_endpoint } = oidcConfig;
  const response = await fetch(userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  return await response.json();
}
