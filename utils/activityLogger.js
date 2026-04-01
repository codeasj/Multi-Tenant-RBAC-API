
import ActivityLog from "../models/activityLog.model.js";

export const logActivity = async ({
  organizationId,
  userId,
  action,
  resourceType,
  resourceId,
  metadata = {},
}) => {
  try {
    await ActivityLog.create({
      organizationId,
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
    });
  } catch (error) {
    // Never let logging break the main flow
    console.error("Activity log error:", error.message);
  }
};