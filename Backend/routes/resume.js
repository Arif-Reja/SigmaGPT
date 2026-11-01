import express from "express";
import multer from "multer";
import Resume from "../models/Resume.js";
import { processUpload, UploadError } from "../utils/fileProcessing.js";
import { reviewResume } from "../utils/resumeReview.js";
import { AIJsonError } from "../utils/aiJson.js";

const router = express.Router();

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MIN_RESUME_CHARS = 80;
const MAX_ROLE_CHARS = 100;
const MAX_JOB_CHARS = 6000;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_RESUME_BYTES,
        files: 1
    }
});
const reviewing = new Set();
const cleanFileName = (rawName) => {
    let name = String(rawName || "");

    if (/^[\u0000-\u00ff]*$/.test(name)) {
        const converted = Buffer.from(name, "latin1").toString("utf8");

        if (!converted.includes("\uFFFD")) {
            name = converted;
        }
    }

    return (
        name
            .replace(/[\u0000-\u001f\u007f]/g, " ")
            .replace(/[\\/]/g, "_")
            .trim()
            .slice(0, 120) || "resume"
    );
};

const toPublic = (doc) => ({
    hasResume: Boolean(doc.fileName),
    fileName: doc.fileName || "",
    size: doc.size || 0,
    textChars: doc.textChars || 0,
    truncated: Boolean(doc.truncated),
    preview: doc.preview || "",
    targetRole: doc.targetRole || "",
    jobDescription: doc.jobDescription || "",
    enabled: doc.enabled !== false,
    updatedAt: doc.updatedAt
});

const writeOptions = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true
};

router.get("/", async (req, res) => {
    try {
        const doc = await Resume.findOne({ userId: req.userId });

        return res.status(200).json({
            resume: doc ? toPublic(doc) : null
        });
    } catch (err) {
        console.error("Fetch resume error:", err);

        return res.status(500).json({
            error: "Could not load your interview setup"
        });
    }
});

router.post("/upload", (req, res) => {
    upload.single("file")(req, res, async (uploadError) => {
        if (uploadError) {
            if (uploadError.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    error: "The file is too large (maximum 5 MB)."
                });
            }

            return res.status(400).json({
                error: "Could not read the uploaded file."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: "No file was uploaded."
            });
        }

        try {
            const name = cleanFileName(req.file.originalname);
            const result = await processUpload(req.file.buffer, name);

            if (result.kind !== "file") {
                throw new UploadError(
                    "Please upload a PDF, Word (.docx) or text file, not an image.",
                    415
                );
            }

            if (result.text.length < MIN_RESUME_CHARS) {
                throw new UploadError(
                    "Very little text was found in this file. Use a text-based resume (scanned PDFs are not supported).",
                    422
                );
            }

            const doc = await Resume.findOneAndUpdate(
                { userId: req.userId },
                {
                    $set: {
                        fileName: name,
                        mimeType: result.mimeType,
                        size: req.file.size,
                        text: result.text,
                        textChars: result.text.length,
                        truncated: result.truncated,
                        preview: result.text.slice(0, 800)
                    }
                },
                writeOptions
            );

            return res.status(200).json({
                resume: toPublic(doc)
            });
        } catch (err) {
            if (err instanceof UploadError) {
                return res.status(err.status).json({
                    error: err.message
                });
            }

            console.error("Upload resume error:", err);

            return res.status(500).json({
                error: "Could not save the resume. Please try again."
            });
        }
    });
});

router.put("/settings", async (req, res) => {
    const { targetRole, jobDescription, enabled } = req.body || {};
    const updates = {};

    if (targetRole !== undefined) {
        if (typeof targetRole !== "string" || targetRole.trim().length > MAX_ROLE_CHARS) {
            return res.status(400).json({
                error: `The target role must be text of up to ${MAX_ROLE_CHARS} characters`
            });
        }

        updates.targetRole = targetRole.trim();
    }

    if (jobDescription !== undefined) {
        if (typeof jobDescription !== "string" || jobDescription.trim().length > MAX_JOB_CHARS) {
            return res.status(400).json({
                error: `The job description must be text of up to ${MAX_JOB_CHARS} characters`
            });
        }

        updates.jobDescription = jobDescription.trim();
    }

    if (enabled !== undefined) {
        if (typeof enabled !== "boolean") {
            return res.status(400).json({
                error: "Enabled must be true or false"
            });
        }

        updates.enabled = enabled;
    }

    if (!Object.keys(updates).length) {
        return res.status(400).json({
            error: "Nothing to update"
        });
    }

    try {
        const doc = await Resume.findOneAndUpdate(
            { userId: req.userId },
            { $set: updates },
            writeOptions
        );

        return res.status(200).json({
            resume: toPublic(doc)
        });
    } catch (err) {
        console.error("Save resume settings error:", err);

        return res.status(500).json({
            error: "Could not save your details. Please try again."
        });
    }
});

router.delete("/file", async (req, res) => {
    try {
        const doc = await Resume.findOneAndUpdate(
            { userId: req.userId },
            {
                $set: {
                    fileName: "",
                    mimeType: "",
                    size: 0,
                    text: "",
                    textChars: 0,
                    truncated: false,
                    preview: ""
                }
            },
            { new: true }
        );

        return res.status(200).json({
            resume: doc ? toPublic(doc) : null
        });
    } catch (err) {
        console.error("Remove resume error:", err);

        return res.status(500).json({
            error: "Could not remove the resume. Please try again."
        });
    }
});

router.post("/review", async (req, res) => {
    if (reviewing.has(req.userId)) {
        return res.status(429).json({
            error: "Your resume is already being reviewed. Please wait a moment."
        });
    }

    reviewing.add(req.userId);

    try {
        const doc = await Resume.findOne({ userId: req.userId }).select(
            "+text targetRole jobDescription"
        );

        if (!doc || !doc.text) {
            return res.status(400).json({
                error: "Upload your resume first."
            });
        }

        const review = await reviewResume({
            resumeText: doc.text,
            targetRole: doc.targetRole,
            jobDescription: doc.jobDescription
        });

        return res.status(200).json({ review });
    } catch (err) {
        if (err instanceof AIJsonError) {
            return res.status(err.status).json({
                error: err.message
            });
        }

        console.error("Review resume error:", err);

        return res.status(500).json({
            error: "Could not review the resume. Please try again."
        });
    } finally {
        reviewing.delete(req.userId);
    }
});

export default router;