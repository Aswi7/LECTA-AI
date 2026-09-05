# LECTA AI 🎓⚡
> **Multilingual AI Lecture Intelligence & Interactive Study Platform**

LECTA AI is a modern AI-powered platform that transforms audio/video lecture recordings, YouTube URLs, and raw text notes into comprehensive executive summaries, key takeaway bullet points, translated notes in 11+ languages, auto-generated practice quizzes, and an interactive vector-powered AI study tutor.

---

## 🌟 Key Features

- 🎙️ **Speech-to-Text Transcription**: Powered by OpenAI Whisper for high-accuracy lecture transcription with audio noise preprocessing.
- 📝 **Executive Summaries & Key Points**: Generates concise summaries and key takeaway bullet points using NLP (spaCy) and BART model pipelines.
- 🌐 **Multilingual Note Translation**: Instantly translates lecture notes and vocabulary into 11+ target languages (Tamil, Hindi, Spanish, French, German, Japanese, and more).
- 🎯 **Automated Exam Quiz Bank**: Creates balanced practice quizzes featuring Multiple Choice (MCQs), True/False, and Fill-in-the-Blank questions with difficulty ratings and instant answer reveals.
- 💬 **Interactive RAG AI Tutor**: Vector search powered by **ChromaDB** and **SentenceTransformers**. Chat directly with an AI study tutor grounded strictly in your lecture transcript via local **Ollama** (`llama3.2`), **Google Gemini API**, or built-in transcript fallbacks.
- ⏱️ **Real-Time Pipeline Analytics**: Logs detailed step-by-step timing metrics for transcription, NLP processing, AI modules, database storage, and vector indexing.
- 💾 **Cloud MongoDB Persistence**: Connects to **MongoDB Atlas** for permanent session storage with an automatic zero-downtime in-memory fallback mode.
- 📄 **Multi-Format Exporting**: Download your structured study notes and quizzes in **PDF**, **Word (.docx)**, or **Plain Text (.txt)** formats with one click.

---

## 🏗️ Tech Stack

### **Backend (Python / Flask)**
- **Framework**: Flask, Flask-CORS
- **Audio Processing**: OpenAI Whisper, FFmpeg, pydub, yt-dlp
- **NLP & AI Models**: spaCy (`en_core_web_sm`), Hugging Face Transformers (`facebook/bart-large-cnn`), SentenceTransformers (`all-MiniLM-L6-v2`)
- **Vector Database**: ChromaDB (Cosine similarity vector search)
- **LLM Integrations**: Local Ollama (`llama3.2:3b`) & Google Gemini API (`gemini-1.5-flash`)
- **Database**: PyMongo / MongoDB Atlas Cloud
- **Document Exporters**: ReportLab (PDF), python-docx (Word)

### **Frontend (React / Vite)**
- **Framework**: React 18, Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## 📁 Project Structure

```text
LECTAAI/
├── backend/
│   ├── app.py                   # Main Flask API server & timing breakdown router
│   ├── modules/
│   │   ├── audio_processor.py   # Audio normalization & Whisper transcription
│   │   ├── nlp_processor.py     # Text cleaning & sentence segmentation
│   │   ├── summarizer.py        # BART text summarization & bullet notes
│   │   ├── translator.py        # Multilingual translation engine
│   │   ├── question_generator.py # Exam quiz bank generator
│   │   ├── rag_chat.py          # ChromaDB vector indexing & RAG chat tutor
│   │   └── keyword_extractor.py # Key concept extraction
│   └── utils/
│       ├── db_handler.py        # MongoDB Atlas & in-memory session fallback
│       └── export_handler.py    # PDF, Word (.docx), and TXT note exporters
├── frontend/
│   ├── src/
│   │   ├── components/          # UploadPanel, ProgressTracker, ResultsDashboard, ChatPanel, DownloadBar
│   │   ├── pages/               # Home workspace & Session History
│   │   ├── App.jsx              # Main React Application shell
│   │   └── main.jsx             # Entry point
│   ├── package.json
│   └── vite.config.js
├── tests/                       # Integration and unit test suite
├── .env                         # Environment variables configuration
├── config.py                    # Server configuration
└── requirements.txt             # Python backend dependencies
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: `3.10` or higher
- **Node.js**: `18.0` or higher
- **FFmpeg**: Installed and added to System PATH (required for audio transcription)

---

### 1. Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Aswi7/LECTA-AI.git
   cd LECTAAI
   ```

2. **Create and activate a Virtual Environment**:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```

4. **Configure Environment Variables (`.env`)**:
   Create a `.env` file in the project root:
   ```env
   # MongoDB Atlas Connection String
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=Cluster0

   # Flask Security Key
   FLASK_SECRET_KEY=your_secret_key_here

   # Storage Folders
   UPLOAD_FOLDER=backend/uploads
   EXPORTS_FOLDER=exports

   # Whisper STT Model (Options: tiny, base, small, medium, large)
   WHISPER_MODEL_SIZE=base

   # AI LLM Provider Configuration (Options: auto, ollama, gemini)
   LLM_PROVIDER=auto
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2:3b

   # Optional Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. **Start the Flask Backend Server**:
   ```bash
   python backend/app.py
   ```
   *The backend will run at `http://localhost:5000` with a MongoDB Atlas startup connection banner.*

---

### 2. Frontend Setup

1. **Navigate to frontend folder**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   *The frontend UI will launch at `http://localhost:5173`.*

---

## 🧪 Running Automated Tests

Run the backend unit and integration test suite:
```bash
python -m unittest discover -s tests
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/process` | Upload audio/video file for full AI pipeline processing |
| `POST` | `/api/process-url` | Process YouTube or web video link |
| `POST` | `/api/process-text` | Process raw text input |
| `POST` | `/api/chat/<session_id>` | Ask questions to the RAG AI Lecture Tutor |
| `GET` | `/api/chat/<session_id>/status` | Query vector indexing status in ChromaDB |
| `POST` | `/api/reindex/<session_id>` | Re-index session transcript into ChromaDB |
| `GET` | `/api/history` | Retrieve saved session history from MongoDB |
| `GET` | `/api/results/<session_id>` | Fetch single session result by ID |
| `GET` | `/api/download/<session_id>/<format>` | Export notes as `pdf`, `docx`, or `txt` |
| `GET` | `/api/health` | System health check & MongoDB connection status |

---


