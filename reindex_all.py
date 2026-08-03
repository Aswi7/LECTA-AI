import os
import sys

# Add root directory to sys.path
root_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, root_path)

from backend.utils.db_handler import get_collection
from backend.modules.rag_chat import index_session

def main():
    print("--- Re-indexing All Past Lectures ---")
    col = get_collection()
    if col is None:
        print("MongoDB connection failed")
        return
        
    cursor = col.find()
    sessions = list(cursor)
    print(f"Found {len(sessions)} sessions in MongoDB. Starting re-indexing...")
    
    success_count = 0
    for doc in sessions:
        session_id = doc["session_id"]
        transcript = doc.get("transcript", "")
        filename = doc.get("filename", "unknown")
        language = doc.get("language", {}).get("code", "en")
        
        print(f"\nIndexing session {session_id} ('{filename}')...")
        if not transcript:
            print("  Skipped: empty transcript")
            continue
            
        success = index_session(
            session_id=session_id,
            transcript=transcript,
            metadata={"filename": filename, "language": language}
        )
        if success:
            # Also update MongoDB document to include "rag_indexed" in pipeline_steps if not already there
            pipeline_steps = doc.get("pipeline_steps", [])
            if "rag_indexed" not in pipeline_steps:
                pipeline_steps.append("rag_indexed")
                col.update_one(
                    {"session_id": session_id},
                    {"$set": {"pipeline_steps": pipeline_steps}}
                )
            print("  Success!")
            success_count += 1
        else:
            print("  Failed to index")
            
    print(f"\nCompleted! Successfully indexed {success_count}/{len(sessions)} sessions.")

if __name__ == "__main__":
    main()
