import { makeExpiryDate } from "./misc";
import { createPkcePair } from "./pkce";

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

export async function generateAuthUrl({
  authorization_endpoint,
  client_id,
  redirect_uri,
}: {
  authorization_endpoint: string;
  client_id: string;
  redirect_uri: string;
}) {
  const { verifier, challenge } = createPkcePair();

  const authUrl = new URL(authorization_endpoint);

  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", client_id);
  authUrl.searchParams.append("scope", "openid profile");
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("code_challenge", challenge);
  authUrl.searchParams.append("redirect_uri", redirect_uri);

  // TODO: address this
  // if (extraQueryParams !== undefined) {
  //   Object.keys(extraQueryParams).forEach((key) => {
  //     authUrl.searchParams.append(key, extraQueryParams[key]);
  //   });
  // }

  useCookie("verifier").value = verifier;

  return authUrl.toString();
}

export async function retrieveToken({
  code,
  redirect_uri,
  token_endpoint,
  client_id,
}: {
  code: string;
  redirect_uri: string;
  token_endpoint: string;
  client_id: string;
}) {
  const verifierCookie = useCookie("verifier");
  const code_verifier = verifierCookie.value;
  if (!code_verifier) throw new Error("Missing verifier");

  const body = new URLSearchParams({
    code,
    code_verifier,
    redirect_uri,
    client_id,
    grant_type: "authorization_code",
  });

  const options: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  };

  const response = await fetch(token_endpoint, options);

  verifierCookie.value = null;

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.json();
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

export async function refreshAccessToken(
  oidcConfig: any,
  client_id: string,
  refresh_token: string
) {
  const { token_endpoint } = oidcConfig;
  const body = new URLSearchParams({
    client_id,
    grant_type: "refresh_token",
    refresh_token,
  });

  const options: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  };

  const response = await fetch(token_endpoint, options);
  if (!response.ok) throw new Error("Error refreshing token");

  return await response.json();
}

export function createTimeoutForTokenExpiry(
  oidcConfig: any,
  client_id: string,
  refresh_token: string
) {
  // This does not work yet
  const oidcCookie = useCookie("oidc");

  const { expires_at } = oidcCookie.value as any;

  if (!expires_at) throw new Error("Missing expires_at field in OIDC cookie");

  const expiryDate = new Date(expires_at);
  const timeLeft = 3000; //expiryDate.getTime() - Date.now();

  // Does not work
  setTimeout(async () => {
    const data = await refreshAccessToken(oidcConfig, client_id, refresh_token);
    saveOidcData(data);
    // TODO: set new Timeout
    console.log("refreshed");
  }, timeLeft);
}

export function saveOidcData(data: any) {
  console.log("Saving data");
  useCookie("oidc").value = {
    ...data,
    expires_at: makeExpiryDate(data.expires_in),
  };
  console.log("Cookie saved");
}
