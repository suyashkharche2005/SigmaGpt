import "./Sidebar.css";
import { useContext, useEffect, useMemo, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import { AuthContext } from "./AuthContext.jsx";
import { v1 as uuidv1 } from "uuid";
import { motion } from "framer-motion";

function Sidebar() {
  const {
    allThreads,
    setAllThreads,
    currThreadId,
    setNewChat,
    setPrompt,
    setReply,
    setCurrThreadId,
    setPrevChats,
    setDocumentText,
    setDocumentName,
    theme,
    setTheme
  } = useContext(MyContext);

  const { user } = useContext(AuthContext);

  const [search, setSearch] = useState("");
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");

  const getAllThreads = async () => {
    if (!user?.token) {
      setAllThreads([]);
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/chat/thread", {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.error || "Failed to fetch threads");
      }

      const filteredData = res.map((thread) => ({
        threadId: thread.threadId,
        title: thread.title,
        pinned: !!thread.pinned
      }));

      setAllThreads(filteredData);
    } catch (err) {
      console.log(err);
      setAllThreads([]);
    }
  };

  useEffect(() => {
    getAllThreads();
  }, [currThreadId, user]);

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
    setDocumentText("");
    setDocumentName("");
  };

  const changeThread = async (newThreadId) => {
    if (!user?.token) return;

    setCurrThreadId(newThreadId);

    try {
      const response = await fetch(
        `http://localhost:8080/api/chat/thread/${newThreadId}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.error || "Failed to load thread");
      }

      setPrevChats(res);
      setNewChat(false);
      setReply(null);
      setPrompt("");
      setDocumentText("");
      setDocumentName("");
    } catch (err) {
      console.log(err);
    }
  };

  const deleteThread = async (threadId) => {
    if (!user?.token) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/chat/thread/${threadId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.error || "Failed to delete thread");
      }

      setAllThreads((prev) =>
        prev.filter((thread) => thread.threadId !== threadId)
      );

      if (threadId === currThreadId) {
        createNewChat();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const togglePin = async (threadId, pinned) => {
    if (!user?.token) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/chat/thread/${threadId}/pin`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`
          },
          body: JSON.stringify({ pinned: !pinned })
        }
      );

      const updated = await response.json();

      if (!response.ok) {
        throw new Error(updated.error || "Failed to update pin");
      }

      setAllThreads((prev) =>
        prev
          .map((thread) =>
            thread.threadId === threadId
              ? { ...thread, pinned: updated.pinned }
              : thread
          )
          .sort((a, b) => Number(b.pinned) - Number(a.pinned))
      );
    } catch (err) {
      console.log(err);
    }
  };

  const startRename = (thread) => {
    setEditingThreadId(thread.threadId);
    setEditedTitle(thread.title);
  };

  const saveRename = async (threadId) => {
    if (!user?.token || !editedTitle.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/chat/thread/${threadId}/rename`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`
          },
          body: JSON.stringify({ title: editedTitle })
        }
      );

      const updated = await response.json();

      if (!response.ok) {
        throw new Error(updated.error || "Failed to rename thread");
      }

      setAllThreads((prev) =>
        prev.map((thread) =>
          thread.threadId === threadId
            ? { ...thread, title: updated.title }
            : thread
        )
      );

      setEditingThreadId(null);
      setEditedTitle("");
    } catch (err) {
      console.log(err);
    }
  };

  const visibleThreads = useMemo(() => {
    return allThreads.filter((thread) =>
      thread.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [allThreads, search]);

  return (
    <motion.section
      className="sidebar"
      initial={{ opacity: 0, x: -22 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="sidebarTop">
        <motion.button
          className="newChatBtn"
          onClick={createNewChat}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
        >
          <img
            src="src/assets/blacklogo.png"
            alt="logo"
            className="logo"
          />

          <div className="newChatBtnText">
            <span className="newChatBtnTitle">New conversation</span>
            <span className="newChatBtnSub">Start with a fresh prompt</span>
          </div>

          <span className="newChatIcon">
            <i className="fa-solid fa-pen-to-square"></i>
          </span>
        </motion.button>

        <div className="sidebarControls">
          <div className="searchBox">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="themeToggleBtn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            <i className={theme === "dark" ? "fa-regular fa-sun" : "fa-regular fa-moon"}></i>
          </button>
        </div>
      </div>

      <motion.div
        className="sidebarSectionTitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12 }}
      >
        Recent chats
      </motion.div>

      <ul className="history">
        {visibleThreads.map((thread, idx) => (
          <motion.li
            key={thread.threadId}
            onClick={() => changeThread(thread.threadId)}
            className={thread.threadId === currThreadId ? "highlighted" : ""}
            title={thread.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 * idx, duration: 0.22 }}
            whileHover={{ x: 2 }}
          >
            <div className="threadContent">
              {editingThreadId === thread.threadId ? (
                <input
                  className="renameInput"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(thread.threadId);
                  }}
                  autoFocus
                />
              ) : (
                <span className="threadTitle">
                  <i className="fa-regular fa-message"></i>
                  {thread.title}
                </span>
              )}
            </div>

            <div className="threadActions" onClick={(e) => e.stopPropagation()}>
              <i
                className={`fa-solid fa-thumbtack ${thread.pinned ? "pinnedIcon" : ""}`}
                title={thread.pinned ? "Unpin" : "Pin"}
                onClick={() => togglePin(thread.threadId, thread.pinned)}
              ></i>

              {editingThreadId === thread.threadId ? (
                <i
                  className="fa-solid fa-check"
                  title="Save"
                  onClick={() => saveRename(thread.threadId)}
                ></i>
              ) : (
                <i
                  className="fa-solid fa-pen"
                  title="Rename"
                  onClick={() => startRename(thread)}
                ></i>
              )}

              <i
                className="fa-solid fa-trash"
                title="Delete"
                onClick={() => deleteThread(thread.threadId)}
              ></i>
            </div>
          </motion.li>
        ))}
      </ul>

      <motion.div
        className="sign"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <div className="signCard">
          <div className="signTitle">SigmaGPT Workspace</div>
          <div className="signSub">
            AI chat for study, coding, and productivity.
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}

export default Sidebar;