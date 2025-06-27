import { createPkcePair } from "./pkce";
import { useCookie } from "#imports";

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
    const text = await response.text();
    console.error(text);
    throw new Error(text);
  }

  return await response.json();
}

export async function getUser(userinfo_endpoint: string, token: string) {
  const response = await fetch(userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  return await response.json();
}

export async function refreshAccessToken(
  token_endpoint: string,
  client_id: string,
  refresh_token: string
) {
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
  if (!response.ok)
    throw new Error(`Error refreshing token ${await response.text()}`);

  return await response.json();
}

export function generateLogoutUrl({
  end_session_endpoint,
  id_token,
}: {
  end_session_endpoint: string;
  id_token: string;
}) {
  const logoutUrl = new URL(end_session_endpoint);

  logoutUrl.searchParams.append("id_token_hint", id_token);

  return logoutUrl.toString();
}
