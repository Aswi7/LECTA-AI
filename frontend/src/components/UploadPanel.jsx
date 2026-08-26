import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Mic, X, CheckCircle, ChevronDown, FileAudio, Globe, Sparkles, FileText, HelpCircle } from 'lucide-react';
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
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Top Tab Switcher */}
      <div className="flex justify-center">
        <div className="p-1.5 bg-slate-200/80 dark:bg-slate-900/90 rounded-2xl flex space-x-1.5 border border-slate-300/60 dark:border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer ${
              activeTab === 'upload' 
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-md scale-[1.02]' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File &amp; URL</span>
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center space-x-2 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer ${
              activeTab === 'record' 
                ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-md scale-[1.02]' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Live Recording</span>
          </button>
        </div>
      </div>

      {/* Main Form Container Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-brand-500/5 dark:shadow-black/40 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {activeTab === 'upload' ? (
          <div className="p-8 sm:p-10">
            {/* Header & Mode Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">Process Lecture Source</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Upload audio/video files or paste a direct video URL.</p>
              </div>
              
              <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl flex border border-slate-200/60 dark:border-slate-700/60 self-start">
                <button
                  onClick={() => setMode('file')}
                  className={`flex items-center space-x-2 py-2 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'file' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <FileAudio className="w-4 h-4" />
                  <span>Media File</span>
                </button>
                <button
                  onClick={() => setMode('url')}
                  className={`flex items-center space-x-2 py-2 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'url' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>Web Link</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {mode === 'file' ? (
                /* File Drop Zone */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isLoading && fileInputRef.current.click()}
                  className={`
                    relative cursor-pointer group
                    border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center transition-all duration-300
                    ${dragOver 
                      ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 scale-[0.99]' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-brand-50/20 dark:hover:bg-brand-950/20'}
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
                    <div className="space-y-5">
                      <div className="w-16 h-16 bg-brand-100 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 border border-brand-200 dark:border-brand-800/60 shadow-inner">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-extrabold text-slate-800 dark:text-slate-200">
                          Drop your lecture file here
                        </p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          or <span className="text-brand-600 dark:text-brand-400 font-bold underline">browse your device</span>
                        </p>
                      </div>
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-full text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <span>MP3, WAV, MP4, M4A, OGG, FLAC, WEBM</span>
                      </div>
                    </div>
                  ) : (
                    /* Selected File Details Box */
                    <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-5 rounded-2xl border border-brand-200 dark:border-brand-800 shadow-md flex items-center justify-between animate-fade-in">
                      <div className="flex items-center space-x-4 overflow-hidden">
                        <div className="bg-brand-600 p-2.5 rounded-xl shrink-0">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{file.name}</p>
                          <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                        disabled={isLoading}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* URL Input Field */
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <LinkIcon className="w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      placeholder="Paste YouTube or video link here (e.g. https://www.youtube.com/watch?v=...)"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={isLoading}
                      className="block w-full pl-12 pr-4 py-4 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-base bg-slate-50 dark:bg-slate-950/60 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400 px-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Auto-extracts audio &amp; generates speech-to-text transcript</span>
                  </div>
                </div>
              )}

              {/* Language Selector & Process Button Grid */}
              <div className="grid md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 ml-1">
                    <Globe className="w-4 h-4 text-brand-500" />
                    <span>Translate Notes &amp; Transcript To</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      disabled={isLoading}
                      className="w-full appearance-none p-4 bg-slate-50 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all disabled:opacity-50 pr-12 cursor-pointer"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={(mode === 'file' ? !file : !url) || isLoading}
                  className={`
                    w-full py-4.5 rounded-2xl font-black text-base text-white transition-all shadow-lg cursor-pointer
                    ${(mode === 'file' ? !file : !url) || isLoading 
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none' 
                      : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/20 hover:-translate-y-0.5 active:scale-95'}
                  `}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing Lecture...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <Sparkles className="w-5 h-5" />
                      <span>Process with AI</span>
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <LiveRecorder onSubmit={onSubmit} isLoading={isLoading} />
        )}
      </div>
      
      {/* Feature Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { icon: <FileText className="w-5 h-5 text-brand-500" />, title: "Abstractive Summaries", desc: "Key takeaways & bullet-point lecture notes" },
          { icon: <Globe className="w-5 h-5 text-indigo-500" />, title: "11 Regional Languages", desc: "Automatic translations for Indian languages" },
          { icon: <HelpCircle className="w-5 h-5 text-emerald-500" />, title: "Exam Quiz Generation", desc: "AI-generated MCQs & flashcards" }
        ].map((feat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl shrink-0">{feat.icon}</div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{feat.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadPanel;

