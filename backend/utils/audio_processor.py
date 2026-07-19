import os
import sys
import logging
import subprocess
from pathlib import Path
from pydub import AudioSegment
from pydub.utils import mediainfo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

SUPPORTED_FORMATS = {".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".flac", ".webm"}

def preprocess_audio(input_path: str) -> str:
    """Detects format, converts to 16kHz mono WAV, and normalizes loudness using ffmpeg subprocess.

    Args:
        input_path (str): The absolute path to the input audio file.

    Returns:
        str: The path to the processed .wav file.

    Raises:
        FileNotFoundError: If the input file does not exist.
        ValueError: If the file format is not supported.
    """
    path = Path(input_path)
    
    if not path.exists():
        logger.error(f"Input file not found: {input_path}")
        raise FileNotFoundError(f"File not found: {input_path}")

    ext = path.suffix.lower()
    if ext not in SUPPORTED_FORMATS:
        supported_str = ", ".join(SUPPORTED_FORMATS)
        logger.error(f"Unsupported format {ext}. Supported: {supported_str}")
        raise ValueError(f"Unsupported format: {ext}. Supported: {supported_str}")

    logger.info(f"Processing audio (using streaming ffmpeg): {input_path}")
    output_path = str(path.with_name(f"{path.stem}_processed.wav"))

    try:
        # Build optimized ffmpeg command: mono (-ac 1), 16000Hz (-ar 16000), loudness normalize (-filter:a "loudnorm=i=-20")
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(path),
            "-ac", "1",
            "-ar", "16000",
            "-filter:a", "loudnorm=i=-20",
            output_path
        ]
        
        logger.info(f"Running ffmpeg command: {' '.join(cmd)}")
        # Run ffmpeg as a subprocess to process audio in a streaming fashion (low RAM footprint)
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        logger.info("ffmpeg processing completed successfully.")
        return output_path

    except subprocess.CalledProcessError as e:
        logger.warning(f"ffmpeg failed with exit code {e.returncode}. Stderr: {e.stderr}. Retrying without loudnorm filter...")
        try:
            # Fallback in case loudnorm is not supported or fails on short clips
            fallback_cmd = [
                "ffmpeg",
                "-y",
                "-i", str(path),
                "-ac", "1",
                "-ar", "16000",
                output_path
            ]
            logger.info(f"Running fallback ffmpeg command: {' '.join(fallback_cmd)}")
            subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            logger.info("Fallback ffmpeg processing completed successfully.")
            return output_path
        except subprocess.CalledProcessError as err:
            logger.error(f"Fallback ffmpeg processing failed: {err.stderr}")
            raise RuntimeError(f"ffmpeg audio preprocessing failed: {err.stderr}") from err
    except Exception as e:
        logger.error(f"Error during audio preprocessing: {str(e)}")
        raise

def get_audio_duration(path: str) -> float:
    """Returns the duration of an audio file in seconds without loading it into memory.

    Args:
        path (str): The path to the audio file.

    Returns:
        float: Duration in seconds.

    Raises:
        FileNotFoundError: If the file is missing.
        ValueError: If the file cannot be processed.
    """
    if not os.path.exists(path):
        logger.error(f"File not found for duration check: {path}")
        raise FileNotFoundError(f"File not found: {path}")

    try:
        # Use mediainfo (which queries metadata) instead of loading the entire file in RAM
        info = mediainfo(path)
        if 'duration' in info:
            return float(info['duration'])
        
        # Fallback to AudioSegment only if metadata is missing
        logger.warning(f"Duration not found in metadata for {path}. Falling back to AudioSegment load.")
        audio = AudioSegment.from_file(path)
        duration_seconds = len(audio) / 1000.0
        return float(duration_seconds)
    except Exception as e:
        logger.error(f"Could not determine duration for {path}: {str(e)}")
        raise ValueError(f"Error processing audio for duration: {str(e)}")

def cleanup_file(path: str) -> None:
    """Safely deletes a file if it exists.

    Args:
        path (str): The path to the file to delete.
    """
    if os.path.exists(path):
        try:
            os.remove(path)
            logger.info(f"Successfully deleted temporary file: {path}")
        except Exception as e:
            logger.warn(f"Failed to delete file {path}: {str(e)}")
    else:
        logger.info(f"Cleanup skipped: file {path} does not exist.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python audio_processor.py <input_file_path>")
        sys.exit(1)

    input_file = sys.argv[1]
    try:
        processed_file = preprocess_audio(input_file)
        duration = get_audio_duration(processed_file)
        print(f"\n--- Processing Results ---")
        print(f"Original File: {input_file}")
        print(f"Processed File: {processed_file}")
        print(f"Duration: {duration:.2f} seconds")
    except Exception as err:
        print(f"Error: {err}")
