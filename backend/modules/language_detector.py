import logging
import re
from typing import List, Dict, Any
from langdetect import detect_langs, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException

# Set seed for reproducible results from langdetect
DetectorFactory.seed = 0

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ISO 639-1 codes mapped to full language names
LANGUAGE_NAMES = {
    "en": "English",
    "ta": "Tamil",
    "hi": "Hindi",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "ur": "Urdu",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "zh": "Chinese",
    "ar": "Arabic"
}

def detect_language(text: str) -> Dict[str, Any]:
    """
    Detects the primary language of the given text and identifies if it's multilingual.

    Args:
        text: The text to analyze.

    Returns:
        A dictionary containing:
        - code: ISO 639-1 language code.
        - name: Full language name.
        - confidence: Confidence score of the detection.
        - is_multilingual: True if multiple languages are detected with >0.15 confidence.
    """
    default_response = {
        "code": "en",
        "name": LANGUAGE_NAMES.get("en", "English"),
        "confidence": 0.0,
        "is_multilingual": False
    }

    if not text or not text.strip():
        return default_response

    try:
        results = detect_langs(text)
        if not results:
            return default_response

        # Primary language is the first result (highest probability)
        primary_lang = results[0]
        code = primary_lang.lang
        confidence = primary_lang.prob
        name = LANGUAGE_NAMES.get(code, "Unknown")

        # Set is_multilingual to True if more than one language has confidence above 0.15
        significant_langs = [res for res in results if res.prob > 0.15]
        is_multilingual = len(significant_langs) > 1

        return {
            "code": code,
            "name": name,
            "confidence": round(confidence, 4),
            "is_multilingual": is_multilingual
        }

    except LangDetectException as e:
        logger.error(f"Language detection failed: {e}")
        return default_response

def detect_multilingual(text: str, chunk_size: int = 3) -> List[str]:
    """
    Splits text into chunks of sentences and detects languages in each chunk.
    Useful for identifying all languages used in code-mixed lectures.

    Args:
        text: The full text transcript.
        chunk_size: Number of sentences to group for each detection chunk.

    Returns:
        A deduplicated, sorted list of language codes found across all chunks.
    """
    if not text or not text.strip():
        return []

    # Split text into sentences using basic punctuation boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        # Fallback if regex split fails or text has no punctuation
        sentences = [text.strip()]

    detected_codes = set()
    
    # Process sentences in groups of chunk_size
    for i in range(0, len(sentences), chunk_size):
        chunk = " ".join(sentences[i:i + chunk_size])
        if chunk:
            try:
                lang_data = detect_language(chunk)
                # We add the code if we found a language with any confidence
                if lang_data["confidence"] > 0.0:
                    detected_codes.add(lang_data["code"])
            except Exception:
                continue

    return sorted(list(detected_codes))

def is_supported_language(code: str) -> bool:
    """
    Returns True if the language code is in the supported LANGUAGE_NAMES mapping.

    Args:
        code: ISO 639-1 language code.

    Returns:
        Boolean indicating if the language is supported.
    """
    return code in LANGUAGE_NAMES

if __name__ == "__main__":
    # Test cases for language detection
    test_samples = [
        ("This is a standard English lecture on software engineering.", "English"),
        ("வணக்கம், இன்று நாம் ஒரு புதிய பாடத்தை கற்கப்போகிறோம்.", "Tamil"),
        ("आज की कक्षा में हम डेटा साइंस के बारे में बात करेंगे।", "Hindi"),
        ("Welcome to the class. आज हम Neural Networks पढेंगे।", "Mixed En/Hi"),
        ("", "Empty String")
    ]

    print("=== Testing detect_language ===")
    for text, label in test_samples:
        res = detect_language(text)
        print(f"[{label}] -> {res}")

    print("\n=== Testing detect_multilingual ===")
    multilingual_text = (
        "Hello everyone. Today we discuss AI. "
        "இப்போது நாம் தமிழில் பேசலாம். "
        "इसके बाद हम हिंदी में बात करेंगे।"
    )
    found_langs = detect_multilingual(multilingual_text, chunk_size=1)
    print(f"Text: {multilingual_text}")
    print(f"Found Languages: {found_langs}")

    print("\n=== Testing is_supported_language ===")
    print(f"Is 'ta' (Tamil) supported? {is_supported_language('ta')}")
    print(f"Is 'jp' (Japanese) supported? {is_supported_language('jp')}")
