import mongoose, { Schema, Document } from "mongoose";

export interface IBlog extends Document {
  title: string;
  description: string; // Changed from excerpt
  image: string; // Changed from heroImage
  tags: string[];
  date: string; // Formatted date string (YYYY-MM-DD)
  author: mongoose.Types.ObjectId;
  content?: string; // Optional content field for future expansion
  status: "draft" | "published" | "archived";
  thumbnailImage?: string; // Optional thumbnail image for future use
  createdAt: Date;
}

const BlogSchema: Schema<IBlog> = new Schema<IBlog>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    thumbnailImage: { type: String },
    tags: [{ type: String }],
    date: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String }, // Optional, for future
    status: { 
      type: String, 
      enum: ["draft", "published", "archived"], 
      default: "draft" 
    }
  },
  { timestamps: true }
);

BlogSchema.index({ status: 1, date: -1 });
BlogSchema.index({ tags: 1 });

export default mongoose.model<IBlog>("Blog", BlogSchema);
