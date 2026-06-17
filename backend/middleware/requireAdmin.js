export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin privileges required' });
    }

    next();
};
