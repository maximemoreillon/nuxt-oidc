import getOidcConfig, { OidcConfig } from "../shared/getOidcConfig";
import publicRuntimeConfigSchema from "../shared/publicRuntimeConfigSchema";
import { useRuntimeConfig } from "#imports";

export let oidcConfig: OidcConfig | undefined;
const runtimeConfig = useRuntimeConfig();
const { oidcAuthority } = publicRuntimeConfigSchema.parse(runtimeConfig.public);
getOidcConfig(oidcAuthority).then((c) => (oidcConfig = c));
