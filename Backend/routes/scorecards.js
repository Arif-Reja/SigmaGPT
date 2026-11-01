import express from "express";
import Thread from "../models/Thread.js";
import Scorecard from "../models/Scorecard.js";
import { buildScorecard, ScorecardError } from "../utils/scorecard.js";

const router = express.Router();

const ID_PATTERN = /^[0-9a-f]{24}$/i;
const MIN_USER_MESSAGES = 2; 
const MAX_LISTED = 100;
const inProgress = new Set();

const toSummary = (doc) => ({
    id: doc._id.toString(),
    threadId: doc.threadId,
    topic: doc.topic,
    threadTitle: doc.threadTitle,
    overall: doc.overall,
    scores: {
        correctness: doc.scores.correctness,
        communication: doc.scores.communication,
        depth: doc.scores.depth
    },
    answeredCount: doc.answeredCount,
    date: doc.updatedAt
});

const toFull = (doc) => ({
    ...toSummary(doc),
    summary: doc.summary,
    strengths: [...(doc.strengths || [])],
    weakSpots: [...(doc.weakSpots || [])],
    studyNext: (doc.studyNext || []).map(({ topic, why }) => ({ topic, why })),
    questions: (doc.questions || []).map(({ question, score, feedback }) => ({
        question,
        score,
        feedback
    }))
});

router.post("/", async (req, res) => {
    const { threadId } = req.body || {};

    if (typeof threadId !== "string" || !threadId.trim()) {
        return res.status(400).json({
            error: "Thread ID is required"
        });
    }

    const cleanThreadId = threadId.trim();
    const lockKey = `${req.userId}:${cleanThreadId}`;

    if (inProgress.has(lockKey)) {
        return res.status(429).json({
            error: "This scorecard is already being created. Please wait a moment."
        });
    }

    inProgress.add(lockKey);

    try {
        const thread = await Thread.findOne({
            threadId: cleanThreadId,
            userId: req.userId
        }).lean();

        if (!thread) {
            return res.status(404).json({
                error: "Chat not found. Answer at least one question first."
            });
        }

        const userMessages = thread.messages.filter(
            (message) => message.role === "user"
        ).length;

        if (userMessages < MIN_USER_MESSAGES) {
            return res.status(400).json({
                error: "Answer at least one question before finishing the interview."
            });
        }

        const result = await buildScorecard(thread.messages);

        let doc = await Scorecard.findOne({
            userId: req.userId,
            threadId: cleanThreadId
        });

        if (!doc) {
            doc = new Scorecard({
                userId: req.userId,
                threadId: cleanThreadId
            });
        }

        doc.set({
            threadTitle: thread.title,
            ...result
        });

        await doc.save();

        return res.status(200).json({
            scorecard: toFull(doc)
        });
    } catch (err) {
        if (err instanceof ScorecardError) {
            return res.status(err.status).json({
                error: err.message
            });
        }

        console.error("Create scorecard error:", err);

        return res.status(500).json({
            error: "Could not create the scorecard. Please try again."
        });
    } finally {
        inProgress.delete(lockKey);
    }
});

router.get("/", async (req, res) => {
    try {
        const docs = await Scorecard.find({ userId: req.userId })
            .select(
                "threadId topic threadTitle overall scores answeredCount updatedAt"
            )
            .sort({ updatedAt: -1 })
            .limit(MAX_LISTED)
            .lean();

        return res.status(200).json({
            scorecards: docs.map(toSummary)
        });
    } catch (err) {
        console.error("List scorecards error:", err);

        return res.status(500).json({
            error: "Could not load your scorecards"
        });
    }
});

router.get("/:id", async (req, res) => {
    const { id } = req.params;

    if (!ID_PATTERN.test(id)) {
        return res.status(404).json({
            error: "Scorecard not found"
        });
    }

    try {
        const doc = await Scorecard.findOne({
            _id: id,
            userId: req.userId
        }).lean();

        if (!doc) {
            return res.status(404).json({
                error: "Scorecard not found"
            });
        }

        return res.status(200).json({
            scorecard: toFull(doc)
        });
    } catch (err) {
        console.error("Fetch scorecard error:", err);

        return res.status(500).json({
            error: "Could not load the scorecard"
        });
    }
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    if (!ID_PATTERN.test(id)) {
        return res.status(404).json({
            error: "Scorecard not found"
        });
    }

    try {
        const deleted = await Scorecard.findOneAndDelete({
            _id: id,
            userId: req.userId
        });

        if (!deleted) {
            return res.status(404).json({
                error: "Scorecard not found"
            });
        }

        return res.status(200).json({
            success: true
        });
    } catch (err) {
        console.error("Delete scorecard error:", err);

        return res.status(500).json({
            error: "Could not delete the scorecard"
        });
    }
});

export default router;