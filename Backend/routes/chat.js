import express from "express";
import fetch from "node-fetch";
import Thread from "../models/Thread.js";
import { protect } from "../middleware/authMiddleware.js";
import { getDocumentForThread } from "../utils/documentStore.js";

const router = express.Router();

const DEBUG = true;
const STRICT_MATCH_THRESHOLD = 0.45;
const GOOD_MATCH_THRESHOLD = 0.4;
const MIN_KEYWORD_RATIO = 0.35;
const OPENROUTER_URL = "https://openrouter.ai/api/v1";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
  "X-Title": "SigmaGPT"
};

const STOP_WORDS = new Set([
  "what",
  "is",
  "the",
  "of",
  "in",
  "a",
  "an",
  "to",
  "and",
  "for",
  "from",
  "with",
  "this",
  "that",
  "does",
  "about",
  "into",
  "are",
  "was",
  "were",
  "how",
  "when",
  "where",
  "which",
  "can",
  "you",
  "tell",
  "me",
  "please",
  "give",
  "show",
  "find",
  "explain",
  "document",
  "pdf",
  "uploaded"
]);

const MODE_PROMPTS = {
  general: "You are a helpful AI assistant.",
  explain: "Explain clearly in simple language with examples.",
  code: "Answer like a senior software engineer. Give clean, working, and optimized code. Keep explanation short unless needed.",
  summarize: "Summarize in concise bullet points and highlight only the most important ideas.",
  study: "Answer like a study assistant. Make it easy to learn, structured, and exam-friendly.",
  debug: "Debug step by step. Identify the issue, explain the reason, and provide the fix clearly."
};

const authHeaders = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing in .env");
  }

  return {
    ...BASE_HEADERS,
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
  };
};

const logRetrievalSummary = ({
  threadId,
  doc,
  mode,
  isSummaryQuery,
  validChunks = [],
  topChunks = [],
  usedDocumentSources = false
}) => {
  if (!DEBUG) return;

  console.log("\n==============================");
  console.log("🤖 SigmaGPT Retrieval");
  console.log("🧵 Thread:", threadId);
  console.log("🧠 Mode:", mode);

  if (!doc) {
    console.log("📄 Document: Not found");
    console.log("==============================\n");
    return;
  }

  console.log("📄 PDF:", doc.fileName || "Unnamed document");
  console.log("📚 Chunks:", doc?.chunks?.length || 0);
  console.log("📝 Query Type:", isSummaryQuery ? "Summary" : "Question Answering");
  console.log("📎 Using PDF Sources:", usedDocumentSources ? "Yes" : "No");

  const best = validChunks[0] || topChunks[0];
  if (best) {
    console.log("⭐ Best Score:", Number(best.boostedScore || best.score || 0).toFixed(3));
    console.log(
      "🧩 Best Preview:",
      (best.chunk || "").slice(0, 100).replace(/\s+/g, " ") + "..."
    );
  }

  console.log("==============================\n");
};

const cosineSimilarity = (a, b) => {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (!magA || !magB) return 0;
  return dot / (magA * magB);
};

const normalizeScore = (score, min = 0.2, max = 0.55) => {
  if (score <= min) return 0;
  if (score >= max) return 1;
  return (score - min) / (max - min);
};

const extractImportantWords = (text) => {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
};

const getKeywordRatio = (question, text) => {
  const qWords = extractImportantWords(question);
  if (!qWords.length) return 0;

  const lowerText = text.toLowerCase();
  const matched = qWords.filter((word) => lowerText.includes(word));
  return matched.length / qWords.length;
};

const getExactMatchBonus = (question, text) => {
  const q = question.toLowerCase();
  const t = text.toLowerCase();

  if (/dataset\s*1/.test(q) && /dataset\s*1/.test(t)) return 1;
  if (/dataset\s*2/.test(q) && /dataset\s*2/.test(t)) return 1;
  if (/dataset\s*3/.test(q) && /dataset\s*3/.test(t)) return 1;

  const qWords = extractImportantWords(question);
  const strongMatches = qWords.filter((word) => t.includes(word)).length;

  if (qWords.length && strongMatches / qWords.length >= 0.75) return 0.8;
  if (qWords.length && strongMatches / qWords.length >= 0.5) return 0.4;

  return 0;
};

const getAnswerSupportRatio = (answer, text) => {
  if (!answer) return 0;

  const answerWords = answer
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4 && !STOP_WORDS.has(word));

  if (!answerWords.length) return 0;

  const lowerText = text.toLowerCase();
  const matched = answerWords.filter((word) => lowerText.includes(word));
  return matched.length / answerWords.length;
};

const rerankChunks = (question, rankedChunks) => {
  return rankedChunks
    .map((item) => {
      const keywordRatio = getKeywordRatio(question, item.chunk);
      const exactBonus = getExactMatchBonus(question, item.chunk);

      let boostedScore =
        item.score +
        keywordRatio * 0.35 +
        exactBonus * 0.35;

      if (item.score < 0.3) {
        boostedScore -= 0.2;
      }

      return {
        ...item,
        keywordRatio,
        exactBonus,
        boostedScore
      };
    })
    .sort((a, b) => b.boostedScore - a.boostedScore);
};

const calculateChunkConfidence = (
  question,
  chunk,
  boostedScore,
  answer = ""
) => {
  const normalizedSemantic = normalizeScore(boostedScore);
  const keywordRatio = getKeywordRatio(question, chunk);
  const exactBonus = getExactMatchBonus(question, chunk);
  const answerSupport = getAnswerSupportRatio(answer, chunk);

  let confidence =
    normalizedSemantic * 4 +
    keywordRatio * 3 +
    exactBonus * 2 +
    answerSupport * 1.5;

  if (boostedScore < 0.4) confidence -= 2.5;
  if (keywordRatio < 0.3) confidence -= 1.5;
  if (exactBonus === 0) confidence -= 0.5;
  if (answerSupport < 0.2) confidence -= 1;

  confidence = Math.max(1, Math.min(9, confidence));
  return Number(confidence.toFixed(1));
};

const getConfidenceLabel = (confidence) => {
  if (confidence >= 8) return "High";
  if (confidence >= 6) return "Medium";
  if (confidence >= 4) return "Low";
  return "Very Low";
};

const openRouterJson = async (path, body) => {
  const response = await fetch(`${OPENROUTER_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.error || "OpenRouter request failed"
    );
  }

  return data;
};

const getQueryEmbedding = async (input) => {
  const data = await openRouterJson("/embeddings", {
    model: "sentence-transformers/all-minilm-l6-v2",
    input
  });

  return data.data[0].embedding;
};

const generateThreadTitle = async (message) => {
  try {
    const data = await openRouterJson("/chat/completions", {
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Generate a short 4-5 word title for: ${message}`
        }
      ]
    });

    return (data?.choices?.[0]?.message?.content || "New Chat").replace(/["']/g, "");
  } catch {
    return "New Chat";
  }
};

const getSummaryChunks = (chunks, limit = 8) => {
  if (!chunks?.length) return [];
  if (chunks.length <= limit) return chunks;

  const selected = [];
  const step = Math.max(1, Math.floor(chunks.length / limit));

  for (let i = 0; i < chunks.length && selected.length < limit; i += step) {
    selected.push(chunks[i]);
  }

  return selected;
};

const getSummaryConfidence = (chunk, index, totalChunks) => {
  const chunkLengthScore = Math.min(chunk.length / 400, 1.2);
  const positionBonus = index === 0 ? 0.6 : index === 1 ? 0.3 : 0.1;
  const coverageBonus = totalChunks >= 6 ? 0.6 : totalChunks >= 3 ? 0.3 : 0.1;

  let confidence = 5 + chunkLengthScore * 1.4 + positionBonus + coverageBonus;
  confidence = Math.max(5, Math.min(8, confidence));

  return Number(confidence.toFixed(1));
};

const buildSummarySourceMeta = (chunks) =>
  chunks.slice(0, 3).map((chunk, index) => {
    const confidence = getSummaryConfidence(chunk, index, chunks.length);

    return {
      id: index + 1,
      retrievalScore: 100,
      confidence,
      confidenceLabel: getConfidenceLabel(confidence),
      snippet: chunk.slice(0, 220)
    };
  });

const buildDocumentPrompt = ({
  docName,
  message,
  chunks,
  summary = false
}) => {
  const context = chunks
    .map((item, index) =>
      typeof item === "string"
        ? item
        : `[Source ${index + 1}] ${item.chunk}`
    )
    .join("\n\n");

  if (summary) {
    return `
You are a strict AI assistant.

Summarize the PDF only from the context below.
Do not use outside knowledge.
Keep the answer clear and structured.

PDF Name: ${docName}

DOCUMENT CONTEXT:
${context}

TASK:
${message}
`;
  }

  return `
You are a strict AI assistant.

Answer using ONLY the provided document context.

If answer is partially found:
Explain using available information clearly.

If answer is not exact:
Give the best possible explanation from context.

Do NOT say "not available" unless nothing relevant exists.
Do NOT use outside knowledge.
Do NOT guess.
Do NOT add external information.

PDF Name: ${docName}

DOCUMENT CONTEXT:
${context}

QUESTION:
${message}
`;
};

const buildGeneralKnowledgePrompt = (message) => `
You are a helpful AI assistant.

The uploaded PDF does not contain a strong relevant match for this question.
So answer using your general knowledge clearly and directly.

Do not mention missing document context unless the user specifically asks.
Just answer the question normally.

Question:
${message}
`;

const getHistoryMessages = (messages) =>
  messages
    .filter(
      (m) =>
        m &&
        m.role &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
    .slice(-5);

// ================= THREAD ROUTES =================

router.get("/thread", protect, async (req, res) => {
  try {
    const threads = await Thread.find({ userId: req.user.id })
      .sort({ pinned: -1, updatedAt: -1 })
      .select("threadId title pinned updatedAt");

    res.json(threads);
  } catch (err) {
    console.error("❌ Fetch threads error:", err);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

router.get("/thread/:threadId", protect, async (req, res) => {
  try {
    const thread = await Thread.findOne({
      threadId: req.params.threadId,
      userId: req.user.id
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(thread.messages);
  } catch (err) {
    console.error("❌ Fetch chat error:", err);
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

router.delete("/thread/:threadId", protect, async (req, res) => {
  try {
    const deletedThread = await Thread.findOneAndDelete({
      threadId: req.params.threadId,
      userId: req.user.id
    });

    if (!deletedThread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json({ success: "Thread deleted successfully" });
  } catch (err) {
    console.error("❌ Delete thread error:", err);
    res.status(500).json({ error: "Failed to delete thread" });
  }
});

router.patch("/thread/:threadId/rename", protect, async (req, res) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    const updatedThread = await Thread.findOneAndUpdate(
      {
        threadId: req.params.threadId,
        userId: req.user.id
      },
      {
        title: title.trim(),
        updatedAt: new Date()
      },
      {
        returnDocument: "after"
      }
    );

    if (!updatedThread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(updatedThread);
  } catch (err) {
    console.error("❌ Rename thread error:", err);
    res.status(500).json({ error: "Failed to rename thread" });
  }
});

router.patch("/thread/:threadId/pin", protect, async (req, res) => {
  try {
    const updatedThread = await Thread.findOneAndUpdate(
      {
        threadId: req.params.threadId,
        userId: req.user.id
      },
      {
        pinned: !!req.body.pinned,
        updatedAt: new Date()
      },
      {
        returnDocument: "after"
      }
    );

    if (!updatedThread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(updatedThread);
  } catch (err) {
    console.error("❌ Pin thread error:", err);
    res.status(500).json({ error: "Failed to pin thread" });
  }
});

// ================= CHAT ROUTE =================

router.post("/", protect, async (req, res) => {
  const { threadId, message, mode = "general" } = req.body;

  if (!threadId || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let thread = await Thread.findOne({
      threadId,
      userId: req.user.id
    });

    if (!thread) {
      thread = new Thread({
        threadId,
        userId: req.user.id,
        title: "New Chat",
        pinned: false,
        messages: []
      });
    }

    if (thread.messages.length === 0) {
      thread.title = await generateThreadTitle(message);
    }

    const doc = getDocumentForThread(threadId);
    const normalizedMessage = message.toLowerCase().trim();

    const isSummaryQuery =
      mode === "summarize" ||
      normalizedMessage.includes("summarize") ||
      normalizedMessage.includes("summary") ||
      normalizedMessage.includes("brief") ||
      normalizedMessage.includes("overview");

    let finalMessage = message;
    let sourceMeta = [];
    let usedDocumentSources = false;

    if (doc?.chunks?.length && doc?.embeddings?.length) {
      const docName = doc.fileName || "Document";

      if (isSummaryQuery) {
        const summaryChunks = getSummaryChunks(doc.chunks, 8);

        sourceMeta = buildSummarySourceMeta(summaryChunks);
        usedDocumentSources = true;

        logRetrievalSummary({
          threadId,
          doc,
          mode,
          isSummaryQuery,
          validChunks: summaryChunks.slice(0, 3).map((chunk) => ({
            chunk,
            boostedScore: 1
          })),
          topChunks: [],
          usedDocumentSources
        });

        finalMessage = buildDocumentPrompt({
          docName,
          message,
          chunks: summaryChunks,
          summary: true
        });
      } else {
        const expandedQuery = `
${message}
Explain definition, steps, algorithm, working, example if present.
`.trim();

        const queryEmbedding = await getQueryEmbedding(expandedQuery);

        const rankedChunksRaw = doc.chunks
          .map((chunk, idx) => ({
            chunk,
            score: cosineSimilarity(queryEmbedding, doc.embeddings[idx])
          }))
          .sort((a, b) => b.score - a.score);

        const rankedChunks = rerankChunks(message, rankedChunksRaw);
        const topChunks = rankedChunks.slice(0, 8);

        const bestChunk = topChunks[0];
        const bestScore = bestChunk?.boostedScore || 0;
        const bestKeywordRatio = bestChunk?.keywordRatio || 0;

        const hasStrongMatch =
          bestChunk &&
          bestScore >= STRICT_MATCH_THRESHOLD &&
          bestKeywordRatio >= MIN_KEYWORD_RATIO;

        if (hasStrongMatch) {
          const strongChunks = topChunks
            .filter(
              (item) =>
                item.boostedScore >= GOOD_MATCH_THRESHOLD &&
                item.keywordRatio >= 0.3
            )
            .slice(0, 3);

          sourceMeta = strongChunks.map((item, index) => {
            let confidence = calculateChunkConfidence(
              message,
              item.chunk,
              item.boostedScore
            );

            confidence = Math.max(5, Math.min(8, confidence));

            return {
              id: index + 1,
              retrievalScore: Number((item.score * 100).toFixed(1)),
              confidence,
              confidenceLabel: getConfidenceLabel(confidence),
              snippet: item.chunk.slice(0, 220)
            };
          });

          usedDocumentSources = true;

          finalMessage = buildDocumentPrompt({
            docName,
            message,
            chunks: strongChunks
          });
        } else {
          sourceMeta = [];
          usedDocumentSources = false;
          finalMessage = buildGeneralKnowledgePrompt(message);
        }

        logRetrievalSummary({
          threadId,
          doc,
          mode,
          isSummaryQuery,
          validChunks: hasStrongMatch ? topChunks.slice(0, 3) : [],
          topChunks,
          usedDocumentSources
        });
      }
    } else {
      logRetrievalSummary({
        threadId,
        doc: null,
        mode,
        isSummaryQuery,
        validChunks: [],
        topChunks: [],
        usedDocumentSources: false
      });
    }

    finalMessage = `${MODE_PROMPTS[mode] || MODE_PROMPTS.general}

${finalMessage}`;

    const requestMessages = [
      {
        role: "system",
        content:
          "You are a careful AI assistant. Follow the user's document constraints strictly."
      },
      ...getHistoryMessages(thread.messages),
      {
        role: "user",
        content: finalMessage
      }
    ];

    const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        stream: true,
        messages: requestMessages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter HTTP Error:", response.status, errorText);
      return res.status(500).json({ error: "OpenRouter request failed" });
    }

    if (!response.body) {
      return res.status(500).json({ error: "No response body from OpenRouter" });
    }

    thread.messages.push({
      role: "user",
      content: message
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Source-Meta", encodeURIComponent(JSON.stringify(sourceMeta)));

    let fullReply = "";

    response.body.on("data", (chunk) => {
      const lines = chunk
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.replace("data: ", "");

        if (data === "[DONE]") {
          thread.messages.push({
            role: "assistant",
            content: fullReply

          });

          thread.updatedAt = new Date();
                    thread.save();

          if (DEBUG) {
            console.log("✅ Response completed for thread:", threadId);
          }

          res.end();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const token = parsed?.choices?.[0]?.delta?.content;

          if (token) {
            fullReply += token;
            res.write(token);
          }
        } catch {
          if (DEBUG) {
            console.log("⚠️ Stream parse skip");
          }
        }
      }
    });

    response.body.on("end", () => {
      if (!res.writableEnded) res.end();
    });

    response.body.on("error", (streamErr) => {
      console.error("❌ Stream error:", streamErr);
      if (!res.writableEnded) res.end();
    });
  } catch (err) {
    console.error("❌ AI Error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;