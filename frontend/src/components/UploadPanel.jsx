import React, { useState, useRef } from 'react';
import LiveRecorder from './LiveRecorder';

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

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'mp4', 'ogg', 'flac', 'webm'];

const UploadPanel = ({ onSubmit, isLoading }) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'record'
  const [mode, setMode] = useState('file'); // 'file' or 'url'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('ta');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isLoading && mode === 'file') setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (isLoading || mode !== 'file') return;

    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(extension)) {
      setFile(selectedFile);
    } else {
      alert(`Unsupported file format. Please upload: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileBadgeColor = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const colors = {
      mp3: 'bg-green-100 text-green-800',
      wav: 'bg-blue-100 text-blue-800',
      mp4: 'bg-purple-100 text-purple-800',
      m4a: 'bg-yellow-100 text-yellow-800',
      webm: 'bg-red-100 text-red-800',
      flac: 'bg-indigo-100 text-indigo-800',
      ogg: 'bg-orange-100 text-orange-800'
    };
    return colors[ext] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (mode === 'file' && file) {
      onSubmit({ type: 'file', file, language: selectedLanguage });
    } else if (mode === 'url' && url) {
      onSubmit({ type: 'url', url, language: selectedLanguage });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Top Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-8 py-2 rounded-lg font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'upload' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span>📁</span>
            <span>Upload File</span>
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`px-8 py-2 rounded-lg font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'record' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span>🎙️</span>
            <span>Live Record</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="text-center py-2 px-4 bg-gray-100 rounded-lg border border-gray-200 text-xs text-gray-600 font-medium">
        {activeTab === 'upload' ? (
          "Supports MP3, WAV, M4A, MP4, OGG, FLAC, WEBM · Max recommended: 500MB"
        ) : (
          "Records directly from your microphone · Requires browser microphone permission"
        )}
      </div>

      {activeTab === 'upload' ? (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Process Lecture</h2>
          
          {/* Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 p-1 rounded-xl flex w-full max-w-xs">
              <button
                onClick={() => setMode('file')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${mode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                File Upload
              </button>
              <button
                onClick={() => setMode('url')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${mode === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Video Link
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'file' ? (
              /* Drag and Drop Zone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current.click()}
                className={`
                  relative cursor-pointer transition-all duration-300
                  border-2 rounded-2xl p-12 text-center flex flex-col items-center justify-center
                  ${dragOver ? 'border-solid border-blue-500 bg-blue-50' : 'border-dashed border-gray-300 hover:border-blue-400 bg-gray-50'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',')}
                  disabled={isLoading}
                />
                
                <div className="mb-4">
                  <span className="text-5xl">🎙️</span>
                </div>

                {!file ? (
                  <>
                    <p className="text-xl font-medium text-gray-700">Drag & drop your lecture file here</p>
                    <p className="text-sm text-gray-500 mt-2">Supports MP3, WAV, M4A, MP4, WebM (Max 50MB)</p>
                    <button
                      type="button"
                      className="mt-6 px-6 py-2 bg-white border border-gray-300 rounded-full text-gray-700 font-semibold hover:bg-gray-100 transition-colors shadow-sm"
                      disabled={isLoading}
                    >
                      Click to browse
                    </button>
                  </>
                ) : (
                  <div className="w-full bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-4 overflow-hidden">
                      <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${getFileBadgeColor(file.name)}`}>
                        {file.name.split('.').pop()}
                      </span>
                      <div className="text-left overflow-hidden">
                        <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-gray-400 hover:text-red-500 p-2"
                      disabled={isLoading}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* URL Input Zone */
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xl">🔗</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Paste YouTube or video link here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                    className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 px-1">
                  Supported: YouTube, Vimeo, and most video hosting platforms.
                </p>
              </div>
            )}

            {/* Language Selection and Process Button */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Translate to:</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={isLoading}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="w-full sm:w-1/2 pt-7">
                <button
                  type="submit"
                  disabled={(mode === 'file' ? !file : !url) || isLoading}
                  className={`
                    w-full p-3 rounded-lg font-bold text-white transition-all shadow-md
                    ${(mode === 'file' ? !file : !url) || isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:transform active:scale-95'}
                  `}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Process Lecture'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <LiveRecorder onSubmit={onSubmit} isLoading={isLoading} />
      )}
    </div>
  );
};

export default UploadPanel;
