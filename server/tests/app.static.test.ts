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
  it("prevents ranged or revalidated JavaScript bundle responses", () => {
    const { headers, removedHeaders } = invokeStaticHeaders("/client/dist/assets/index-FEogyng1.js");

    expect(productionStaticOptions.acceptRanges).toBe(false);
    expect(productionStaticOptions.cacheControl).toBe(false);
    expect(productionStaticOptions.etag).toBe(false);
    expect(productionStaticOptions.lastModified).toBe(false);
    expect(removedHeaders).toContain("accept-ranges");
    expect(headers.get("cache-control")).toContain("no-store");
    expect(headers.get("pragma")).toBe("no-cache");
    expect(headers.get("expires")).toBe("0");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("marks HTML entrypoints as no-store", () => {
    const { headers } = invokeStaticHeaders("/client/dist/index.html");

    expect(headers.get("cache-control")).toContain("no-store");
    expect(headers.get("pragma")).toBe("no-cache");
    expect(headers.get("expires")).toBe("0");
  });
});
