# SigmaGPT 🤖 — AI-Powered Chat Application

SigmaGPT is a full-stack AI chat application built with React and Node.js. It combines a modern chat interface with backend APIs, authentication, database integration, and AI model connectivity.

The project is designed to provide an interactive AI experience with a responsive frontend and a modular backend architecture.

## ✨ Features

* 💬 **AI Chat Interface** — Interact with AI through a dedicated chat interface.
* 🤖 **AI Integration** — Backend dependencies support OpenRouter/OpenAI-compatible APIs and Google Gemini.
* 🔐 **Authentication** — User authentication with password hashing and JSON Web Tokens (JWT).
* 👤 **Login and Signup** — Dedicated authentication screens.
* 🗂️ **Chat Management UI** — Chat window and sidebar components.
* 📄 **File Upload Support** — Backend upload route and file-processing dependencies.
* 🧠 **Document Processing Dependencies** — PDF parsing and similarity utilities.
* 🎨 **Modern UI** — React components with animations powered by Framer Motion.
* 📝 **Markdown Rendering** — Render formatted AI responses with syntax highlighting support.
* 🗄️ **Database Integration** — MongoDB connectivity through Mongoose.
* ⚡ **Fast Development** — Vite-based frontend development workflow.

*Features depend on the implementation of the corresponding routes and components.*

## 🛠️ Tech Stack

### Frontend

| Technology       | Purpose                           |
| ---------------- | --------------------------------- |
| React 19         | User interface                    |
| Vite             | Development server and build tool |
| React Router DOM | Client-side routing               |
| Framer Motion    | UI animations                     |
| React Markdown   | Markdown rendering                |
| Rehype Highlight | Code syntax highlighting          |
| UUID             | Unique identifiers                |

### Backend

| Technology        | Purpose                           |
| ----------------- | --------------------------------- |
| Node.js           | JavaScript runtime                |
| Express 5         | REST API framework                |
| MongoDB           | Database                          |
| Mongoose          | Database object modeling          |
| JSON Web Token    | Authentication tokens             |
| bcryptjs          | Password hashing                  |
| Multer            | File upload handling              |
| dotenv            | Environment configuration         |
| OpenAI SDK        | OpenAI-compatible API integration |
| Google GenAI SDK  | Google AI integration             |
| pdf-parse         | PDF text extraction               |
| cosine-similarity | Similarity calculations           |

## 📁 Project Structure

```text
SigmaGPT/
│
├── Backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chat.js
│   │   └── upload.js
│   ├── utils/
│   ├── chatRoutes.js
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env                 # Local only; never commit
│
├── Frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── AuthContext.jsx
│   │   ├── Chat.jsx
│   │   ├── ChatWindow.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Sidebar.jsx
│   │   ├── MyContext.jsx
│   │   ├── main.jsx
│   │   └── ... CSS and other components
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

## ⚙️ Prerequisites

Install the following before starting:

* [Node.js](https://nodejs.org/)
* npm (included with Node.js)
* [MongoDB](https://www.mongodb.com/) or a MongoDB Atlas database
* An API key for the AI provider configured in your backend
* Git

## 🚀 Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/suyashkharche2005/SigmaGpt.git
cd SigmaGpt
```

### 2. Configure the backend environment

Open a terminal in the project root:

```powershell
cd Backend
```

Create a local `.env` file containing the environment variables required by your backend.

Example configuration:

```dotenv
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
OPENROUTER_API_KEY=your_openrouter_api_key
```

These variable names are examples. Check `server.js`, the route files, and the model integrations to confirm the exact names required by your implementation.

Obtain credentials from:

* [OpenRouter](https://openrouter.ai/)
* [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas)
* [Google AI Studio](https://aistudio.google.com/) if your code uses Gemini

**Security:** Never upload `.env` or real credentials to GitHub. Use placeholders in documentation.

### 3. Install backend dependencies

From the `Backend` directory:

```bash
npm install
```

### 4. Start the backend

Inspect `Backend/package.json` for a `start` or `dev` script.

If a `dev` script is configured:

```bash
npm run dev
```

If there are no scripts, and `server.js` is the backend entry point, run:

```bash
node server.js
```

Keep the backend terminal open.

### 5. Install frontend dependencies

Open a second terminal:

```powershell
cd D:\SigmaGPT\Frontend
npm install
```

### 6. Start the frontend

```bash
npm run dev
```

Open the local URL displayed by Vite in your terminal, typically `http://localhost:5173`.

## 🔑 Environment Variables

The backend may require the following configuration, depending on the implementation.

| Variable             | Description                               |
| -------------------- | ----------------------------------------- |
| `PORT`               | Backend server port                       |
| `MONGODB_URI`        | MongoDB connection string                 |
| `JWT_SECRET`         | Secret used to sign authentication tokens |
| `OPENROUTER_API_KEY` | OpenRouter API credential                 |

Use the exact variable names expected by the application. Add other provider keys only if your code requires them.

## 🔒 Security Best Practices

* Keep `.env` files out of version control.
* Store AI provider keys on the backend, never in browser code.
* Use strong, randomly generated JWT secrets.
* Hash passwords before storing them.
* Validate uploaded files and enforce appropriate size limits.
* Validate and sanitize incoming API requests.
* Rotate any API key accidentally exposed in a Git commit.
* Never bypass GitHub secret scanning to publish a real credential.

Recommended root `.gitignore` entries:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
Backend/.env
Frontend/.env
```

## 🧪 Available Frontend Scripts

Run these commands from `Frontend/`.

| Command           | Purpose                           |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start the Vite development server |
| `npm run build`   | Build the production frontend     |
| `npm run lint`    | Run ESLint                        |
| `npm run preview` | Preview the production build      |

## 🐛 Troubleshooting

### MongoDB connection error

* Verify that your MongoDB URI is correct.
* Ensure the database is reachable.
* Check database network access and credentials.
* Confirm that the backend reads the correct environment variable.

### AI API errors

* Confirm that the API key is valid.
* Check the provider and model configured in your backend.
* Verify that your account has access to the selected model.
* Review backend logs for the actual API error.

### Frontend cannot connect to the backend

* Ensure both frontend and backend are running.
* Verify the API base URL used by the frontend.
* Check CORS configuration.
* Confirm the backend port and endpoint paths.

### GitHub rejects the push

If GitHub reports a secret-scanning violation, remove the secret from the affected Git commit history, rotate the exposed credential, and ensure `.env` is ignored.

## 🔮 Future Enhancements

Potential improvements include:

* Conversation history and persistent chat sessions
* Streaming AI responses
* Support for multiple AI models
* Enhanced document-based question answering
* Improved file upload validation
* Deployment and production monitoring
* Automated backend and frontend tests

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test your changes.
5. Submit a pull request.

## 👨‍💻 Author

**Suyash Kharche**

* GitHub: [@suyashkharche2005](https://github.com/suyashkharche2005)
* Repository: [SigmaGPT](https://github.com/suyashkharche2005/SigmaGpt)

## 📄 License

No license has been specified yet. Add a `LICENSE` file if you intend to distribute the project under an open-source license.

---

⭐ If you find SigmaGPT interesting, consider starring the repository!
