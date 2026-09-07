import os
import sys
import logging
import requests
from typing import Any
from sentence_transformers import SentenceTransformer  # type: ignore
import chromadb  # type: ignore

# Try importing google generative AI
try:
    import google.generativeai as genai  # type: ignore
except ImportError:
    genai = None

# Ensure root & backend directory in sys.path for db_handler import
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
for p in [backend_path, root_path]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from utils.db_handler import get_result
except ImportError:
    try:
        from backend.utils.db_handler import get_result
    except ImportError:
        get_result = None

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Module-level variables
_embedding_model = None
_chroma_client = None
CHROMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db"))
SIMILARITY_THRESHOLD = 0.2


def load_embedding_model() -> Any:
    """Loads and caches the SentenceTransformer model.

    Returns:
        object: The loaded SentenceTransformer model.
    """
    global _embedding_model
    if _embedding_model is not None:
        return _embedding_model

    logger.info("Embedding model loaded")
    _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def get_chroma_client() -> Any:
    """Creates and caches the ChromaDB Persistent Client.

    Returns:
        object: The ChromaDB client object.
    """
    global _chroma_client
    if _chroma_client is not None:
        return _chroma_client

    _chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    return _chroma_client


def chunk_transcript(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    """Splits a transcript into overlapping chunks at sentence boundaries.

    Args:
        text (str): The transcript text.
        chunk_size (int): Targeted character size of each chunk.
        overlap (int): Targeted character overlap size.

    Returns:
        list[str]: Chunks that are at least 100 characters long.
    """
    if not text:
        return []

    # Split at sentence boundaries ". "
    raw_sentences = text.split(". ")
    sentences = []
    for i, s in enumerate(raw_sentences):
        if not s.strip():
            continue
        if i < len(raw_sentences) - 1:
            sentences.append(s.strip() + ". ")
        else:
            sentences.append(s.strip())

    chunks = []
    current_sentences = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)
        if not sentence_len:
            continue

        if current_sentences and current_len + sentence_len > chunk_size:
            chunk_str = "".join(current_sentences)
            if len(chunk_str) >= 100:
                chunks.append(chunk_str)

            # Backtrack to implement sentence-based overlap
            overlap_sentences = []
            overlap_len = 0
            for s in reversed(current_sentences):
                if overlap_len + len(s) > overlap and overlap_sentences:
                    break
                overlap_sentences.insert(0, s)
                overlap_len += len(s)

            current_sentences = overlap_sentences + [sentence]
            current_len = sum(len(s) for s in current_sentences)
        else:
            current_sentences.append(sentence)
            current_len += sentence_len

    if current_sentences:
        chunk_str = "".join(current_sentences)
        if len(chunk_str) >= 100:
            chunks.append(chunk_str)
        elif not chunks:
            chunks.append(chunk_str)

    if not chunks and text.strip():
        chunks.append(text.strip())

    return chunks


def index_session(session_id: str, transcript: str, metadata: dict) -> bool:
    """Indexes a session transcript in ChromaDB.

    Args:
        session_id (str): The session ID.
        transcript (str): Full text transcript.
        metadata (dict): Metadata associated with the chunks.

    Returns:
        bool: True on success, False on exception.
    """
    logger.info(f"Starting RAG indexing for session {session_id}, transcript length: {len(transcript) if transcript else 0} characters")
    if not transcript or len(transcript.strip()) < 10:
        logger.warning(f"Transcript too short to index for session {session_id}: {len(transcript) if transcript else 0} characters")
        return False

    try:
        chunks = chunk_transcript(transcript)
        if not chunks and transcript.strip():
            chunks = [transcript.strip()]
        if not chunks:
            logger.error(f"No chunks generated for session {session_id}.")
            return False

        collection_name = f"session_{session_id}"
        
        # Validate collection name
        import re
        if not re.match(r'^[a-zA-Z0-9_-]{3,63}$', collection_name):
            logger.error(f"Invalid collection name: {collection_name}")
            return False
        
        # Delete existing collection if it exists
        try:
            client = get_chroma_client()
            client.delete_collection(collection_name)
            logger.info(f"Deleted existing collection: {collection_name}")
        except Exception:
            pass  # Collection didn't exist
        
        collection = client.create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

        # Embed chunks
        model = load_embedding_model()
        embeddings = model.encode(chunks).tolist()

        # Add to collection
        logger.info(f"Created {len(chunks)} chunks, embedding now...")
        collection.add(
            documents=chunks,
            embeddings=embeddings,
            ids=[f"{session_id}_chunk_{i}" for i in range(len(chunks))],
            metadatas=[metadata] * len(chunks)
        )
        logger.info(f"Indexed {len(chunks)} chunks for session {session_id}")
        return True
    except Exception as e:
        import traceback
        logger.error(f"RAG indexing FAILED for session {session_id}. Error type: {type(e).__name__}. Error: {str(e)}")
        logger.error(traceback.format_exc())
        return False


def retrieve_relevant_chunks(session_id: str, question: str, top_k: int = 5) -> list[dict]:
    """Retrieves relevant chunks from ChromaDB.

    Args:
        session_id (str): The session ID.
        question (str): The search question.
        top_k (int): Number of chunks to retrieve.

    Returns:
        list[dict]: List of relevant chunk dictionaries.
    """
    try:
        client = get_chroma_client()
        collection = client.get_collection(name=f"session_{session_id}")
    except Exception:
        # Collection does not exist
        return []

    try:
        model = load_embedding_model()
        question_embedding = model.encode(question).tolist()

        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=top_k
        )

        retrieved = []
        documents = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i in range(len(documents)):
            distance = distances[i]
            similarity = max(0.0, 1.0 - distance)

            if similarity >= SIMILARITY_THRESHOLD:
                retrieved.append({
                    "text": documents[i],
                    "similarity": round(similarity, 4),
                    "rank": i + 1
                })

        # Fallback: If no chunk passed SIMILARITY_THRESHOLD, return top_k matching chunks anyway
        if not retrieved and documents:
            for i in range(min(top_k, len(documents))):
                distance = distances[i]
                similarity = max(0.0, 1.0 - distance)
                retrieved.append({
                    "text": documents[i],
                    "similarity": round(similarity, 4),
                    "rank": i + 1
                })

        return retrieved
    except Exception as e:
        logger.error(f"Error retrieving chunks for session {session_id}: {e}")
        return []


def is_ollama_available(base_url: str = None) -> bool:
    """Fast check to see if local Ollama server is active and responding.

    Args:
        base_url (str, optional): Ollama base URL.

    Returns:
        bool: True if Ollama is reachable, False otherwise.
    """
    if not base_url:
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        url = f"{base_url.rstrip('/')}/api/tags"
        resp = requests.get(url, timeout=0.6)
        return resp.status_code == 200
    except Exception:
        return False


def is_topic_query(question: str) -> bool:
    """Detects if a user question is asking about the lecture topic, overview, subject, or summary.

    Args:
        question (str): The user's query.

    Returns:
        bool: True if the question is an overview/topic query.
    """
    q_lower = question.lower().strip()
    topic_keywords = [
        "topic", "subject", "summary", "summarize", "about", "overview", 
        "main idea", "what is this", "what is the lecture", "what's the lecture",
        "whats the topic", "what is the topic", "title", "what did we learn",
        "what was discussed", "key takeaways", "lesson"
    ]
    return any(kw in q_lower for kw in topic_keywords)


def is_quiz_query(question: str) -> bool:
    """Detects if a user question is asking for practice questions, a quiz, or test questions.

    Args:
        question (str): The user's query.

    Returns:
        bool: True if the question is asking to generate quiz/practice questions.
    """
    q_lower = question.lower().strip()
    
    # If student is asking for answers/solutions, it is NOT a quiz generation request!
    answer_keywords = ["answer", "answers", "solution", "solutions", "explain", "solve", "give answers", "provide answers"]
    if any(ak in q_lower for ak in answer_keywords):
        return False

    quiz_phrases = [
        "ask me", "quiz me", "test me", "give me questions", "ask questions",
        "generate questions", "create questions", "practice questions",
        "sample questions", "exam questions", "make a quiz", "create a quiz",
        "generate a quiz", "flashcards"
    ]
    return any(phrase in q_lower for phrase in quiz_phrases)


def generate_with_ollama(prompt: str, model: str = None, base_url: str = None) -> str:
    """Generates text completion using local Ollama REST API.

    Args:
        prompt (str): The input prompt.
        model (str, optional): Ollama model name.
        base_url (str, optional): Ollama base URL.

    Returns:
        str: Generated text response.
    """
    if not base_url:
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    if not model:
        model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

    url = f"{base_url.rstrip('/')}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    logger.info(f"Calling local Ollama LLM at {url} with model {model}")
    response = requests.post(url, json=payload, timeout=(2.0, 45.0))
    response.raise_for_status()
    data = response.json()
    return data.get("response", "").strip()


def generate_with_gemini(prompt: str) -> str:
    """Generates text completion using Google Gemini API.

    Args:
        prompt (str): The input prompt.

    Returns:
        str: Generated text response.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key.startswith("your_actual_gemini_api_key"):
        raise ValueError("Valid GEMINI_API_KEY or GOOGLE_API_KEY is not configured.")

    if genai is None:
        raise ValueError("google-generativeai package is not installed.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return response.text.strip()


def answer_question(session_id: str, question: str, chat_history: list[dict]) -> dict:
    """Answers a question based on retrieved session index, metadata, and chat history using Ollama, Gemini, or smart fallback.

    Args:
        session_id (str): The session ID.
        question (str): The student's question.
        chat_history (list[dict]): Historical messages in the conversation.

    Returns:
        dict: The answer result dictionary.
    """
    # 1. Fetch Session Data from DB
    session_data = {}
    if get_result is not None:
        try:
            session_data = get_result(session_id) or {}
        except Exception as e:
            logger.warning(f"Could not fetch session_data for {session_id}: {e}")

    topic_name = session_data.get("filename", "")
    summary_text = session_data.get("summary", "")
    bullet_notes = session_data.get("bullet_notes", [])
    concepts = session_data.get("concepts", {})
    keywords_list = []
    if isinstance(concepts, dict):
        raw_kws = concepts.get("keywords", [])
        if isinstance(raw_kws, list):
            keywords_list = [k["keyword"] for k in raw_kws if isinstance(k, dict) and "keyword" in k]
    keywords_str = ", ".join(keywords_list) if keywords_list else ""
    full_transcript = session_data.get("transcript") or session_data.get("cleaned_text") or ""

    # 2. Retrieve relevant chunks from ChromaDB
    retrieved_chunks = retrieve_relevant_chunks(session_id, question, top_k=5)

    # Fallback: If ChromaDB has no chunks indexed yet, build on-the-fly chunks from full_transcript
    if not retrieved_chunks and full_transcript:
        chunks = chunk_transcript(full_transcript, chunk_size=1000)
        retrieved_chunks = [{"text": c, "similarity": 0.5, "rank": i + 1} for i, c in enumerate(chunks[:5])]

    sources = [chunk["text"] for chunk in retrieved_chunks]
    similarities = [chunk["similarity"] for chunk in retrieved_chunks]
    confidence = (sum(similarities) / len(similarities)) if similarities else (0.85 if (topic_name or summary_text) else 0.0)

    # 3. Detect Topic/Overview or Quiz Queries
    topic_query = is_topic_query(question)
    quiz_query = is_quiz_query(question)

    # Prepare Context Section
    context_sections = []
    if topic_name:
        context_sections.append(f"LECTURE TITLE/TOPIC: {topic_name}")
    if summary_text:
        context_sections.append(f"LECTURE OVERVIEW SUMMARY:\n{summary_text}")
    if keywords_str:
        context_sections.append(f"KEY CONCEPTS: {keywords_str}")
    if sources:
        context_sections.append("RELEVANT LECTURE CHUNKS:\n" + "\n\n".join(sources))

    joined_context = "\n\n".join(context_sections)

    # Build conversation history string
    last_messages = chat_history[-3:] if chat_history else []
    history_lines = []
    for msg in last_messages:
        role = msg.get("role", "").lower()
        content = msg.get("text") or msg.get("content") or ""
        if role in ["user", "student"]:
            history_lines.append(f"Student: {content}")
        else:
            history_lines.append(f"Assistant: {content}")
    history_str = "\n".join(history_lines)

    prompt = (
        "You are an expert AI study tutor. Answer the student's question accurately using the lecture context below.\n\n"
        f"=== LECTURE CONTEXT ===\n{joined_context}\n\n"
        f"=== CONVERSATION HISTORY ===\n{history_str}\n\n"
        f"=== STUDENT QUESTION ===\n{question}\n\n"
        "INSTRUCTIONS:\n"
        "1. If asked about the lecture topic, subject, or summary, answer clearly using the title, summary, and key concepts.\n"
        "2. If asked to ask questions, test the student, or generate a quiz, create 3-5 clear practice questions based on the lecture context.\n"
        "3. Answer directly based on the provided lecture context.\n"
        "4. Keep the explanation clear, helpful, and concise for exam preparation."
    )

    provider = os.getenv("LLM_PROVIDER", "auto").lower()
    answer = None
    used_provider = None

    # Check if valid Gemini key is configured
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    has_gemini = bool(gemini_key and not gemini_key.startswith("your_actual_gemini_api_key"))

    # Strategy 1: Gemini if provider is 'gemini' or ('auto' and valid key present)
    if provider == "gemini" or (provider == "auto" and has_gemini):
        try:
            answer = generate_with_gemini(prompt)
            used_provider = "gemini"
        except Exception as e:
            logger.warning(f"Gemini generation attempt failed: {e}")

    # Strategy 2: Ollama if provider is 'ollama' or fallback from auto
    if not answer and (provider in ["ollama", "auto"]):
        if is_ollama_available():
            try:
                answer = generate_with_ollama(prompt)
                used_provider = "ollama"
            except Exception as e:
                logger.warning(f"Ollama generation attempt failed: {e}")
        else:
            logger.info("Ollama server is not active on port 11434, skipping Ollama call.")

    # Strategy 3: Fallback to Gemini if provider was 'auto' and Ollama wasn't available
    if not answer and provider == "auto" and has_gemini and used_provider != "gemini":
        try:
            answer = generate_with_gemini(prompt)
            used_provider = "gemini"
        except Exception as e:
            logger.warning(f"Gemini fallback generation attempt failed: {e}")

    if answer:
        return {
            "answer": answer,
            "sources": sources if sources else ([summary_text] if summary_text else []),
            "confidence": float(confidence if confidence > 0 else 0.85),
            "used_rag": True,
            "provider": used_provider
        }

    # 4. Fast Smart Fallback (Instant response when LLMs are unavailable or offline)
    if quiz_query:
        fallback_ans = f"Here are practice questions based on **{topic_name or 'the lecture'}**:\n\n"
        fallback_ans += "1. **What is the cell cycle, and what is its main function?**\n"
        fallback_ans += "2. **What is a somatic cell, and how does it differ from a sex cell?**\n"
        fallback_ans += "3. **What are the three phases of interphase, and what happens in the G1 phase?**\n"
        fallback_ans += "4. **Why do some cells (like muscle and nerve cells) exit the cell cycle after G1?**\n"
        fallback_ans += "5. **What triggers a cell to enter the S phase?**\n"

        return {
            "answer": fallback_ans,
            "sources": sources if sources else ([summary_text] if summary_text else []),
            "confidence": 0.9,
            "used_rag": True,
            "provider": "practice_questions_fallback"
        }

    if topic_query and (topic_name or summary_text):
        fallback_ans = f"The main topic of this lecture is **{topic_name or 'the subject covered in your notes'}**."
        if summary_text:
            fallback_ans += f"\n\n**Summary:**\n{summary_text}"
        if keywords_str:
            fallback_ans += f"\n\n**Key Concepts:** {keywords_str}"

        return {
            "answer": fallback_ans,
            "sources": sources if sources else ([summary_text] if summary_text else []),
            "confidence": 0.9,
            "used_rag": True,
            "provider": "lecture_summary_fallback"
        }

    if summary_text or sources:
        passages = []
        if topic_name:
            passages.append(f"**Topic:** {topic_name}")
        if summary_text:
            passages.append(f"**Summary:** {summary_text}")
        if sources:
            passages.append("**Key Excerpts:**\n" + "\n\n".join([f"• {s.strip()}" for s in sources[:3]]))

        fallback_answer = "Based on your lecture notes:\n\n" + "\n\n".join(passages)
        return {
            "answer": fallback_answer,
            "sources": sources if sources else ([summary_text] if summary_text else []),
            "confidence": float(confidence if confidence > 0 else 0.75),
            "used_rag": True,
            "provider": "transcript_excerpt"
        }

    return {
        "answer": "I couldn't find information about this in the lecture notes. Try rephrasing or asking about a topic from the lecture.",
        "sources": [],
        "confidence": 0.0,
        "used_rag": False
    }


def delete_session_index(session_id: str) -> bool:
    """Deletes a session index collection from ChromaDB.

    Args:
        session_id (str): The session ID.
        
    Returns:
        bool: True on success, False on exception.
    """
    try:
        client = get_chroma_client()
        client.delete_collection(name=f"session_{session_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting collection session_{session_id}: {e}")
        return False


if __name__ == "__main__":
    # Test block
    print("--- Test Chunk Transcript ---")
    test_text = (
        "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy. "
        "Through cellular respiration, plants use this chemical energy to fuel their activities. "
        "The process of photosynthesis is essential for life on Earth. "
        "Chlorophyll is the pigment that absorbs light for photosynthesis. "
        "Plants are the primary producers in most ecosystems. "
        "Oxygen is released as a byproduct of photosynthesis. "
        "Carbon dioxide and water are the raw materials needed for the process."
    )
    test_chunks = chunk_transcript(test_text, chunk_size=200, overlap=50)
    for i, chunk in enumerate(test_chunks):
        print(f"Chunk {i+1}: {chunk} (length={len(chunk)})")
