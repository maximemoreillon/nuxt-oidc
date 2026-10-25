import { getOidcConfig, type OidcConfig } from "../shared/oidc";
import { parsePublicConfig } from "../shared/config";
import { useRuntimeConfig } from "#imports";

// Fetched once for the whole server, retried on the next call if it failed
let oidcConfig: Promise<OidcConfig> | undefined;

export function useOidcConfig() {
  if (!oidcConfig) {
    const { authority } = parsePublicConfig(useRuntimeConfig().public);
    oidcConfig = getOidcConfig(authority).catch((error) => {
      oidcConfig = undefined;
      throw error;
    });
  }
  return oidcConfig;
}
