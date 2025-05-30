export function rateLimit({ interval, uniqueTokenPerInterval = 500 }) {
  const tokens = new Map();
  const lastReset = new Map();

  return {
    check: async (request, limit) => {
      const ip = request.headers.get("x-forwarded-for") || "anonymous";
      const now = Date.now();

      if (lastReset.get(ip) === undefined) {
        lastReset.set(ip, now);
        tokens.set(ip, limit - 1);
        return;
      }

      const elapsedTime = now - lastReset.get(ip);

      if (elapsedTime > interval) {
        lastReset.set(ip, now);
        tokens.set(ip, limit - 1);
        return;
      }

      const remainingTokens = tokens.get(ip);

      if (remainingTokens === 0) {
        throw new Error("Rate limit exceeded");
      }

      tokens.set(ip, remainingTokens - 1);
    },
  };
}
