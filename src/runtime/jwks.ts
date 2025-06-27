import { useRuntimeConfig } from "#imports";
import { getOidcConfig } from "./common";
import createJwksClient from "jwks-rsa";

export default async function () {
  const runtimeConfig = useRuntimeConfig();

  const { oidcAuthority: authority } = runtimeConfig.public;
  if (!authority) throw new Error("Missing oidcAuthority in runtimeConfig");
  const { jwks_uri } = await getOidcConfig(authority as string);

  const client = createJwksClient({
    jwksUri: jwks_uri,
    cache: true,
    rateLimit: true,
  });

  return client;
}
