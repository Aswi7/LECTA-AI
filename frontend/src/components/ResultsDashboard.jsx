import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatPanel from './ChatPanel';
import { 
  FileText, 
  Languages, 
  Key, 
  HelpCircle, 
  Clock, 
  BookOpen, 
  ChevronRight, 
  ChevronDown,
  Info,
  CheckCircle2,
  Trophy,
  Globe,
  Sparkles,
  MessageSquare
} from 'lucide-react';

const ResultsDashboard = ({ result }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [showAnswers, setShowAnswers] = useState({});

  if (!result) return null;

  const toggleAnswer = (qId) => {
    setShowAnswers(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'medium': return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'hard': return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case 'mcq': return { label: 'Multiple Choice', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'true_false': return { label: 'True / False', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'definition': return { label: 'Definition', color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
      case 'fill_blank': return { label: 'Fill in Blank', color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
      default: return { label: type?.toUpperCase() || 'QUESTION', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  const tabs = [
    { id: 'summary', label: 'Summary Notes', icon: <FileText className="w-4 h-4" /> },
    { id: 'translation', label: 'Translation', icon: <Languages className="w-4 h-4" /> },
    { id: 'keywords', label: 'Concepts & Entities', icon: <Key className="w-4 h-4" /> },
    { id: 'questions', label: 'Quiz & Practice', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'chat', label: 'Interactive AI Chat', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Top Analytics Stats Pills */}
      <div className="flex flex-wrap gap-3 items-center justify-start">
        {[
          { label: 'Source Lang', value: result.language?.name || 'English', icon: <Languages className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />, borderClass: 'border-brand-200/80 dark:border-brand-900/60', bg: 'bg-brand-50/80 dark:bg-brand-950/40', text: 'text-brand-900 dark:text-brand-200' },
          { label: 'Target Lang', value: (result.target_language || 'ta').toUpperCase(), icon: <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />, borderClass: 'border-indigo-200/80 dark:border-indigo-900/60', bg: 'bg-indigo-50/80 dark:bg-indigo-950/40', text: 'text-indigo-900 dark:text-indigo-200' },
          { label: 'Latency', value: `${result.processing_time_seconds || 0}s`, icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, borderClass: 'border-amber-200/80 dark:border-amber-900/60', bg: 'bg-amber-50/80 dark:bg-amber-950/40', text: 'text-amber-900 dark:text-amber-200' },
          { label: 'Quiz Bank', value: `${result.questions?.length || 0} Questions`, icon: <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />, borderClass: 'border-emerald-200/80 dark:border-emerald-900/60', bg: 'bg-emerald-50/80 dark:bg-emerald-950/40', text: 'text-emerald-900 dark:text-emerald-200' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} ${stat.text} ${stat.borderClass} px-4 py-2 rounded-2xl border flex items-center space-x-2 text-xs font-bold shadow-xs`}>
            {stat.icon}
            <span>
              <span className="opacity-70 font-semibold">{stat.label}:</span> <span className="font-extrabold">{stat.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Main Content Workspace Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-brand-500/5 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="flex overflow-x-auto p-2 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 gap-1.5 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-300 cursor-pointer whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-md scale-[1.01]' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white/60 dark:hover:bg-slate-800/50'}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Viewport */}
        <div className="p-6 sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-10">
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-brand-500 to-indigo-600 rounded-full" />
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-4">Executive Summary</h3>
                    <div className="bg-brand-50/40 dark:bg-brand-950/20 p-6 sm:p-8 rounded-3xl border border-brand-100 dark:border-brand-900/50 text-base sm:text-lg text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {result.summary || "No summary available."}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-6 flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-brand-500" />
                      <span>Key Takeaways &amp; Highlights</span>
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {result.bullet_notes?.map((note, idx) => (
                        <div key={idx} className="flex items-start space-x-3.5 p-5 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-2xs hover:shadow-md transition-shadow">
                          <div className="bg-brand-100 dark:bg-brand-950 p-1.5 rounded-lg mt-0.5 shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                          </div>
                          <span className="text-slate-700 dark:text-slate-300 font-medium text-sm sm:text-base leading-relaxed">{note.replace('• ', '')}</span>
                        </div>
                      )) || <p className="text-slate-500 text-sm">No takeaways available.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Translation Tab */}
              {activeTab === 'translation' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Translated Content</h3>
                    <div className="px-4 py-1.5 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 rounded-full text-xs font-extrabold uppercase tracking-widest border border-brand-200/80 dark:border-brand-800/60">
                      Target Language: {(result.target_language || 'ta').toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="bg-slate-100/90 dark:bg-slate-950 p-6 sm:p-10 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
                    <p className="text-slate-900 dark:text-slate-100 text-lg sm:text-xl leading-relaxed italic font-serif">
                      "{result.translated_content || "Translation not available."}"
                    </p>
                  </div>

                  {result.translated_keywords?.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Translated Vocabulary Pairings</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {result.translated_keywords.map((kw, idx) => (
                          <div key={idx} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{kw.keyword}</span>
                            <ChevronRight className="w-4 h-4 text-brand-400 group-hover:translate-x-1 transition-transform" />
                            <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">{kw.translated}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Keywords / Concepts Tab */}
              {activeTab === 'keywords' && (
                <div className="space-y-10">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-6">Core Lecture Concepts</h3>
                    <div className="flex flex-wrap gap-3">
                      {result.concepts?.keywords?.map((kw, idx) => (
                        <div key={idx} className="group relative">
                          <div className="relative bg-white dark:bg-slate-800 border-2 border-slate-200/80 dark:border-slate-700/80 px-5 py-3 rounded-2xl flex items-center space-x-3 shadow-2xs group-hover:border-brand-400 dark:group-hover:border-brand-600 transition-all">
                            <span className="text-base font-extrabold text-slate-800 dark:text-slate-200">{kw.keyword}</span>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                            <span className="text-xs font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/80 px-2 py-0.5 rounded-lg border border-brand-200 dark:border-brand-800">
                              {(kw.score * 10).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )) || <p className="text-slate-500 text-sm">No keywords extracted.</p>}
                    </div>
                  </div>

                  {result.concepts?.entities?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                        <Info className="w-5 h-5 text-brand-500" />
                        <span>Identified Domain Entities</span>
                      </h3>
                      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {result.concepts.entities.map((ent, idx) => (
                          <div key={idx} className="bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center gap-4">
                            <div className="md:w-1/4">
                              <span className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest block mb-0.5">Entity</span>
                              <p className="text-base font-black text-slate-900 dark:text-white">{ent.text}</p>
                            </div>
                            <div className="md:w-1/4">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Category</span>
                              <span className="px-3 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                                {ent.label}
                              </span>
                            </div>
                            <div className="md:grow">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Context</span>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{ent.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz & Practice Tab */}
              {activeTab === 'questions' && (
                <div className="space-y-8">
                  <div className="bg-gradient-to-r from-brand-600 to-indigo-700 p-6 sm:p-8 rounded-3xl text-white flex flex-col sm:flex-row items-center gap-6 shadow-lg">
                    <div className="bg-white/20 p-4 rounded-2xl shrink-0">
                      <Trophy className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black mb-1">Interactive Quiz Bank</h3>
                      <p className="text-brand-100 text-sm font-medium opacity-90">
                        Test your exam readiness with {result.questions?.length || 0} AI-generated review questions.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5">
                    {result.questions?.map((q, idx) => {
                      const qId = `q-${idx}`;
                      const typeBadge = getTypeBadge(q.type);
                      return (
                        <div key={qId} className="group bg-white dark:bg-slate-950/80 border-2 border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 transition-all hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div className="grow space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest">Question {idx + 1}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${typeBadge.color}`}>
                                  {typeBadge.label}
                                </span>
                              </div>
                              <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">{q.question}</h4>
                            </div>
                            <div className={`px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${getDifficultyColor(q.difficulty)}`}>
                              {q.difficulty || 'medium'}
                            </div>
                          </div>

                          {/* MCQ Options Choices List if present */}
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-extrabold text-slate-600 dark:text-slate-400 shrink-0">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reveal Answer Toggle */}
                          <div className="space-y-3 pt-2">
                            <button
                              type="button"
                              onClick={() => toggleAnswer(qId)}
                              className="flex items-center space-x-2 text-xs font-black text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer"
                            >
                              <span>{showAnswers[qId] ? 'Hide Correct Answer' : 'Reveal Correct Answer'}</span>
                              {showAnswers[qId] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            
                            <AnimatePresence>
                              {showAnswers[qId] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                                    <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Correct Answer</p>
                                    <p className="text-base font-extrabold text-emerald-900 dark:text-emerald-100">{q.answer}</p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <ChatPanel 
                  sessionId={result.session_id}
                  isIndexed={result.pipeline_steps?.includes("rag_indexed")} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;

