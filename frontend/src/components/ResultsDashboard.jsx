import React, { useState } from 'react';

const ResultsDashboard = ({ result }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [showAnswers, setShowAnswers] = useState({});

  if (!result) return null;

  const toggleAnswer = (qIndex) => {
    setShowAnswers(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: '📝' },
    { id: 'translation', label: 'Translation', icon: '🌐' },
    { id: 'keywords', label: 'Keywords', icon: '🔑' },
    { id: 'questions', label: 'Questions', icon: '❓' },
  ];

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* 1. Stats Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase">
            Detected: {result.language?.name || 'N/A'}
          </span>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold uppercase">
            Target: {result.target_language || 'ta'}
          </span>
        </div>
        <div className="flex gap-6 text-sm text-gray-600 font-medium">
          <div className="flex items-center gap-2">
            <span>⏱️</span> {result.processing_time_seconds || 0}s
          </div>
          <div className="flex items-center gap-2">
            <span>📚</span> {result.questions?.length || 0} Questions
          </div>
        </div>
      </div>

      {/* 2. Tab Navigation */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
                ${activeTab === tab.id 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                  : 'text-gray-500 hover:text-blue-500 hover:bg-gray-100/50'}`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-8">
              <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Lecture Summary</h3>
                <p className="text-gray-700 leading-relaxed">
                  {result.summary || "Summary not available."}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Key Takeaways</h3>
                <ul className="space-y-3">
                  {result.bullet_notes?.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{note.replace('• ', '')}</span>
                    </li>
                  )) || <p className="text-gray-500">No bullet notes available.</p>}
                </ul>
              </div>
            </div>
          )}

          {/* Translation Tab */}
          {activeTab === 'translation' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Translated Content ({result.target_language || 'ta'})
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                  <p className="text-gray-800 leading-relaxed italic">
                    {result.translated_content || "Translation not available."}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Concept Mapping</h4>
                <div className="flex flex-wrap gap-2">
                  {result.translated_keywords?.map((kw, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">{kw.keyword}</span>
                      <span className="text-blue-600 font-bold">→</span>
                      <span className="text-sm font-bold text-gray-800">{kw.translated}</span>
                    </div>
                  )) || <p className="text-gray-500">No keywords available.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === 'keywords' && (
            <div className="space-y-10">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-6">Important Keywords</h3>
                <div className="flex flex-wrap gap-3">
                  {result.concepts?.keywords?.map((kw, idx) => (
                    <div key={idx} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-100 flex items-center gap-2 shadow-sm">
                      <span className="font-bold">{kw.keyword}</span>
                      <span className="text-[10px] bg-indigo-200/50 px-1.5 py-0.5 rounded font-mono">
                        {(kw.score * 10).toFixed(1)}
                      </span>
                    </div>
                  )) || <p className="text-gray-500">No keywords extracted.</p>}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Named Entities</h3>
                <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Entity</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Label</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.concepts?.entities?.map((ent, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-800">{ent.text}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-mono uppercase">
                              {ent.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{ent.description}</td>
                        </tr>
                      )) || <tr><td colSpan="3" className="px-6 py-4 text-center text-gray-500">No entities found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div className="space-y-10">
              {['definition', 'fill_blank', 'true_false'].map((type) => {
                const filteredQs = result.questions?.filter(q => q.type === type) || [];
                if (filteredQs.length === 0) return null;

                const typeLabels = {
                  definition: 'Definition Questions',
                  fill_blank: 'Fill in the Blanks',
                  true_false: 'True or False'
                };

                return (
                  <div key={type} className="space-y-4">
                    <h3 className="text-lg font-extrabold text-gray-800 border-l-4 border-blue-500 pl-3">
                      {typeLabels[type]}
                    </h3>
                    <div className="grid gap-4">
                      {filteredQs.map((q, idx) => {
                        const qId = `${type}-${idx}`;
                        return (
                          <div key={qId} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start gap-4 mb-4">
                              <p className="text-gray-800 font-medium leading-relaxed">{q.question}</p>
                              <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getDifficultyColor(q.difficulty)}`}>
                                {q.difficulty}
                              </span>
                            </div>
                            <div className="flex flex-col gap-3">
                              <button
                                onClick={() => toggleAnswer(qId)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 w-fit"
                              >
                                {showAnswers[qId] ? 'Hide Answer ↑' : 'Show Answer ↓'}
                              </button>
                              {showAnswers[qId] && (
                                <div className="p-3 bg-gray-50 rounded-lg border-l-2 border-green-400 animate-slide-down">
                                  <p className="text-sm font-bold text-gray-500 mb-1 uppercase text-[9px]">Answer</p>
                                  <p className="text-gray-800 font-semibold">{q.answer}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {(!result.questions || result.questions.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <p>No review questions generated for this lecture.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
