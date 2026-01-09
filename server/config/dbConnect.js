import mongoose from "mongoose";

export const dbConnect = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI is not set. Aborting startup.");
    throw new Error("MONGO_URI environment variable is required");
  }

  try {
    // Prevent long buffering and use modern topology
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // fail fast if cannot reach server
    };

    await mongoose.connect(mongoUri, opts);
    console.log("✅ Connected to MongoDB successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    // Rethrow so calling code can decide how to handle (and deployment can fail fast)
    throw error;
  }
};

export default dbConnect;
