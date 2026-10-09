import "./Chat.css";
import React, { useContext, useEffect, useRef, useState } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { motion } from "framer-motion";

function Chat() {
  const { newChat, prevChats, setPrompt, activeMode } = useContext(MyContext);
  const chatEndRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [prevChats]);

  const suggestions = [
    {
      icon: "🧠",
      title: "Explain a concept simply",
      desc: "Break down a difficult topic into easy language with examples.",
      prompt: "Explain recursion in simple words with a real-life example."
    },
    {
      icon: "💻",
      title: "Help with coding",
      desc: "Debug, improve, or generate code for your next project.",
      prompt: "Help me build a React login form with validation."
    },
    {
      icon: "📚",
      title: "Summarize notes",
      desc: "Turn long notes into short, high-value key points.",
      prompt: "Summarize this topic into important exam points."
    },
    {
      icon: "✍️",
      title: "Create better content",
      desc: "Draft emails, answers, reports, and project descriptions faster.",
      prompt: "Write a professional project description for my AI chat app."
    }
  ];

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.log("Copy failed:", err);
    }
  };

  const getModeLabel = () => {
    switch (activeMode) {
      case "explain":
        return "EXPLAIN MODE";
      case "code":
        return "CODE MODE";
      case "summarize":
        return "SUMMARIZE MODE";
      case "study":
        return "STUDY MODE";
      case "debug":
        return "DEBUG MODE";
      default:
        return "NEXT-GEN AI WORKSPACE";
    }
  };

  const normalizeSources = (sources) => {
    if (!Array.isArray(sources)) return [];

    return sources.filter((source) => {
      const retrieval = Number(source?.retrievalScore ?? 0);
      const confidence = Number(source?.confidence ?? 0);
      const snippet = String(source?.snippet || "").trim();

      const hasSnippet = snippet.length > 30;

      const strongEnough =
        (retrieval >= 30 && confidence >= 5) ||
        retrieval >= 40 ||
        confidence >= 6;

      return hasSnippet && strongEnough;
    });
  };

  const shouldShowGeneralKnowledge = (chat) => {
    const sources = normalizeSources(chat?.sources);

    return (
      chat?.role === "assistant" &&
      chat?.content?.trim() &&
      (!Array.isArray(chat.sources) || sources.length === 0)
    );
  };

  return (
    <div className="chats">
      <div className="chatContent">
        {newChat && prevChats?.length === 0 && (
          <motion.div
            className="welcomeWrap"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <motion.div
              className="welcomeBadge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              {getModeLabel()}
            </motion.div>

            <motion.h1
              className="welcome"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.45 }}
            >
              Build faster with{" "}
              <span className="welcomeGradient">SigmaGPT</span>
            </motion.h1>

            <motion.div
              className="welcomeSub"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.45 }}
            >
              Your intelligent workspace for learning, coding, summarizing,
              and getting things done with a cleaner AI experience.
            </motion.div>

            <div className="promptGrid">
              {suggestions.map((item, index) => (
                <motion.div
                  key={index}
                  className="promptCard"
                  onClick={() => setPrompt(item.prompt)}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 + index * 0.08, duration: 0.38 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                >
                  <div className="promptIcon">{item.icon}</div>
                  <div className="promptTitle">{item.title}</div>
                  <div className="promptDesc">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {prevChats?.map((chat, idx) => {
          const filteredSources = normalizeSources(chat?.sources);
          const showSources =
            chat.role === "assistant" &&
            Array.isArray(chat.sources) &&
            chat.sources.length > 0 &&
            filteredSources.length > 0;

          const showGeneralKnowledge = shouldShowGeneralKnowledge(chat);

          return (
            <motion.div
              key={idx}
              className={
                chat.role === "user"
                  ? "messageRow userRow"
                  : "messageRow aiRow"
              }
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {chat.role !== "user" && (
                <motion.div
                  className="avatar"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  🤖
                </motion.div>
              )}

              <div className="messageBlock">
                <motion.div
                  className="messageBubble"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.22 }}
                >
                  {chat.role === "user" ? (
                    <p>{chat.content}</p>
                  ) : (
                    <div className="chat-response">
                      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                        {chat.content || ""}
                      </ReactMarkdown>
                    </div>
                  )}
                </motion.div>

                {showGeneralKnowledge && (
                  <div className="sourceBox">
                    <div className="sourceTitle">
                      <i className="fa-solid fa-brain"></i>
                      Answer Type
                    </div>

                    <div className="sourceList">
                      <div className="sourceCard">
                        <div className="sourceHeader">
                          <span className="sourceBadge">General Knowledge</span>
                        </div>

                        <div className="sourceSnippet">
                          No strong document match was found, so this answer was
                          generated without reliable PDF evidence.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showSources && (
                  <div className="sourceBox">
                    <div className="sourceTitle">
                      <i className="fa-solid fa-link"></i>
                      Sources & Confidence
                    </div>

                    <div className="sourceList">
                      {filteredSources.map((source) => (
                        <div key={source.id} className="sourceCard">
                          <div className="sourceHeader">
                            <span className="sourceBadge">
                              Source {source.id}
                            </span>

                            <div className="sourceConfidenceWrap">
                              <span className="confidenceBadge">
                                {source.confidence ?? "--"}/10
                              </span>
                              <span className="confidenceLabel">
                                {source.confidenceLabel || "Unknown"}
                              </span>
                            </div>
                          </div>

                          <div className="retrievalMeta">
                            Retrieval: {source.retrievalScore ?? 0}%
                          </div>

                          <div className="sourceSnippet">
                            {source.snippet}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {chat.role === "assistant" && chat.content?.trim() && (
                  <div className="messageActions">
                    <button
                      className="actionBtn"
                      onClick={() => copyToClipboard(chat.content, idx)}
                    >
                      <i className="fa-regular fa-copy"></i>
                      {copiedIndex === idx ? "Copied" : "Copy"}
                    </button>

                    <button
                      className="actionBtn"
                      onClick={() =>
                        setPrompt("Regenerate the previous answer in a better way.")
                      }
                    >
                      <i className="fa-solid fa-rotate-right"></i>
                      Regenerate
                    </button>
                  </div>
                )}
              </div>

              {chat.role === "user" && (
                <motion.div
                  className="avatar"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  👤
                </motion.div>
              )}
            </motion.div>
          );
        })}

        <div ref={chatEndRef}></div>
      </div>
    </div>
  );
}

export default Chat;