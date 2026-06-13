import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Play, Pause, RotateCcw, AlertCircle, Headphones } from 'lucide-react';

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
  
  const [supportedMimeType] = useState(() => {
    if (typeof window !== 'undefined' && window.MediaRecorder) {
      if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    }
    return null;
  });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [audioURL]);

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
    if (!supportedMimeType) {
      setError('Recording not supported in this browser.');
      return;
    }

    setError(null);
    setRecorderState('requesting');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: supportedMimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioURL(url);
      };

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
    } catch {
      setError('Microphone access denied.');
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#a855f7');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight, 4);
        ctx.fill();

        x += barWidth + 2;
      }
    };

    draw();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      stopTimer();
      setRecorderState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
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
  };

  const submitRecording = () => {
    if (!audioBlob) return;
    const extension = supportedMimeType === 'audio/mp4' ? 'mp4' : 'webm';
    const file = new File([audioBlob], `live_recording.${extension}`, { type: supportedMimeType });
    onSubmit({ type: 'file', file, language: selectedLanguage });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-10 md:p-12">
      <div className="text-center max-w-xl mx-auto space-y-4 mb-12">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Live Recording</h2>
        <p className="text-gray-500 dark:text-gray-400">Record your lecture in real-time. Our AI will handle the transcription and analysis.</p>
      </div>

      <AnimatePresence mode="wait">
        {recorderState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center space-y-10 py-10"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse" />
              <button
                onClick={startRecording}
                disabled={isLoading}
                className="relative w-32 h-32 bg-red-600 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 transition-all active:scale-90 group"
              >
                <div className="w-10 h-10 bg-white rounded-lg group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            <div className="w-full max-w-xs space-y-3">
              <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Translation Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-700 dark:text-gray-200 font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}

        {(recorderState === 'recording' || recorderState === 'paused') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-3 px-6 py-2 bg-red-50 dark:bg-red-950/20 rounded-full border border-red-100 dark:border-red-900/50">
                <div className={`w-2.5 h-2.5 bg-red-600 rounded-full ${recorderState === 'recording' ? 'animate-pulse' : ''}`} />
                <span className="text-red-600 dark:text-red-400 font-black tracking-widest uppercase text-xs">
                  {recorderState === 'recording' ? 'Live Recording' : 'Paused'}
                </span>
              </div>
              <span className="text-6xl font-black text-gray-900 dark:text-white font-mono tracking-tighter">
                {formatTime(duration)}
              </span>
            </div>

            <div className="bg-gray-900 dark:bg-black p-8 rounded-[2rem] shadow-2xl border-4 border-gray-800 dark:border-gray-900">
              <canvas ref={canvasRef} width="800" height="120" className="w-full h-32" />
            </div>

            <div className="flex justify-center items-center gap-6">
              {recorderState === 'recording' ? (
                <button
                  onClick={pauseRecording}
                  className="w-16 h-16 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-800 transition-all shadow-sm"
                >
                  <Pause className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white hover:bg-brand-700 transition-all shadow-lg"
                >
                  <Play className="w-6 h-6 fill-current" />
                </button>
              )}
              
              <button
                onClick={stopRecording}
                className="w-20 h-20 bg-gray-900 dark:bg-gray-800 rounded-[1.5rem] flex items-center justify-center text-white hover:bg-black transition-all shadow-xl"
              >
                <Square className="w-8 h-8 fill-current" />
              </button>
            </div>
          </motion.div>
        )}

        {recorderState === 'stopped' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 py-6"
          >
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/50 flex flex-col items-center text-center space-y-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm">
                <Headphones className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-900 dark:text-white">Recording Captured</h3>
                <p className="text-emerald-700 dark:text-emerald-400 font-medium">{formatTime(duration)} total duration</p>
              </div>
              <audio controls src={audioURL} className="w-full max-w-md mt-4 dark:invert dark:hue-rotate-180" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={submitRecording}
                disabled={isLoading}
                className="flex-grow py-5 bg-brand-600 text-white rounded-2xl font-black text-lg hover:bg-brand-700 transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Analysing...' : 'Submit to AI'}
              </button>
              <button
                onClick={resetRecording}
                className="px-8 py-5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-8 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center space-x-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default LiveRecorder;
