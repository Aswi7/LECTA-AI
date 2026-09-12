import re
import sys
import random
import logging
import json
import os
import requests
from typing import List, Dict, Any
from difflib import SequenceMatcher

import spacy

# Ensure backend root is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
for path in (root_dir, backend_dir):
    if path not in sys.path:
        sys.path.insert(0, path)

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
    r"\bwelcome\b", r"\bsubscribe\b", r"\bchannel\b", r"\bvideo\b", r"\bvideos\b", r"\blecture\b",
    r"\btoday's\b", r"\bin this video\b", r"\bin this lecture\b", r"\blet's get started\b",
    r"\bthanks for watching\b", r"\blike and subscribe\b", r"\bhope you\b", r"\bdon't forget\b",
    r"\bhello everyone\b", r"\bhi guys\b", r"\bsee you\b", r"\bcomment below\b",
    r"\bmoving on to\b", r"\bnext topic\b", r"\bpresentation\b", r"\bslide\b",
    r"\bas i said\b", r"\bas we discussed\b", r"\bin the previous\b", r"\bwelcome back\b",
    r"\bmy name is\b", r"\btoday we are\b", r"\btoday we will\b", r"\bcheck out\b",
    r"\bmake sure to\b", r"\bin this tutorial\b", r"\bwebsite\b", r"\bsign up\b",
    r"\bclick here\b", r"\bplaylist\b", r"\byoutube\b", r"\bflashcard\b", r"\bflashcards\b",
    r"\bexam style\b", r"\bpast papers\b", r"\bpass papers\b", r"\bcognito\b",
    r"\bpatreon\b", r"\blink in the description\b", r"\bsocial media\b",
    r"\bif you haven't heard\b", r"\bfind all of our\b", r"\bbrowse our\b"
]

CONVERSATIONAL_PREFIXES = [
    r"^(because\s+we\s+can\s+see\s+that\s+)",
    r"^(as\s+we\s+can\s+see\s+that\s+)",
    r"^(for\s+example\s*,?\s*)",
    r"^(for\s+instance\s*,?\s*)",
    r"^(so\s+if\s+you\s+)",
    r"^(so\s+as\s+you\s+can\s+see\s*,?\s*)",
    r"^(so\s*,?\s*)",
    r"^(now\s*,?\s*)",
    r"^(basically\s*,?\s*)",
    r"^(remember\s+that\s*)",
    r"^(in\s+other\s+words\s*,?\s*)",
    r"^(as\s+you\s+know\s*,?\s*)"
]

GENERIC_QUESTION_PATTERNS = [
    r"what did you learn",
    r"did you enjoy",
    r"what do you think",
    r"can you explain your understanding",
    r"would you like to learn more",
    r"what is your opinion",
    r"was the video useful",
    r"true or false",
    r"true/false",
    r"multiple choice",
    r"choose the correct",
    r"fill in the blank",
    r"welcome to",
    r"subscribe",
    r"in this video",
    r"in this lecture",
    r"about the video",
    r"opinion"
]

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
    "es": "Spanish",
    "fr": "French",
    "de": "German"
}

def clean_sentence_for_questions(sent: str) -> str:
    """Strips conversational leading phrases from a sentence."""
    text = sent.strip()
    for prefix_pat in CONVERSATIONAL_PREFIXES:
        text = re.sub(prefix_pat, "", text, flags=re.IGNORECASE).strip()
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    return text

def is_meta_or_filler_sentence(sent: str) -> bool:
    """Checks if a sentence is meta-commentary, video intro/outro, or conversational filler."""
    lowercased = sent.lower().strip()
    for pattern in META_FILLER_PATTERNS:
        if re.search(pattern, lowercased):
            return True
    return False

def is_generic_or_invalid_question(q_text: str) -> bool:
    """Checks if a question is generic, conversational, MCQ, True/False, or invalid."""
    if not q_text or len(q_text.strip()) < 8:
        return True
    low = q_text.lower().strip()
    for pat in GENERIC_QUESTION_PATTERNS:
        if re.search(pat, low):
            return True
    return False

def is_valid_subject(subject: str) -> bool:
    """Validates if a subject noun chunk is suitable for an academic question."""
    low = subject.lower().strip()
    if not low or len(low) < 3:
        return False
    bad_words = {
        "this", "that", "it", "they", "we", "he", "she", "here", "there", "what", "which",
        "video", "videos", "topic", "lecture", "today", "channel", "website", "playlist",
        "questions", "flashcards", "papers", "example", "thing", "someone", "anyone", "user",
        "opinion", "viewers", "subscribers"
    }
    if low in bad_words or any(bw in low.split() for bw in bad_words):
        return False
    return True

def clean_question_text(q_text: str) -> str:
    """Removes leading numbers/bullets and normalizes formatting."""
    cleaned = re.sub(r"^\d+[\.\)\s]+", "", q_text.strip())
    cleaned = cleaned.strip()
    if cleaned.endswith(".?"):
        cleaned = cleaned[:-2] + "?"
    elif cleaned.endswith("??"):
        cleaned = cleaned.rstrip("?") + "?"
    elif cleaned and not cleaned.endswith("?") and not cleaned.endswith("."):
        cleaned += "?"
    elif cleaned.endswith("."):
        cleaned = cleaned[:-1] + "?"
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned

def generate_questions_with_llm(text: str, max_questions: int = 10, target_language: str = "en") -> List[Dict[str, Any]]:
    """Generates 10 high-quality academic questions using Ollama or Gemini API with strict formatting rules."""
    if not text or len(text.strip()) < 50:
        return []

    lang_name = LANGUAGE_NAMES.get(target_language.lower(), target_language)

    prompt = (
        f"You are an expert academic professor. Read the lecture transcript below and generate EXACTLY {max_questions} academic questions based ONLY on the content of the lecture.\n\n"
        "STRICT RULES:\n"
        f"1. Generate EXACTLY {max_questions} questions.\n"
        "2. Generate ONLY normal academic questions.\n"
        "   - Do NOT generate True/False questions.\n"
        "   - Do NOT generate MCQs (Multiple Choice Questions).\n"
        "   - Do NOT generate yes/no questions.\n"
        "   - Do NOT generate conversational questions.\n"
        "   - Do NOT generate questions about the user or personal experiences.\n"
        "   - Do NOT generate greetings, casual remarks, or meta-questions.\n"
        "   - Do NOT generate questions unrelated to the lecture.\n"
        "3. Every question MUST be directly answerable from the lecture content.\n"
        "4. Base questions on actual concepts, facts, explanations, processes, examples, definitions, methods, or key points discussed in the lecture.\n"
        "5. Preferred question patterns:\n"
        "   - What is ...?\n"
        "   - Explain ...\n"
        "   - Why is ... important?\n"
        "   - How does ... work?\n"
        "   - What are the main features of ...?\n"
        "   - What are the steps involved in ...?\n"
        "   - What is the difference between ...?\n"
        "   - What are the advantages/disadvantages of ...?\n"
        "   - How is ... used?\n"
        "   - What happens when ...?\n"
        "6. DO NOT invent information that is not present in the transcript.\n"
        "7. DO NOT generate generic questions like 'What did you learn from this video?', 'Did you enjoy the video?', 'What do you think about this topic?', 'Was the video useful?'.\n"
        "8. Avoid duplicate or nearly identical questions. Cover different topics from the lecture.\n"
        "9. Maintain strict difficulty distribution:\n"
        "   - 3 basic understanding questions (difficulty: 'easy')\n"
        "   - 4 conceptual/explanation questions (difficulty: 'medium')\n"
        "   - 3 application/comparison/analysis questions (difficulty: 'hard')\n"
        f"10. Target Language: {lang_name} ({target_language}). Generate ALL questions and answers in {lang_name}.\n\n"
        "Output ONLY a raw JSON array of objects with no markdown formatting or commentary.\n"
        "Each JSON object must contain:\n"
        '  "question": string (the academic question text)\n'
        '  "answer": string (concise answer based strictly on the transcript)\n'
        '  "type": "academic"\n'
        '  "difficulty": "easy" | "medium" | "hard"\n\n'
        f"LECTURE CONTENT:\n{text[:6000]}"
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
                timeout=2
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
            valid_qs = []
            for item in data:
                if isinstance(item, dict) and "question" in item:
                    q_str = clean_question_text(str(item["question"]))
                    if not is_generic_or_invalid_question(q_str) and not is_meta_or_filler_sentence(q_str):
                        valid_qs.append({
                            "question": q_str,
                            "answer": str(item.get("answer", "")).strip(),
                            "type": "academic",
                            "difficulty": item.get("difficulty", "medium") if item.get("difficulty") in ["easy", "medium", "hard"] else "medium"
                        })
            if valid_qs:
                logger.info(f"Successfully generated {len(valid_qs)} AI academic questions")
                return valid_qs[:max_questions]
    except Exception as e:
        logger.error(f"Failed to parse AI question JSON response: {e}")

    return []

def generate_academic_rule_based(sentences: List[str], keywords: List[Dict[str, Any]], max_questions: int = 10) -> List[Dict[str, Any]]:
    """spaCy rule-based generator for academic questions following strict academic patterns."""
    clean_sents = [clean_sentence_for_questions(s) for s in sentences if not is_meta_or_filler_sentence(s)]
    if not clean_sents:
        clean_sents = sentences

    extracted_subjects = []
    for kw in keywords:
        k_text = kw.get("keyword", "").strip()
        if is_valid_subject(k_text) and k_text not in extracted_subjects:
            extracted_subjects.append(k_text)

    for sent in clean_sents:
        doc = nlp(sent)
        for chunk in doc.noun_chunks:
            chunk_text = chunk.text.strip()
            if is_valid_subject(chunk_text) and chunk_text not in extracted_subjects:
                extracted_subjects.append(chunk_text)

    candidate_qs = []

    # Category 1: Definitions ("What is X?") -> Easy
    def_patterns = ["is defined as", "refers to", "is known as", "means that", "can be defined as", "is a type of", "is the process of"]
    for sent in clean_sents:
        low_sent = sent.lower()
        for pat in def_patterns:
            if pat in low_sent:
                doc = nlp(sent)
                pattern_idx = low_sent.find(pat)
                subject = ""
                for chunk in doc.noun_chunks:
                    if chunk.end_char <= pattern_idx:
                        subject = chunk.text.strip()
                    else:
                        break
                if not subject and extracted_subjects:
                    for subj in extracted_subjects:
                        if subj.lower() in low_sent[:pattern_idx + 10]:
                            subject = subj
                            break
                if subject and is_valid_subject(subject):
                    candidate_qs.append({
                        "question": f"What is {subject.capitalize()}?",
                        "answer": sent,
                        "type": "academic",
                        "difficulty": "easy"
                    })
                    break

    # Category 2: Conceptual & Explanation -> Medium
    for sent in clean_sents:
        low_sent = sent.lower()
        if any(w in low_sent for w in ["works", "operates", "functions", "serves", "helps", "allows", "enables", "provides", "uses"]):
            for subj in extracted_subjects:
                if subj.lower() in low_sent:
                    candidate_qs.append({
                        "question": f"How does {subj} work?",
                        "answer": sent,
                        "type": "academic",
                        "difficulty": "medium"
                    })
                    candidate_qs.append({
                        "question": f"Explain {subj}.",
                        "answer": sent,
                        "type": "academic",
                        "difficulty": "medium"
                    })
                    break

        if any(w in low_sent for w in ["feature", "component", "consists of", "contains", "composed of", "includes"]):
            for subj in extracted_subjects:
                if subj.lower() in low_sent:
                    candidate_qs.append({
                        "question": f"What are the main features of {subj}?",
                        "answer": sent,
                        "type": "academic",
                        "difficulty": "medium"
                    })
                    break

    # Category 3: Application / Importance / Analysis -> Hard
    for sent in clean_sents:
        low_sent = sent.lower()
        if any(w in low_sent for w in ["important", "essential", "crucial", "vital", "key", "significance", "role"]):
            for subj in extracted_subjects:
                if subj.lower() in low_sent:
                    candidate_qs.append({
                        "question": f"Why is {subj} important?",
                        "answer": sent,
                        "type": "academic",
                        "difficulty": "hard"
                    })
                    break
        if any(w in low_sent for w in ["when", "if", "result", "causes", "leads to", "produces", "affects"]):
            for subj in extracted_subjects:
                if subj.lower() in low_sent:
                    candidate_qs.append({
                        "question": f"What happens when {subj} is used?",
                        "answer": sent,
                        "type": "academic",
                        "difficulty": "hard"
                    })
                    break

    # If candidate questions are fewer than max_questions, generate from extracted subjects using templates
    if len(candidate_qs) < max_questions and extracted_subjects:
        templates = [
            ("What is {subj}?", "easy"),
            ("Explain the concept of {subj}.", "medium"),
            ("Why is {subj} important in this topic?", "hard"),
            ("How is {subj} used?", "medium"),
            ("What are the main features of {subj}?", "easy"),
            ("What is the role of {subj}?", "hard")
        ]
        for subj in extracted_subjects:
            for tmpl, diff in templates:
                ans = next((s for s in clean_sents if subj.lower() in s.lower()), clean_sents[0] if clean_sents else "")
                candidate_qs.append({
                    "question": tmpl.format(subj=subj.capitalize()),
                    "answer": ans,
                    "type": "academic",
                    "difficulty": diff
                })
                if len(candidate_qs) >= max_questions * 3:
                    break

    # Deduplicate candidate questions
    unique_qs = []
    for q in candidate_qs:
        if is_generic_or_invalid_question(q["question"]):
            continue
        is_dup = False
        for uq in unique_qs:
            sim = SequenceMatcher(None, q["question"].lower(), uq["question"].lower()).ratio()
            if sim > 0.75:
                is_dup = True
                break
        if not is_dup:
            unique_qs.append(q)

    # Balance difficulty: 3 easy, 4 medium, 3 hard
    easy_qs = [q for q in unique_qs if q["difficulty"] == "easy"]
    med_qs = [q for q in unique_qs if q["difficulty"] == "medium"]
    hard_qs = [q for q in unique_qs if q["difficulty"] == "hard"]

    selected = []
    selected.extend(easy_qs[:3])
    selected.extend(med_qs[:4])
    selected.extend(hard_qs[:3])

    remaining = [q for q in unique_qs if q not in selected]
    needed = max_questions - len(selected)
    if needed > 0 and remaining:
        selected.extend(remaining[:needed])

    # If still fewer than max_questions (10), pad with general subject-based academic questions from available sentences
    if len(selected) < max_questions and clean_sents:
        for idx, sent in enumerate(clean_sents):
            if len(selected) >= max_questions:
                break
            doc = nlp(sent)
            n_chunks = [c.text for c in doc.noun_chunks if is_valid_subject(c.text)]
            if n_chunks:
                subj = n_chunks[0].capitalize()
                q_text = f"What is the significance of {subj}?"
                if not any(uq["question"].lower() == q_text.lower() for uq in selected):
                    selected.append({
                        "question": q_text,
                        "answer": sent,
                        "type": "academic",
                        "difficulty": "medium"
                    })

    # Sort difficulty order: easy, medium, hard
    diff_order = {"easy": 0, "medium": 1, "hard": 2}
    selected.sort(key=lambda x: diff_order.get(x["difficulty"], 1))

    return selected[:max_questions]

def generate_questions(sentences: List[str], keywords: List[Dict[str, Any]], max_questions: int = 10, target_language: str = "en") -> List[Dict[str, Any]]:
    """
    Main question generation entry point.
    Generates exactly max_questions (default 10) academic questions in English ONLY.
    """
    clean_sents = [s for s in sentences if not is_meta_or_filler_sentence(s)]
    if not clean_sents:
        clean_sents = sentences

    full_text = " ".join(clean_sents)
    ai_questions = generate_questions_with_llm(full_text, max_questions=max_questions, target_language="en")

    if ai_questions and len(ai_questions) >= max_questions:
        return ai_questions[:max_questions]

    # If AI questions yielded some questions but fewer than max_questions, use rule-based to fill the rest
    logger.info("Using spaCy academic rule-based question generation to ensure exact 10 questions")
    rb_questions = generate_academic_rule_based(clean_sents, keywords, max_questions=max_questions)

    combined = []
    if ai_questions:
        combined.extend(ai_questions)
    
    for q in rb_questions:
        if len(combined) >= max_questions:
            break
        if not any(SequenceMatcher(None, q["question"].lower(), cq["question"].lower()).ratio() > 0.75 for cq in combined):
            combined.append(q)

    # Final guarantee of difficulty distribution tag and clean question format
    for idx, q in enumerate(combined):
        q["question"] = clean_question_text(q["question"])

    return combined[:max_questions]

if __name__ == "__main__":
    test_sentences = [
        "Photosynthesis is defined as the process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water.",
        "The nucleus is known as the control center of the cell.",
        "Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions.",
        "DNA stands for deoxyribonucleic acid and carries genetic information.",
        "ATP refers to adenosine triphosphate, the primary energy carrier in all living organisms.",
        "Gravity is a fundamental force of nature that attracts objects with mass.",
        "The Speed of Light is approximately 299,792,458 meters per second.",
        "Oxygen is essential for cellular respiration in human life.",
        "Water boils at 100 degrees Celsius at standard atmospheric pressure.",
        "The human heart has four chambers that pump blood throughout the body."
    ]

    test_keywords = [
        {"keyword": "Photosynthesis", "score": 0.9},
        {"keyword": "Mitochondria", "score": 0.85},
        {"keyword": "DNA", "score": 0.8},
        {"keyword": "Oxygen", "score": 0.75},
        {"keyword": "Gravity", "score": 0.7}
    ]

    print("--- Generating Academic Questions (10 Questions) ---")
    questions = generate_questions(test_sentences, test_keywords, max_questions=10)

    print(f"Total questions generated: {len(questions)}")
    for i, q in enumerate(questions):
        print(f"{i+1}. [{q['difficulty'].upper()}] {q['question']}")
        print(f"   Answer: {q['answer']}\n")
