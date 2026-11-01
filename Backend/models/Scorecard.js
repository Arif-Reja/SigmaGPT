import mongoose from "mongoose";

const score = () => ({
    type: Number,
    min: 1,
    max: 10,
    required: true
});

const ScorecardSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true
        },
        threadId: {
            type: String,
            required: true
        },
        threadTitle: {
            type: String,
            default: "",
            maxlength: 100
        },
        topic: {
            type: String,
            default: "Mock interview",
            maxlength: 100
        },
        overall: {
            type: Number, 
            min: 0,
            max: 100,
            required: true
        },
        scores: {
            correctness: score(),
            communication: score(),
            depth: score()
        },
        summary: {
            type: String,
            default: "",
            maxlength: 1500
        },
        strengths: {
            type: [String],
            default: []
        },
        weakSpots: {
            type: [String],
            default: []
        },
        studyNext: {
            type: [
                new mongoose.Schema(
                    {
                        topic: String,
                        why: String
                    },
                    { _id: false }
                )
            ],
            default: []
        },
        questions: {
            type: [
                new mongoose.Schema(
                    {
                        question: String,
                        score: Number,
                        feedback: String
                    },
                    { _id: false }
                )
            ],
            default: []
        },
        answeredCount: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);
ScorecardSchema.index({ userId: 1, threadId: 1 }, { unique: true });
ScorecardSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("Scorecard", ScorecardSchema);