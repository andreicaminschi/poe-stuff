import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { app, net, protocol, session, type IpcMainInvokeEvent } from "electron";

export const APP_ORIGIN = "app://panel";

const PROD_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

// vite injects inline HMR scripts
const devCsp = (origin: string): string => [
  "default-src 'none'",
  `script-src 'self' 'unsafe-inline' ${origin}`,
  `style-src 'self' 'unsafe-inline' ${origin}`,
  "img-src 'self' data:",
  `connect-src ${origin} ${origin.replace(/^http/, "ws")}`,
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join("; ");

/** Must run before `app.whenReady`. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
}

/** Serves the built renderer under `app://panel/`, refusing any path outside it. */
export function serveRenderer(rendererDir: string): void {
  protocol.handle("app", async (request) => {
    const url = new URL(request.url);
    const file = resolve(rendererDir, `.${decodeURIComponent(url.pathname === "/"
      ? "/index.html"
      : url.pathname)}`);
    const inside = relative(rendererDir, file);

    if (url.host !== "panel" || inside.startsWith("..") || isAbsolute(inside)) return new Response("Not found", { status: 404 });
    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", PROD_CSP);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, headers });
  });
}

/**
 * Locks the default session and every window: no permissions, no new windows, no navigation away,
 * no webviews, and in dev a CSP on the Vite server's responses.
 */
export function lockDown(devOrigin: string | undefined): void {
  const defaultSession = session.defaultSession;

  defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  defaultSession.setPermissionCheckHandler(() => false);
  if (devOrigin !== undefined) {
    defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [devCsp(devOrigin)] } });
    });
  }

  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
    contents.on("will-navigate", (event, url) => {
      if (!isTrustedUrl(url, devOrigin)) event.preventDefault();
    });
    contents.on("will-attach-webview", (event) => event.preventDefault());
  });
}

/** Tells whether a URL is the panel's own page. Node reads a custom scheme's origin as "null", so compare parts. */
function isTrustedUrl(url: string, devOrigin: string | undefined): boolean {
  const parsed = URL.parse(url);
  if (parsed === null) return false;
  if (parsed.protocol === "app:" && parsed.host === "panel") return true;
  return devOrigin !== undefined && parsed.origin === devOrigin;
}

/** Refuses IPC from any frame that is not the panel's own page. */
export function requireTrustedSender(event: IpcMainInvokeEvent, devOrigin: string | undefined): void {
  const url = event.senderFrame?.url ?? "";
  if (!isTrustedUrl(url, devOrigin)) throw new Error(`Refused IPC from ${url}.`);
}
