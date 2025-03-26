import { createPkcePair } from "./pkce";
import { getOidcConfig } from "./oidc";

async function generateAuthUrl({
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

async function retrieveToken({
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

let oidcConfig: any;

export default defineNuxtRouteMiddleware(async (to, from) => {
  const runtimeConfig = useRuntimeConfig();

  const url = useRequestURL();
  const redirect_uri = url.origin;

  const { oidcAuthority: authority, oidcClientId: client_id } =
    runtimeConfig.public;

  if (!oidcConfig) oidcConfig = await getOidcConfig(authority);

  const { authorization_endpoint, token_endpoint } = oidcConfig;

  const oidcCookie = useCookie("oidc");
  const hrefCookie = useCookie("href");

  if (oidcCookie.value) {
    // TODO: get user
    return;
  }

  const code = url.searchParams.get("code");

  if (code) {
    console.log("GOT CODE!");

    const data = await retrieveToken({
      token_endpoint,
      code,
      client_id,
      redirect_uri,
    });
    oidcCookie.value = data;
    const href = hrefCookie.value;
    hrefCookie.value = null;
    navigateTo(href, { external: true });
    return;
  }

  hrefCookie.value = url.href;
  const authUrl = await generateAuthUrl({
    authorization_endpoint,
    client_id,
    redirect_uri,
  });

  navigateTo(authUrl, { external: true });
});
