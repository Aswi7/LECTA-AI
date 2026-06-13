import { useState } from 'react';
import { FileText, FileCode, Type, Check, AlertCircle, Loader2 } from 'lucide-react';

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
      
      const extension = format === 'docx' ? 'docx' : format;
      a.download = `${sessionId}_notes.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(prev => ({ ...prev, [format]: true }));
      setTimeout(() => {
        setSuccess(prev => ({ ...prev, [format]: false }));
      }, 2000);

    } catch (err) {
      setError(err.message || 'Download failed.');
    } finally {
      setLoading(prev => ({ ...prev, [format]: false }));
    }
  };

  const formats = [
    { id: 'pdf', label: 'PDF Document', icon: <FileText className="w-4 h-4" /> },
    { id: 'docx', label: 'Word File', icon: <FileCode className="w-4 h-4" /> },
    { id: 'txt', label: 'Plain Text', icon: <Type className="w-4 h-4" /> }
  ];

  if (!sessionId) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border-2 border-gray-50 dark:border-gray-700 flex flex-wrap gap-2 shadow-sm transition-colors">
      {formats.map((fmt) => (
        <button
          key={fmt.id}
          onClick={() => handleDownload(fmt.id)}
          disabled={loading[fmt.id]}
          className={`
            flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all
            ${success[fmt.id] 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 disabled:opacity-50'}
          `}
        >
          {loading[fmt.id] ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
          ) : success[fmt.id] ? (
            <Check className="w-4 h-4" />
          ) : (
            fmt.icon
          )}
          <span>{success[fmt.id] ? 'Saved' : fmt.label}</span>
        </button>
      ))}
      
      {error && (
        <div className="flex items-center space-x-2 px-4 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DownloadBar;
