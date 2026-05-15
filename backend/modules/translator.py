import re
import time
import logging
from typing import List, Dict, Any
from deep_translator import GoogleTranslator
from deep_translator.exceptions import TranslationNotFound, RequestError

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SUPPORTED_REGIONAL_LANGUAGES = {
    "ta": "Tamil",
    "hi": "Hindi",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "ur": "Urdu"
}

def get_supported_languages() -> Dict[str, str]:
    """Returns the dictionary of supported Indian regional languages."""
    return SUPPORTED_REGIONAL_LANGUAGES

def chunk_text(text: str, max_chars: int = 4500) -> List[str]:
    """
    Splits text into chunks no longer than max_chars.
    Splits only at sentence boundaries (. ! or ?).
    
    Args:
        text: The input text to chunk.
        max_chars: Maximum characters per chunk.
        
    Returns:
        A list of text chunks.
    """
    if len(text) <= max_chars:
        return [text]

    # Split by sentence boundaries using positive lookbehind to keep the punctuation
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        # If a single sentence is longer than max_chars, we have to force split it
        if len(sentence) > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
            
            # Force split long sentence
            for i in range(0, len(sentence), max_chars):
                chunks.append(sentence[i:i+max_chars].strip())
            continue

        if len(current_chunk) + len(sentence) + 1 <= max_chars:
            current_chunk += (sentence + " ")
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence + " "

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

def translate_text(text: str, target_lang: str, source_lang: str = "auto") -> str:
    """
    Translates text to the target language with retry logic and chunking.
    
    Args:
        text: The text to translate.
        target_lang: The target language code (e.g., 'ta', 'hi').
        source_lang: The source language code, defaults to 'auto'.
        
    Returns:
        The translated text.
        
    Raises:
        ValueError: If the target_lang is not supported.
    """
    if target_lang not in SUPPORTED_REGIONAL_LANGUAGES:
        # Check if it's at least a valid 2-letter code if not in our specific list, 
        # but the requirement says "Raises ValueError if target_lang is not a valid language code".
        # We'll enforce our regional list for this project's scope.
        raise ValueError(f"Language code '{target_lang}' is not supported or invalid.")

    translator = GoogleTranslator(source=source_lang, target=target_lang)
    
    chunks = chunk_text(text)
    translated_chunks = []

    for chunk in chunks:
        success = False
        last_exception = None
        for attempt in range(3):
            try:
                translated = translator.translate(chunk)
                translated_chunks.append(translated)
                success = True
                break
            except (RequestError, Exception) as e:
                last_exception = e
                logger.warning(f"Translation attempt {attempt + 1} failed: {e}. Retrying...")
                time.sleep(1)
        
        if not success:
            logger.error(f"Failed to translate chunk after 3 attempts. Error: {last_exception}")
            # Fallback to original chunk if all retries fail
            translated_chunks.append(chunk)

    return " ".join(translated_chunks)

def translate_keywords(keywords: List[Dict[str, Any]], target_lang: str) -> List[Dict[str, Any]]:
    """
    Translates a list of keywords and adds the "translated" key to each dict.
    
    Args:
        keywords: A list of dictionaries containing at least a "keyword" key.
        target_lang: The target language code.
        
    Returns:
        A new list of dictionaries with the "translated" key.
    """
    translated_keywords = []
    translator = GoogleTranslator(source='auto', target=target_lang)

    for kw_dict in keywords:
        new_dict = kw_dict.copy()
        keyword = kw_dict.get("keyword", "")
        
        if not keyword:
            new_dict["translated"] = ""
            translated_keywords.append(new_dict)
            continue

        try:
            # We don't necessarily need retry logic for every single keyword to keep it fast,
            # but we follow the "graceful failure" rule.
            translated = translator.translate(keyword)
            new_dict["translated"] = translated
        except Exception as e:
            logger.warning(f"Failed to translate keyword '{keyword}': {e}")
            new_dict["translated"] = keyword # Fallback to original
            
        translated_keywords.append(new_dict)

    return translated_keywords

if __name__ == "__main__":
    # Test block
    test_text = (
        "Artificial intelligence is transforming the world. "
        "It enables machines to learn from experience and perform human-like tasks. "
        "Many applications, from self-driving cars to medical diagnosis, rely on deep learning algorithms."
    )
    
    test_keywords = [
        {"keyword": "Artificial Intelligence", "score": 0.95},
        {"keyword": "Machine Learning", "score": 0.88},
        {"keyword": "Neural Networks", "score": 0.82}
    ]

    target = "hi" # Hindi
    print(f"--- Testing Translation to {SUPPORTED_REGIONAL_LANGUAGES[target]} ---")
    
    try:
        translated_text = translate_text(test_text, target)
        print(f"Original: {test_text}")
        print(f"Translated: {translated_text}")
        
        print("\n--- Testing Keyword Translation ---")
        translated_kws = translate_keywords(test_keywords, target)
        for kw in translated_kws:
            print(f"{kw['keyword']} -> {kw['translated']} (Score: {kw['score']})")
            
    except Exception as e:
        print(f"Error during testing: {e}")
