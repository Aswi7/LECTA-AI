import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Mic, X, CheckCircle, ChevronDown, FileAudio, Globe } from 'lucide-react';
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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
    <div className="w-full max-w-4xl mx-auto">
      {/* Top Tab Switcher */}
      <div className="flex justify-center mb-8">
        <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl flex space-x-1 shadow-inner">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
              activeTab === 'upload' ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>Upload & Link</span>
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
              activeTab === 'record' ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Mic className="w-5 h-5" />
            <span>Live Record</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-4xl shadow-2xl shadow-brand-100/20 dark:shadow-brand-900/10 border border-gray-100 dark:border-gray-800 overflow-hidden">
        {activeTab === 'upload' ? (
          <div className="p-10 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Process Lecture</h2>
                <p className="text-gray-500 dark:text-gray-400">Choose a file or paste a video link to start.</p>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl flex self-start">
                <button
                  onClick={() => setMode('file')}
                  className={`flex items-center space-x-2 py-2 px-6 rounded-lg text-sm font-bold transition-all ${mode === 'file' ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  <FileAudio className="w-4 h-4" />
                  <span>File</span>
                </button>
                <button
                  onClick={() => setMode('url')}
                  className={`flex items-center space-x-2 py-2 px-6 rounded-lg text-sm font-bold transition-all ${mode === 'url' ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>URL</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {mode === 'file' ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isLoading && fileInputRef.current.click()}
                  className={`
                    relative cursor-pointer group
                    border-4 rounded-3xl p-16 text-center transition-all duration-500
                    ${dragOver ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10 scale-[0.99]' : 'border-dashed border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'}
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
                  
                  {!file ? (
                    <div className="space-y-6">
                      <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/30 text-brand-500 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                        <Upload className="w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">Drop your file here</p>
                        <p className="text-gray-500 dark:text-gray-400">or click to browse your library</p>
                      </div>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Supports MP3, WAV, MP4, M4A, FLAC
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl border border-brand-100 dark:border-brand-900 shadow-xl shadow-brand-500/5 flex items-center justify-between animate-fade-in">
                      <div className="flex items-center space-x-4 overflow-hidden">
                        <div className="bg-brand-500 p-3 rounded-xl">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                          <p className="text-xs font-semibold text-brand-500 dark:text-brand-400 uppercase">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                        disabled={isLoading}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <LinkIcon className="w-6 h-6 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder="Paste YouTube or video link here..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={isLoading}
                      className="block w-full pl-14 pr-6 py-6 border-2 border-gray-100 dark:border-gray-800 rounded-2xl text-lg bg-gray-50 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 px-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Auto-detects timestamps and speakers</span>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 items-end">
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                    <Globe className="w-4 h-4" />
                    <span>Translate results to</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      disabled={isLoading}
                      className="w-full appearance-none p-5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl text-gray-700 dark:text-gray-200 font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all disabled:opacity-50 pr-12"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={(mode === 'file' ? !file : !url) || isLoading}
                  className={`
                    w-full py-5 rounded-2xl font-extrabold text-lg text-white transition-all shadow-xl
                    ${(mode === 'file' ? !file : !url) || isLoading 
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none' 
                      : 'bg-brand-600 hover:bg-brand-700 hover:shadow-brand-500/20 hover:-translate-y-1 active:scale-95'}
                  `}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analysing Lecture...
                    </span>
                  ) : (
                    'Process with AI'
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <LiveRecorder onSubmit={onSubmit} isLoading={isLoading} />
        )}
      </div>
      
      {/* Bottom Features Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {[
          { icon: <CheckCircle className="text-brand-500" />, title: "Summarization", desc: "Get concise bullet points" },
          { icon: <Globe className="text-brand-500" />, title: "Translation", desc: "Support for 10+ languages" },
          { icon: <Mic className="text-brand-500" />, title: "Key Concepts", desc: "Automated keyword extraction" }
        ].map((feat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center space-x-4 shadow-sm">
            <div className="bg-brand-50 dark:bg-brand-900/30 p-3 rounded-xl">{feat.icon}</div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">{feat.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadPanel;
