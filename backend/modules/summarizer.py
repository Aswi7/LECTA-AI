import logging
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline as hf_pipeline  # type: ignore
import torch

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

_bart_summarizer = None


def load_bart_model():
    """
    Loads and caches the BART summarization pipeline.
    """
    global _bart_summarizer
    if _bart_summarizer is not None:
        return _bart_summarizer
    
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _bart_summarizer = hf_pipeline(
            "summarization",
            model="facebook/bart-large-cnn",
            device=0 if device == "cuda" else -1
        )
        logger.info(f"BART model loaded on {device}")
        return _bart_summarizer
    except Exception as e:
        logger.error(f"Error loading BART model: {e}")
        return None


def chunk_for_bart(text: str, max_words: int = 900) -> list[str]:
    """
    Splits text into chunks under max_words words, always splitting on sentence boundaries.
    """
    if not text:
        return []
    
    # Split text on sentence boundaries (". ", "! ", "? ") without discarding punctuation
    sentences = re.split(r'(?<=\. |\! |\? )', text)
    sentences = [s for s in sentences if s]
    
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for sentence in sentences:
        sentence_words = len(sentence.split())
        if not sentence_words:
            continue
        
        if current_chunk and current_word_count + sentence_words > max_words:
            chunks.append("".join(current_chunk))
            current_chunk = [sentence]
            current_word_count = sentence_words
        else:
            current_chunk.append(sentence)
            current_word_count += sentence_words
            
    if current_chunk:
        chunks.append("".join(current_chunk))
        
    return chunks


def summarize_with_bart(text: str, max_length: int = 150, min_length: int = 50) -> str:
    """
    Summarizes the text using BART. Fallback to TF-IDF summarization on failure.
    """
    model = load_bart_model()
    if model is None:
        logger.info("Fallback summarizer was used.")
        return summarize_text(text, text.split(". "), use_bart=False)
        
    try:
        word_count = len(text.split())
        if word_count > 900:
            chunks = chunk_for_bart(text)
            chunk_summaries = []
            for chunk in chunks:
                res = model(chunk, max_length=max_length, min_length=min_length, do_sample=False)
                if res and isinstance(res, list) and len(res) > 0:
                    chunk_summaries.append(res[0]["summary_text"])
            
            joined_text = " ".join(chunk_summaries)
            res = model(joined_text, max_length=max_length, min_length=min_length, do_sample=False)
            final_summary = res[0]["summary_text"]
        else:
            res = model(text, max_length=max_length, min_length=min_length, do_sample=False)
            final_summary = res[0]["summary_text"]
            
        logger.info("BART summarizer was used.")
        return final_summary
    except Exception as e:
        logger.error(f"Error during BART summarization: {e}")
        logger.info("Fallback summarizer was used.")
        return summarize_text(text, text.split(". "), use_bart=False)


def score_sentences(sentences: list[str]) -> dict[str, float]:
    """
    Scores each sentence based on the sum of its TF-IDF term weights.
    
    Args:
        sentences: A list of sentence strings.
        
    Returns:
        A dictionary mapping each sentence to its calculated score.
    """
    if not sentences:
        return {}
    
    if len(sentences) == 1:
        return {sentences[0]: 1.0}

    try:
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(sentences)
        
        # Calculate scores as the sum of TF-IDF values for each sentence
        # matrix.sum(axis=1) returns a matrix of shape (n_sentences, 1)
        scores = np.asarray(tfidf_matrix.sum(axis=1)).flatten()  # type: ignore
        
        return {sentences[i]: float(scores[i]) for i in range(len(sentences))}
    except ValueError:
        # Handles cases where sentences might contain only stop words or be empty strings
        return {s: 0.0 for s in sentences}

def deduplicate_sentences(scored: dict[str, float], threshold: float = 0.85) -> list[str]:
    """
    Removes redundant sentences based on cosine similarity of their TF-IDF vectors.
    
    Args:
        scored: A dictionary of {sentence: score}.
        threshold: Cosine similarity threshold for deduplication.
        
    Returns:
        A list of deduplicated sentences sorted by score descending.
    """
    if len(scored) <= 1:
        return list(scored.keys())

    # Sort sentences by score descending
    sorted_items = sorted(scored.items(), key=lambda x: x[1], reverse=True)
    sentences = [item[0] for item in sorted_items]
    
    try:
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(sentences)
        sim_matrix = cosine_similarity(tfidf_matrix)
    except ValueError:
        # Fallback if TF-IDF fails
        return sentences

    keep_indices = []
    dropped_indices = set()

    for i in range(len(sentences)):
        if i in dropped_indices:
            continue
        
        keep_indices.append(i)
        
        for j in range(i + 1, len(sentences)):
            if j in dropped_indices:
                continue
            
            if sim_matrix[i, j] > threshold:
                dropped_indices.add(j)

    return [sentences[i] for i in keep_indices]

def summarize_text(cleaned_text: str, sentences: list[str], ratio: float = 0.3, use_bart: bool = True) -> str:
    """
    Creates an extractive summary of the text.
    
    Args:
        cleaned_text: The full text (not used for scoring, but provided for context).
        sentences: List of sentences extracted from the text.
        ratio: Fraction of sentences to include in the summary.
        use_bart: Whether to use BART model for abstractive summarization.
        
    Returns:
        A single paragraph string representing the summary.
    """
    if use_bart and len(cleaned_text.split()) > 50:
        return summarize_with_bart(cleaned_text)

    if not sentences:
        return ""
    
    scored = score_sentences(sentences)
    deduplicated = deduplicate_sentences(scored)
    
    # Calculate how many sentences to keep
    target_count = max(2, int(len(sentences) * ratio))
    
    # Select top sentences from deduplicated list
    top_sentences = deduplicated[:target_count]
    
    # If we have fewer than 2 sentences but more were available in original input,
    # fill in from original sentences (sorted by score) until we hit 2 or run out.
    if len(top_sentences) < 2 and len(sentences) >= 2:
        sorted_sentences = sorted(scored.items(), key=lambda x: x[1], reverse=True)
        for sent, score in sorted_sentences:
            if sent not in top_sentences:
                top_sentences.append(sent)
            if len(top_sentences) >= 2:
                break
    
    # Preserve original sentence order
    # Create a map of sentence to its original index
    original_order = {sent: i for i, sent in enumerate(sentences)}
    ordered_summary = sorted(top_sentences, key=lambda x: original_order.get(x, 999))
    
    return " ".join(ordered_summary)

def generate_bullet_notes(sentences: list[str], top_n: int = 8) -> list[str]:
    """
    Generates high-signal bullet points from the sentences.
    
    Args:
        sentences: List of sentences.
        top_n: Maximum number of bullet points to return.
        
    Returns:
        A list of strings, each starting with "• ".
    """
    if not sentences:
        return []
    
    scored = score_sentences(sentences)
    deduplicated = deduplicate_sentences(scored)
    
    # Select top N
    top_n_sentences = deduplicated[:top_n]
    
    return [f"• {s}" for s in top_n_sentences]

if __name__ == "__main__":
    # Test block
    test_sentences = [
        "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy.",
        "Through cellular respiration, plants use this chemical energy to fuel their activities.",
        "Light energy is converted into chemical energy during photosynthesis.", # Redundant
        "The process of photosynthesis is essential for life on Earth.",
        "Chlorophyll is the pigment that absorbs light for photosynthesis.",
        "Plants are the primary producers in most ecosystems.",
        "Oxygen is released as a byproduct of photosynthesis.",
        "Carbon dioxide and water are the raw materials needed for the process."
    ]
    
    print("--- Scoring ---")
    scores = score_sentences(test_sentences)
    for s, score in scores.items():
        print(f"{score:.4f}: {s}")
        
    print("\n--- Summary ---")
    summary = summarize_text("", test_sentences, ratio=0.4)
    print(summary)
    
    print("\n--- Bullet Notes ---")
    bullets = generate_bullet_notes(test_sentences, top_n=4)
    for b in bullets:
        print(b)
        
    print("\n--- BART Summary ---")
    long_text = (
        "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy. "
        "Through cellular respiration, plants use this chemical energy to fuel their activities. "
        "The process of photosynthesis is essential for life on Earth. "
        "Chlorophyll is the pigment that absorbs light for photosynthesis. "
        "Plants are the primary producers in most ecosystems. "
        "Oxygen is released as a byproduct of photosynthesis. "
        "Carbon dioxide and water are the raw materials needed for the process. "
        "This long text is designed to be over fifty words so that we can trigger the BART model for abstractive summarization. "
        "Let us add some more sentences. The BART model is a sequence-to-sequence model trained on denoising text. "
        "It excels at abstractive summarization because it can rewrite and compress information. "
        "By using Facebook's bart-large-cnn model, we get high quality summaries that capture the core meaning of our lecture content. "
        "This is a demonstration of that capability."
    )
    print(f"Word count of test text: {len(long_text.split())}")
    bart_summary = summarize_text(long_text, test_sentences, use_bart=True)
    print("BART Summary Output:")
    print(bart_summary)
