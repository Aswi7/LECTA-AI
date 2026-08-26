import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  BookOpen, 
  FileText, 
  Trash2, 
  Calendar, 
  Languages, 
  ChevronLeft, 
  ChevronRight,
  X,
  ExternalLink,
  History as HistoryIcon,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import ResultsDashboard from '../components/ResultsDashboard';

const History = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const fetchHistory = useCallback(async (query = '', pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/history?page=${pageNum}&limit=10&search=${query}`);
      const data = await response.json();
      if (response.ok) {
        setSessions(data.results);
        setTotalPages(data.pages);
        setPage(data.page);
      } else {
        setError(data.error || 'Failed to fetch history.');
      }
    } catch {
      setError('Network error: Could not connect to the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchHistory(search, 1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search, fetchHistory]);

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this session? This action cannot be undone.')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/results/${sessionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      }
    } catch {
      alert('Network error occurred.');
    }
  };

  const handleDownloadPDF = async (sessionId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/download/${sessionId}/pdf`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionId}_notes.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch {
      alert('Could not download PDF.');
    }
  };

  const handleViewNotes = async (sessionId) => {
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/results/${sessionId}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedSession(data);
      } else {
        setIsModalOpen(false);
      }
    } catch {
      setIsModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="space-y-8 animate-fade-in">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-brand-50 dark:bg-brand-950/60 rounded-full border border-brand-200/80 dark:border-brand-800/60 text-xs font-extrabold text-brand-700 dark:text-brand-300 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lecture Vault Archive</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-heading">Study Vault</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">Search and review your past analyzed lectures, transcripts, and quizzes.</p>
          </div>
          <div className="relative group w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search lectures..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-2xs text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-5 rounded-2xl flex items-center space-x-3 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 h-64 animate-pulse space-y-4">
                <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/4" />
                <div className="h-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg w-1/2" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-full" />
                  <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-full" />
                  <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HistoryIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">No Lectures Found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-xs mx-auto">Upload or record a lecture on the home workspace to start archiving notes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((s, i) => (
              <motion.div 
                key={s.session_id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs hover:shadow-xl hover:shadow-brand-500/5 dark:hover:shadow-black/40 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-brand-50 dark:bg-brand-950/60 p-2.5 rounded-xl border border-brand-200/60 dark:border-brand-800/60">
                      <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">#{s.session_id.slice(0, 8)}</span>
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 line-clamp-1 group-hover:text-brand-600 transition-colors" title={s.filename}>
                    {s.filename || 'Untitled Lecture'}
                  </h3>
                  
                  <div className="flex items-center space-x-1.5 text-slate-400 dark:text-slate-500 mb-4 font-bold text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(s.created_at)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center space-x-1.5">
                      <Languages className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase">{s.detected_language || 'EN'}</span>
                    </div>
                    <div className="px-2.5 py-0.5 bg-brand-50 dark:bg-brand-950/60 rounded-lg flex items-center space-x-1.5 border border-brand-200/60 dark:border-brand-800/60">
                      <ExternalLink className="w-3 h-3 text-brand-500" />
                      <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase">Target: {(s.target_language || 'TA').toUpperCase()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-6 font-medium">
                    {s.preview || "No summary preview available for this session."}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleViewNotes(s.session_id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-all cursor-pointer group/btn"
                  >
                    <BookOpen className="w-4 h-4 mb-0.5 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-extrabold uppercase">Study</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(s.session_id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer group/btn"
                  >
                    <FileText className="w-4 h-4 mb-0.5 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-extrabold uppercase">Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.session_id)}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer group/btn"
                  >
                    <Trash2 className="w-4 h-4 mb-0.5 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-extrabold uppercase">Delete</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {sessions.length > 0 && (
          <div className="flex items-center justify-center space-x-3 pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchHistory(search, page - 1)}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-brand-600 disabled:opacity-30 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-white">
              {page} <span className="text-slate-300 dark:text-slate-600 mx-1.5">/</span> {totalPages || 1}
            </div>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => fetchHistory(search, page + 1)}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-brand-600 disabled:opacity-30 transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Modern Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-slate-950 w-full max-w-6xl h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest">Study Vault Viewer</span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate max-w-xl mt-0.5 font-heading">
                    {modalLoading ? 'Loading Session Details...' : selectedSession?.filename || 'Untitled Lecture'}
                  </h2>
                  {!modalLoading && (
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                      Processed on {formatDate(selectedSession?.created_at)}
                    </p>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="grow overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                {modalLoading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-brand-100 dark:border-brand-900/30 rounded-full" />
                      <div className="absolute top-0 w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest text-xs">Retrieving Vault Data...</p>
                  </div>
                ) : selectedSession ? (
                  <div className="animate-fade-in">
                    <ResultsDashboard result={selectedSession} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-rose-500 font-bold text-sm">
                    Vault retrieval failed. Please try again.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default History;

