// Test helper: lets Node resolve extensionless relative TypeScript imports (as the Next.js build does).
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) return next(`${specifier}.ts`, context);
    throw err;
  }
}
