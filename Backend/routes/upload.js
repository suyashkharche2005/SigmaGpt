import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import { createRequire } from "module";
import Thread from "../models/Thread.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  saveDocumentForThread,
  removeDocumentForThread
} from "../utils/documentStore.js";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return cb(new Error("Only PDF files are allowed"));
    }

    cb(null, true);
  }
});

const chunkText = (text, chunkSize = 400, overlap = 80) => {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks.filter((chunk) => chunk && chunk.trim().length > 0);
};

const getEmbeddings = async (inputs) => {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "SigmaGPT"
    },
    body: JSON.stringify({
      model: "sentence-transformers/all-minilm-l6-v2",
      input: inputs
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.error || "Embedding request failed"
    );
  }

  if (!data?.data || !Array.isArray(data.data)) {
    throw new Error("Invalid embedding response");
  }

  return data.data.map((item) => item.embedding);
};

const extractPdfText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return (result?.text || "").replace(/\s+/g, " ").trim();
  } finally {
    if (typeof parser.destroy === "function") {
      await parser.destroy().catch(() => {});
    }
  }
};

router.post(
  "/",
  protect,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message || "File upload failed"
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { threadId } = req.body;

      if (!threadId) {
        return res.status(400).json({
          error: "threadId is required"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded"
        });
      }

      let thread = await Thread.findOne({
        threadId,
        userId: req.user.id
      });

      if (!thread) {
        thread = await Thread.create({
          threadId,
          userId: req.user.id,
          title: req.file.originalname || "New Chat",
          pinned: false,
          messages: []
        });
      }

      const extractedText = await extractPdfText(req.file.buffer);

      if (!extractedText) {
        return res.status(400).json({
          error: "Could not extract text from this PDF"
        });
      }

      const safeText = extractedText.slice(0, 150000);
      const chunks = chunkText(safeText, 400, 80);

      if (chunks.length === 0) {
        return res.status(400).json({
          error: "No valid text chunks found in PDF"
        });
      }

      const embeddings = await getEmbeddings(chunks);

      saveDocumentForThread(threadId, {
        fileName: req.file.originalname,
        text: safeText,
        chunks,
        embeddings,
        uploadedAt: new Date().toISOString(),
        userId: String(req.user.id)
      });

      thread.updatedAt = new Date();
      await thread.save();

      return res.status(200).json({
        fileName: req.file.originalname,
        chunkCount: chunks.length,
        semanticReady: true
      });
    } catch (error) {
      console.error("PDF upload error:", error);
      return res.status(500).json({
        error: error.message || "Failed to process PDF"
      });
    }
  }
);

router.delete("/remove/:threadId", protect, async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({
        error: "threadId is required"
      });
    }

    const thread = await Thread.findOne({
      threadId,
      userId: req.user.id
    });

    if (!thread) {
      return res.status(404).json({
        error: "Thread not found or unauthorized"
      });
    }

    const removed = removeDocumentForThread(threadId);

    return res.status(200).json({
      success: true,
      removed,
      message: removed
        ? "Document removed successfully"
        : "No document found for this thread"
    });
  } catch (error) {
    console.error("PDF remove error:", error);
    return res.status(500).json({
      error: "Failed to remove document"
    });
  }
});

export default router;