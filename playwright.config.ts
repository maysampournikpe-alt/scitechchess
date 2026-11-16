import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the real static export in out/ (run `npm run build` first).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "off" },
  webServer: { command: "python3 -m http.server 4173 -d out --bind 127.0.0.1", url: "http://127.0.0.1:4173", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
