import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  price: number;
  images: string[];
  thumbnailImage?: string;
  weight: string;
  description: string;
  reviews: number;
  type: string;
  stock: number;
  isFeatured: boolean;
  tags: string[];
  status: "draft" | "published" | "archived";
  likes: mongoose.Types.ObjectId[];  // Array of user IDs who liked this product
  likeCount: number; 
  createdAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    images: { type: [String], required: true, default: [] },
    thumbnailImage: { type: String }, // Optional thumbnail image
    weight: { type: String, required: true },
    description: { type: String, required: true },
    reviews: { type: Number, default: 0 },
    type: { type: String, required: true },
    stock: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    

    status: { 
      type: String, 
      enum: ["draft", "published", "archived"], 
      default: "draft" 
    } ,
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likeCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes for better query performance
ProductSchema.index({ name: "text", description: "text" });
ProductSchema.index({ type: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ status: 1 });

export default mongoose.model<IProduct>("Product", ProductSchema);
