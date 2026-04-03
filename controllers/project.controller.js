import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { logActivity } from "../utils/activityLogger.js";
import { getPagination, paginatedResponse } from "../utils/pagination.js";

// GET /api/projects
export const getProjects = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, search } = req.query;

    const filter = {
      organizationId: req.user.organizationId, // tenant isolation
    };

    if (status) filter.status = status;
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(filter),
    ]);

    res.json({
      success: true,
      ...paginatedResponse(projects, total, page, limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/projects/:id
export const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId, // tenant isolation
    })
      .populate("createdBy", "name email")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" }); // ← 404 not 403
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/projects
export const createProject = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const project = await Project.create({
      title,
      description,
      organizationId: req.user.organizationId, // tenant isolation
      createdBy: req.user._id,
    });

    await logActivity({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: "project.created",
      resourceType: "project",
      resourceId: project._id,
      metadata: { title: project.title },
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/projects/:id
export const updateProject = async (req, res) => {
  try {
    const { title, description, status } = req.body;

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organizationId, //tenant isolation
      },
      { title, description, status },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await logActivity({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: "project.updated",
      resourceType: "project",
      resourceId: project._id,
      metadata: { title: project.title },
    });

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId, //tenant isolation
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Delete all tasks in this project
    await Task.deleteMany({
      projectId: project._id,
      organizationId: req.user.organizationId,
    });

    await logActivity({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: "project.deleted",
      resourceType: "project",
      resourceId: project._id,
      metadata: { title: project.title },
    });

    res.json({ success: true, message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};