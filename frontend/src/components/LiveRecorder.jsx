import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, Play, Pause, RotateCcw, AlertCircle, Headphones, Mic } from 'lucide-react';

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
  const startTimeRef = useRef(null);
  const accumulatedTimeRef = useRef(0);
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

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const totalMs = accumulatedTimeRef.current + (Date.now() - startTimeRef.current);
        setDuration(Math.floor(totalMs / 1000));
      }
    }, 200);
  };

  useEffect(() => {
    return () => {
      stopTracks();
      stopTimer();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [audioURL]);

  // Handle waveform drawing loop on state changes/canvas mount
  useEffect(() => {
    if ((recorderState === 'recording' || recorderState === 'paused') && canvasRef.current && analyserRef.current) {
      drawWaveform();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [recorderState]);

  const startRecording = async () => {
    if (!supportedMimeType) {
      setError('Recording not supported in this browser.');
      return;
    }

    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
      setAudioBlob(null);
    }
    setError(null);
    setDuration(0);
    accumulatedTimeRef.current = 0;
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

      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
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
      if (!canvasRef.current || !analyserRef.current) {
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
      
      const currentCanvas = canvasRef.current;
      const currentCtx = currentCanvas.getContext('2d');
      const currentAnalyser = analyserRef.current;
      
      currentAnalyser.getByteFrequencyData(dataArray);

      currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

      // Disable shadow for grid lines
      currentCtx.shadowBlur = 0;

      // Draw background grid lines
      currentCtx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      currentCtx.lineWidth = 1;
      
      // Horizontal grid lines
      const horizontalLines = 5;
      for (let i = 1; i < horizontalLines; i++) {
        const y = (currentCanvas.height / horizontalLines) * i;
        currentCtx.beginPath();
        currentCtx.moveTo(0, y);
        currentCtx.lineTo(currentCanvas.width, y);
        currentCtx.stroke();
      }
      
      // Vertical grid lines
      const verticalLines = 15;
      for (let i = 1; i < verticalLines; i++) {
        const x = (currentCanvas.width / verticalLines) * i;
        currentCtx.beginPath();
        currentCtx.moveTo(x, 0);
        currentCtx.lineTo(x, currentCanvas.height);
        currentCtx.stroke();
      }

      // Check if there is actual input audio
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / bufferLength;

      // Calculate voice activity factor (0 to 1) to dynamically scale the background waves
      const activity = Math.min(1.0, Math.max(0.0, (average - 1.5) / 15));

      // 1. Draw beautiful animated flowing sine waves (always visible, scales with sound)
      const time = Date.now() * 0.003;
      const waves = [
        { freq: 0.006, amp: 22, speed: 0.8, color: 'rgba(99, 102, 241, 0.75)', glowColor: 'rgba(99, 102, 241, 0.5)' }, // Indigo
        { freq: 0.012, amp: 14, speed: -1.0, color: 'rgba(168, 85, 247, 0.6)', glowColor: 'rgba(168, 85, 247, 0.4)' }, // Purple
        { freq: 0.004, amp: 8,  speed: 0.6, color: 'rgba(236, 72, 153, 0.45)', glowColor: 'rgba(236, 72, 153, 0.3)' }, // Pink
        { freq: 0.018, amp: 5,  speed: -1.5, color: 'rgba(45, 212, 191, 0.5)', glowColor: 'rgba(45, 212, 191, 0.35)' }  // Teal
      ];

      waves.forEach(w => {
        currentCtx.beginPath();
        currentCtx.lineWidth = 2.5;
        currentCtx.strokeStyle = w.color;
        currentCtx.shadowColor = w.glowColor || w.color;
        currentCtx.shadowBlur = 10;
        
        for (let x = 0; x < currentCanvas.width; x++) {
          // Boost amplitude dynamically based on voice activity
          const dynamicAmp = w.amp * (1 + activity * 3.5);
          const y = (currentCanvas.height / 2) + 
                    Math.sin(x * w.freq + time * w.speed) * dynamicAmp;
          if (x === 0) {
            currentCtx.moveTo(x, y);
          } else {
            currentCtx.lineTo(x, y);
          }
        }
        currentCtx.stroke();
      });

      // 2. Draw active audio frequency bars in front (if volume is above baseline threshold)
      if (average > 1.5) {
        // Reset shadow for bars so they look sharp
        currentCtx.shadowBlur = 0;

        const barWidth = (currentCanvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * currentCanvas.height;
          
          // Only draw visible bars
          if (barHeight > 1) {
            const gradient = currentCtx.createLinearGradient(0, currentCanvas.height, 0, 0);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0.85)');
            
            currentCtx.fillStyle = gradient;
            currentCtx.beginPath();
            if (typeof currentCtx.roundRect === 'function') {
              currentCtx.roundRect(x, (currentCanvas.height - barHeight) / 2, barWidth, barHeight, 4);
            } else {
              currentCtx.rect(x, (currentCanvas.height - barHeight) / 2, barWidth, barHeight);
            }
            currentCtx.fill();
          }

          x += barWidth + 2;
        }
      }
    };

    draw();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (startTimeRef.current) {
        accumulatedTimeRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = null;
      }
      stopTimer();
      setRecorderState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      startTimer();
      setRecorderState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopTracks();
      stopTimer();
      
      if (startTimeRef.current) {
        accumulatedTimeRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = null;
      }
      const finalSecs = Math.floor(accumulatedTimeRef.current / 1000);
      setDuration(finalSecs);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      setRecorderState('stopped');
    }
  };

  const resetRecording = () => {
    stopTimer();
    stopTracks();
    if (audioURL) URL.revokeObjectURL(audioURL);
    startTimeRef.current = null;
    accumulatedTimeRef.current = 0;
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
    <div className="p-8 sm:p-10">
      <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">Live Lecture Recorder</h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Record live classroom lectures directly from your microphone.</p>
      </div>

      <AnimatePresence mode="wait">
        {recorderState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center space-y-8 py-6"
          >
            <div className="relative group cursor-pointer" onClick={startRecording}>
              <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
              <button
                type="button"
                onClick={startRecording}
                disabled={isLoading}
                className="relative w-28 h-28 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all active:scale-95 cursor-pointer group"
                aria-label="Start Recording"
              >
                <Mic className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Click Mic to Start Live Recording
            </p>

            <div className="w-full max-w-xs space-y-2 pt-2">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center">Translate To</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all cursor-pointer text-sm"
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
            className="space-y-8"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-2.5 px-5 py-2 bg-red-50 dark:bg-red-950/40 rounded-full border border-red-200 dark:border-red-900/60">
                <div className={`w-2.5 h-2.5 bg-red-600 rounded-full ${recorderState === 'recording' ? 'animate-pulse' : ''}`} />
                <span className="text-red-700 dark:text-red-400 font-extrabold tracking-widest uppercase text-xs">
                  {recorderState === 'recording' ? 'Live Recording Active' : 'Recording Paused'}
                </span>
              </div>
              <span className="text-5xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatTime(duration)}
              </span>
            </div>

            <div className="relative overflow-hidden bg-slate-950 p-6 rounded-3xl shadow-2xl border border-slate-800">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
              
              <canvas ref={canvasRef} width="800" height="120" className="w-full h-28 relative z-10" />
              
              <div className="absolute bottom-2 right-4 text-[10px] font-mono font-bold tracking-widest text-slate-600 select-none z-20">
                AUDIO CORE v2.0
              </div>
            </div>

            <div className="flex justify-center items-center gap-5">
              {recorderState === 'recording' ? (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="w-14 h-14 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-all shadow-sm cursor-pointer"
                  title="Pause Recording"
                >
                  <Pause className="w-6 h-6" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white hover:bg-brand-500 transition-all shadow-md cursor-pointer"
                  title="Resume Recording"
                >
                  <Play className="w-6 h-6 fill-current" />
                </button>
              )}
              
              <button
                type="button"
                onClick={stopRecording}
                className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-2xl flex items-center justify-center text-white transition-all shadow-lg active:scale-95 cursor-pointer"
                title="Stop Recording"
              >
                <Square className="w-7 h-7 fill-current" />
              </button>
            </div>
          </motion.div>
        )}

        {recorderState === 'stopped' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 py-4"
          >
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-6 sm:p-8 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 flex flex-col items-center text-center space-y-4">
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900">
                <Headphones className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">Recording Captured Successfully</h3>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{formatTime(duration)} duration</p>
              </div>
              <audio controls src={audioURL} className="w-full max-w-md mt-2 dark:invert dark:hue-rotate-180" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={submitRecording}
                disabled={isLoading}
                className="grow py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black text-base transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Analyzing Recording...' : 'Submit to AI Workspace'}
              </button>
              <button
                type="button"
                onClick={resetRecording}
                className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                title="Record Again"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-6 bg-red-50 dark:bg-red-950/30 p-4 rounded-2xl border border-red-200 dark:border-red-900/60 flex items-center space-x-3 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-bold">{error}</p>
        </div>
      )}
    </div>
  );
};

export default LiveRecorder;
