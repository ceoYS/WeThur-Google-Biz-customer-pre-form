export function isConfiguredOrigin(
  origin: string | null,
  appUrl: string,
): boolean {
  if (!origin) return false;

  try {
    const parsedOrigin = new URL(origin);
    return (
      parsedOrigin.origin === new URL(appUrl).origin &&
      parsedOrigin.pathname === "/" &&
      parsedOrigin.search === "" &&
      parsedOrigin.hash === "" &&
      parsedOrigin.username === "" &&
      parsedOrigin.password === ""
    );
  } catch {
    return false;
  }
}
