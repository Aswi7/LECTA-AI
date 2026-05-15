import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

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
        scores = np.asarray(tfidf_matrix.sum(axis=1)).flatten()
        
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

def summarize_text(cleaned_text: str, sentences: list[str], ratio: float = 0.3) -> str:
    """
    Creates an extractive summary of the text.
    
    Args:
        cleaned_text: The full text (not used for scoring, but provided for context).
        sentences: List of sentences extracted from the text.
        ratio: Fraction of sentences to include in the summary.
        
    Returns:
        A single paragraph string representing the summary.
    """
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
