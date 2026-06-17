// Decode the JWT payload without verifying the signature.
// Signature verification is the backend's job. On the client we only need the exp claim
// to schedule a proactive refresh before the token expires.
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
