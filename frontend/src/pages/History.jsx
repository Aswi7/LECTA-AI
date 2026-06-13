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
  AlertCircle
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
    <div className="space-y-10 animate-fade-in">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 font-heading">Study Vault</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Your processed lectures and AI insights in one place.</p>
        </div>
        <div className="relative group w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search filenames..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-6 rounded-2xl flex items-center space-x-4 text-red-700 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border-2 border-gray-50 dark:border-gray-800 rounded-3xl p-8 h-72 animate-pulse space-y-6">
              <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-lg w-3/4"></div>
              <div className="h-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg w-1/2"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-50 dark:bg-gray-800/50 rounded-full w-full"></div>
                <div className="h-3 bg-gray-50 dark:bg-gray-800/50 rounded-full w-full"></div>
                <div className="h-3 bg-gray-50 dark:bg-gray-800/50 rounded-full w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-gray-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <HistoryIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No lectures found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">Start processing your first lecture to see it in your study vault.</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20"
          >
            Process Now
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((s, i) => (
            <motion.div 
              key={s.session_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-white dark:bg-gray-900 border-2 border-gray-50 dark:border-gray-800 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-brand-500/5 dark:hover:shadow-black/20 hover:-translate-y-1 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-brand-50 dark:bg-brand-900/30 p-3 rounded-2xl">
                    <BookOpen className="w-6 h-6 text-brand-500" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">ID: {s.session_id.slice(0, 8)}</span>
                </div>
                
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-brand-600 transition-colors" title={s.filename}>
                  {s.filename || 'Untitled Lecture'}
                </h3>
                
                <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-500 mb-6 font-bold text-xs uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(s.created_at)}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center space-x-2 border border-transparent dark:border-gray-700">
                    <Languages className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase">{s.detected_language || 'EN'}</span>
                  </div>
                  <div className="px-3 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-lg flex items-center space-x-2 border border-transparent dark:border-brand-900/50">
                    <ExternalLink className="w-3 h-3 text-brand-400" />
                    <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase">{s.target_language || 'TA'}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-8">
                  {s.preview || "No summary preview available for this session."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleViewNotes(s.session_id)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-all group/btn"
                >
                  <BookOpen className="w-5 h-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase">Study</span>
                </button>
                <button
                  onClick={() => handleDownloadPDF(s.session_id)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group/btn"
                >
                  <FileText className="w-5 h-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase">Export</span>
                </button>
                <button
                  onClick={() => handleDelete(s.session_id)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all group/btn"
                >
                  <Trash2 className="w-5 h-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                  <span className="text-[9px] font-black uppercase">Delete</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {sessions.length > 0 && (
        <div className="flex items-center justify-center space-x-4 pt-10">
          <button
            disabled={page <= 1}
            onClick={() => fetchHistory(search, page - 1)}
            className="p-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 hover:text-brand-600 hover:border-brand-200 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-black text-gray-900 dark:text-white">
            {page} <span className="text-gray-300 dark:text-gray-600 mx-2">/</span> {totalPages || 1}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => fetchHistory(search, page + 1)}
            className="p-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 hover:text-brand-600 hover:border-brand-200 disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Modern Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-950/80 backdrop-blur-xl"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[var(--bg)] w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 dark:border-white/5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-10 py-8 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white truncate max-w-xl">
                    {modalLoading ? 'Consulting the Vault...' : selectedSession?.filename}
                  </h2>
                  {!modalLoading && (
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                      Processed on {formatDate(selectedSession?.created_at)}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-grow overflow-y-auto p-10 custom-scrollbar">
                {modalLoading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-brand-100 dark:border-brand-900/30 rounded-full"></div>
                      <div className="absolute top-0 w-20 h-20 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-[0.2em] text-xs">Reconstructing Session...</p>
                  </div>
                ) : selectedSession ? (
                  <div className="animate-fade-in">
                    <ResultsDashboard result={selectedSession} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-red-500 font-bold">
                    Vault retrieval failed. Please try again.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default History;
