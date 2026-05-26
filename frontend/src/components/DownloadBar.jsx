import React, { useState } from 'react';

const DownloadBar = ({ result }) => {
  const sessionId = result?.session_id;
  const [loading, setLoading] = useState({ pdf: false, docx: false, txt: false });
  const [success, setSuccess] = useState({ pdf: false, docx: false, txt: false });
  const [error, setError] = useState(null);

  const handleDownload = async (format) => {
    if (!sessionId) return;

    setError(null);
    setLoading(prev => ({ ...prev, [format]: true }));

    try {
      const response = await fetch(`http://localhost:5000/api/download/${sessionId}/${format}`);
      
      if (!response.ok) {
        throw new Error(`Failed to download ${format.toUpperCase()} file.`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Filename construction
      const extension = format === 'docx' ? 'docx' : format;
      a.download = `${sessionId}_notes.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Success feedback
      setSuccess(prev => ({ ...prev, [format]: true }));
      setTimeout(() => {
        setSuccess(prev => ({ ...prev, [format]: false }));
      }, 2000);

    } catch (err) {
      console.error('Download error:', err);
      setError(err.message || 'An unexpected error occurred during download.');
    } finally {
      setLoading(prev => ({ ...prev, [format]: false }));
    }
  };

  const formats = [
    { id: 'pdf', label: 'PDF', icon: '📄' },
    { id: 'docx', label: 'Word Doc', icon: '🗒️' },
    { id: 'txt', label: 'Plain Text', icon: '📃' }
  ];

  if (!sessionId) return null;

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-gray-700 font-bold flex items-center gap-2">
          📥 Download your notes as:
        </span>
        
        <div className="flex flex-wrap justify-center gap-3">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => handleDownload(fmt.id)}
              disabled={loading[fmt.id]}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 shadow-sm
                ${success[fmt.id] 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:text-blue-600 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'}
              `}
            >
              {loading[fmt.id] ? (
                <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : success[fmt.id] ? (
                <span>✓</span>
              ) : (
                <span>{fmt.icon}</span>
              )}
              {success[fmt.id] ? 'Downloaded' : fmt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-medium animate-shake">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default DownloadBar;
