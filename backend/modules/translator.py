import os
import sys
import re
import time
import logging
from typing import List, Dict, Any

# Ensure root and backend directories are in sys.path for reliable module imports
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
for path in (root_dir, backend_dir):
    if path not in sys.path:
        sys.path.insert(0, path)

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
    "ur": "Urdu",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "zh": "Chinese",
    "ja": "Japanese",
    "ru": "Russian",
    "ar": "Arabic",
    "pt": "Portuguese",
    "it": "Italian",
    "en": "English"
}

TRANSLATION_PROMPT_TEMPLATE = """You are a professional multilingual translator for an educational lecture assistant.

Your task is to translate the provided lecture summary from the source language into the target language.

IMPORTANT RULES:

1. Translate the ENTIRE summary. Do not skip, shorten, or remove any information.
2. Preserve the exact meaning and context of the original summary.
3. Do NOT add new information, explanations, examples, or opinions.
4. Do NOT summarize the summary again.
5. Preserve the original structure:
   - Headings
   - Subheadings
   - Bullet points
   - Numbered lists
   - Paragraphs
6. Keep technical terms, scientific terms, programming terms, mathematical expressions, formulas, names, and abbreviations accurate.
7. If a technical term does not have a natural or commonly accepted translation, keep the original technical term and translate the surrounding explanation.
8. Preserve numbers, dates, percentages, units, equations, code, URLs, and special symbols exactly unless they must be linguistically localized.
9. Translate naturally so that a native speaker of the target language can understand it easily.
10. Do not translate proper nouns such as people's names, organization names, product names, programming languages, libraries, or course names unless there is a standard translated form.
11. Do not output the original text along with the translation.
12. Output ONLY the translated summary. Do not include comments such as "Here is the translation."

TARGET LANGUAGE:
{target_language}

SOURCE SUMMARY:
{summary}"""

def get_supported_languages() -> Dict[str, str]:
    """Returns the dictionary of supported regional and global languages."""
    return SUPPORTED_REGIONAL_LANGUAGES

def get_language_name(lang_code_or_name: str) -> str:
    """Resolves language code to full language name if possible."""
    clean_code = lang_code_or_name.lower().strip()
    return SUPPORTED_REGIONAL_LANGUAGES.get(clean_code, lang_code_or_name.capitalize())

def get_language_code(target_lang: str) -> str:
    """Resolves full language name or code to ISO language code if possible."""
    target_clean = target_lang.lower().strip()
    if target_clean in SUPPORTED_REGIONAL_LANGUAGES:
        return target_clean
    for code, name in SUPPORTED_REGIONAL_LANGUAGES.items():
        if name.lower() == target_clean:
            return code
    return target_clean

def chunk_text(text: str, max_chars: int = 4500) -> List[str]:
    """
    Splits text into chunks no longer than max_chars.
    Splits only at sentence boundaries (. ! or ?).
    """
    if len(text) <= max_chars:
        return [text]

    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(sentence) > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
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

def translate_with_llm(summary: str, target_lang: str) -> str:
    """
    Translates lecture summary using local Ollama or Google Gemini API with system prompt rules.
    """
    if not summary or not summary.strip():
        return ""

    target_lang_name = get_language_name(target_lang)
    prompt = TRANSLATION_PROMPT_TEMPLATE.format(
        target_language=target_lang_name,
        summary=summary.strip()
    )

    provider = os.getenv("LLM_PROVIDER", "auto").lower()

    # Strategy 1: Try Ollama
    if provider in ["ollama", "auto"]:
        try:
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip('/')
            model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
            import requests
            res = requests.post(
                f"{base_url}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
                timeout=5
            )
            if res.status_code == 200:
                translated = res.json().get("response", "").strip()
                if translated:
                    logger.info(f"Successfully translated summary to {target_lang_name} using Ollama")
                    return translated
        except Exception as e:
            logger.warning(f"Ollama translation attempt failed: {e}")

    # Strategy 2: Try Gemini
    if provider in ["gemini", "auto"]:
        try:
            try:
                from modules.rag_chat import generate_with_gemini
            except ImportError:
                from backend.modules.rag_chat import generate_with_gemini
            
            translated = generate_with_gemini(prompt)
            if translated and len(translated.strip()) > 0:
                logger.info(f"Successfully translated summary to {target_lang_name} using Gemini")
                return translated.strip()
        except Exception as e:
            logger.warning(f"Gemini translation attempt failed: {e}")

    return ""

def translate_text(text: str, target_lang: str, source_lang: str = "auto") -> str:
    """
    Translates text to the target language with LLM prompt rules and fallback to GoogleTranslator.
    """
    if not text or not text.strip():
        return ""

    # Attempt LLM prompt-based translation first
    try:
        llm_translation = translate_with_llm(text, target_lang)
        if llm_translation and not str(llm_translation).startswith("Error 500"):
            return llm_translation
    except Exception as e:
        logger.warning(f"LLM translation failed, falling back to GoogleTranslator: {e}")

    # Fallback to GoogleTranslator
    target_code = get_language_code(target_lang)
    try:
        translator = GoogleTranslator(source=source_lang, target=target_code)
        chunks = chunk_text(text)
        translated_chunks = []

        for chunk in chunks:
            success = False
            last_exception = None
            for attempt in range(3):
                try:
                    translated = translator.translate(chunk)
                    if translated and not str(translated).startswith("Error 500") and "Server Error" not in str(translated):
                        translated_chunks.append(translated)
                        success = True
                        break
                    else:
                        logger.warning(f"GoogleTranslator returned server error string: {translated}")
                except (RequestError, Exception) as e:
                    last_exception = e
                    logger.warning(f"Translation attempt {attempt + 1} failed: {e}. Retrying...")
                    time.sleep(1)
            
            if not success:
                logger.error(f"Failed to translate chunk after 3 attempts. Error: {last_exception}")
                translated_chunks.append(chunk)

        result_text = " ".join(translated_chunks)
        if str(result_text).startswith("Error 500"):
            return text
        return result_text
    except Exception as e:
        logger.error(f"GoogleTranslator execution failed: {e}")
        return text

def translate_keywords(keywords: List[Dict[str, Any]], target_lang: str) -> List[Dict[str, Any]]:
    """
    Translates a list of keywords in a single batch request, with individual fallback.
    """
    if not keywords:
        return []

    target_code = get_language_code(target_lang)
    translated_keywords = []
    
    try:
        translator = GoogleTranslator(source='auto', target=target_code)
        kw_strings = [kw_dict.get("keyword", "").strip() for kw_dict in keywords if kw_dict.get("keyword")]
        
        if not kw_strings:
            return [kw.copy() for kw in keywords]

        separator = " ||| "
        combined_text = separator.join(kw_strings)
        
        logger.info(f"Batch translating {len(kw_strings)} keywords...")
        try:
            translated_combined = translator.translate(combined_text)
            if translated_combined and not str(translated_combined).startswith("Error 500") and "Server Error" not in str(translated_combined):
                translated_parts = [part.strip() for part in translated_combined.split("|||")]
                
                if len(translated_parts) == len(kw_strings):
                    kw_map = dict(zip(kw_strings, translated_parts))
                    for kw_dict in keywords:
                        new_dict = kw_dict.copy()
                        orig_kw = kw_dict.get("keyword", "").strip()
                        new_dict["translated"] = kw_map.get(orig_kw, orig_kw)
                        translated_keywords.append(new_dict)
                    logger.info("Batch keyword translation completed successfully.")
                    return translated_keywords
                else:
                    logger.warning(f"Batch translation returned mismatched count: {len(translated_parts)} instead of {len(kw_strings)}. Falling back to individual translation...")
        except Exception as e:
            logger.warning(f"Batch keyword translation failed: {e}. Falling back to individual translation...")
            
        for kw_dict in keywords:
            new_dict = kw_dict.copy()
            keyword = kw_dict.get("keyword", "")
            
            if not keyword:
                new_dict["translated"] = ""
                translated_keywords.append(new_dict)
                continue

            try:
                translated = translator.translate(keyword)
                if translated and not str(translated).startswith("Error 500") and "Server Error" not in str(translated):
                    new_dict["translated"] = translated
                else:
                    new_dict["translated"] = keyword
            except Exception as e:
                logger.warning(f"Failed to translate keyword '{keyword}': {e}")
                new_dict["translated"] = keyword
                
            translated_keywords.append(new_dict)

        return translated_keywords
    except Exception as e:
        logger.error(f"Keyword translation failed: {e}")
        return [{**kw, "translated": kw.get("keyword", "")} for kw in keywords]

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

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

    target = "hi"
    print(f"--- Testing Translation to {get_language_name(target)} ---")
    
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


