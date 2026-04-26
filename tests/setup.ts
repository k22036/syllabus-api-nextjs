import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Save Bun's native Fetch API before happy-dom overwrites them.
// Component tests need happy-dom's DOM globals (document, window, …)
// but the existing API-level tests rely on Bun's native Request / Response.
const nativeFetch = globalThis.fetch;
const nativeRequest = globalThis.Request;
const nativeResponse = globalThis.Response;
const nativeHeaders = globalThis.Headers;

// Register happy-dom to provide document, window, and all other DOM globals
// that @testing-library/react needs to mount React trees.
GlobalRegistrator.register();

// Require @testing-library/react AFTER the DOM is registered
const { cleanup } = await import("@testing-library/react");

// Restore Bun's native Fetch API so that:
//  - API-level tests (tests/api/**) keep using the real Request / Response
//  - Component tests that mock globalThis.fetch get a consistent baseline
// Unmount every React tree and clean the DOM after each test so that
// tests are fully isolated from each other.
afterEach(() => {
  globalThis.fetch = nativeFetch;
  globalThis.Request = nativeRequest;
  globalThis.Response = nativeResponse;
  globalThis.Headers = nativeHeaders;
  cleanup();
});
