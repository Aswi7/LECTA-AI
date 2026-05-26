import logging
from datetime import datetime
from pymongo import MongoClient, DESCENDING
from config import CONFIG

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseHandler:
    def __init__(self):
        try:
            self.client = MongoClient(CONFIG.MONGODB_URI)
            self.db = self.client.get_database()
            self.sessions = self.db.sessions
            logger.info("Connected to MongoDB successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    def save_session(self, session_data: dict):
        """Saves or updates a session in MongoDB."""
        session_data["timestamp"] = datetime.utcnow()
        return self.sessions.update_one(
            {"session_id": session_data["session_id"]},
            {"$set": session_data},
            upsert=True
        )

    def get_recent_sessions(self, limit: int = 10):
        """Returns the most recent N sessions."""
        return list(self.sessions.find({}, {"_id": 0}).sort("timestamp", DESCENDING).limit(limit))

    def get_session_by_id(self, session_id: str):
        """Retrieves a single session by its session_id."""
        return self.sessions.find_one({"session_id": session_id}, {"_id": 0})

    def delete_session(self, session_id: str):
        """Deletes a session from MongoDB."""
        return self.sessions.delete_one({"session_id": session_id})

    def get_history(self, page: int = 1, limit: int = 10, search: str = None):
        """Returns paginated and optionally filtered session history."""
        query = {}
        if search:
            # Simple text search on transcript or summary
            query = {
                "$or": [
                    {"transcript": {"$regex": search, "$options": "i"}},
                    {"summary": {"$regex": search, "$options": "i"}},
                    {"session_id": {"$regex": search, "$options": "i"}}
                ]
            }

        skip = (page - 1) * limit
        cursor = self.sessions.find(query, {"_id": 0}).sort("timestamp", DESCENDING).skip(skip).limit(limit)
        
        results = []
        for doc in cursor:
            # Add preview field (first 100 chars of summary)
            summary = doc.get("summary", "")
            doc["preview"] = (summary[:100] + "...") if len(summary) > 100 else summary
            results.append(doc)
            
        total_count = self.sessions.count_documents(query)
        
        return {
            "sessions": results,
            "total_count": total_count,
            "page": page,
            "limit": limit
        }

# Singleton instance
db_handler = DatabaseHandler()
