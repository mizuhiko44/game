import { Prisma, PrismaClient, User, UserRole } from "@prisma/client";
import { createHash, createHmac, randomBytes } from "crypto";
import { env } from "../config/env";
import { logger } from "./logger";
import { prisma } from "./prisma";

type TokenKind = "access" | "refresh";

type TokenClaims = {
  sub: string;
  nickname: string;
  role: UserRole;
  jti?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  tokenType: TokenKind;
};

type PublicUser = Pick<User, "id" | "nickname" | "regionCode" | "totalPoints"> & { role: UserRole };

type UserLike = Pick<User, "id" | "nickname" | "regionCode" | "totalPoints"> & { role?: UserRole | null };

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

type AuthPrismaClient = Pick<PrismaClient, "authSession"> | Prisma.TransactionClient;
type AuthSessionDelegate = PrismaClient["authSession"];

let hasWarnedAboutMissingAuthSession = false;

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

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getAuthSessionDelegate(client: AuthPrismaClient | PrismaClient = prisma): AuthSessionDelegate | null {
  const delegate = (client as { authSession?: AuthSessionDelegate }).authSession;
  if (delegate) return delegate;

  if (!hasWarnedAboutMissingAuthSession) {
    hasWarnedAboutMissingAuthSession = true;
    logger.warn("authSession delegate is unavailable; falling back to stateless refresh tokens. Run prisma generate/migrate to enable session persistence.");
  }

  return null;
}

export function resolveUserRole(user: Pick<UserLike, "id" | "nickname"> & { role?: UserRole | null }): UserRole {
  if (user.role === "admin" || user.role === "user") return user.role;
  // Temporary fallback for environments that still have pre-role seed data.
  if (user.id === "usr_demo_1" || user.nickname === "DemoUser") return "admin";
  return "user";
}

function createTokenClaims(user: PublicUser, tokenType: TokenKind): TokenClaims {
  const issuedAt = Math.floor(Date.now() / 1000);
  const ttlSeconds = tokenType === "access" ? env.accessTokenTtlMinutes * 60 : env.refreshTokenTtlDays * 24 * 60 * 60;
  return {
    sub: user.id,
    nickname: user.nickname,
    role: user.role,
    jti: tokenType === "refresh" ? randomBytes(16).toString("hex") : undefined,
    iss: env.jwtIssuer,
    aud: env.jwtAudience,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
    tokenType,
  };
}

export function serializeUser(user: UserLike): PublicUser {
  return {
    id: user.id,
    nickname: user.nickname,
    regionCode: user.regionCode,
    totalPoints: user.totalPoints,
    role: resolveUserRole(user),
  };
}

function createSignedToken(user: PublicUser, tokenType: TokenKind) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify(createTokenClaims(user, tokenType)));
  const signature = base64UrlEncode(createHmac("sha256", env.jwtSecret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

export function createAccessToken(user: PublicUser) {
  return createSignedToken(user, "access");
}

export function createRefreshToken(user: PublicUser) {
  return createSignedToken(user, "refresh");
}

function verifyToken(token: string, expectedType: TokenKind): TokenClaims {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) throw new Error("invalid token format");

  const expectedSignature = base64UrlEncode(createHmac("sha256", env.jwtSecret).update(`${header}.${payload}`).digest());
  if (signature !== expectedSignature) throw new Error("invalid token signature");

  const claims = JSON.parse(base64UrlDecode(payload)) as TokenClaims;
  if (claims.iss !== env.jwtIssuer) throw new Error("invalid issuer");
  if (claims.aud !== env.jwtAudience) throw new Error("invalid audience");
  if (claims.tokenType !== expectedType) throw new Error(`invalid ${expectedType} token`);
  if (claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("token expired");
  return claims;
}

export function verifyAccessToken(token: string) {
  return verifyToken(token, "access");
}

export function verifyRefreshToken(token: string) {
  return verifyToken(token, "refresh");
}

export async function issueAuthTokensForUser(user: UserLike, dbClient: AuthPrismaClient = prisma): Promise<AuthResponse> {
  const serializedUser = serializeUser(user);
  const accessToken = createAccessToken(serializedUser);
  const refreshToken = createRefreshToken(serializedUser);
  const expiresAt = new Date(Date.now() + env.accessTokenTtlMinutes * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  const authSession = getAuthSessionDelegate(dbClient);
  if (authSession) {
    await authSession.create({
      data: {
        userId: serializedUser.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });
  }

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
  const claims = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) throw new Error("user not found");

  const authSession = getAuthSessionDelegate(prisma);
  if (!authSession) {
    return issueAuthTokensForUser(user);
  }

  const session = await authSession.findUnique({
    where: { tokenHash },
  });
  if (!session || session.userId !== claims.sub) throw new Error("refresh session not found");
  if (session.revokedAt) throw new Error("refresh session revoked");
  if (session.expiresAt <= new Date()) throw new Error("refresh session expired");

  return prisma.$transaction(async (tx) => {
    const txAuthSession = getAuthSessionDelegate(tx);
    if (!txAuthSession) {
      return issueAuthTokensForUser(user);
    }

    await txAuthSession.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });

    return issueAuthTokensForUser(user, tx);
  });
}

export async function revokeRefreshToken(refreshToken: string) {
  const claims = verifyRefreshToken(refreshToken);
  const authSession = getAuthSessionDelegate(prisma);

  if (!authSession) {
    return;
  }

  await authSession.updateMany({
    where: {
      tokenHash: hashToken(refreshToken),
      userId: claims.sub,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}
