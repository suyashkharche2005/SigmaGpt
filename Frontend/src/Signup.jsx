import { useState, useContext } from "react";
import "./Auth.css";
import { AuthContext } from "./AuthContext";

function Signup({ close, openLogin }) {
  const { login } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }

    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      if (!data.user || !data.user.token) {
        setError("Invalid signup response from server");
        return;
      }

      login(data.user);

      setName("");
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
              <i className="fa-solid fa-rocket"></i>
              Join SigmaGPT
            </div>
            <h2>Create your account and start faster.</h2>
            <p>
              Build a clean AI workflow for chatting, coding, studying,
              summarizing, and semantic PDF search in one place.
            </p>
          </div>

          <div className="authHighlights">
            <div className="authHighlightItem">
              <div className="authHighlightIcon">
                <i className="fa-solid fa-code"></i>
              </div>
              <div className="authHighlightText">
                <strong>Code smarter</strong>
                <span>Use explain, debug, and code modes inside one workspace.</span>
              </div>
            </div>

            <div className="authHighlightItem">
              <div className="authHighlightIcon">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div className="authHighlightText">
                <strong>Study better</strong>
                <span>Turn your notes into answers, summaries, and key points.</span>
              </div>
            </div>

            <div className="authHighlightItem">
              <div className="authHighlightIcon">
                <i className="fa-solid fa-layer-group"></i>
              </div>
              <div className="authHighlightText">
                <strong>Organized workspace</strong>
                <span>Keep your threads, uploads, and modes structured beautifully.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="authRight">
          <div className="closeBtn" onClick={() => typeof close === "function" && close()}>
            ✕
          </div>

          <h2>Sign up</h2>
          <div className="authSubText">
            Create your account to start using SigmaGPT.
          </div>

          {error && <p className="authError">{error}</p>}

          <div className="authField">
            <label>Name</label>
            <div className="authInputWrap">
              <i className="fa-regular fa-user"></i>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSignup();
                }}
              />
            </div>
          </div>

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
                  if (e.key === "Enter") handleSignup();
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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSignup();
                }}
              />
            </div>
          </div>

          <button className="authBtn" onClick={handleSignup} disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="switchAuth">
            Already have an account?
            <span onClick={openLogin}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;