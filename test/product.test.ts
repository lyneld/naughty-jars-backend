import { describe, expect, it, vi } from "vitest";
import Product from "../src/models/product";
import { getProductDetails } from "../src/controllers/product";

describe("public product details", () => {
  it("always filters ObjectId lookups to published products", async () => {
    const findOne = vi.spyOn(Product, "findOne").mockResolvedValue(null);
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();

    await getProductDetails(
      { params: { id: "507f1f77bcf86cd799439011" } } as never,
      { status, json } as never,
    );

    expect(findOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439011",
      status: "published",
    });
    expect(status).toHaveBeenCalledWith(404);
    findOne.mockRestore();
  });
});
