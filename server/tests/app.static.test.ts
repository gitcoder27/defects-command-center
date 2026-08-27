import { describe, expect, it } from "vitest";
import { productionStaticOptions } from "../src/app";

type StaticSetHeaders = NonNullable<typeof productionStaticOptions.setHeaders>;
type StaticResponse = Parameters<StaticSetHeaders>[0];
type StaticStats = Parameters<StaticSetHeaders>[2];

const invokeStaticHeaders = (filePath: string) => {
  const headers = new Map<string, string>();
  const removedHeaders: string[] = [];
  const res = {
    setHeader: (name: string, value: string | number | readonly string[]) => {
      headers.set(name.toLowerCase(), Array.isArray(value) ? value.join(",") : String(value));
    },
    removeHeader: (name: string) => {
      removedHeaders.push(name.toLowerCase());
    },
  } as StaticResponse;

  productionStaticOptions.setHeaders?.(res, filePath, {} as StaticStats);

  return { headers, removedHeaders };
};

describe("production static asset headers", () => {
  it("marks fingerprinted JS bundles as immutable for one year", () => {
    const { headers, removedHeaders } = invokeStaticHeaders("/client/dist/assets/index-FEogyng1.js");

    expect(productionStaticOptions.acceptRanges).toBe(false);
    expect(productionStaticOptions.cacheControl).toBe(false);
    expect(productionStaticOptions.etag).toBe(true);
    expect(productionStaticOptions.lastModified).toBe(true);
    expect(removedHeaders).toContain("accept-ranges");
    expect(headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(headers.has("pragma")).toBe(false);
    expect(headers.has("expires")).toBe(false);
    expect(headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("marks fingerprinted fonts as immutable for one year", () => {
    const { headers } = invokeStaticHeaders("/client/dist/assets/geist-latin-wght-normal-Dm3htQBi.woff2");

    expect(headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("marks HTML entrypoints as no-store", () => {
    const { headers } = invokeStaticHeaders("/client/dist/index.html");

    expect(headers.get("cache-control")).toContain("no-store");
    expect(headers.get("pragma")).toBe("no-cache");
    expect(headers.get("expires")).toBe("0");
  });

  it("allows ETag revalidation for non-fingerprinted static files", () => {
    const { headers } = invokeStaticHeaders("/client/dist/favicon.svg");

    expect(headers.get("cache-control")).toBe("no-cache, must-revalidate");
  });
});
