import React, { useState, useRef, useEffect } from 'react';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ur', name: 'Urdu' },
];

const LiveRecorder = ({ onSubmit, isLoading }) => {
  const [recorderState, setRecorderState] = useState('idle'); // idle, requesting, recording, paused, stopped
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [error, setError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('ta');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [audioURL]);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    setRecorderState('requesting');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioURL(url);
      };

      // Web Audio API for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();

      mediaRecorder.start(1000);
      startTimer();
      setRecorderState('recording');
    } catch (err) {
      console.error('Recording error:', err);
      setError('Microphone access denied. Please allow microphone permission in your browser settings.');
      setRecorderState('idle');
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#f9fafb'; // bg-gray-50
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(59, 130, 246)`; // text-blue-500
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      stopTimer();
      setRecorderState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimer();
      setRecorderState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      stopTracks();
      stopTimer();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setRecorderState('stopped');
    }
  };

  const resetRecording = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setRecorderState('idle');
    setDuration(0);
    setAudioBlob(null);
    setAudioURL(null);
    setError(null);
    audioChunksRef.current = [];
  };

  const submitRecording = () => {
    if (!audioBlob) return;
    const file = new File([audioBlob], 'live_recording.webm', { type: 'audio/webm' });
    onSubmit({ type: 'file', file, language: selectedLanguage });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Live Lecture Recorder</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <span className="text-red-400 mr-3">⚠️</span>
            <div>
              <p className="text-sm text-red-700 font-medium">{error}</p>
              <button
                onClick={resetRecording}
                className="mt-2 text-sm font-semibold text-red-700 hover:underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {recorderState === 'idle' && (
        <div className="flex flex-col items-center space-y-6">
          <div className="text-7xl mb-2 animate-bounce">🎙️</div>
          <p className="text-gray-600 text-lg">Click below to start recording your lecture</p>
          
          <div className="w-full max-w-xs">
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">Language of lecture:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={startRecording}
            disabled={isLoading}
            className="group relative flex items-center justify-center w-24 h-24 bg-red-600 rounded-full hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:bg-gray-400"
          >
            <div className="w-8 h-8 bg-white rounded-full"></div>
            <span className="absolute -bottom-8 text-red-600 font-bold text-sm">Start Recording</span>
          </button>
        </div>
      )}

      {recorderState === 'requesting' && (
        <div className="flex flex-col items-center py-12 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 font-medium">Requesting microphone access...</p>
        </div>
      )}

      {(recorderState === 'recording' || recorderState === 'paused') && (
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 bg-red-600 rounded-full ${recorderState === 'recording' ? 'animate-pulse' : ''}`}></div>
            <span className="text-3xl font-mono font-bold text-gray-800">{formatTime(duration)}</span>
          </div>

          {recorderState === 'paused' && (
            <p className="text-orange-600 font-bold uppercase tracking-wider">Recording paused</p>
          )}

          <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200">
            {/* Waveform Visualization Canvas */}
            <canvas 
              ref={canvasRef} 
              width="600" 
              height="100" 
              className="w-full h-24 rounded-lg"
            />
            {/* 
              Web Audio API logic: 
              We use AnalyserNode to get real-time frequency data from the microphone stream.
              The draw() function uses requestAnimationFrame to continuously update the canvas.
              ByteFrequencyData is converted into bar heights to create a live visualizer.
            */}
          </div>

          <div className="flex items-center space-x-4">
            {recorderState === 'recording' ? (
              <button
                onClick={pauseRecording}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full font-bold hover:bg-gray-200 transition-all border border-gray-300"
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={resumeRecording}
                className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all shadow-md"
              >
                ▶ Resume
              </button>
            )}
            
            <button
              onClick={stopRecording}
              className="px-6 py-2 bg-gray-800 text-white rounded-full font-bold hover:bg-black transition-all shadow-md"
            >
              ⏹ Stop
            </button>

            <button
              disabled
              className="px-6 py-2 bg-gray-200 text-gray-400 rounded-full font-bold cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {recorderState === 'stopped' && (
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center">
            <p className="text-green-600 font-bold text-lg mb-1">Recording complete</p>
            <p className="text-gray-500">{formatTime(duration)} recorded • {formatFileSize(audioBlob?.size)}</p>
          </div>

          <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center">
            <audio controls src={audioURL} className="w-full max-w-md" />
          </div>

          <div className="flex flex-col w-full space-y-3 pt-4">
            <button
              onClick={submitRecording}
              disabled={isLoading}
              className={`
                w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg
                ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'}
              `}
            >
              {isLoading ? 'Processing...' : '✅ Submit for Processing'}
            </button>
            
            <button
              onClick={resetRecording}
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-all"
            >
              🔄 Record Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveRecorder;
