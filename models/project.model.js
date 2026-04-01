
import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  organizationId: {           // tenant isolation key
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,              // index for fast queries
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  },
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);