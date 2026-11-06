import { expect, test as base } from "@playwright/test";

/**
 * Every browser test runs under the production CSP (vite preview serves public/_headers). This fails a
 * test when the page reports anything the CSP refused, such as a component inserting a <style> tag,
 * which would otherwise only show as a console line while the page quietly misbehaves.
 */
export const test = base.extend<{ cspViolations: void }>({
  cspViolations: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        const seen: string[] = [];
        (window as unknown as { __cspViolations: string[] }).__cspViolations = seen;
        document.addEventListener("securitypolicyviolation", (e) => {
          seen.push(`${e.effectiveDirective} refused ${e.blockedURI || "inline"}`);
        });
      });
      await use();
      const seen = await page
        .evaluate(() => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [])
        .catch(() => [] as string[]);
      expect(seen, "the CSP refused something on this page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export type { Page } from "@playwright/test";
