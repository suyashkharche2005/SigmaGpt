import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { AuthContext } from "./AuthContext.jsx";

import { useContext, useEffect, useRef, useState } from "react";
import { ScaleLoader } from "react-spinners";
import { motion } from "framer-motion";

import Login from "./Login.jsx";
import Signup from "./Signup.jsx";

function ChatWindow() {
  const {
    prompt,
    setPrompt,
    currThreadId,
    setPrevChats,
    setNewChat,
    activeMode,
    setActiveMode,
    documentName,
    setDocumentName,
    setDocumentText
  } = useContext(MyContext);

  const { user, logout } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const modes = [
    { key: "general", label: "General", icon: "fa-solid fa-sparkles" },
    { key: "explain", label: "Explain", icon: "fa-solid fa-lightbulb" },
    { key: "code", label: "Code", icon: "fa-solid fa-code" },
    { key: "summarize", label: "Summarize", icon: "fa-solid fa-file-lines" },
    { key: "study", label: "Study", icon: "fa-solid fa-graduation-cap" },
    { key: "debug", label: "Debug", icon: "fa-solid fa-bug" }
  ];

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setPrompt(transcript.trim());
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [setPrompt]);

  const toggleVoiceInput = () => {
    if (!voiceSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.log("Voice start error:", err);
    }
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user?.token) {
      setShowLoginAlert(true);
      event.target.value = "";
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file only.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("threadId", currThreadId);

    setUploading(true);

    try {
      const response = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setDocumentName(data.fileName || file.name);
      setDocumentText("__semantic_search_ready__");
    } catch (error) {
      console.log("Upload error:", error);
      alert(error.message || "Failed to upload PDF");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const clearDocument = async () => {
    if (!user?.token) {
      setShowLoginAlert(true);
      return;
    }

    try {
      await fetch(`http://localhost:8080/api/upload/remove/${currThreadId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
    } catch (error) {
      console.log("Remove document error:", error);
    } finally {
      setDocumentName("");
      setDocumentText("");
    }
  };

  const getReply = async () => {
    if (!prompt.trim() || loading) return;

    const rawUserMessage = prompt.trim();

    if (!user?.token) {
      setShowLoginAlert(true);
      return;
    }

    setNewChat(false);
    setLoading(true);

    setPrevChats((prev) => [
      ...prev,
      { role: "user", content: rawUserMessage },
      { role: "assistant", content: "", sources: [] }
    ]);

    setPrompt("");

    try {
      const response = await fetch("http://localhost:8080/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          threadId: currThreadId,
          message: rawUserMessage,
          mode: activeMode
        })
      });

      if (response.status === 401) {
        throw new Error("Please login first");
      }

      if (!response.ok) {
        throw new Error("Server error");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      let sourceMeta = [];
      const sourceHeader = response.headers.get("X-Source-Meta");

      if (sourceHeader) {
        try {
          sourceMeta = JSON.parse(decodeURIComponent(sourceHeader));
        } catch (e) {
          console.log("Failed to parse source meta:", e);
          sourceMeta = [];
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          setPrevChats((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: fullText,
              sources: sourceMeta
            };
            return updated;
          });
        }
      }
    } catch (err) {
      console.log("Streaming error:", err);

      if (err.message === "Please login first") {
        setShowLoginAlert(true);
      }

      setPrevChats((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content:
            err.message === "Please login first"
              ? "Login required."
              : "Server error. Please try again.",
          sources: []
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = () => {
    if (user) {
      logout();
      setPrevChats([]);
      setDocumentName("");
      setDocumentText("");
    } else {
      setShowLogin(true);
    }
  };

  return (
    <div className="chatWindow">
      <motion.div className="navbar">
        <div className="brandBlock">
          <span className="brandTitle">SigmaGPT</span>
          <span className="brandSub">AI workspace</span>
        </div>

        <div className="userIconDiv" onClick={handleUserClick}>
          {user ? `${user.name} | Logout` : "Login"}
        </div>
      </motion.div>

      <div className="modeBar">
        {modes.map((mode) => (
          <button
            key={mode.key}
            className={`modeChip ${
              activeMode === mode.key ? "modeChipActive" : ""
            }`}
            onClick={() => setActiveMode(mode.key)}
          >
            <i className={mode.icon}></i>
            {mode.label}
          </button>
        ))}
      </div>

      <Chat />

      {loading && (
        <div className="loader">
          <ScaleLoader color="#aaa" height={18} width={3} />
        </div>
      )}

      <div className="chatInput">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

        {(documentName || uploading) && (
          <div className="documentBadge">
            <div className="documentBadgeLeft">
              <i className="fa-regular fa-file-pdf"></i>
              <span>{uploading ? "Semantic indexing..." : documentName}</span>
            </div>

            {!uploading && (
              <button className="removeDocBtn" onClick={clearDocument}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}

        <div className="inputBox">
          <div className="inputTools">
            <i
              className="fa-regular fa-image"
              onClick={handleFilePick}
              title="Upload PDF"
            ></i>
            <i
              className={`fa-solid fa-microphone ${
                isListening ? "micActive" : ""
              } ${!voiceSupported ? "micDisabled" : ""}`}
              onClick={toggleVoiceInput}
              title="Voice input"
            ></i>
          </div>

          <input
            placeholder={
              documentName
                ? `Ask semantically about ${documentName}...`
                : "Ask anything..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") getReply();
            }}
          />

          <div id="submit" onClick={getReply}>
            <i className="fa-solid fa-paper-plane"></i>
          </div>
        </div>

        <p className="info">
          {uploading
            ? "Creating semantic index for your PDF..."
            : documentName
            ? "Semantic search is active for this uploaded PDF."
            : "SigmaGPT can make mistakes. Verify important results."}
        </p>
      </div>

      {showLogin && (
        <Login
          close={() => setShowLogin(false)}
          openSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
        />
      )}

      {showSignup && (
        <Signup
          close={() => setShowSignup(false)}
          openLogin={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
        />
      )}

      {showLoginAlert && (
        <div className="loginAlertOverlay">
          <div className="loginAlertBox">
            <div className="loginAlertIcon">
              <i className="fa-solid fa-lock"></i>
            </div>
            <h3>Login Required</h3>
            <p>Please login to send messages and manage your threads.</p>
            <div className="loginAlertActions">
              <button
                className="loginAlertCancel"
                onClick={() => setShowLoginAlert(false)}
              >
                Cancel
              </button>
              <button
                className="loginAlertLogin"
                onClick={() => {
                  setShowLoginAlert(false);
                  setShowLogin(true);
                }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;