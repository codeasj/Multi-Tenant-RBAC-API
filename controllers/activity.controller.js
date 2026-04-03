
import ActivityLog from "../models/activityLog.model.js";
import { getPagination, paginatedResponse } from "../utils/pagination.js";

// GET /api/activity
export const getActivityLogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { resourceType, userId } = req.query;

    const filter = {
      organizationId: req.user.organizationId, //tenant isolation
    };

    if (resourceType) filter.resourceType = resourceType;
    if (userId) filter.userId = userId;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      ...paginatedResponse(logs, total, page, limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};