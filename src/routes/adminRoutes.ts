// routes/adminRoutes.ts
import { Router } from "express";
import Product from "../models/product";
import User from "../models/user";
import { authenticateJWT } from "../middlewares/auth";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

// Promote user to admin (only accessible by existing admins)
router.patch("/promote/:userId", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: "admin" },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User promoted to admin",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users (admin only)
router.get("/users", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/product/:productId/likes", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .populate({
        path: 'likes',
        select: 'username email role createdAt' // Select specific user fields
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        totalLikes: product.likeCount || 0
      },
      likedBy: product.likes.map((user: any) => ({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        joinedAt: user.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// 2. Get like statistics for all products
router.get("/stats/likes", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const products = await Product.find()
      .select('name slug price likeCount likes')
      .sort({ likeCount: -1 });

    // Calculate summary statistics
    const totalLikes = products.reduce((sum, p) => sum + (p.likeCount || 0), 0);
    const totalProducts = products.length;
    const productsWithLikes = products.filter(p => p.likeCount > 0).length;
    const avgLikes = totalProducts > 0 ? (totalLikes / totalProducts).toFixed(2) : 0;

    const productStats = products.map(product => ({
      id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      likeCount: product.likeCount || 0,
      uniqueUsers: product.likes?.length || 0
    }));

    // Get top 5 most liked products
    const topLiked = [...productStats]
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5);

    res.json({
      success: true,
      summary: {
        totalProducts,
        totalLikes,
        productsWithLikes,
        averageLikesPerProduct: avgLikes,
        mostLikedProduct: productStats.length > 0 ? productStats[0] : null
      },
      topLikedProducts: topLiked,
      allProducts: productStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// 3. Get all products liked by a specific user
router.get("/user/:userId/liked-products", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId).select('username email role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Find all products this user liked
    const likedProducts = await Product.find({
      likes: userId
    }).select('name slug price images likeCount description');

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      stats: {
        totalLikedProducts: likedProducts.length,
        totalValue: likedProducts.reduce((sum, p) => sum + p.price, 0)
      },
      likedProducts: likedProducts.map(product => ({
        id: product._id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.images[0] || null,
        description: product.description.substring(0, 100) + '...',
        totalLikes: product.likeCount
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// 4. Get users who liked multiple products (power users)
router.get("/analytics/power-users", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // Aggregate pipeline to find users with most likes
    const powerUsers = await Product.aggregate([
      { $unwind: "$likes" },
      { $group: {
          _id: "$likes",
          likeCount: { $sum: 1 },
          products: { $push: {
            id: "$_id",
            name: "$name",
            price: "$price"
          }}
      }},
      { $sort: { likeCount: -1 } },
      { $limit: 10 }
    ]);

    // Populate user details
    const userIds = powerUsers.map(item => item._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('username email role');

    // Combine data
    const result = powerUsers.map(item => {
      const user = users.find(u => u._id.toString() === item._id.toString());
      return {
        user: user ? {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        } : { id: item._id },
        totalLikes: item.likeCount,
        likedProducts: item.products.slice(0, 5) // Show first 5 products
      };
    });

    res.json({
      success: true,
      powerUsers: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

export default router;