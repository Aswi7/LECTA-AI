import { useState } from 'react';
import { FileText, FileCode, Type, Check, AlertCircle, Loader2, Download } from 'lucide-react';

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
      }, 2500);

    } catch (err) {
      setError(err.message || 'Download failed.');
    } finally {
      setLoading(prev => ({ ...prev, [format]: false }));
    }
  };

  const formats = [
    { id: 'pdf', label: 'PDF Notes', icon: <FileText className="w-4 h-4 text-red-500" /> },
    { id: 'docx', label: 'Word Doc', icon: <FileCode className="w-4 h-4 text-blue-500" /> },
    { id: 'txt', label: 'Plain Text', icon: <Type className="w-4 h-4 text-slate-500" /> }
  ];

  if (!sessionId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
      <div className="px-3 py-1 text-slate-400 dark:text-slate-500 text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5 hidden sm:flex">
        <Download className="w-3.5 h-3.5" />
        <span>Export</span>
      </div>

      {formats.map((fmt) => (
        <button
          key={fmt.id}
          type="button"
          onClick={() => handleDownload(fmt.id)}
          disabled={loading[fmt.id]}
          className={`
            flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95
            ${success[fmt.id] 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 shadow-2xs hover:shadow-xs disabled:opacity-50'}
          `}
        >
          {loading[fmt.id] ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
          ) : success[fmt.id] ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            fmt.icon
          )}
          <span>{success[fmt.id] ? 'Downloaded!' : fmt.label}</span>
        </button>
      ))}
      
      {error && (
        <div className="flex items-center space-x-1.5 px-3 py-1 text-rose-600 dark:text-rose-400 text-xs font-bold animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DownloadBar;

