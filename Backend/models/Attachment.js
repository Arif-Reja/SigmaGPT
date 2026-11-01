import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        kind: {
            type: String,
            enum: ["image", "file"],
            required: true
        },
        mimeType: {
            type: String,
            required: true
        },
        size: {
            type: Number,
            required: true
        },
        data: {
            type: Buffer, 
            select: false
        },
        text: {
            type: String, 
            select: false
        },
        truncated: {
            type: Boolean,
            default: false
        },
        threadId: {
            type: String, 
            default: null,
            index: true
        },
        expiresAt: {
            type: Date, 
            default: null
        }
    },
    { timestamps: true }
);

AttachmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Attachment", AttachmentSchema);