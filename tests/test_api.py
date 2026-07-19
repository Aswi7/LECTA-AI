import unittest
import json
import sys
import os

# Compatibility shim for Python 3.13 (audioop removal)
try:
    import audioop
except ImportError:
    try:
        import audioop_lts as audioop
        sys.modules['audioop'] = audioop
    except ImportError:
        pass

# Add the root and backend directory to the path so we can import config and app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from backend.app import app

class TestLectureAPI(unittest.TestCase):
    """Integration test suite for the Flask REST API endpoints."""

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_endpoint(self):
        """Verifies the health check endpoint returns status 200 and OK."""
        response = self.app.get('/api/health')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'ok')

    def test_process_text_valid(self):
        """Verifies that valid text input triggers the full AI pipeline and returns results."""
        payload = {
            "text": "Artificial Intelligence is the simulation of human intelligence by machines. " \
                    "It involves learning, reasoning, and self-correction. " \
                    "Deep learning is a subset of AI based on neural networks.",
            "target_language": "hi"
        }
        response = self.app.post('/api/process-text', 
                                data=json.dumps(payload),
                                content_type='application/json')
        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertIn('summary', data)
        self.assertIn('concepts', data)
        self.assertIn('questions', data)
        self.assertNotEqual(data['filename'], 'text_input')
        self.assertTrue(len(data['filename']) > 0)

    def test_process_text_missing_field(self):
        """Verifies that requests with missing required fields return a 400 error."""
        payload = {"target_language": "ta"}
        response = self.app.post('/api/process-text', 
                                data=json.dumps(payload),
                                content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_get_nonexistent_result(self):
        """Verifies that requesting a non-existent session ID returns a 404 error."""
        response = self.app.get('/api/results/doesnotexist')
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_download_invalid_format(self):
        """Verifies that requesting an unsupported download format returns a 400 error."""
        response = self.app.get('/api/download/fakeid/xml')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

if __name__ == "__main__":
    unittest.main(verbosity=2)
