import re
import logging
from collections import Counter
from typing import List, Dict, Any, Set

import spacy
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

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

ACADEMIC_STOPWORDS: Set[str] = {
    "therefore", "however", "thus", "furthermore", "moreover", "also", 
    "although", "whereas", "since", "because", "hence", "consequently", 
    "additionally", "nevertheless", "nonetheless", "let", "well", "actually",
    "basically", "specifically", "example", "using", "used", "shows", "shown"
}

ENTITY_DESCRIPTIONS: Dict[str, str] = {
    "PERSON": "People, including fictional",
    "NORP": "Nationalities or religious or political groups",
    "FAC": "Buildings, airports, highways, bridges, etc.",
    "ORG": "Companies, agencies, institutions, etc.",
    "GPE": "Countries, cities, states",
    "LOC": "Non-GPE locations, mountain ranges, bodies of water",
    "PRODUCT": "Objects, vehicles, foods, etc. (not services)",
    "EVENT": "Named hurricanes, battles, wars, sports events, etc.",
    "WORK_OF_ART": "Titles of books, songs, etc.",
    "LAW": "Named documents made into laws",
    "LANGUAGE": "Any named language"
}

EXCLUDED_ENTITIES: Set[str] = {
    "CARDINAL", "ORDINAL", "PERCENT", "MONEY", "QUANTITY", "TIME", "DATE"
}

def extract_keywords(text: str, top_n: int = 15) -> List[Dict[str, Any]]:
    """
    Extracts top keywords using TF-IDF and frequency analysis.
    
    Args:
        text: Input lecture text.
        top_n: Number of keywords to return.
        
    Returns:
        List of dictionaries with keyword, score, and frequency.
    """
    if not text.strip():
        return []

    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 5]
    
    if not sentences:
        sentences = [text]

    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(sentences)
        feature_names = vectorizer.get_feature_names_out()
        
        # Mean TF-IDF across all sentences
        mean_tfidf = np.asarray(tfidf_matrix.mean(axis=0)).flatten()
        
        # Raw frequency in the original text
        # Lowercase text for better matching
        lowercased_text = text.lower()
        
        results = []
        for i, term in enumerate(feature_names):
            # Filtering
            if (term in ACADEMIC_STOPWORDS or 
                len(term) <= 1 or 
                term.isdigit()):
                continue
            
            # Use regex to find whole word frequency
            frequency = len(re.findall(r'\b' + re.escape(term) + r'\b', lowercased_text))
            
            results.append({
                "keyword": term,
                "score": float(mean_tfidf[i]),
                "frequency": frequency
            })
            
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        top_keywords = results[:top_n]
        
        if top_keywords:
            max_score = max(kw["score"] for kw in top_keywords)
            for kw in top_keywords:
                kw["confidence"] = round(kw["score"] / max_score, 3) if max_score > 0 else 0.0
                
        return top_keywords
    except Exception as e:
        logger.error(f"Error in extract_keywords: {e}")
        return []

def extract_named_entities(text: str) -> List[Dict[str, Any]]:
    """
    Extracts meaningful named entities using spaCy.
    
    Args:
        text: Input text.
        
    Returns:
        List of deduplicated entity dictionaries.
    """
    if not text.strip():
        return []

    doc = nlp(text)
    entities = {}
    
    for ent in doc.ents:
        if ent.label_ in EXCLUDED_ENTITIES:
            continue
            
        # Deduplicate by lowercased text
        key = ent.text.strip().lower()
        if key not in entities:
            entities[key] = {
                "text": ent.text.strip(),
                "label": ent.label_,
                "description": ENTITY_DESCRIPTIONS.get(ent.label_, "Other interesting entity")
            }
            
    return list(entities.values())

def get_noun_phrases(text: str, top_n: int = 10) -> List[str]:
    """
    Extracts multi-word noun phrases and returns the most frequent ones.
    
    Args:
        text: Input text.
        top_n: Number of phrases to return.
        
    Returns:
        List of top multi-word noun phrases.
    """
    if not text.strip():
        return []

    doc = nlp(text)
    phrases = []
    
    for chunk in doc.noun_chunks:
        # Multi-word only
        words = chunk.text.strip().split()
        if len(words) >= 2:
            phrases.append(chunk.text.strip().lower())
            
    # Count frequencies
    counts = Counter(phrases)
    
    # Get top N most frequent
    common_phrases = [phrase for phrase, count in counts.most_common(top_n)]
    
    return common_phrases

def get_key_concepts(text: str) -> Dict[str, Any]:
    """
    Combines keywords, entities, and noun phrases into a single concept map.
    
    Args:
        text: Input text.
        
    Returns:
        Dictionary containing all extracted concepts.
    """
    return {
        "keywords": extract_keywords(text),
        "entities": extract_named_entities(text),
        "noun_phrases": get_noun_phrases(text)
    }

if __name__ == "__main__":
    # Test block
    test_lecture = (
        "Good morning everyone. Today we are discussing Quantum Mechanics. "
        "Quantum Mechanics is a fundamental theory in physics that provides a description of the "
        "physical properties of nature at the scale of atoms and subatomic particles. "
        "Max Planck and Albert Einstein were key figures in its development. "
        "Einstein received the Nobel Prize in Physics for his discovery of the law of the photoelectric effect. "
        "We will see how Schrödinger's equation describes the evolution of a physical system. "
        "Quantum entanglement is a phenomenon where particles remain connected even at large distances. "
        "This technology is crucial for building quantum computers in the future. "
        "Therefore, we must understand wave-particle duality. "
        "However, the concept is very counter-intuitive for many students."
    )
    
    print("--- Extracting Key Concepts ---")
    concepts = get_key_concepts(test_lecture)
    
    print("\n[Keywords]")
    for kw in concepts["keywords"]:
        print(f"{kw['keyword']} (Score: {kw['score']:.4f}, Freq: {kw['frequency']})")
        
    print("\n[Named Entities]")
    for ent in concepts["entities"]:
        print(f"{ent['text']} [{ent['label']}]: {ent['description']}")
        
    print("\n[Noun Phrases]")
    for np_ in concepts["noun_phrases"]:
        print(f"- {np_}")
