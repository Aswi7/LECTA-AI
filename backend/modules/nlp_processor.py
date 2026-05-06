import re
import spacy
import string
from typing import List, Tuple

# Module-level spaCy load
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    raise RuntimeError("Run: python -m spacy download en_core_web_sm")

def clean_text(text: str) -> str:
    """
    Cleans raw text by removing filler words, collapsing whitespace, and filtering non-printable characters.

    Args:
        text: The raw transcript text.

    Returns:
        The cleaned text string.
    """
    # Remove filler words: "um", "uh", "you know", "like", "okay so", "right", "i mean"
    # Case-insensitive, whole-word matching. 
    # We also optionally match a following comma and trailing spaces to clean up the output.
    filler_words = [
        "um", "uh", "you know", "like", "okay so", "right", "i mean"
    ]
    filler_pattern = r'\b(' + '|'.join(map(re.escape, filler_words)) + r')\b[,]?\s*'
    text = re.sub(filler_pattern, '', text, flags=re.IGNORECASE)

    # Remove non-printable characters (keep standard punctuation and whitespace)
    printable = set(string.printable)
    text = ''.join(filter(lambda x: x in printable, text))

    # Collapse multiple spaces and blank lines into single space
    text = re.sub(r'\s+', ' ', text)
    
    # Final cleanup of dangling punctuation (e.g., ", ," or " ,")
    text = re.sub(r'\s+([,.!?])', r'\1', text) # Move punctuation back to word
    text = re.sub(r',+', ',', text)            # Collapse multiple commas
    text = re.sub(r'^[,.\s]+', '', text)       # Strip leading punctuation/whitespace

    return text.strip()

def segment_sentences(text: str) -> List[str]:
    """
    Segments text into sentences using spaCy and filters out short sentences.

    Args:
        text: The cleaned text.

    Returns:
        A list of sentence strings, each with at least 4 words.
    """
    doc = nlp(text)
    sentences = []
    for sent in doc.sents:
        sent_text = sent.text.strip()
        # Filter out any sentence shorter than 4 words
        # We split by whitespace to count words accurately
        if len(sent_text.split()) >= 4:
            sentences.append(sent_text)
    return sentences

def remove_stopwords(text: str) -> str:
    """
    Removes English stopwords, single-character tokens, and numeric tokens.

    Args:
        text: The text to filter.

    Returns:
        The filtered text as a space-joined string.
    """
    doc = nlp(text)
    filtered_tokens = [
        token.text for token in doc 
        if not token.is_stop and len(token.text) > 1 and not token.like_num
    ]
    return ' '.join(filtered_tokens)

def process_text(raw_text: str) -> Tuple[str, List[str]]:
    """
    Main entry point to clean and segment raw transcript text.

    Args:
        raw_text: The raw transcript text from Whisper.

    Returns:
        A tuple containing (cleaned_text, sentences_list).
    """
    cleaned_text = clean_text(raw_text)
    sentences_list = segment_sentences(cleaned_text)
    return cleaned_text, sentences_list

if __name__ == "__main__":
    # Test block with a sample paragraph
    sample_paragraph = (
        "Um, hello everyone. Like, today we are going to talk about NLP, right? "
        "I mean, natural language processing is a very interesting field. "
        "Uh, you know, it involves computers understanding human language. "
        "Okay so, we will cover tokenization and segmentation today. "
        "It is fun. Right?"
    )
    
    cleaned, sentences = process_text(sample_paragraph)
    
    print("--- Original ---")
    print(sample_paragraph)
    print("\n--- Cleaned ---")
    print(cleaned)
    print("\n--- Sentences (Filtered) ---")
    for i, s in enumerate(sentences, 1):
        print(f"{i}. {s}")
    
    # Test stopword removal
    keywords_base = remove_stopwords(cleaned)
    print("\n--- Stopwords Removed ---")
    print(keywords_base)
