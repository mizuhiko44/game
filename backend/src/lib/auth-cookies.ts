import { Request, Response } from "express";
import { env } from "../config/env";

const REFRESH_COOKIE_NAME = env.refreshTokenCookieName;

type SameSite = "Lax" | "Strict" | "None";

type CookieOptions = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: SameSite;
  secure?: boolean;
};

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  segments.push(`Path=${options.path ?? "/"}`);
  if (options.httpOnly) segments.push("HttpOnly");
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  if (options.secure) segments.push("Secure");

  return segments.join("; ");
}

function parseCookies(header: string | undefined) {
  if (!header) return {} as Record<string, string>;

  return header
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) return cookies;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function resolveSameSite(): SameSite {
  return env.appEnv === "local" ? "Lax" : "None";
}

function isSecureCookie() {
  return env.appEnv !== "local";
}

export function readRefreshTokenCookie(req: Request) {
  return parseCookies(req.header("cookie"))[REFRESH_COOKIE_NAME] ?? null;
}

export function setRefreshTokenCookie(res: Response, refreshToken: string, refreshTokenTtlDays: number) {
  res.append(
    "Set-Cookie",
    serializeCookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      path: "/",
      maxAge: refreshTokenTtlDays * 24 * 60 * 60,
      sameSite: resolveSameSite(),
      secure: isSecureCookie(),
    })
  );
}

export function clearRefreshTokenCookie(res: Response) {
  res.append(
    "Set-Cookie",
    serializeCookie(REFRESH_COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: resolveSameSite(),
      secure: isSecureCookie(),
    })
  );
}
