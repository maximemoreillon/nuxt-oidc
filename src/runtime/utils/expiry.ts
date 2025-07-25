export function makeExpiryDate(expires_in: number | string) {
  const expiryDate = new Date();
  const time = expiryDate.getTime();
  const expiryTime = time + 1000 * Number(expires_in);
  expiryDate.setTime(expiryTime);
  return expiryDate;
}

export function isExpired(expires_at: string | Date) {
  const expiryDate = new Date(expires_at);
  return new Date().getTime() - expiryDate.getTime() > 0;
}
