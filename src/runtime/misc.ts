export function makeExpiryDate(expires_in: number | string) {
  const expiryDate = new Date();
  const time = expiryDate.getTime();
  const expiryTime = time + 1000 * Number(expires_in);
  expiryDate.setTime(expiryTime);
  return expiryDate;
}
