import jwt from "jsonwebtoken";
export const signToken = (userId) =>
    jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: "7d"
    });

const requireAuth = (req, res, next) => {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            error: "Please log in to continue"
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });

        req.userId = String(payload.sub);

        return next();
    } catch (err) {
        return res.status(401).json({
            error: "Your session has expired. Please log in again."
        });
    }
};

export default requireAuth;