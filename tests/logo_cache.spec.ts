import path from "node:path";
import CachedFetch from "@11ty/eleventy-fetch";
import { test, expect } from '@playwright/test';

const breaches: [] = await CachedFetch("https://haveibeenpwned.com/api/breaches", {
  duration: "12h",
  type: "json",
});

for (const breach of breaches.slice(0, 50)) {
  test(`check logo for ${breach.Name}`, async ({ page }) => {
    await page.goto(`https://stage.firefoxmonitor.nonprod.cloudops.mozgcp.net/breach-details/${breach.Name}`);
    await expect(page).toHaveTitle(/Firefox Monitor/);

    // Take a "before" screenshot w/ bespoke logo.
    await page.screenshot({ path: path.join("screenshots", `${breach.Name}.v1.png`) });

    await page.evaluate(async () => {
      // Scrape the breach Domain from the page link (if available).
      const parseDomain = () => {
        let href = document.querySelector("a.breach-detail-meta-domain")?.getAttribute("href");
        if (href) {
          return new URL(href).hostname;
        }
      };
      // Fetch the breach info from HIBP (as a last resort).
      const fetchBreach = async (name) => {
        if (!name) {
          name = new URL(window.location.href).pathname.split("/").pop();
        }
        const breach = await fetch(`https://haveibeenpwned.com/api/v3/breach/${name}`);
        return breach.json();
      };

      let domain = parseDomain();
      if (!domain) {
        const breach = await fetchBreach();
        domain = breach.Domain;
      }
      if (domain) {
        const logo = document.querySelector("img.breach-detail-logo");
        logo?.setAttribute("src", `/images/logo_cache/${domain}.ico`);
      } else {
        document.querySelector("body")?.setAttribute("style", "background-color: red;");
      }
    });

    // Throttle the page to let the new logo load.
    await page.waitForTimeout(2000);

    // Take an "after" screenshot w/ fetched logo.
    await page
      // .locator("header.breach-detail-header")
      .screenshot({ path: path.join("screenshots", `${breach.Name}.v2.png`) });
  });
}
