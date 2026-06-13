import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
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
    <div className="space-y-12">
      {/* Hero Section */}
      {!result && !isProcessing && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            Transform Your <span className="text-brand-600">Lectures</span> into Knowledge
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed">
            Upload recordings or paste video links. Our AI generates summaries, 
            translations, and practice questions in seconds.
          </p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Input Section */}
        {!result && !isProcessing && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <UploadPanel 
              onSubmit={handleProcess} 
              isLoading={isProcessing} 
            />
          </motion.div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ProgressTracker />
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-3xl mx-auto bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-6 rounded-2xl shadow-sm flex items-start space-x-4"
          >
            <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-grow">
              <h3 className="font-bold text-red-900 dark:text-red-100 mb-1">Processing Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-4 flex items-center space-x-2 text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try again</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Results Section */}
        {result && !isProcessing && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-heading">Lecture Analysis</h2>
              <DownloadBar result={result} />
            </div>
            
            <ResultsDashboard result={result} />
            
            <div className="flex justify-center pt-12">
              <button 
                onClick={() => setResult(null)}
                className="flex items-center space-x-2 px-8 py-4 bg-gray-900 dark:bg-brand-600 text-white rounded-2xl font-bold hover:bg-black dark:hover:bg-brand-700 transition-all shadow-xl hover:shadow-2xl active:scale-95"
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
