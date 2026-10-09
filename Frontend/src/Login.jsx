import { useState, useContext } from "react";
import "./Auth.css";
import { AuthContext } from "./AuthContext";

function Login({ close, openSignup }) {
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (!data.user || !data.user.token) {
        setError("Invalid login response from server");
        return;
      }

      login(data.user);

      setEmail("");
      setPassword("");

      if (typeof close === "function") {
        close();
      }
    } catch (err) {
      setError("Server error. Please check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authOverlay">
      <div className="authContainer">
        <div className="authLeft">
          <div className="authBrand">
            <div className="authBadge">
              <i className="fa-solid fa-sparkles"></i>
              SigmaGPT Workspace
            </div>
            <h2>Welcome back to your AI workspace.</h2>
            <p>
              Continue your chats, code faster, summarize smarter, and keep all
              your productivity in one premium workspace.
            </p>
          </div>

          <div className="authHighlights">
            <div className="authHighlightItem">
              <div className="authHighlightIcon">
                <i className="fa-solid fa-comments"></i>
              </div>
              <div className="authHighlightText">
                <strong>Smart conversations</strong>
                <span>Access your saved threads and continue where you left off.</span>
              </div>
            </div>

            <div className="authHighlightItem">
              <div className="authHighlightIcon">
                <i className="fa-solid fa-file-lines"></i>
              </div>
              <div className="authHighlightText">
                <strong>PDF semantic search</strong>
                <span>Upload notes and ask questions with semantic understanding.</span>
              </div>
            </div>

            <div className="authHighlightItem">
              <div className="authHighlightIcon">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div className="authHighlightText">
                <strong>Fast workflow</strong>
                <span>Study, code, debug, and summarize in one polished place.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="authRight">
          <div className="closeBtn" onClick={() => typeof close === "function" && close()}>
            ✕
          </div>

          <h2>Login</h2>
          <div className="authSubText">
            Enter your account details to continue.
          </div>

          {error && <p className="authError">{error}</p>}

          <div className="authField">
            <label>Email</label>
            <div className="authInputWrap">
              <i className="fa-regular fa-envelope"></i>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
              />
            </div>
          </div>

          <div className="authField">
            <label>Password</label>
            <div className="authInputWrap">
              <i className="fa-solid fa-lock"></i>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
              />
            </div>
          </div>

          <button className="authBtn" onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="switchAuth">
            Don&apos;t have an account?
            <span onClick={openSignup}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;