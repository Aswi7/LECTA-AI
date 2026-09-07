import unittest
import sys
import os

# Add root and backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from backend.utils.db_handler import save_result, delete_result
from backend.modules.rag_chat import answer_question, index_session, is_topic_query, is_quiz_query

class TestRAGChat(unittest.TestCase):
    """Test suite for RAG Chat features, topic query resolution, and speed."""

    def setUp(self):
        self.session_id = "test_rag_session_123"
        self.transcript = (
            "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy. "
            "Chlorophyll is the primary pigment involved in photosynthesis. "
            "Cellular respiration is the process where cells break down glucose to generate ATP. "
            "Mitochondria are known as the powerhouse of the cell."
        )
        self.session_data = {
            "session_id": self.session_id,
            "filename": "Photosynthesis and Cellular Biology",
            "summary": "This lecture explains the principles of photosynthesis in plants and cellular respiration in mitochondria.",
            "transcript": self.transcript,
            "cleaned_text": self.transcript,
            "concepts": {
                "keywords": [
                    {"keyword": "Photosynthesis", "score": 0.95},
                    {"keyword": "Chlorophyll", "score": 0.88},
                    {"keyword": "Mitochondria", "score": 0.82}
                ]
            }
        }
        save_result(self.session_id, self.session_data)
        index_session(self.session_id, self.transcript, {"filename": self.session_data["filename"]})

    def tearDown(self):
        delete_result(self.session_id)

    def test_is_topic_query(self):
        """Verifies that topic-related questions are correctly recognized."""
        self.assertTrue(is_topic_query("whats the topic of this lecture?"))
        self.assertTrue(is_topic_query("What is this video about?"))
        self.assertTrue(is_topic_query("Summarize the main points of the lecture"))
        self.assertFalse(is_topic_query("What is chlorophyll?"))

    def test_is_quiz_query(self):
        """Verifies that quiz generation requests are detected, but answer requests are NOT."""
        self.assertTrue(is_quiz_query("ask me some practice questions"))
        self.assertTrue(is_quiz_query("create a quiz for me"))
        self.assertFalse(is_quiz_query("give answers to these questions"))
        self.assertFalse(is_quiz_query("answer question 1"))

    def test_answer_topic_question(self):
        """Verifies that topic questions return the lecture topic and summary instead of failure."""
        res = answer_question(self.session_id, "whats the topic of this lecture?", [])
        self.assertTrue(res.get("used_rag"))
        self.assertNotIn("I couldn't find information about this in the lecture notes", res.get("answer", ""))
        self.assertIn("Photosynthesis", res.get("answer", ""))

    def test_answer_specific_question(self):
        """Verifies that specific questions are answered grounded in lecture notes."""
        res = answer_question(self.session_id, "What is chlorophyll?", [])
        self.assertTrue(res.get("used_rag"))
        self.assertNotIn("I couldn't find information about this in the lecture notes", res.get("answer", ""))
        self.assertIn("pigment", res.get("answer", "").lower())

if __name__ == "__main__":
    unittest.main(verbosity=2)
