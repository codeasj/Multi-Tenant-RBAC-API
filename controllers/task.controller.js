
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import { logActivity } from "../utils/activityLogger.js";
import { getPagination, paginatedResponse } from "../utils/pagination.js";

// Verify project belongs to org - reused across task routes
const verifyProject = async (projectId, organizationId) => {
  return await Project.findOne({ _id: projectId, organizationId });
};

// GET /api/tasks?projectId=xxx
export const getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const filter = {
      organizationId: req.user.organizationId, //tenant isolation
    };

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignedTo", "name email")
        .populate("createdBy", "name email")
        .populate("projectId", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      ...paginatedResponse(tasks, total, page, limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/tasks/:id
export const getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId, // tenant isolation
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("projectId", "title")
      .lean();

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/tasks
export const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, projectId, assignedTo } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ message: "Title and projectId are required" });
    }

    // Verify project belongs to this org
    const project = await verifyProject(projectId, req.user.organizationId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      projectId,
      assignedTo: assignedTo || null,
      organizationId: req.user.organizationId, // ← tenant isolation
      createdBy: req.user._id,
    });

    await logActivity({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: "task.created",
      resourceType: "task",
      resourceId: task._id,
      metadata: { title: task.title, projectId },
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/tasks/:id
export const updateTask = async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo } = req.body;

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId: req.user.organizationId, // tenant isolation
      },
      { title, description, status, priority, assignedTo },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await logActivity({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: "task.updated",
      resourceType: "task",
      resourceId: task._id,
      metadata: { title: task.title, status: task.status },
    });

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId, // ← tenant isolation
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await logActivity({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: "task.deleted",
      resourceType: "task",
      resourceId: task._id,
      metadata: { title: task.title },
    });

    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};