import Product from "../models/product";
import { Request, Response } from "express";
import { saveImages } from "../utils/saveImages";
import { uploadToCloudinary } from "../utils/cloudinary";
import mongoose from "mongoose";

export const addProduct = async (req: Request, res: Response) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    const { 
      name, 
      description, 
      price, 
      weight, 
      type, 
      stock,
      tags,
      isFeatured,
      status
    } = req.body;

    // Handle image uploads - for array uploads, req.files is an array directly
    let images: string[] = [];
    
    // Check for uploaded files - now req.files is an array, not an object
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      images = await Promise.all(
        files.map((file) => 
          uploadToCloudinary(file.buffer, {
            folder: "products",
            width: 800,
            height: 800,
            crop: "limit",
          }).then((r) => r.secure_url)
        )
      );
    }

    // Validation
    if (!name || !price || !description || !weight || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, price, description, weight, and type are required fields" 
      });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // Parse tags
    let parsedTags: string[] = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === 'string') {
        parsedTags = tags.split(',').map((tag: string) => tag.trim());
      }
    }

    // Create product
    const product = await Product.create({ 
      name: name.trim(),
      slug,
      description: description.trim(), 
      price: parseFloat(price),
      weight: weight.trim(),
      type: type.trim(),
      images,
      stock: parseInt(stock) || 0,
      tags: parsedTags,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      status: status || "draft"
    });

    // Format response
    const formattedProduct = {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      images: product.images,
      weight: product.weight,
      reviews: product.reviews,
      type: product.type,
      stock: product.stock,
      isFeatured: product.isFeatured,
      tags: product.tags,
      status: product.status,
      createdAt: product.createdAt.toISOString()
    };

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: formattedProduct
    });
  } catch (err: any) {
    console.error("Create product error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try { 
    const { id } = req.params;
    const updates: any = { ...req.body };
    
    // Handle image uploads for update - now req.files is an array
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const newImages = await Promise.all(
        files.map((file) => 
          uploadToCloudinary(file.buffer, {
            folder: "products",
            width: 800,
            height: 800,
            crop: "limit",
          }).then((r) => r.secure_url)
        )
      );
      
      // Get existing images from request or keep existing
      let existingImages: string[] = [];
      if (req.body.existingImages) {
        try {
          existingImages = JSON.parse(req.body.existingImages);
        } catch {
          existingImages = [];
        }
      }
      
      // Combine existing and new images
      updates.images = [...existingImages, ...newImages];
    } else {
      if (req.body.existingImages) {
        try {
          updates.images = JSON.parse(req.body.existingImages);
        } catch {
          delete updates.images;
        }
      } else {
        delete updates.images;
      }
    }
    
    // Handle numeric fields
    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.stock) updates.stock = parseInt(updates.stock);
    if (updates.reviews) updates.reviews = parseInt(updates.reviews);
    
    // Handle tags if provided as string
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map((tag: string) => tag.trim());
    }
    
    // Handle boolean field
    if (updates.isFeatured !== undefined) {
      updates.isFeatured = updates.isFeatured === 'true' || updates.isFeatured === true;
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }

    // Format response to match UI structure
    const formattedProduct = {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      images: product.images,
      weight: product.weight,
      reviews: product.reviews,
      type: product.type,
      stock: product.stock,
      isFeatured: product.isFeatured,
      tags: product.tags,
      status: product.status,
      createdAt: product.createdAt.toISOString()
    };
    
    res.json({
      success: true,
      message: "Product updated successfully",
      product: formattedProduct
    });
  } catch (err: any) {
    console.error("Update product error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};


export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }
    res.json({ 
      success: true,
      message: "Product deleted successfully" 
    });
  } catch (err: any) {
    console.error("Delete product error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
// controllers/product.ts - Update getProductDetails
export const getProductDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Check if it's a valid ObjectId format
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    
    let product;
    if (isValidObjectId) {
      // If admin, populate likes with user details
      if (userRole === 'admin') {
        product = await Product.findById(id)
          .populate({
            path: 'likes',
            select: 'username email role createdAt'
          });
      } else {
        product = await Product.findById(id);
      }
    }
    
    if (!product) {
      product = await Product.findOne({ slug: id });
    }
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }

    // Base product info
    const formattedProduct: any = {
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      images: product.images,
      weight: product.weight,
      reviews: product.reviews,
      type: product.type,
      stock: product.stock,
      isFeatured: product.isFeatured,
      tags: product.tags,
      status: product.status,
      createdAt: product.createdAt.toISOString(),
      likeCount: product.likeCount || 0,
      liked: userId ? product.likes?.some((like: any) => 
        like._id ? like._id.toString() === userId : like.toString() === userId
      ) : false
    };

    // If admin, include detailed like information
    if (userRole === 'admin' && product.likes) {
      formattedProduct.likesDetails = {
        total: product.likeCount || 0,
        users: product.likes.map((user: any) => ({
          id: user._id || user,
          username: user.username || 'Unknown',
          email: user.email || 'No email',
          role: user.role || 'user',
          likedAt: user.createdAt || null
        }))
      };
    }
    
    res.json({
      success: true,
      product: formattedProduct
    });
  } catch (err: any) {
    console.error("Get product details error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { 
      type, 
      minPrice, 
      maxPrice, 
      search,
      page = 1,
      limit = 20,
      featured,
      tags,
      status
    } = req.query;
    
    const filter: any = {};
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Apply filters
    if (type) filter.type = type;
    if (featured === 'true') filter.isFeatured = true;
    if (status) filter.status = status;
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice as string);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice as string);
    }
    
    // Tag filter
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Product.countDocuments(filter)
    ]);

    // Format products to match UI structure
    const formattedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      images: product.images,
      weight: product.weight,
      reviews: product.reviews,
      type: product.type,
      stock: product.stock,
      isFeatured: product.isFeatured,
      tags: product.tags,
      status: product.status,
      createdAt: product.createdAt.toISOString()
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
    console.error("Get all products error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get published products for frontend
export const getPublishedProducts = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      type,
      minPrice,
      maxPrice,
      search,
      featured
    } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const filter: any = { status: "published" };
    
    // Apply filters
    if (type) filter.type = type;
    if (featured === 'true') filter.isFeatured = true;
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice as string);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice as string);
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Product.countDocuments(filter)
    ]);

    // Format products
    const formattedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      images: product.images,
      weight: product.weight,
      reviews: product.reviews,
      type: product.type,
      stock: product.stock,
      isFeatured: product.isFeatured,
      tags: product.tags,
      createdAt: product.createdAt.toISOString()
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
    console.error("Get published products error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ 
      isFeatured: true,
      status: "published"
    })
    .limit(10);

    // Format products
    const formattedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      images: product.images,
      weight: product.weight,
      reviews: product.reviews,
      type: product.type,
      createdAt: product.createdAt.toISOString()
    }));
    
    res.json({
      success: true,
      products: formattedProducts
    });
  } catch (err: any) {
    console.error("Get featured products error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};