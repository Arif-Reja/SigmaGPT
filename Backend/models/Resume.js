import mongoose from "mongoose";
const ResumeSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true
        },
        fileName: {
            type: String,
            default: "",
            maxlength: 200
        },
        mimeType: {
            type: String,
            default: ""
        },
        size: {
            type: Number,
            default: 0
        },
        text: {
            type: String, 
            default: "",
            select: false
        },
        textChars: {
            type: Number,
            default: 0
        },
        truncated: {
            type: Boolean,
            default: false
        },
        preview: {
            type: String, 
            default: "",
            maxlength: 800
        },
        targetRole: {
            type: String,
            default: "",
            trim: true,
            maxlength: 100
        },
        jobDescription: {
            type: String,
            default: "",
            maxlength: 6000
        },
        enabled: {
            type: Boolean, 
            default: true
        }
    },
    { timestamps: true }
);

export default mongoose.model("Resume", ResumeSchema);