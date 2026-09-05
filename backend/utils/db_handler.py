import os
import sys
import logging
from datetime import datetime, UTC

# Add root directory to sys.path to allow importing 'config'
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if root_path not in sys.path:
    sys.path.insert(0, root_path)

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import CONFIG

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Module-level cached client and in-memory cache fallback
_client = None
IN_MEMORY_SESSIONS = {}

def get_collection():
    """
    Returns the MongoDB collection object for sessions.
    Caches the MongoClient and uses a 3-second selection timeout.
    """
    global _client
    try:
        if _client is None:
            uri = getattr(CONFIG, "MONGODB_URI", "mongodb://localhost:27017")
            _client = MongoClient(uri, serverSelectionTimeoutMS=3000)
            # Trigger a connection check
            _client.admin.command('ping')
        
        db = _client.get_database("lecture_ai")
        return db.get_collection("sessions")
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error(f"MongoDB connection failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error getting collection: {e}")
        return None

def save_result(session_id: str, result: dict) -> bool:
    """Upserts document keyed by session_id in MongoDB and in-memory cache."""
    IN_MEMORY_SESSIONS[session_id] = result
    collection = get_collection()
    if collection is None:
        return True
    
    try:
        now = datetime.now(UTC).isoformat()
        update_data = {
            "$set": {**result, "updated_at": now},
            "$setOnInsert": {"created_at": now}
        }
        
        collection.update_one(
            {"session_id": session_id},
            update_data,
            upsert=True
        )
        logger.info(f"Successfully saved result for session: {session_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to save result for {session_id}: {e}")
        return True

def get_result(session_id: str) -> dict | None:
    """Finds one document by session_id, fallback to in-memory cache."""
    collection = get_collection()
    if collection is not None:
        try:
            doc = collection.find_one({"session_id": session_id}, {"_id": 0})
            if doc:
                return doc
        except Exception as e:
            logger.error(f"Failed to retrieve result from MongoDB for {session_id}: {e}")
    
    return IN_MEMORY_SESSIONS.get(session_id)

def get_all_results(limit: int = 10) -> list[dict]:
    """Returns the most recent limit sessions with specific fields."""
    collection = get_collection()
    if collection is None:
        return []
    
    fields = {
        "_id": 0,
        "session_id": 1,
        "filename": 1,
        "detected_language": 1,
        "target_language": 1,
        "created_at": 1,
        "processing_time_seconds": 1
    }
    
    try:
        cursor = collection.find({}, fields).sort("created_at", -1).limit(limit)
        return list(cursor)
    except Exception as e:
        logger.error(f"Failed to retrieve all results: {e}")
        return []

def get_paginated_results(page: int = 1, limit: int = 10, search: str = "") -> dict:
    """Returns paginated results with search and preview."""
    collection = get_collection()
    if collection is None:
        return {"results": [], "total": 0, "page": page, "pages": 0}
    
    query = {}
    if search:
        query = {"filename": {"$regex": search, "$options": "i"}}
    
    try:
        total = collection.count_documents(query)
        pages = (total + limit - 1) // limit
        skip = (page - 1) * limit
        
        cursor = collection.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
        
        results = []
        for doc in cursor:
            summary = doc.get("summary", "")
            doc["preview"] = (summary[:100] + "...") if len(summary) > 100 else summary
            results.append(doc)
            
        return {
            "results": results,
            "total": total,
            "page": page,
            "pages": pages
        }
    except Exception as e:
        logger.error(f"Failed to retrieve paginated results: {e}")
        return {"results": [], "total": 0, "page": page, "pages": 0}

def delete_result(session_id: str) -> bool:
    """Deletes document by session_id."""
    collection = get_collection()
    if collection is None:
        return False
    
    try:
        res = collection.delete_one({"session_id": session_id})
        success = res.deleted_count > 0
        if success:
            logger.info(f"Deleted session {session_id} from database.")
        return success
    except Exception as e:
        logger.error(f"Failed to delete result for {session_id}: {e}")
        return False

def ping_db() -> bool:
    """Attempts a ping command."""
    global _client
    try:
        # Re-use cached client or create one
        if _client is None:
            uri = getattr(CONFIG, "MONGODB_URI", "mongodb://localhost:27017")
            _client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        
        _client.admin.command('ping')
        return True
    except Exception as e:
        logger.error(f"Database ping failed: {e}")
        return False
