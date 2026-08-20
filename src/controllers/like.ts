// controllers/like.ts
import Product from "../models/product";
import { Request, Response } from "express";

// Like a product
export const likeProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = (req as any).user.id; // Get user ID from JWT

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Check if user already liked this product
    const alreadyLiked = product.likes.includes(userId);

    if (alreadyLiked) {
      return res.status(400).json({
        success: false,
        message: "Product already liked"
      });
    }

    // Add user to likes array and increment count
    product.likes.push(userId);
    product.likeCount = product.likes.length;
    await product.save();

    res.json({
      success: true,
      message: "Product liked successfully",
      likeCount: product.likeCount,
      liked: true
    });
  } catch (err: any) {
    console.error("Like product error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Unlike a product
export const unlikeProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = (req as any).user.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Check if user has liked this product
    const likeIndex = product.likes.indexOf(userId);

    if (likeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Product not liked yet"
      });
    }

    // Remove user from likes array and update count
    product.likes.splice(likeIndex, 1);
    product.likeCount = product.likes.length;
    await product.save();

    res.json({
      success: true,
      message: "Product unliked successfully",
      likeCount: product.likeCount,
      liked: false
    });
  } catch (err: any) {
    console.error("Unlike product error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Check if user liked a product
export const checkUserLike = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = (req as any).user.id;

    const product = await Product.findById(productId).select('likes');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const liked = product.likes.includes(userId);

    res.json({
      success: true,
      liked,
      likeCount: product.likeCount
    });
  } catch (err: any) {
    console.error("Check like error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Get user's liked products
export const getUserLikedProducts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const products = await Product.find({
      likes: userId,
      status: "published"
    })
    .skip(skip)
    .limit(parseInt(limit as string));

    const total = await Product.countDocuments({
      likes: userId,
      status: "published"
    });

    // Format products
    const formattedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      price: product.price,
      images: product.images,
      description: product.description,
      likeCount: product.likeCount,
      liked: true // Since we know user liked these
    }));

    res.json({
      success: true,
      products: formattedProducts,
      pagination: {
        total,
        page: parseInt(page as string),
        pages: Math.ceil(total / parseInt(limit as string)),
        limit: parseInt(limit as string)
      }
    });
  } catch (err: any) {
    console.error("Get liked products error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};