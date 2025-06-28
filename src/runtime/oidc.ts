import { createPkcePair } from "./pkce";
import { useCookie } from "#imports";

type GenerateAuthUrlArg = {
  authorization_endpoint: string;
  client_id: string;
  redirect_uri: string;
  extraQueryParams?: { [k: string]: string };
};

export async function generateAuthUrl(args: GenerateAuthUrlArg) {
  const { authorization_endpoint, client_id, redirect_uri, extraQueryParams } =
    args;
  const { verifier, challenge } = createPkcePair();

  const authUrl = new URL(authorization_endpoint);

  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", client_id);
  authUrl.searchParams.append("scope", "openid profile");
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("code_challenge", challenge);
  authUrl.searchParams.append("redirect_uri", redirect_uri);

  if (extraQueryParams) {
    Object.keys(extraQueryParams).forEach((key) => {
      authUrl.searchParams.append(key, extraQueryParams[key]);
    });
  }

  useCookie("verifier").value = verifier;

  return authUrl.toString();
}

type RetrieveTokenArg = {
  code: string;
  redirect_uri: string;
  token_endpoint: string;
  client_id: string;
};

export async function retrieveToken(args: RetrieveTokenArg) {
  const { code, redirect_uri, token_endpoint, client_id } = args;
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

export async function getUser(userInfoEndpoint: string, token: string) {
  const response = await fetch(userInfoEndpoint, {
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

export function generateLogoutUrl(args: {
  end_session_endpoint: string;
  id_token: string;
}) {
  const { end_session_endpoint, id_token } = args;
  const logoutUrl = new URL(end_session_endpoint);

  logoutUrl.searchParams.append("id_token_hint", id_token);

  return logoutUrl.toString();
}
