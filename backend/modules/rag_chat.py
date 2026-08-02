import os
import logging
from typing import Any
from sentence_transformers import SentenceTransformer  # type: ignore
import chromadb  # type: ignore
import anthropic  # type: ignore

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Module-level variables
_embedding_model = None
_chroma_client = None
CHROMA_PATH = "chroma_db"
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


def chunk_transcript(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
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
    try:
        chunks = chunk_transcript(transcript)
        if not chunks:
            return False

        client = get_chroma_client()
        # Gets or creates ChromaDB collection named f"session_{session_id}"
        collection = client.get_or_create_collection(name=f"session_{session_id}")

        # Embed chunks
        model = load_embedding_model()
        embeddings = model.encode(chunks).tolist()

        # Add to collection
        collection.add(
            documents=chunks,
            embeddings=embeddings,
            ids=[f"{session_id}_chunk_{i}" for i in range(len(chunks))],
            metadatas=[metadata] * len(chunks)
        )
        logger.info(f"Indexed {len(chunks)} chunks for session {session_id}")
        return True
    except Exception as e:
        logger.error(f"Error indexing session {session_id}: {e}")
        return False


def retrieve_relevant_chunks(session_id: str, question: str, top_k: int = 3) -> list[dict]:
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


def answer_question(session_id: str, question: str, chat_history: list[dict]) -> dict:
    """Answers a question based on retrieved session index and chat history using Anthropic API.

    Args:
        session_id (str): The session ID.
        question (str): The student's question.
        chat_history (list[dict]): Historical messages in the conversation.

    Returns:
        dict: The answer result.
    """
    retrieved_chunks = retrieve_relevant_chunks(session_id, question)
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

    try:
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

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        answer = getattr(message.content[0], "text", "")

        return {
            "answer": answer,
            "sources": sources,
            "confidence": float(confidence),
            "used_rag": True
        }
    except Exception as e:
        logger.error(f"Anthropic API error answering question for session {session_id}: {e}")
        return {
            "answer": "An error occurred while calling the AI assistant. Please try again later.",
            "sources": sources,
            "confidence": float(confidence),
            "used_rag": True
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
