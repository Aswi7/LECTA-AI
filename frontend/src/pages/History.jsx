import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
    } catch (err) {
      setError('Network error: Could not connect to the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchHistory(search, 1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search, fetchHistory]);

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session and all its exports?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/results/${sessionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      } else {
        alert('Failed to delete session.');
      }
    } catch (err) {
      alert('Network error occurred while deleting.');
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
    } catch (err) {
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
        alert('Failed to fetch session details.');
        setIsModalOpen(false);
      }
    } catch (err) {
      alert('Network error fetching session details.');
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
      hour12: true
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900">Session History</h1>
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
          <p>{error}</p>
        </div>
      )}

      {/* Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 h-64 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-8"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-100 rounded w-full"></div>
                <div className="h-3 bg-gray-100 rounded w-full"></div>
                <div className="h-3 bg-gray-100 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-2xl">
          <p className="text-xl text-gray-500 mb-4">No lectures processed yet.</p>
          <Link to="/" className="text-blue-600 font-bold hover:underline">Go upload your first lecture! →</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((s) => (
              <div key={s.session_id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900 truncate pr-4" title={s.filename}>
                      {s.filename || 'Untitled Lecture'}
                    </h3>
                    <span className="text-xs font-mono text-gray-400">{s.session_id}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">{formatDate(s.created_at)}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">
                      {s.detected_language || 'EN'}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold uppercase">
                      TO: {s.target_language || 'TA'}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px] font-bold">
                      ⏱️ {s.processing_time_seconds || 0}s
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-6">
                    {s.preview || "No preview available."}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => handleViewNotes(s.session_id)}
                    className="text-[10px] font-bold py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                  >
                    📖 View
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(s.session_id)}
                    className="text-[10px] font-bold py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={() => handleDelete(s.session_id)}
                    className="text-[10px] font-bold py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-8">
            <button
              disabled={page <= 1}
              onClick={() => fetchHistory(search, page - 1)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchHistory(search, page + 1)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div 
            className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {modalLoading ? 'Loading notes...' : selectedSession?.filename}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow overflow-y-auto p-6 bg-gray-50">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="text-gray-500 font-medium">Extracting AI insights...</p>
                </div>
              ) : selectedSession ? (
                <ResultsDashboard result={selectedSession} />
              ) : (
                <p className="text-center text-red-500">Failed to load session details.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
