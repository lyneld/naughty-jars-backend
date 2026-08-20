import dotenv from "dotenv";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import Blog from "./models/blog";
import Crew from "./models/crew";
import Product from "./models/product";
import { uploadToCloudinary } from "./utils/cloudinary";

dotenv.config({ path: process.env.ENV_FILE || ".env" });

type MediaReference = {
  model: "Product" | "Blog" | "Crew";
  documentId: string;
  field: string;
  url: string;
  filePath?: string;
};

const localUrl = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("/uploads/");

const findFile = (url: string): string | undefined => {
  const relative = url.replace(/^\/+/, "");
  const candidates = [
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), "public", relative),
    path.resolve(process.cwd(), "src", "public", relative),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  const migrate = process.argv.includes("--migrate");
  const requireClean = process.argv.includes("--require-clean");
  if (migrate && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
    throw new Error("Cloudinary credentials are required with --migrate");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const references: MediaReference[] = [];

  for (const product of await Product.find()) {
    product.images.forEach((url, index) => {
      if (localUrl(url)) references.push({ model: "Product", documentId: product.id, field: `images.${index}`, url, filePath: findFile(url) });
    });
    if (localUrl(product.thumbnailImage)) references.push({ model: "Product", documentId: product.id, field: "thumbnailImage", url: product.thumbnailImage, filePath: findFile(product.thumbnailImage) });
  }
  for (const blog of await Blog.find()) {
    if (localUrl(blog.image)) references.push({ model: "Blog", documentId: blog.id, field: "image", url: blog.image, filePath: findFile(blog.image) });
    if (localUrl(blog.thumbnailImage)) references.push({ model: "Blog", documentId: blog.id, field: "thumbnailImage", url: blog.thumbnailImage, filePath: findFile(blog.thumbnailImage) });
  }
  for (const crew of await Crew.find()) {
    if (localUrl(crew.image)) references.push({ model: "Crew", documentId: crew.id, field: "image", url: crew.image, filePath: findFile(crew.image) });
  }

  console.table(references.map(({ filePath, ...reference }) => ({ ...reference, fileFound: Boolean(filePath) })));
  if (!migrate) {
    console.log(references.length === 0
      ? "Media audit clean: no local /uploads/ references found."
      : `Found ${references.length} local media reference(s). Re-run with --migrate after reviewing this report.`);
    if (requireClean && references.length > 0) process.exitCode = 2;
    return;
  }

  for (const reference of references) {
    if (!reference.filePath) throw new Error(`Missing file for ${reference.model} ${reference.documentId}: ${reference.url}`);
    const result = await uploadToCloudinary(await fs.promises.readFile(reference.filePath), { folder: "legacy" });
    const update = { $set: { [reference.field]: result.secure_url } };
    if (reference.model === "Product") await Product.updateOne({ _id: reference.documentId }, update);
    if (reference.model === "Blog") await Blog.updateOne({ _id: reference.documentId }, update);
    if (reference.model === "Crew") await Crew.updateOne({ _id: reference.documentId }, update);
    console.log(`Migrated ${reference.model} ${reference.documentId} ${reference.field}`);
  }
  console.log(`Migrated ${references.length} local media reference(s) to Cloudinary.`);
};

main()
  .catch((error) => {
    console.error("Media audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
