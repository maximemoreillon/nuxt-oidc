// This middleware is only for pages
// NOTE: this could have been a composable run on layout or something
import CryptoJS from "crypto-js";

function generateCodeVerifier(length: number) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => (byte % 36).toString(36)).join("");
}

function generatePkceChallenge(verifier: string) {
  const hash = CryptoJS.SHA256(verifier);
  const base64 = CryptoJS.enc.Base64.stringify(hash);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createPkcePair() {
  const verifier = generateCodeVerifier(128);
  const challenge = generatePkceChallenge(verifier);

  return {
    verifier,
    challenge,
  };
}

async function getOidcConfig(authority: string) {
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
  const code_verifier = useCookie("verifier").value;
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
  if (!response.ok) throw `Error getting token ${await response.text()}`;

  useCookie("verifier").value = null;

  return await response.json();
}

export default defineNuxtRouteMiddleware(async (to, from) => {
  const runtimeConfig = useRuntimeConfig();

  const url = useRequestURL();
  const redirect_uri = url.href;

  const { oidcAuthority: authority, oidcClientId: client_id } =
    runtimeConfig.public;

  const oidcConfig = await getOidcConfig(authority);
  const { authorization_endpoint, token_endpoint } = oidcConfig;

  const oidcCookie = useCookie("oidc");

  if (oidcCookie.value) {
    // TODO: get user
    return;
  }

  const code = url.searchParams.get("code");

  if (code) {
    const data = await retrieveToken({
      token_endpoint,
      code,
      client_id,
      redirect_uri,
    });
    useCookie("oidc").value = data;
    navigateTo(useCookie("href").value, { external: true });
    return;
  }

  useCookie("href").value = url.href;
  const authUrl = await generateAuthUrl({
    authorization_endpoint,
    client_id,
    redirect_uri,
  });

  navigateTo(authUrl, { external: true });
});
