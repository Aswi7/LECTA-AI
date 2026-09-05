import os
import logging
import requests
from typing import Any
from sentence_transformers import SentenceTransformer  # type: ignore
import chromadb  # type: ignore
import google.generativeai as genai  # type: ignore

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Module-level variables
_embedding_model = None
_chroma_client = None
CHROMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db"))
SIMILARITY_THRESHOLD = 0.3


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
        
        # Delete existing collection if it exists (to avoid conflicts on reprocessing)
        try:
            client = get_chroma_client()
            client.delete_collection(collection_name)
            logger.info(f"Deleted existing collection: {collection_name}")
        except Exception:
            pass  # Collection didn't exist, that's fine
        
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
            similarity = 1.0 - distance

            if similarity >= SIMILARITY_THRESHOLD:
                retrieved.append({
                    "text": documents[i],
                    "similarity": round(similarity, 4),
                    "rank": i + 1
                })

        return retrieved
    except Exception as e:
        logger.error(f"Error retrieving chunks for session {session_id}: {e}")
        return []


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
    response = requests.post(url, json=payload, timeout=(3.0, 30.0))
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

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return response.text.strip()


def answer_question(session_id: str, question: str, chat_history: list[dict]) -> dict:
    """Answers a question based on retrieved session index and chat history using Ollama or Gemini.

    Args:
        session_id (str): The session ID.
        question (str): The student's question.
        chat_history (list[dict]): Historical messages in the conversation.

    Returns:
        dict: The answer result.
    """
    retrieved_chunks = retrieve_relevant_chunks(session_id, question, top_k=5)
    if not retrieved_chunks:
        return {
            "answer": "I couldn't find information about this in the lecture notes. Try rephrasing or asking about a topic from the lecture.",
            "sources": [],
            "confidence": 0.0,
            "used_rag": False
        }

    sources = [chunk["text"] for chunk in retrieved_chunks]
    similarities = [chunk["similarity"] for chunk in retrieved_chunks]
    confidence = sum(similarities) / len(similarities) if similarities else 0.0

    # Build conversation history string (last 3 messages)
    last_messages = chat_history[-3:] if chat_history else []
    history_lines = []
    for msg in last_messages:
        role = msg.get("role", "").lower()
        content = msg.get("text") or msg.get("content") or ""
        if role in ["user", "student", "student:"]:
            history_lines.append(f"Student: {content}")
        elif role in ["assistant", "assistant:"]:
            history_lines.append(f"Assistant: {content}")
        else:
            history_lines.append(f"{role.capitalize()}: {content}")
    history_str = "\n".join(history_lines)

    joined_chunks = "\n\n".join(sources)

    prompt = (
        "You are a study assistant. Answer ONLY using the lecture content below. "
        "If answer not found, say so clearly. Do not add outside information.\n\n"
        f"LECTURE CONTENT:\n{joined_chunks}\n\n"
        f"CONVERSATION HISTORY:\n{history_str}\n\n"
        f"STUDENT QUESTION: {question}\n\n"
        "Answer clearly for exam preparation."
    )

    provider = os.getenv("LLM_PROVIDER", "auto").lower()
    answer = None
    used_provider = None

    # Strategy 1: Ollama first if provider is 'ollama' or 'auto'
    if provider in ["ollama", "auto"]:
        try:
            answer = generate_with_ollama(prompt)
            used_provider = "ollama"
        except Exception as e:
            logger.warning(f"Ollama generation attempt failed: {e}")

    # Strategy 2: Gemini fallback or primary if provider is 'gemini' or 'auto' fallback
    if not answer and provider in ["gemini", "auto"]:
        try:
            answer = generate_with_gemini(prompt)
            used_provider = "gemini"
        except Exception as e:
            logger.warning(f"Gemini generation attempt failed: {e}")

    if answer:
        return {
            "answer": answer,
            "sources": sources,
            "confidence": float(confidence),
            "used_rag": True,
            "provider": used_provider
        }

    # Extractive fallback: answer directly using top relevant transcript chunks
    top_passages = "\n\n".join([f"• {chunk['text'].strip()}" for chunk in retrieved_chunks[:3]])
    fallback_answer = (
        f"Based on your lecture transcript:\n\n{top_passages}"
    )

    return {
        "answer": fallback_answer,
        "sources": sources,
        "confidence": float(confidence),
        "used_rag": True,
        "provider": "transcript_excerpt"
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
