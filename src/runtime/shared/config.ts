import { defaultCookiePrefix, defaultScope, getCookieNames } from "./constants";

const optionalString = (value: unknown) =>
  typeof value === "string" && value ? value : undefined;

export function parsePublicConfig(config: Record<string, unknown>) {
  const { oidcAuthority, oidcClientId, oidcAudience, oidcScope, oidcCookiePrefix } = config;

  if (typeof oidcAuthority !== "string")
    throw new Error("Missing oidcAuthority in public runtimeConfig");
  if (typeof oidcClientId !== "string")
    throw new Error("Missing oidcClientId in public runtimeConfig");

  return {
    authority: oidcAuthority,
    client_id: oidcClientId,
    audience: optionalString(oidcAudience),
    scope: optionalString(oidcScope) ?? defaultScope,
    cookies: getCookieNames(optionalString(oidcCookiePrefix) ?? defaultCookiePrefix),
  };
}
