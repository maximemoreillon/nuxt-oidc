export function makeExpiryDate(expires_in: number) {
  const expiryDate = new Date();
  const time = expiryDate.getTime();
  const expiryTime = time + 1000 * expires_in;
  expiryDate.setTime(expiryTime);
  return expiryDate;
}
