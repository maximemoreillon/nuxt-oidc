import { z } from "zod";

export default z.object({
  oidcAuthority: z.string(),
  oidcClientId: z.string(),
  oidcAudience: z.string().optional(),
});
