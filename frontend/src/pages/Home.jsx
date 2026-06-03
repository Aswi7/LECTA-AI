import React, { useState } from 'react';
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Upload Section */}
      {!result && (
        <UploadPanel 
          onSubmit={handleProcess} 
          isLoading={isProcessing} 
        />
      )}

      {/* Processing State */}
      {isProcessing && (
        <ProgressTracker />
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
              <button 
                onClick={() => setError(null)}
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-600 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && !isProcessing && (
        <>
          <DownloadBar result={result} />
          <ResultsDashboard result={result} />
          
          <div className="flex justify-center pt-8">
            <button 
              onClick={() => setResult(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Process Another Lecture
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
