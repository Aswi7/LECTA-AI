import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, Sparkles, BookOpen, Zap, Layers } from 'lucide-react';
import UploadPanel from '../components/UploadPanel';
import ProgressTracker from '../components/ProgressTracker';
import ResultsDashboard from '../components/ResultsDashboard';
import DownloadBar from '../components/DownloadBar';

const Home = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleProcess = async (submission) => {
    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      let response;
      if (submission.type === 'file') {
        const formData = new FormData();
        formData.append('audio', submission.file);
        formData.append('target_language', submission.language);

        response = await fetch('http://localhost:5000/api/process', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('http://localhost:5000/api/process-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: submission.url,
            target_language: submission.language,
          }),
        });
      }

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to process lecture. Please try again.');
      }
    } catch (err) {
      setError('Network error: Could not connect to the backend server.');
      console.error('Process Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero Header Section */}
      {!result && !isProcessing && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto pt-4 pb-2 space-y-6"
        >
          {/* Feature Badge Pill */}
          <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-brand-50/80 dark:bg-brand-950/60 border border-brand-200/80 dark:border-brand-800/60 shadow-xs">
            <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
              AI-Powered Multilingual Lecture Intelligence
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] font-heading">
            Turn Every Lecture Into <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Smart Study Notes
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Upload audio/video recordings or live stream lectures. Our AI automatically handles 
            speech-to-text, key summary generation, multi-language translations, and interactive quizzes.
          </p>

          {/* Micro Value Props */}
          <div className="flex flex-wrap justify-center items-center gap-6 pt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Whisper STT</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-brand-500" />
              <span>11 Languages Supported</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Interactive RAG Tutor</span>
            </span>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Workspace Input Panel */}
        {!result && !isProcessing && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <UploadPanel 
              onSubmit={handleProcess} 
              isLoading={isProcessing} 
            />
          </motion.div>
        )}

        {/* Processing State Tracker */}
        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <ProgressTracker />
          </motion.div>
        )}

        {/* Error Alert Box */}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-6 rounded-3xl shadow-sm flex items-start space-x-4"
          >
            <div className="bg-red-100 dark:bg-red-900/50 p-2.5 rounded-2xl">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="grow">
              <h3 className="font-bold text-red-900 dark:text-red-200 text-base mb-1">Processing Failed</h3>
              <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-4 flex items-center space-x-2 text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Processing Again</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Results Dashboard Section */}
        {result && !isProcessing && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Results Title & Download Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">Analysis Complete</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">Lecture Study Vault</h2>
              </div>
              <DownloadBar result={result} />
            </div>
            
            {/* Dashboard Component */}
            <ResultsDashboard result={result} />
            
            {/* Bottom Process Another Lecture CTA */}
            <div className="flex justify-center pt-8 pb-4">
              <button 
                type="button"
                onClick={() => setResult(null)}
                className="flex items-center space-x-2.5 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black shadow-lg shadow-brand-500/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Process Another Lecture</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;

