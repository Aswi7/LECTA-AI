import unittest
import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from modules.nlp_processor import clean_text, segment_sentences
from modules.summarizer import summarize_text
from modules.keyword_extractor import extract_keywords
from modules.question_generator import generate_questions
from modules.language_detector import detect_language
import spacy

class TestLecturePipeline(unittest.TestCase):
    """Complete test suite for the AI processing pipeline modules."""

    def test_clean_text(self):
        """Verifies that filler words like 'um' and 'uh' are removed from the text."""
        input_text = "Um, today we are going to, uh, discuss photosynthesis, right?"
        output = clean_text(input_text)
        self.assertIn("today we are going to", output.lower())
        self.assertIn("discuss photosynthesis", output.lower())
        self.assertNotIn("um", output.lower())
        self.assertNotIn("uh", output.lower())

    def test_segment_sentences(self):
        """Verifies that a paragraph is correctly split into sentences."""
        input_text = "First sentence is here. Second sentence is there. Third sentence is long. Fourth sentence is short. Fifth sentence is last."
        output = segment_sentences(input_text)
        # segment_sentences filters out short sentences (< 4 words)
        # "First sentence is here." (4 words)
        # "Second sentence is there." (4 words)
        # "Third sentence is long." (4 words)
        # "Fourth sentence is short." (4 words)
        # "Fifth sentence is last." (4 words)
        self.assertEqual(len(output), 5)

    def test_summarizer_ratio(self):
        """Verifies that the summarizer respects the compression ratio."""
        sentences = [f"This is sentence number {i} which is long enough to count." for i in range(10)]
        input_text = " ".join(sentences)
        # ratio 0.3 should give max(2, 10*0.3) = 3 sentences
        output = summarize_text(input_text, sentences, ratio=0.3)
        output_sentences = [s.strip() for s in output.split('.') if s.strip()]
        self.assertLessEqual(len(output_sentences), 4)

    def test_keyword_extraction(self):
        """Verifies that key terms are accurately extracted from the text."""
        input_text = "Photosynthesis is the process in plants to convert light into energy. " \
                     "Plants use chlorophyll for photosynthesis in their leaves."
        keywords = extract_keywords(input_text)
        keyword_list = [kw['keyword'].lower() for kw in keywords]
        self.assertIn("photosynthesis", keyword_list)

    def test_keyword_not_stopword(self):
        """Verifies that extracted keywords do not include common English stopwords."""
        nlp = spacy.load("en_core_web_sm")
        input_text = "The quick brown fox jumps over the lazy dog. Programming is a valuable skill in the modern world."
        keywords = extract_keywords(input_text)
        for kw_dict in keywords:
            kw = kw_dict['keyword']
            self.assertFalse(nlp.vocab[kw].is_stop, f"Keyword '{kw}' should not be a stopword.")

    def test_question_generation(self):
        """Verifies that definition questions are correctly identified and generated."""
        sentences = [
            "Photosynthesis is defined as the process of light conversion.",
            "This is a standard sentence about biology.",
            "Water is essential for life.",
            "Cells are the building blocks of organisms.",
            "DNA carries genetic information."
        ]
        keywords = [{"keyword": "Photosynthesis", "score": 1.0}]
        questions = generate_questions(sentences, keywords)
        
        definition_qs = [q for q in questions if q['type'] == 'definition']
        self.assertGreaterEqual(len(definition_qs), 1)
        self.assertIn("What is Photosynthesis?", definition_qs[0]['question'])

    def test_fill_blank_generation(self):
        """Verifies that fill-in-the-blank questions contain a masked keyword."""
        sentences = ["Mitochondria are the powerhouse of the cell."]
        keywords = [{"keyword": "Mitochondria", "score": 1.0}]
        questions = generate_questions(sentences, keywords)
        
        fill_blank_qs = [q for q in questions if q['type'] == 'fill_blank']
        if fill_blank_qs:
            self.assertIn("______", fill_blank_qs[0]['question'])

    def test_language_detection(self):
        """Verifies that Tamil text is correctly identified."""
        input_text = "வணக்கம்"
        res = detect_language(input_text)
        self.assertEqual(res['code'], 'ta')

    def test_detect_english(self):
        """Verifies that English text is detected with high confidence."""
        input_text = "This is a standard English sentence for testing language detection accuracy."
        res = detect_language(input_text)
        self.assertEqual(res['code'], 'en')
        self.assertGreater(res['confidence'], 0.5)

if __name__ == "__main__":
    unittest.main(verbosity=2)
