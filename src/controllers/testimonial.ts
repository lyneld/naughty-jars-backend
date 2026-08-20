import {Request, Response} from 'express';
import Testimonial, { ITestimonial} from '../models/testimonial';
import mongoose from 'mongoose';

// Create a new testimonial
export const createTestimonial = async (req: Request, res: Response) => {
  try {
    const { name, content, rating } = req.body;
    const testimonial: ITestimonial = new Testimonial({
      name,
      content,
      rating,
    });
    const savedTestimonial = await testimonial.save();
    res.status(201).json(savedTestimonial);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all testimonials with pagination
export const getTestimonials = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const testimonials = await Testimonial.find()
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Testimonial.countDocuments();

    res.json({
      testimonials,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};