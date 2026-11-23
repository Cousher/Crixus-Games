const {
  sanitizeObject,
  securityHeaders,
  isSafeImageUrl,
  isValidImageBase64,
  createSocketRateLimiter,
  isValidObjectId,
} = require("../../middleware/security");
const {
  SESSION_COOKIE_NAME,
  parseCookies,
  getSessionCookieOptions,
  extractRequestToken,
  extractSocketToken,
} = require("../../utils/authCookie");

describe("security middleware & validators", () => {
  test("sanitizeObject strips NoSQL $ operators and prototype-pollution keys recursively", () => {
    const payload = JSON.parse(
      '{"email":{"$ne":""},"nested":{"$gt":0,"ok":"yes","__proto__":{"isAdmin":true}},"constructor":{"bad":1},"arr":[{"$where":"1==1","safe":42}]}'
    );
    sanitizeObject(payload);
    expect(payload.email).toEqual({});
    expect(payload.nested).toEqual({ ok: "yes" });
    expect(Object.prototype.hasOwnProperty.call(payload, "constructor")).toBe(false);
    expect(payload.arr[0]).toEqual({ safe: 42 });
    expect(({}).isAdmin).toBeUndefined();
  });

  test("securityHeaders sets defensive HTTP headers including HSTS on HTTPS", () => {
    const headers = {};
    const res = { setHeader: (k, v) => (headers[k] = v) };
    let nextCalled = false;
    securityHeaders({ secure: true, headers: {} }, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
  });

  test("isSafeImageUrl permits local /images and https:// while blocking javascript: and data:", () => {
    expect(isSafeImageUrl("")).toBe(true);
    expect(isSafeImageUrl("/images/cases/gladiator.webp")).toBe(true);
    expect(isSafeImageUrl("https://crixus.com.ar/images/og.jpg")).toBe(true);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeImageUrl("//evil.com/x.png")).toBe(false);
  });

  test("isValidImageBase64 checks magic bytes for PNG and JPEG", () => {
    // Valid PNG header: 89 50 4E 47 0D 0A 1A 0A + padding
    const pngB64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]).toString("base64");
    const jpgB64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]).toString("base64");
    const fakeHtmlB64 = Buffer.from("<script>alert(1)</script>").toString("base64");

    expect(isValidImageBase64(`data:image/png;base64,${pngB64}`)).toBe(true);
    expect(isValidImageBase64(`data:image/jpeg;base64,${jpgB64}`)).toBe(true);
    expect(isValidImageBase64(`data:image/png;base64,${fakeHtmlB64}`)).toBe(false);
    expect(isValidImageBase64("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(false);
  });

  test("createSocketRateLimiter throttles rapid event bursts and resets after window", () => {
    const limit = createSocketRateLimiter({ maxEvents: 3, windowMs: 1000 });
    expect(limit(100)).toBe(false);
    expect(limit(200)).toBe(false);
    expect(limit(300)).toBe(false);
    expect(limit(400)).toBe(true); // 4th event inside 1000ms blocked
    expect(limit(1200)).toBe(false); // window slid past 100ms
  });

  test("isValidObjectId validates MongoDB ObjectIds strictly", () => {
    expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isValidObjectId("not-an-id")).toBe(false);
    expect(isValidObjectId(null)).toBe(false);
  });

  test("parseCookies parses cookie header safely and ignores prototype keys", () => {
    const parsed = parseCookies(
      `foo=bar; ${SESSION_COOKIE_NAME}=tok%2E123; __proto__=evil; constructor=bad`
    );
    expect(parsed.foo).toBe("bar");
    expect(parsed[SESSION_COOKIE_NAME]).toBe("tok.123");
    expect(Object.prototype.hasOwnProperty.call(parsed, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed, "constructor")).toBe(false);
  });

  test("getSessionCookieOptions enforces HttpOnly, SameSite=Lax, and Secure over HTTPS", () => {
    const httpsOpts = getSessionCookieOptions({
      secure: false,
      headers: { "x-forwarded-proto": "https" },
    });
    expect(httpsOpts.httpOnly).toBe(true);
    expect(httpsOpts.sameSite).toBe("lax");
    expect(httpsOpts.secure).toBe(true);

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const devOpts = getSessionCookieOptions({ secure: false, headers: {} });
    process.env.NODE_ENV = prevEnv;
    expect(devOpts.httpOnly).toBe(true);
    expect(devOpts.sameSite).toBe("lax");
    expect(devOpts.secure).toBe(false);
  });

  test("extractRequestToken & extractSocketToken prefer HttpOnly cookie over Bearer/auth", () => {
    const reqBoth = {
      headers: { cookie: `${SESSION_COOKIE_NAME}=from-cookie` },
      header: () => "Bearer from-header",
    };
    expect(extractRequestToken(reqBoth)).toEqual({ token: "from-cookie", source: "cookie" });

    const reqBearer = { headers: {}, header: () => "Bearer from-header" };
    expect(extractRequestToken(reqBearer)).toEqual({ token: "from-header", source: "bearer" });

    const sockBoth = {
      handshake: {
        headers: { cookie: `${SESSION_COOKIE_NAME}=sock-cookie` },
        auth: { token: "sock-auth" },
      },
    };
    expect(extractSocketToken(sockBoth)).toBe("sock-cookie");
    expect(extractSocketToken({ handshake: { headers: {}, auth: { token: "sock-auth" } } })).toBe(
      "sock-auth"
    );
  });
});
