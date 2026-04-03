
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Shorthand helpers
export const ownerOnly = requireRole("owner");
export const  adminAndAbove = requireRole("owner", "admin");
export const memberAndAbove = requireRole("owner", "admin", "member");