import { Prisma, PrismaClient, User, UserRole } from "@prisma/client";
import { createHash, createHmac, randomBytes } from "crypto";
import { env } from "../config/env";
import { prisma } from "./prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

type AccessTokenClaims = {
  sub: string;
  nickname: string;
  role: UserRole;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};

type PublicUser = Pick<User, "id" | "nickname" | "regionCode" | "totalPoints" | "role">;

export type AuthResponse = {
  user: PublicUser;
  auth: {
    tokenType: "Bearer";
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    refreshExpiresAt: string;
    authMode: string;
  };
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function createAccessTokenClaims(user: PublicUser): AccessTokenClaims {
  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    sub: user.id,
    nickname: user.nickname,
    role: user.role,
    iss: env.jwtIssuer,
    aud: env.jwtAudience,
    iat: issuedAt,
    exp: issuedAt + env.accessTokenTtlMinutes * 60,
  };
}

export function serializeUser(user: Pick<User, "id" | "nickname" | "regionCode" | "totalPoints" | "role">): PublicUser {
  return {
    id: user.id,
    nickname: user.nickname,
    regionCode: user.regionCode,
    totalPoints: user.totalPoints,
    role: user.role,
  };
}

export function createAccessToken(user: PublicUser) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify(createAccessTokenClaims(user)));
  const signature = base64UrlEncode(createHmac("sha256", env.jwtSecret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) throw new Error("invalid token format");

  const expectedSignature = base64UrlEncode(createHmac("sha256", env.jwtSecret).update(`${header}.${payload}`).digest());
  if (signature !== expectedSignature) throw new Error("invalid token signature");

  const claims = JSON.parse(base64UrlDecode(payload)) as AccessTokenClaims;
  if (claims.iss !== env.jwtIssuer) throw new Error("invalid issuer");
  if (claims.aud !== env.jwtAudience) throw new Error("invalid audience");
  if (claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("token expired");
  return claims;
}

export function createRefreshToken() {
  return randomBytes(48).toString("hex");
}

export function hashRefreshToken(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export async function issueAuthTokensForUser(db: DbClient, user: Pick<User, "id" | "nickname" | "regionCode" | "totalPoints" | "role">): Promise<AuthResponse> {
  const serializedUser = serializeUser(user);
  const refreshToken = createRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await db.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt,
    },
  });

  const accessToken = createAccessToken(serializedUser);
  const expiresAt = new Date(Date.now() + env.accessTokenTtlMinutes * 60 * 1000);

  return {
    user: serializedUser,
    auth: {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      authMode: env.authMode,
    },
  };
}

export async function findUserByAccessToken(token: string) {
  const claims = verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) throw new Error("user not found");
  return user;
}

export async function rotateRefreshToken(refreshToken: string): Promise<AuthResponse> {
  const tokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.authSession.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new Error("refresh token is invalid or expired");
  }

  return prisma.$transaction(async (tx) => {
    await tx.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return issueAuthTokensForUser(tx, session.user);
  });
}

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.authSession.findUnique({ where: { tokenHash } });
  if (!session || session.revokedAt) return;

  await prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
}
