import express from "express";
import multer from "multer";
import Attachment from "../models/Attachment.js";
import {
    processUpload,
    UploadError,
    MAX_FILE_BYTES
} from "../utils/fileProcessing.js";

const router = express.Router();

const UNUSED_UPLOAD_HOURS = 24;
const MAX_PENDING_UPLOADS = 20;
const ATTACHMENT_ID_PATTERN = /^[0-9a-f]{24}$/i;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_BYTES,
        files: 1
    }
});

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
            .slice(0, 120) || "file"
    );
};

const publicAttachment = (attachment) => ({
    attachmentId: attachment._id.toString(),
    name: attachment.name,
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    size: attachment.size,
    truncated: attachment.truncated
});

router.post("/", (req, res) => {
    upload.single("file")(req, res, async (uploadError) => {
        if (uploadError) {
            if (uploadError.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    error: "File is too large (maximum 10 MB)."
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
            const pending = await Attachment.countDocuments({
                userId: req.userId,
                threadId: null
            });

            if (pending >= MAX_PENDING_UPLOADS) {
                return res.status(429).json({
                    error: "Too many unused uploads. Send your message first, then attach more."
                });
            }

            const name = cleanFileName(req.file.originalname);
            const result = await processUpload(req.file.buffer, name);

            const attachment = await Attachment.create({
                userId: req.userId,
                name,
                kind: result.kind,
                mimeType: result.mimeType,
                size: req.file.size,
                data: result.data,
                text: result.text,
                truncated: result.truncated || false,
                expiresAt: new Date(
                    Date.now() + UNUSED_UPLOAD_HOURS * 60 * 60 * 1000
                )
            });

            return res.status(201).json({
                attachment: publicAttachment(attachment)
            });
        } catch (err) {
            if (err instanceof UploadError) {
                return res.status(err.status).json({
                    error: err.message
                });
            }

            console.error("Upload error:", err);

            return res.status(500).json({
                error: "Could not process the file. Please try again."
            });
        }
    });
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!ATTACHMENT_ID_PATTERN.test(id)) {
        return res.status(404).json({
            error: "Attachment not found"
        });
    }

    try {
        const attachment = await Attachment.findOne({
            _id: id,
            userId: req.userId
        }).select("+data");

        if (!attachment || attachment.kind !== "image" || !attachment.data) {
            return res.status(404).json({
                error: "Attachment not found"
            });
        }

        res.setHeader("Content-Type", attachment.mimeType);
        res.setHeader("Content-Length", attachment.data.length);
        res.setHeader("Cache-Control", "private, max-age=86400");
        res.setHeader("X-Content-Type-Options", "nosniff");

        return res.send(attachment.data);
    } catch (err) {
        console.error("Download attachment error:", err);

        return res.status(500).json({
            error: "Could not load the attachment"
        });
    }
});

export default router;