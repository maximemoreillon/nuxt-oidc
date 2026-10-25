export function parsePublicConfig(config: Record<string, unknown>) {
  const { oidcAuthority, oidcClientId, oidcAudience } = config;

  if (typeof oidcAuthority !== "string")
    throw new Error("Missing oidcAuthority in public runtimeConfig");
  if (typeof oidcClientId !== "string")
    throw new Error("Missing oidcClientId in public runtimeConfig");

  return {
    authority: oidcAuthority,
    client_id: oidcClientId,
    audience: typeof oidcAudience === "string" && oidcAudience ? oidcAudience : undefined,
  };
}
