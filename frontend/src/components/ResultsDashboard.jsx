import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Globe
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
      case 'easy': return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800';
      case 'medium': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800';
      case 'hard': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800';
      default: return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700';
    }
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: <FileText className="w-4 h-4" /> },
    { id: 'translation', label: 'Translation', icon: <Languages className="w-4 h-4" /> },
    { id: 'keywords', label: 'Concepts', icon: <Key className="w-4 h-4" /> },
    { id: 'questions', label: 'Quiz', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* 1. Stats Overview (Compact Badges at Top) */}
      <div className="flex flex-wrap gap-3 items-center justify-start pb-2">
        {[
          { label: 'Source', value: result.language?.name || 'Unknown', icon: <Languages className="w-3.5 h-3.5" />, textClass: 'text-brand-700 dark:text-brand-400', borderClass: 'border-brand-100 dark:border-brand-900/50', bg: 'bg-brand-50/50 dark:bg-brand-900/20' },
          { label: 'Target', value: result.target_language || 'ta', icon: <Globe className="w-3.5 h-3.5" />, textClass: 'text-blue-700 dark:text-blue-400', borderClass: 'border-blue-100 dark:border-blue-900/50', bg: 'bg-blue-50/50 dark:bg-blue-900/20' },
          { label: 'Time', value: `${result.processing_time_seconds || 0}s`, icon: <Clock className="w-3.5 h-3.5" />, textClass: 'text-amber-700 dark:text-amber-400', borderClass: 'border-amber-100 dark:border-amber-900/50', bg: 'bg-amber-50/50 dark:bg-amber-900/20' },
          { label: 'Quiz', value: `${result.questions?.length || 0} Qs`, icon: <Trophy className="w-3.5 h-3.5" />, textClass: 'text-emerald-700 dark:text-emerald-400', borderClass: 'border-emerald-100 dark:border-emerald-900/50', bg: 'bg-emerald-50/50 dark:bg-emerald-900/20' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} ${stat.textClass} ${stat.borderClass} px-3.5 py-1.5 rounded-full border flex items-center space-x-2 text-xs font-semibold shadow-sm transition-all duration-300`}>
            {stat.icon}
            <span>
              <span className="opacity-75">{stat.label}:</span> <span className="font-extrabold">{stat.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* 2. Main Content Card */}
      <div className="bg-white dark:bg-gray-900 rounded-5xl shadow-xl shadow-brand-500/5 dark:shadow-brand-950/20 border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex p-2 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl text-sm font-bold transition-all duration-300
                ${activeTab === tab.id 
                  ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-md scale-[1.02]' 
                  : 'text-gray-500 hover:text-brand-500 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8 md:p-12">
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
                <div className="space-y-12">
                  <div className="relative">
                    <div className="absolute -left-6 top-0 bottom-0 w-1.5 bg-brand-500 rounded-full" />
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Executive Summary</h3>
                    <div className="bg-brand-50/30 dark:bg-brand-900/10 p-8 rounded-3xl border border-brand-100 dark:border-brand-900/50 text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                      {result.summary || "No summary available."}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-brand-500" />
                      <span>Key Takeaways</span>
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {result.bullet_notes?.map((note, idx) => (
                        <div key={idx} className="flex items-start space-x-4 p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="bg-brand-50 dark:bg-brand-900/30 p-1.5 rounded-lg mt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-brand-500" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{note.replace('• ', '')}</span>
                        </div>
                      )) || <p className="text-gray-500">No takeaways available.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Translation Tab */}
              {activeTab === 'translation' && (
                <div className="space-y-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Translation</h3>
                    <div className="px-4 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-xs font-bold uppercase tracking-widest border border-brand-100 dark:border-brand-900/50">
                      Target: {result.target_language || 'ta'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 dark:bg-black p-8 md:p-10 rounded-4xl shadow-2xl border border-white/5">
                    <p className="text-gray-100 dark:text-gray-200 text-xl leading-relaxed italic font-serif">
                      "{result.translated_content || "Translation not available."}"
                    </p>
                  </div>

                  {result.translated_keywords?.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Vocabulary Match</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {result.translated_keywords.map((kw, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
                            <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{kw.keyword}</span>
                            <ChevronRight className="w-4 h-4 text-brand-300 group-hover:translate-x-1 transition-transform" />
                            <span className="text-base font-black text-brand-600 dark:text-brand-400">{kw.translated}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Keywords Tab */}
              {activeTab === 'keywords' && (
                <div className="space-y-12">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-8">Core Concepts</h3>
                    <div className="flex flex-wrap gap-4">
                      {result.concepts?.keywords?.map((kw, idx) => (
                        <div key={idx} className="group relative">
                          <div className="absolute inset-0 bg-brand-500 rounded-2xl blur-md opacity-0 group-hover:opacity-20 transition-opacity" />
                          <div className="relative bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 px-6 py-4 rounded-2xl flex items-center space-x-4 shadow-sm group-hover:border-brand-300 dark:group-hover:border-brand-700 transition-all">
                            <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{kw.keyword}</span>
                            <div className="h-8 w-px bg-gray-100 dark:bg-gray-700" />
                            <span className="text-xs font-black text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-lg">
                              {(kw.score * 10).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )) || <p className="text-gray-500">No keywords extracted.</p>}
                    </div>
                  </div>

                  {result.concepts?.entities?.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                        <Info className="w-5 h-5 text-brand-500" />
                        <span>Identified Entities</span>
                      </h3>
                      <div className="grid gap-4">
                        {result.concepts.entities.map((ent, idx) => (
                          <div key={idx} className="bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center gap-6">
                            <div className="md:w-1/4">
                              <span className="text-xs font-black text-brand-400 uppercase tracking-widest mb-1 block">Entity</span>
                              <p className="text-lg font-black text-gray-900 dark:text-white">{ent.text}</p>
                            </div>
                            <div className="md:w-1/4">
                              <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">Category</span>
                              <span className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-[10px] font-black text-gray-600 dark:text-gray-300">
                                {ent.label}
                              </span>
                            </div>
                            <div className="md:grow">
                              <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 block">Context</span>
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{ent.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Questions Tab */}
              {activeTab === 'questions' && (
                <div className="space-y-12">
                  <div className="bg-brand-600 dark:bg-brand-700 p-8 rounded-4xl text-white flex flex-col md:flex-row items-center gap-8">
                    <div className="bg-white/20 p-6 rounded-3xl">
                      <Trophy className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black mb-2">Knowledge Check</h3>
                      <p className="text-brand-100 font-medium opacity-90">
                        We've generated {result.questions?.length || 0} questions to test your understanding of the material.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    {result.questions?.map((q, idx) => {
                      const qId = `q-${idx}`;
                      return (
                        <div key={qId} className="group bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-3xl p-8 transition-all hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-xl hover:shadow-brand-500/5 dark:hover:shadow-black/20">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                            <div className="grow">
                              <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-3 block">Question {idx + 1}</span>
                              <h4 className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">{q.question}</h4>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getDifficultyColor(q.difficulty)}`}>
                              {q.difficulty}
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <button
                              onClick={() => toggleAnswer(qId)}
                              className="flex items-center space-x-2 text-sm font-black text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                            >
                              <span>{showAnswers[qId] ? 'Hide Answer' : 'Reveal Answer'}</span>
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
                                  <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/50">
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Correct Answer</p>
                                    <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{q.answer}</p>
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
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
