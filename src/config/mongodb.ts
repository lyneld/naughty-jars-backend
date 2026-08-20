import mongoose from "mongoose";

export const connectDB = async (mongoUri: string) => {
  try {
    mongoose.set("sanitizeFilter", true);
    await mongoose.connect(mongoUri);
    
    console.log("Database Connected");
    console.log(`Connected to database: ${mongoose.connection.db.databaseName}`);
    return mongoose.connection;
  } catch (error) {
    console.error("Database Connection Error: ", error);
    throw error;
  }
};

mongoose.connection.on("error", (error) => {
  console.error("Mongoose Connection Error: ", error);
});

export const getNaughtyJarsCollection = () => {
  return mongoose.connection.db?.collection("naughty_jars");
};
