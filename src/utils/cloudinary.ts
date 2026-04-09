import { v2 as cloudinary } from "cloudinary";
import { UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadOptions {
  folder: string;
  width?: number;
  height?: number;
  crop?: string;
  quality?: number | "auto";
}

export const uploadToCloudinary = (
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const { folder, width, height, crop = "inside", quality = "auto" } = options;

    const transformation: Record<string, any> = { quality };
    if (width || height) {
      transformation.width = width;
      transformation.height = height;
      transformation.crop = crop ?? "limit";
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `tiramisu/${folder}`,
        transformation,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};