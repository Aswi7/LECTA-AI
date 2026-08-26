import re
import random
import logging
from typing import List, Dict, Any
from difflib import SequenceMatcher

import spacy

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model 'en_core_web_sm' not found. Attempting to download...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

META_FILLER_PATTERNS = [
    r"\bwelcome\b", r"\bsubscribe\b", r"\bchannel\b", r"\bvideo\b", r"\blecture\b",
    r"\btoday's\b", r"\bin this video\b", r"\bin this lecture\b", r"\blet's get started\b",
    r"\bthanks for watching\b", r"\blike and subscribe\b", r"\bhope you\b", r"\bdon't forget\b",
    r"\bhello everyone\b", r"\bhi guys\b", r"\bsee you\b", r"\bcomment below\b",
    r"\bmoving on to\b", r"\bnext topic\b", r"\bpresentation\b", r"\bslide\b",
    r"\bas i said\b", r"\bas we discussed\b", r"\bin the previous\b", r"\bwelcome back\b",
    r"\bmy name is\b", r"\btoday we are\b", r"\btoday we will\b", r"\bcheck out\b",
    r"\bmake sure to\b", r"\bin this tutorial\b"
]

def is_meta_or_filler_sentence(sent: str) -> bool:
    """Checks if a sentence is meta-commentary, video intro/outro, or conversational filler."""
    lowercased = sent.lower().strip()
    for pattern in META_FILLER_PATTERNS:
        if re.search(pattern, lowercased):
            return True
    return False

def is_valid_subject(subject: str) -> bool:
    """Validates if a subject noun chunk is suitable for a definition question."""
    low = subject.lower().strip()
    if not low or len(low) < 3:
        return False
    bad_words = {"this", "that", "it", "they", "we", "he", "she", "here", "there", "what", "which", "video", "topic", "lecture", "today", "channel"}
    if low in bad_words or any(bw in low.split() for bw in bad_words):
        return False
    return True

def get_difficulty(sentence: str) -> str:
    """
    Determines sentence difficulty based on length and entity density.
    
    Args:
        sentence: Input sentence string.
        
    Returns:
        Difficulty level: "easy", "medium", or "hard".
    """
    doc = nlp(sentence)
    word_count = len([token for token in doc if not token.is_punct])
    entity_count = len(doc.ents)
    
    if word_count < 12:
        return "easy"
    elif word_count > 25 or entity_count > 2:
        return "hard"
    else:
        return "medium"

def generate_definition_questions(sentences: List[str]) -> List[Dict[str, Any]]:
    """
    Generates "What is X?" questions from sentences containing definition patterns.
    """
    patterns = [
        "is defined as", "refers to", "is known as", 
        "means that", "can be defined as", "is a type of"
    ]
    questions = []
    
    for sent in sentences:
        if is_meta_or_filler_sentence(sent):
            continue
        lowercased = sent.lower()
        matched_pattern = next((p for p in patterns if p in lowercased), None)
        
        if matched_pattern:
            doc = nlp(sent)
            subject = ""
            pattern_start_idx = lowercased.find(matched_pattern)
            
            for chunk in doc.noun_chunks:
                if chunk.end_char <= pattern_start_idx:
                    subject = chunk.text
                else:
                    break
            
            if subject and is_valid_subject(subject):
                subject = subject.strip().capitalize()
                questions.append({
                    "question": f"What is {subject}?",
                    "answer": sent,
                    "type": "definition",
                    "difficulty": get_difficulty(sent)
                })
                
    return questions

def generate_fill_in_blank(sentences: List[str], keywords: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates fill-in-the-blank questions based on extracted keywords.
    """
    questions = []
    keyword_list = [kw["keyword"] for kw in keywords]
    
    for sent in sentences:
        if is_meta_or_filler_sentence(sent):
            continue
        for kw in keyword_list:
            if not kw or len(kw.strip()) < 3:
                continue
            doc = nlp(sent)
            matches = [token for token in doc if token.text.lower() == kw.lower()]
            
            if len(matches) == 1:
                start = matches[0].idx
                end = start + len(matches[0].text)
                masked_sent = sent[:start] + "______" + sent[end:]
                
                questions.append({
                    "question": masked_sent,
                    "answer": matches[0].text,
                    "type": "fill_blank",
                    "difficulty": get_difficulty(sent)
                })
                break
                
    return questions

def generate_true_false(sentences: List[str]) -> List[Dict[str, Any]]:
    """
    Generates True or False questions from declarative sentences.
    """
    questions = []
    
    for sent in sentences:
        if is_meta_or_filler_sentence(sent):
            continue
        doc = nlp(sent)
        word_count = len([t for t in doc if not t.is_punct])
        
        # Must have at least 1 noun chunk or entity to ensure factual substance
        if not list(doc.noun_chunks) and not list(doc.ents):
            continue

        if 8 <= word_count <= 25:
            diff = get_difficulty(sent)
            questions.append({
                "question": f"True or False: {sent}",
                "answer": "True",
                "type": "true_false",
                "difficulty": diff
            })
            
            root = next((token for token in doc if token.head == token and token.pos_ == "VERB"), None)
            if not root:
                root = next((token for token in doc if token.pos_ == "AUX"), None)
                
            if root:
                if root.lemma_ == "be":
                    idx = root.idx + len(root.text)
                    false_sent = sent[:idx] + " not" + sent[idx:]
                else:
                    idx = root.idx
                    false_sent = sent[:idx] + "NOT " + sent[idx:]
                
                questions.append({
                    "question": f"True or False: {false_sent}",
                    "answer": "False",
                    "type": "true_false",
                    "difficulty": diff
                })
                
    return questions

import json
import os
import requests

def generate_questions_with_llm(text: str, max_questions: int = 8) -> List[Dict[str, Any]]:
    """Generates high-quality exam questions using Ollama or Gemini API with JSON output parsing."""
    if not text or len(text.strip()) < 50:
        return []

    prompt = (
        f"You are an expert academic professor creating an official exam. Read the lecture content below and generate {max_questions} high-yield, conceptually important exam questions.\n\n"
        "STRICT QUALITY & RELEVANCE RULES:\n"
        "1. Focus ONLY on core academic, scientific, or factual concepts taught in the lecture.\n"
        "2. STRICTLY IGNORE conversational filler, greetings, channel plugs, speaker intros/outros, or meta-comments (e.g. NEVER ask 'What is discussed in this video?' or 'True/False: Welcome to class').\n"
        "3. Create a balanced mix of Multiple Choice Questions (MCQs), True/False questions, and Short Answer questions.\n"
        "4. For MCQs, provide 4 distinct, highly plausible domain-specific options.\n"
        "5. Ensure every question tests real understanding of the subject matter.\n\n"
        "Output ONLY a raw JSON array of objects with no markdown fences, no ```json formatting, and no conversational text.\n"
        "Each object must contain:\n"
        '  "question": (string question text)\n'
        '  "options": (list of 4 string options for MCQ, or ["True", "False"] for True/False, or [] for Short Answer)\n'
        '  "answer": (string correct answer)\n'
        '  "type": ("mcq", "true_false", or "short_answer")\n'
        '  "difficulty": ("easy", "medium", or "hard")\n\n'
        f"LECTURE CONTENT:\n{text[:4000]}"
    )

    provider = os.getenv("LLM_PROVIDER", "auto").lower()
    raw_response = None

    # Strategy 1: Try Ollama first
    if provider in ["ollama", "auto"]:
        try:
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip('/')
            model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
            res = requests.post(
                f"{base_url}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
                timeout=5
            )
            if res.status_code == 200:
                raw_response = res.json().get("response", "").strip()
        except Exception as e:
            logger.warning(f"Ollama question generation attempt failed: {e}")

    # Strategy 2: Try Gemini fallback
    if not raw_response and provider in ["gemini", "auto"]:
        try:
            try:
                from modules.rag_chat import generate_with_gemini
            except ImportError:
                from backend.modules.rag_chat import generate_with_gemini
            raw_response = generate_with_gemini(prompt)
        except Exception as e:
            logger.warning(f"Gemini question generation attempt failed: {e}")

    if not raw_response:
        return []

    # Clean JSON output
    clean_json = raw_response.strip()
    if clean_json.startswith("```"):
        lines = clean_json.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        clean_json = "\n".join(lines).strip()

    try:
        data = json.loads(clean_json)
        if isinstance(data, list) and len(data) > 0:
            logger.info(f"Successfully generated {len(data)} AI exam questions")
            return data[:max_questions]
    except Exception as e:
        logger.error(f"Failed to parse AI question JSON response: {e}")

    return []


def generate_questions(sentences: List[str], keywords: List[Dict[str, Any]], max_questions: int = 10) -> List[Dict[str, Any]]:
    """
    Combines AI LLM question generation with spaCy rule-based fallback.
    """
    clean_sentences = [s for s in sentences if not is_meta_or_filler_sentence(s)]
    if not clean_sentences:
        clean_sentences = sentences

    full_text = " ".join(clean_sentences)
    ai_questions = generate_questions_with_llm(full_text, max_questions=max_questions)
    
    if ai_questions:
        filtered_ai_qs = [
            q for q in ai_questions 
            if isinstance(q, dict) and "question" in q and not is_meta_or_filler_sentence(q["question"])
        ]
        if filtered_ai_qs:
            return filtered_ai_qs[:max_questions]

    logger.info("Falling back to spaCy rule-based question generation")
    all_qs = []
    all_qs.extend(generate_definition_questions(clean_sentences))
    all_qs.extend(generate_fill_in_blank(clean_sentences, keywords))
    all_qs.extend(generate_true_false(clean_sentences))
    
    # Deduplicate by similarity
    unique_qs = []
    for q in all_qs:
        is_duplicate = False
        for uq in unique_qs:
            similarity = SequenceMatcher(None, q["question"].lower(), uq["question"].lower()).ratio()
            if similarity > 0.8:
                is_duplicate = True
                break
        if not is_duplicate:
            unique_qs.append(q)
            
    # Balancing: 40% fill-blank, 30% true/false, 30% definition
    fill_blank_qs = [q for q in unique_qs if q["type"] == "fill_blank"]
    tf_qs = [q for q in unique_qs if q["type"] == "true_false"]
    def_qs = [q for q in unique_qs if q["type"] == "definition"]
    
    target_fb = int(max_questions * 0.4)
    target_tf = int(max_questions * 0.3)
    target_def = max_questions - target_fb - target_tf
    
    # Sample from each
    final_qs = []
    final_qs.extend(random.sample(fill_blank_qs, min(len(fill_blank_qs), target_fb)))
    final_qs.extend(random.sample(tf_qs, min(len(tf_qs), target_tf)))
    final_qs.extend(random.sample(def_qs, min(len(def_qs), target_def)))
    
    # If we didn't hit max_questions, fill in with whatever is left
    remaining_pool = [q for q in unique_qs if q not in final_qs]
    needed = max_questions - len(final_qs)
    if needed > 0 and remaining_pool:
        final_qs.extend(random.sample(remaining_pool, min(len(remaining_pool), needed)))
        
    # Sort by difficulty: easy first, then medium, then hard
    diff_map = {"easy": 0, "medium": 1, "hard": 2}
    final_qs.sort(key=lambda x: diff_map.get(x["difficulty"], 1))
    
    return final_qs[:max_questions]

if __name__ == "__main__":
    # Test block
    test_sentences = [
        "Photosynthesis is defined as the process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water.",
        "The nucleus is known as the control center of the cell.",
        "Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions.",
        "DNA stands for deoxyribonucleic acid.",
        "ATP refers to adenosine triphosphate, the primary energy carrier in all living organisms.",
        "Gravity is a fundamental force of nature.",
        "The Speed of Light is approximately 299,792,458 meters per second.",
        "Oxygen is essential for human life.",
        "Water boils at 100 degrees Celsius at standard atmospheric pressure.",
        "The human heart has four chambers."
    ]
    
    test_keywords = [
        {"keyword": "Photosynthesis", "score": 0.9},
        {"keyword": "Mitochondria", "score": 0.85},
        {"keyword": "DNA", "score": 0.8},
        {"keyword": "Oxygen", "score": 0.75},
        {"keyword": "Gravity", "score": 0.7}
    ]
    
    print("--- Generating Questions ---")
    questions = generate_questions(test_sentences, test_keywords, max_questions=8)
    
    for i, q in enumerate(questions):
        print(f"{i+1}. [{q['type'].upper()} | {q['difficulty'].upper()}] {q['question']}")
        print(f"   Answer: {q['answer']}\n")
