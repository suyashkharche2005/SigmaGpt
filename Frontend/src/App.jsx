import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { useEffect, useState } from "react";
import { v1 as uuidv1 } from "uuid";

function App() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const [activeMode, setActiveMode] = useState("general");

  const [documentText, setDocumentText] = useState("");
  const [documentName, setDocumentName] = useState("");

  const [theme, setTheme] = useState(
    localStorage.getItem("sigmagpt-theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sigmagpt-theme", theme);
  }, [theme]);

  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    newChat,
    setNewChat,
    prevChats,
    setPrevChats,
    allThreads,
    setAllThreads,
    activeMode,
    setActiveMode,
    documentText,
    setDocumentText,
    documentName,
    setDocumentName,
    theme,
    setTheme
  };

  return (
    <MyContext.Provider value={providerValues}>
      <div className="appLayout">
        <Sidebar />
        <ChatWindow />
      </div>
    </MyContext.Provider>
  );
}

export default App;