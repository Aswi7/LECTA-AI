import React, { useState, useRef } from 'react';

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
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('ta');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isLoading) setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (isLoading) return;

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
    if (file && !isLoading) {
      onSubmit(file, selectedLanguage);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Upload Lecture Audio</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag and Drop Zone */}
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
              disabled={!file || isLoading}
              className={`
                w-full p-3 rounded-lg font-bold text-white transition-all shadow-md
                ${!file || isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:transform active:scale-95'}
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
  );
};

export default UploadPanel;
