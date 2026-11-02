import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/gdd",
);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

export interface GalleryServer {
  url: string;
  close(): Promise<void>;
}

/** Serves the generated gallery exactly as a static host would. */
export async function startGalleryServer(): Promise<GalleryServer> {
  const server = createServer((request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname =
        url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
      const file = resolve(ROOT, `.${pathname}`);
      if (
        !file.startsWith(ROOT) ||
        !existsSync(file) ||
        !statSync(file).isFile()
      ) {
        response.statusCode = 404;
        response.end("Not found");
        return;
      }
      response.setHeader(
        "content-type",
        MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
      );
      createReadStream(file).pipe(response);
    } catch {
      response.statusCode = 500;
      response.end("Gallery server error");
    }
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("gallery server did not expose a TCP port");
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()));
      }),
  };
}
