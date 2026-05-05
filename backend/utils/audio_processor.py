import os
import sys
import logging
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
    """Detects format, converts to 16kHz mono WAV, and normalizes loudness.

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

    logger.info(f"Processing audio: {input_path}")

    try:
        # Load audio file (pydub uses ffmpeg/avconv under the hood)
        # For formats like .mp4 or .webm, AudioSegment.from_file handles them
        audio = AudioSegment.from_file(input_path, format=ext[1:])

        # 1. Convert to Mono
        if audio.channels > 1:
            logger.info("Converting to mono...")
            audio = audio.set_channels(1)

        # 2. Set Sample Rate to 16000 Hz (required by Whisper)
        if audio.frame_rate != 16000:
            logger.info("Setting sample rate to 16000 Hz...")
            audio = audio.set_frame_rate(16000)

        # 3. Normalize loudness to -20 dBFS
        logger.info("Normalizing loudness to -20 dBFS...")
        target_dBFS = -20.0
        change_in_dBFS = target_dBFS - audio.dBFS
        audio = audio.apply_gain(change_in_dBFS)

        # 4. Save processed file
        output_path = str(path.with_name(f"{path.stem}_processed.wav"))
        logger.info(f"Saving processed file to: {output_path}")
        audio.export(output_path, format="wav")

        return output_path

    except Exception as e:
        logger.error(f"Error during audio preprocessing: {str(e)}")
        raise

def get_audio_duration(path: str) -> float:
    """Returns the duration of an audio file in seconds.

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
