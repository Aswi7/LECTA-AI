import os
import sys
import logging
import whisper
import torch
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Module-level model cache to avoid reloading models in the same process
_model_cache: Dict[str, Any] = {}

VALID_MODEL_SIZES = ["tiny", "base", "small", "medium"]

def get_supported_model_sizes() -> List[str]:
    """Returns the list of supported Whisper model sizes.

    Returns:
        List[str]: A list of valid model size strings.
    """
    return VALID_MODEL_SIZES

def load_whisper_model(model_size: str = "base") -> Any:
    """Loads and caches a Whisper model of the specified size on CUDA if available.

    Args:
        model_size (str): The size of the model to load (e.g., 'tiny', 'base').

    Returns:
        Any: The loaded Whisper model object.

    Raises:
        ValueError: If an invalid model size is provided.
    """
    if model_size not in VALID_MODEL_SIZES:
        error_msg = f"Invalid model size '{model_size}'. Valid options are: {', '.join(VALID_MODEL_SIZES)}"
        logger.error(error_msg)
        raise ValueError(error_msg)

    if model_size in _model_cache:
        logger.info(f"Serving Whisper model '{model_size}' from cache.")
        return _model_cache[model_size]

    logger.info(f"Loading Whisper model '{model_size}'... This may take a moment.")
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device} for Whisper transcription.")
        model = whisper.load_model(model_size, device=device)
        _model_cache[model_size] = model
        logger.info(f"Whisper model '{model_size}' loaded successfully on {device}.")
        return model
    except Exception as e:
        logger.error(f"Failed to load Whisper model '{model_size}': {str(e)}")
        raise


def get_transcription_confidence(audio_path: str, model_size: str = "base") -> dict:
    """Runs Whisper transcription and computes confidence score based on no_speech_prob.

    Args:
        audio_path (str): The path to the processed audio file.
        model_size (str): The size of the Whisper model to use.

    Returns:
        dict: A dict containing transcription confidence and unreliable segments.
    """
    if not os.path.exists(audio_path):
        error_msg = f"Audio file not found for transcription: {audio_path}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    try:
        model = load_whisper_model(model_size)
        use_fp16 = torch.cuda.is_available()
        result = model.transcribe(audio_path, fp16=use_fp16)
        
        segments = result.get("segments", [])
        total_segments = len(segments)
        
        if total_segments == 0:
            return {
                "confidence": 1.0,
                "unreliable_segment_count": 0,
                "total_segments": 0,
                "unreliable_segments": []
            }
            
        no_speech_probs = [float(seg.get("no_speech_prob", 0.0)) for seg in segments]
        avg_no_speech_prob = sum(no_speech_probs) / total_segments
        confidence = round(1 - avg_no_speech_prob, 3)
        
        unreliable_segments = []
        for seg in segments:
            prob = float(seg.get("no_speech_prob", 0.0))
            if prob > 0.6:
                unreliable_segments.append({
                    "start": float(seg["start"]),
                    "end": float(seg["end"]),
                    "text": seg["text"].strip()
                })
                
        return {
            "confidence": float(confidence),
            "unreliable_segment_count": len(unreliable_segments),
            "total_segments": total_segments,
            "unreliable_segments": unreliable_segments
        }
    except Exception as e:
        logger.error(f"Error during transcription confidence scoring of {audio_path}: {str(e)}")
        raise


def transcribe_audio(audio_path: str, model_size: str = "base") -> tuple[str, dict]:
    """Transcribes an audio file into a plain text string.

    Args:
        audio_path (str): The path to the processed audio file.
        model_size (str): The size of the Whisper model to use.

    Returns:
        tuple[str, dict]: A tuple of (transcribed_text, confidence_dict).

    Raises:
        FileNotFoundError: If the audio file does not exist.
        Exception: For any other transcription-related errors.
    """
    if not os.path.exists(audio_path):
        error_msg = f"Audio file not found for transcription: {audio_path}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    try:
        model = load_whisper_model(model_size)
        logger.info(f"Starting transcription for: {audio_path}")
        
        # Turn off fp16 if running on CPU to bypass PyTorch CPU warnings and emulation overhead
        use_fp16 = torch.cuda.is_available()
        result = model.transcribe(audio_path, fp16=use_fp16)
        
        detected_lang = result.get("language", "unknown")
        logger.info(f"Transcription complete. Detected language: {detected_lang}")
        
        segments = result.get("segments", [])
        total_segments = len(segments)
        
        if total_segments == 0:
            confidence_dict = {
                "confidence": 1.0,
                "unreliable_segment_count": 0,
                "total_segments": 0,
                "unreliable_segments": []
            }
        else:
            no_speech_probs = [float(seg.get("no_speech_prob", 0.0)) for seg in segments]
            avg_no_speech_prob = sum(no_speech_probs) / total_segments
            confidence = round(1 - avg_no_speech_prob, 3)
            
            unreliable_segments = []
            for seg in segments:
                prob = float(seg.get("no_speech_prob", 0.0))
                if prob > 0.6:
                    unreliable_segments.append({
                        "start": float(seg["start"]),
                        "end": float(seg["end"]),
                        "text": seg["text"].strip()
                    })
                    
            confidence_dict = {
                "confidence": float(confidence),
                "unreliable_segment_count": len(unreliable_segments),
                "total_segments": total_segments,
                "unreliable_segments": unreliable_segments
            }
            
        return result["text"].strip(), confidence_dict

    except Exception as e:
        logger.error(f"Error during transcription of {audio_path}: {str(e)}")
        raise

def transcribe_with_timestamps(audio_path: str, model_size: str = "base") -> List[Dict[str, Any]]:
    """Transcribes an audio file and returns segments with timestamps.

    Args:
        audio_path (str): The path to the processed audio file.
        model_size (str): The size of the Whisper model to use.

    Returns:
        List[Dict[str, Any]]: A list of segments with 'start', 'end', and 'text' keys.

    Raises:
        FileNotFoundError: If the audio file does not exist.
        Exception: For any other transcription-related errors.
    """
    if not os.path.exists(audio_path):
        error_msg = f"Audio file not found for transcription: {audio_path}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    try:
        model = load_whisper_model(model_size)
        logger.info(f"Starting timestamped transcription for: {audio_path}")
        
        # Turn off fp16 if running on CPU
        use_fp16 = torch.cuda.is_available()
        result = model.transcribe(audio_path, fp16=use_fp16)
        
        segments = []
        for segment in result.get("segments", []):
            segments.append({
                "start": float(segment["start"]),
                "end": float(segment["end"]),
                "text": segment["text"].strip()
            })
            
        logger.info(f"Timestamped transcription complete. Generated {len(segments)} segments.")
        return segments

    except Exception as e:
        logger.error(f"Error during timestamped transcription of {audio_path}: {str(e)}")
        raise

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcriber.py <audio_file_path>")
        sys.exit(1)

    input_audio = sys.argv[1]
    try:
        # Note: In production, we'd use the processed audio from audio_processor.py
        transcript = transcribe_audio(input_audio)
        print("\n--- Final Transcript ---")
        print(transcript)
        print("------------------------")
    except Exception as err:
        print(f"Error: {err}")
