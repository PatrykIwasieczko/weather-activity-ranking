import { createYoga } from "graphql-yoga";
import { describe, expect, it } from "vitest";
import { schema } from "../src/graphql/schema.js";

describe("GraphQL health query", () => {
  it("returns ok", async () => {
    const yoga = createYoga({ schema });

    const response = await yoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: "{ health }",
      }),
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data?: { health?: string };
      errors?: unknown[];
    };

    expect(body.errors).toBeUndefined();
    expect(body.data?.health).toBe("ok");
  });
});
