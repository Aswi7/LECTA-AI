import os
import sys

# Add root directory to sys.path to allow importing 'config'
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_path not in sys.path:
    sys.path.insert(0, root_path)

# Compatibility shim for Python 3.13 (audioop removal)
try:
    import audioop
except ImportError:
    try:
        import audioop_lts as audioop  # type: ignore
        sys.modules['audioop'] = audioop
    except ImportError:
        pass

import time
import uuid
import logging
from datetime import datetime, UTC
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import CONFIG
from modules.transcriber import transcribe_audio
from modules.language_detector import detect_language
from modules.nlp_processor import process_text
from modules.summarizer import summarize_text, generate_bullet_notes
from modules.keyword_extractor import get_key_concepts
from modules.question_generator import generate_questions
from modules.translator import translate_text, translate_keywords
from utils.audio_processor import preprocess_audio, cleanup_file
from utils.db_handler import (
    save_result, get_result, get_all_results, 
    get_paginated_results, delete_result, ping_db
)
import yt_dlp
from utils.export_handler import generate_export, delete_exports
from modules.rag_chat import (
    index_session, 
    answer_question, 
    delete_session_index
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(CONFIG)
CORS(app)

ALLOWED_EXTENSIONS = {'mp3', 'mp4', 'wav', 'm4a', 'ogg', 'flac', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def download_audio_from_url(url, session_id):
    """Downloads audio from a URL (YouTube, etc.) using yt-dlp with fallback extractor client args."""
    output_path = os.path.join(CONFIG.UPLOAD_FOLDER, f"{session_id}_downloaded")
    
    common_extractor_args = {
        'youtube': {
            'player_client': ['mweb', 'android', 'web_creator']
        }
    }

    ydl_opts_cookies = {
        'format': 'ba/b',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': output_path + '.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'extractor_args': common_extractor_args,
        'cookiesfrombrowser': ('chrome', 'firefox', 'edge', 'opera', 'brave', 'safari', 'vivaldi'),
        'nocheckcertificate': True,
    }
    
    logger.info("Attempting to download audio using browser cookies extraction...")
    try:
        with yt_dlp.YoutubeDL(ydl_opts_cookies) as ydl:  # type: ignore
            info = ydl.extract_info(url, download=True)
            filename = f"{session_id}_downloaded.mp3"
            return os.path.join(CONFIG.UPLOAD_FOLDER, filename), info.get('title', 'Downloaded Video')
    except Exception as e:
        logger.warning(f"Failed to download using browser cookies: {e}. Retrying without cookies...")
        
        ydl_opts_no_cookies = {
            'format': 'ba/b',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': output_path + '.%(ext)s',
            'quiet': True,
            'no_warnings': True,
            'extractor_args': common_extractor_args,
            'nocheckcertificate': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts_no_cookies) as ydl:  # type: ignore
            info = ydl.extract_info(url, download=True)
            filename = f"{session_id}_downloaded.mp3"
            return os.path.join(CONFIG.UPLOAD_FOLDER, filename), info.get('title', 'Downloaded Video')

def run_ai_modules(cleaned_text, sentences, target_language):
    """Runs the AI modules with ThreadPoolExecutor."""
    with ThreadPoolExecutor(max_workers=4) as executor:
        # Task 1: Summarization
        fut_summary = executor.submit(lambda: {
            "summary": summarize_text(cleaned_text, sentences),
            "bullet_notes": generate_bullet_notes(sentences)
        })
        
        # Task 2: Keyword Extraction
        fut_concepts = executor.submit(get_key_concepts, cleaned_text)
        
        # Get summary first so translation operates on the summary text
        summary_result = fut_summary.result()
        summary_text = summary_result["summary"] if summary_result.get("summary") else cleaned_text

        # Task 3: Translation (using the lecture summary)
        fut_translation = executor.submit(lambda: {
            "translated_text": translate_text(summary_text, target_language) if target_language != "en" else summary_text,
        })
        
        # Get concepts next because questions and keyword translation depend on it
        concepts = fut_concepts.result()
        
        # Task 4: Question Generation (depends on concepts)
        fut_questions = executor.submit(generate_questions, sentences, concepts.get("keywords", []))
        
        # Additional Translation Task (Keywords)
        fut_trans_kws = executor.submit(translate_keywords, concepts.get("keywords", []), target_language)

        results = {
            "summary": summary_result["summary"],
            "bullet_notes": summary_result["bullet_notes"],
            "concepts": concepts,
            "translated_content": fut_translation.result()["translated_text"],
            "questions": fut_questions.result(),
            "translated_keywords": fut_trans_kws.result()
        }
        
    return results

def generate_topic_name(concepts, default_filename):
    """Generates a lecture topic name from concepts or cleaned filename."""
    base_name, _ = os.path.splitext(default_filename)
    base_name = base_name.replace('_', ' ').replace('-', ' ').strip()
    
    # Generic names that don't represent a real topic
    generic_patterns = ['live', 'recording', 'audio', 'text', 'input', 'untitled']
    is_generic = not base_name or any(p in base_name.lower() for p in generic_patterns)
    
    if is_generic:
        noun_phrases = concepts.get("noun_phrases", [])
        if noun_phrases:
            return noun_phrases[0].title()
        keywords = concepts.get("keywords", [])
        if keywords:
            return keywords[0]["keyword"].title()
            
    return base_name.title() if base_name else "Untitled Lecture"


@app.route('/api/process', methods=['POST'])
def process_audio():
    start_time = time.time()
    session_id = str(uuid.uuid4())[:8]
    pipeline_steps = []
    
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided", "session_id": session_id}), 400
    
    file = request.files['audio']
    target_language = request.form.get('target_language', 'ta')
    
    if file.filename == '':
        return jsonify({"error": "No selected file", "session_id": session_id}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file format", "session_id": session_id}), 400

    filename = secure_filename(file.filename or "")
    upload_path = os.path.join(CONFIG.UPLOAD_FOLDER, f"{session_id}_{filename}")
    file.save(upload_path)
    
    processed_path = None
    try:
        # Step 1: Preprocess Audio
        processed_path = preprocess_audio(upload_path)
        pipeline_steps.append("preprocess_audio")
        
        # Step 2: Transcribe Audio
        transcript, transcription_confidence = transcribe_audio(processed_path)
        pipeline_steps.append("transcribe_audio")
        
        # Step 3: Detect Language
        lang_data = detect_language(transcript)
        pipeline_steps.append("detect_language")
        
        # Step 4: Process Text (NLP)
        cleaned_text, sentences = process_text(transcript)
        pipeline_steps.append("process_text")
        
        # Parallel AI Modules
        ai_results = run_ai_modules(cleaned_text, sentences, target_language)
        pipeline_steps.extend(["summarization", "keyword_extraction", "question_generation", "translation"])
        
        # Confidence scoring report
        from modules.summarizer import get_summary_confidence

        confidence_report = {
            "transcription": transcription_confidence.get("confidence", 0.5),
            "summarization": get_summary_confidence(sentences, ai_results.get("summary", "")),
            "keywords": round(
                sum(k.get("confidence", 0) for k in ai_results.get("concepts", {}).get("keywords", []))
                / max(len(ai_results.get("concepts", {}).get("keywords", [])), 1), 3
            ),
            "overall": 0.0
        }
        confidence_report["overall"] = round(
            sum([
                confidence_report["transcription"],
                confidence_report["summarization"],
                confidence_report["keywords"]
            ]) / 3, 3
        )
        
        # Determine topic name
        topic_name = generate_topic_name(ai_results.get("concepts", {}), filename)
        
        # Combine all results
        full_response = {
            "session_id": session_id,
            "filename": topic_name,
            "target_language": target_language,
            "transcript": transcript,
            "cleaned_text": cleaned_text,
            "language": lang_data,
            "pipeline_steps": pipeline_steps,
            "processing_time_seconds": round(time.time() - start_time, 2),
            "confidence_report": confidence_report,
            **ai_results
        }
        
        # Save to DB
        save_result(session_id, full_response)
        
        try:
            from modules.rag_chat import index_session
            indexed = index_session(
                session_id=session_id,
                transcript=transcript,
                metadata={
                    "filename": topic_name,
                    "language": lang_data.get("code", "en")
                }
            )
            if indexed:
                pipeline_steps.append("rag_indexed")
                logger.info(
                  f"RAG index built successfully for {session_id}")
            else:
                logger.error(
                  f"RAG index_session returned False for {session_id}")
        except Exception as e:
            import traceback
            logger.error(f"RAG import or call failed: {str(e)}")
            logger.error(traceback.format_exc())
        
        return jsonify(full_response), 200

    except Exception as e:
        logger.error(f"Error processing session {session_id}: {e}")
        return jsonify({"error": str(e), "session_id": session_id}), 500
    finally:
        # Cleanup
        cleanup_file(upload_path)
        if processed_path:
            cleanup_file(processed_path)

@app.route('/api/process-url', methods=['POST'])
def process_url():
    start_time = time.time()
    session_id = str(uuid.uuid4())[:8]
    pipeline_steps = []
    
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "No URL provided", "session_id": session_id}), 400
    
    url = data['url']
    target_language = data.get('target_language', 'ta')
    
    upload_path = None
    processed_path = None
    try:
        # Step 0: Download from URL
        upload_path, title = download_audio_from_url(url, session_id)
        filename = f"{title}.mp3"
        pipeline_steps.append("download_from_url")
        
        # Step 1: Preprocess Audio
        processed_path = preprocess_audio(upload_path)
        pipeline_steps.append("preprocess_audio")
        
        # Step 2: Transcribe Audio
        transcript, transcription_confidence = transcribe_audio(processed_path)
        pipeline_steps.append("transcribe_audio")
        
        # Step 3: Detect Language
        lang_data = detect_language(transcript)
        pipeline_steps.append("detect_language")
        
        # Step 4: Process Text (NLP)
        cleaned_text, sentences = process_text(transcript)
        pipeline_steps.append("process_text")
        
        # Parallel AI Modules
        ai_results = run_ai_modules(cleaned_text, sentences, target_language)
        pipeline_steps.extend(["summarization", "keyword_extraction", "question_generation", "translation"])
        
        # Confidence scoring report
        from modules.summarizer import get_summary_confidence

        confidence_report = {
            "transcription": transcription_confidence.get("confidence", 0.5),
            "summarization": get_summary_confidence(sentences, ai_results.get("summary", "")),
            "keywords": round(
                sum(k.get("confidence", 0) for k in ai_results.get("concepts", {}).get("keywords", []))
                / max(len(ai_results.get("concepts", {}).get("keywords", [])), 1), 3
            ),
            "overall": 0.0
        }
        confidence_report["overall"] = round(
            sum([
                confidence_report["transcription"],
                confidence_report["summarization"],
                confidence_report["keywords"]
            ]) / 3, 3
        )
        
        # Determine topic name
        topic_name = generate_topic_name(ai_results.get("concepts", {}), filename)
        
        # Combine all results
        full_response = {
            "session_id": session_id,
            "filename": topic_name,
            "target_language": target_language,
            "transcript": transcript,
            "cleaned_text": cleaned_text,
            "language": lang_data,
            "pipeline_steps": pipeline_steps,
            "processing_time_seconds": round(time.time() - start_time, 2),
            "confidence_report": confidence_report,
            **ai_results
        }
        
        # Save to DB
        save_result(session_id, full_response)
        
        try:
            indexed = index_session(
                session_id=session_id,
                transcript=transcript,
                metadata={
                  "filename": topic_name, 
                  "language": lang_data.get("code", "en")
                }
            )
            if indexed:
                pipeline_steps.append("rag_indexed")
                logger.info(f"RAG index built for {session_id}")
            else:
                logger.warning(f"RAG indexing returned False for {session_id}")
        except Exception as e:
            logger.warning(
              f"RAG indexing failed for {session_id}: {e}")
        
        return jsonify(full_response), 200

    except Exception as e:
        logger.error(f"Error processing URL session {session_id}: {e}")
        return jsonify({"error": str(e), "session_id": session_id}), 500
    finally:
        # Cleanup
        if upload_path:
            cleanup_file(upload_path)
        if processed_path:
            cleanup_file(processed_path)

@app.route('/api/process-text', methods=['POST'])
def process_text_api():
    start_time = time.time()
    session_id = str(uuid.uuid4())[:8]
    pipeline_steps = []
    
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided", "session_id": session_id}), 400
    
    text = data['text']
    target_language = data.get('target_language', 'ta')
    
    try:
        # Step 1: Detect Language
        lang_data = detect_language(text)
        pipeline_steps.append("detect_language")
        
        # Step 2: Process Text (NLP)
        cleaned_text, sentences = process_text(text)
        pipeline_steps.append("process_text")
        
        # Parallel AI Modules
        ai_results = run_ai_modules(cleaned_text, sentences, target_language)
        pipeline_steps.extend(["summarization", "keyword_extraction", "question_generation", "translation"])
        
        # Confidence scoring report
        from modules.summarizer import get_summary_confidence
        
        transcription_confidence = {"confidence": 1.0}

        confidence_report = {
            "transcription": transcription_confidence.get("confidence", 0.5),
            "summarization": get_summary_confidence(sentences, ai_results.get("summary", "")),
            "keywords": round(
                sum(k.get("confidence", 0) for k in ai_results.get("concepts", {}).get("keywords", []))
                / max(len(ai_results.get("concepts", {}).get("keywords", [])), 1), 3
            ),
            "overall": 0.0
        }
        confidence_report["overall"] = round(
            sum([
                confidence_report["transcription"],
                confidence_report["summarization"],
                confidence_report["keywords"]
            ]) / 3, 3
        )
        
        # Determine topic name
        topic_name = generate_topic_name(ai_results.get("concepts", {}), "text_input")
        
        full_response = {
            "session_id": session_id,
            "filename": topic_name,
            "target_language": target_language,
            "transcript": text,
            "cleaned_text": cleaned_text,
            "language": lang_data,
            "pipeline_steps": pipeline_steps,
            "processing_time_seconds": round(time.time() - start_time, 2),
            "confidence_report": confidence_report,
            **ai_results
        }
        
        # Save to DB
        save_result(session_id, full_response)
        
        try:
            indexed = index_session(
                session_id=session_id,
                transcript=text,
                metadata={
                  "filename": topic_name, 
                  "language": lang_data.get("code", "en")
                }
            )
            if indexed:
                pipeline_steps.append("rag_indexed")
                logger.info(f"RAG index built for {session_id}")
            else:
                logger.warning(f"RAG indexing returned False for {session_id}")
        except Exception as e:
            logger.warning(
              f"RAG indexing failed for {session_id}: {e}")
        
        return jsonify(full_response), 200

    except Exception as e:
        logger.error(f"Error processing text session {session_id}: {e}")
        return jsonify({"error": str(e), "session_id": session_id}), 500

@app.route('/api/results', methods=['GET'])
def get_results_api():
    try:
        results = get_all_results(10)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/results/<session_id>', methods=['GET'])
def get_result_by_id_api(session_id):
    result = get_result(session_id)
    if result:
        # Self-healing check for legacy Error 500 strings from prior GoogleTranslator failures
        trans_content = str(result.get("translated_content", ""))
        trans_kws = result.get("translated_keywords", [])
        has_error_kw = any(str(kw.get("translated", "")).startswith("Error 500") for kw in trans_kws if isinstance(kw, dict))
        
        if trans_content.startswith("Error 500") or "Server Error" in trans_content or has_error_kw:
            target_lang = result.get("target_language", "ta")
            summary_text = result.get("summary") or result.get("cleaned_text", "")
            
            if summary_text and (trans_content.startswith("Error 500") or "Server Error" in trans_content):
                new_trans = translate_text(summary_text, target_lang)
                if new_trans and not str(new_trans).startswith("Error 500"):
                    result["translated_content"] = new_trans
            
            raw_kws = result.get("concepts", {}).get("keywords", [])
            if raw_kws and has_error_kw:
                new_kws = translate_keywords(raw_kws, target_lang)
                if new_kws:
                    result["translated_keywords"] = new_kws
            
            save_result(session_id, result)

        return jsonify(result), 200
    return jsonify({"error": "Session not found", "session_id": session_id}), 404

@app.route('/api/results/<session_id>', methods=['DELETE'])
def delete_result_api(session_id):
    try:
        delete_result(session_id)
        delete_exports(session_id)
        delete_session_index(session_id)
        return jsonify({"message": "Session deleted successfully", "session_id": session_id}), 200
    except Exception as e:
        return jsonify({"error": str(e), "session_id": session_id}), 500

@app.route('/api/download/<session_id>/<fmt>', methods=['GET'])
def download_export(session_id, fmt):
    if fmt not in ['pdf', 'docx', 'txt']:
        return jsonify({"error": "Invalid format", "session_id": session_id}), 400
    
    session_data = get_result(session_id)
    if not session_data:
        return jsonify({"error": "Session not found", "session_id": session_id}), 404
    
    try:
        export_path = generate_export(session_id, fmt, session_data, CONFIG.EXPORTS_FOLDER)
        
        mimetypes = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain'
        }
        
        # Get filename (topic)
        topic_filename = session_data.get('filename', 'notes')
        # Remove any file extension if present (e.g. .mp3, .mp4, .pdf)
        topic_name, _ = os.path.splitext(topic_filename)
        
        # Strip characters that are illegal on common filesystems
        illegal_chars = set('\\/:*?"<>|')
        safe_topic_name = "".join(c for c in topic_name if c not in illegal_chars).strip()
        
        if not safe_topic_name:
            safe_topic_name = session_id
            
        download_filename = f"{safe_topic_name}.{fmt}"
        
        return send_file(
            export_path,
            mimetype=mimetypes.get(fmt),
            as_attachment=True,
            download_name=download_filename
        )
    except Exception as e:
        return jsonify({"error": str(e), "session_id": session_id}), 500

@app.route('/api/history', methods=['GET'])
def get_history_api():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', "")
        
        history = get_paginated_results(page, limit, search)
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "models_loaded": True,
        "db_connected": ping_db(),
        "timestamp": datetime.now(UTC).isoformat()
    }), 200


@app.route('/api/chat/<session_id>', methods=['POST'])
def chat_with_lecture(session_id):
    data = request.get_json()
    if not data or 'question' not in data:
        return jsonify({
          "error": "No question provided"}), 400
    
    question = data.get('question', '').strip()
    if not question:
        return jsonify({
          "error": "Question cannot be empty"}), 400
    if len(question) > 500:
        return jsonify({
          "error": "Question too long (max 500 chars)"
        }), 400
    
    session_data = get_result(session_id)
    if not session_data:
        return jsonify({
          "error": "Session not found", 
          "session_id": session_id}), 404
    
    history = data.get('history', [])
    
    # Ensure collection exists; auto-index if missing
    try:
        from modules.rag_chat import get_chroma_client, index_session
        client = get_chroma_client()
        try:
            client.get_collection(f"session_{session_id}")
        except Exception:
            transcript = session_data.get('transcript') or session_data.get('cleaned_text') or ""
            if transcript:
                index_session(
                    session_id=session_id,
                    transcript=transcript,
                    metadata={"filename": session_data.get('filename', 'Session')}
                )
    except Exception as e:
        logger.warning(f"Auto-indexing check warning for {session_id}: {e}")

    try:
        result = answer_question(
          session_id, question, history)
        result['session_id'] = session_id
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Chat error for {session_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/chat/<session_id>/status', methods=['GET'])
def chat_status(session_id):
    try:
        from modules.rag_chat import get_chroma_client, index_session
        client = get_chroma_client()
        try:
            collection = client.get_collection(f"session_{session_id}")
            count = collection.count()
            if count > 0:
                return jsonify({
                    "indexed": True,
                    "chunk_count": count,
                    "session_id": session_id
                }), 200
        except Exception:
            pass

        # Try on-the-fly auto-indexing if missing
        session_data = get_result(session_id)
        if session_data:
            transcript = session_data.get('transcript') or session_data.get('cleaned_text') or ""
            if transcript and index_session(session_id=session_id, transcript=transcript, metadata={"filename": session_data.get('filename', 'Session')}):
                collection = client.get_collection(f"session_{session_id}")
                return jsonify({
                    "indexed": True,
                    "chunk_count": collection.count(),
                    "session_id": session_id
                }), 200

        return jsonify({
            "indexed": False,
            "chunk_count": 0,
            "session_id": session_id
        }), 200
    except Exception:
        return jsonify({
            "indexed": False,
            "chunk_count": 0,
            "session_id": session_id
        }), 200


@app.route('/api/reindex/<session_id>', methods=['GET', 'POST'])
def reindex_session_api(session_id):
    try:
        session_data = get_result(session_id)
        if not session_data:
            return jsonify({"error": "Session not found", "session_id": session_id}), 404

        from modules.rag_chat import index_session
        success = index_session(
            session_id=session_id,
            transcript=session_data.get("transcript", ""),
            metadata={
                "filename": session_data.get("filename", ""),
                "language": session_data.get("language", {}).get("code", "en")
            }
        )

        if success:
            # Add rag_indexed to pipeline_steps if not present
            pipeline_steps = session_data.get("pipeline_steps", [])
            if "rag_indexed" not in pipeline_steps:
                pipeline_steps.append("rag_indexed")
                session_data["pipeline_steps"] = pipeline_steps
                save_result(session_id, session_data)

            return jsonify({
                "success": True,
                "session_id": session_id,
                "message": "Session reindexed successfully"
            }), 200
        else:
            return jsonify({"success": False, "error": "Indexing failed"}), 500
    except Exception as e:
        logger.error(f"Error in reindex endpoint for {session_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    os.makedirs(CONFIG.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(CONFIG.EXPORTS_FOLDER, exist_ok=True)
    
    # Check MongoDB connection status on startup
    db_connected = ping_db()
    if db_connected:
        print("\n=======================================================")
        print("  🟢 [SUCCESS] MongoDB Atlas Connected Successfully!  ")
        print("  Database: lecture_ai | Collection: sessions          ")
        print("=======================================================\n")
        logger.info("MongoDB Atlas Connected Successfully!")
    else:
        print("\n=======================================================")
        print("  ⚠️ [WARNING] MongoDB Offline - Using In-Memory Mode   ")
        print("=======================================================\n")
        logger.warning("MongoDB Offline - Using In-Memory Mode.")

    app.run(debug=True, port=5000)
