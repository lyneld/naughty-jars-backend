import { Request, Response } from "express";
import Crew from "../models/crew";
import { uploadToCloudinary } from "../utils/cloudinary";

export const createCrew = async (req: Request, res: Response) => {
  try {
    const { name, position, contact, email, description, status } = req.body;

    // Validate input
    if (!name || !position || !contact || !email || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, position, contact, email, description) are required",
      });
    }

    // Check duplicate email
    const existingCrew = await Crew.findOne({ email });
    if (existingCrew) {
      return res.status(409).json({ 
        success: false,
        message: "Crew with this email already exists" 
      });
    }

    let imageUrl: string | undefined;
    const imageFile = req.file;
    if(imageFile) {
      const result = await uploadToCloudinary(imageFile.buffer, {
        folder: "crew",
        width: 400,
        height: 400,
        crop: "fill",
      })
      imageUrl = result.secure_url;
    }

    // Create crew member
    const crew = await Crew.create({ 
      name, 
      position, 
      contact, 
      email, 
      description,
      image: imageUrl,
      status: status || "active"
    });

    // Optional: Create user account for crew member
    // Uncomment if you want to create login credentials
    /*
    const defaultPassword = "Crew@123";
    const user = await User.create({
      username: name,
      email,
      password: defaultPassword,
      role: "crew",
    });
    */

    res.status(201).json({
      success: true,
      message: "Crew member created successfully",
      crew,
      // user, // Uncomment if creating user account
      // defaultPassword, // Uncomment if creating user account
    });
  } catch (err) {
    console.error("Create crew error:", err);
    res.status(500).json({ 
      success: false,
      message: "Internal Server Error", 
      error: (err as Error).message 
    });
  }
};

export const getAllCrew = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    
    let filter: any = {};
    
    // Apply status filter if provided
    if (status) {
      filter.status = status;
    }
    
    // Apply search filter if provided
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const crew = await Crew.find(filter).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      crew,
      total: crew.length
    });
  } catch (err) {
    console.error("Error fetching crew:", err);
    res.status(500).json({ 
      success: false,
      error: (err as Error).message 
    });
  }
};

export const getCrewById = async (req: Request, res: Response) => {
  try {
    const crew = await Crew.findById(req.params.id);
    if (!crew) return res.status(404).json({ 
      success: false,
      message: "Crew member not found" 
    });
    
    res.json({
      success: true,
      crew
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: (err as Error).message 
    });
  }
};

export const updateCrew = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Define restricted fields that cannot be updated
    const restrictedFields = ['_id', 'createdAt', 'updatedAt', '__v'];
    restrictedFields.forEach(field => delete updates[field]);

    // Check if email is being updated and validate uniqueness
    if (updates.email) {
      const existingCrew = await Crew.findOne({ 
        email: updates.email, 
        _id: { $ne: id } 
      });
      
      if (existingCrew) {
        res.status(409).json({ 
          success: false,
          message: "Crew with this email already exists" 
        });
        return;
      }
    }

    // Handle image update if provided
    const imageFile = req.file;
    if (imageFile) {
      const result = await uploadToCloudinary(imageFile.buffer, {
        folder: "crew",
        width: 400,
        height: 400,
        crop: "fill",
      })
      updates.image = result.secure_url;
    }

    const updatedCrew = await Crew.findByIdAndUpdate(
      id, 
      { $set: updates }, 
      { new: true, runValidators: true }
    );

    if (!updatedCrew) {
      res.status(404).json({ 
        success: false,
        message: "Crew member not found" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Crew member updated successfully",
      crew: updatedCrew
    });

  } catch (error: any) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ 
        success: false,
        error: "Validation Error", 
        details: error.message 
      });
      return;
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

export const deleteCrew = async (req: Request, res: Response) => {
  try {
    const crew = await Crew.findByIdAndDelete(req.params.id);
    if (!crew) return res.status(404).json({ 
      success: false,
      message: "Crew member not found" 
    });
    
    // Optional: Also delete associated user account
    // await User.findOneAndDelete({ email: crew.email });
    
    res.json({ 
      success: true,
      message: "Crew member deleted successfully" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: (err as Error).message 
    });
  }
};

// New endpoint for bulk status update
export const updateCrewStatus = async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    
    if (!ids || !status) {
      return res.status(400).json({
        success: false,
        message: "IDs and status are required"
      });
    }
    
    const result = await Crew.updateMany(
      { _id: { $in: ids } },
      { $set: { status } }
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} crew members updated`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: (err as Error).message 
    });
  }
};