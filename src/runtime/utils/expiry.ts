// expires_at is stored as epoch milliseconds so that it survives JSON serialization in cookies
export const isExpired = (expires_at: number) => Date.now() >= expires_at;

export const withExpiresAt = <T extends { expires_in: number }>(tokens: T) => ({
  ...tokens,
  expires_at: Date.now() + tokens.expires_in * 1000,
});
