import { SignJWT, jwtVerify } from 'jose';

export interface TokenClaims {
  userId: string;
  username: string;
  displayName: string | null;
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signToken(claims: TokenClaims, secret: string): Promise<string> {
  return await new SignJWT({ username: claims.username, displayName: claims.displayName })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(key(secret));
}

export async function verifyToken(token: string, secret: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, key(secret));
  return {
    userId: String(payload.sub),
    username: String(payload.username ?? ''),
    displayName: (payload.displayName as string | null) ?? null,
  };
}
