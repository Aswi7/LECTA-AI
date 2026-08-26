import { motion } from 'framer-motion';
import { Sparkles, Loader2, BrainCircuit, Mic2, FileSearch } from 'lucide-react';

const ProgressTracker = () => {
  const steps = [
    { icon: <Mic2 className="w-5 h-5" />, label: 'Transcribing Speech' },
    { icon: <BrainCircuit className="w-5 h-5" />, label: 'Analyzing Context' },
    { icon: <FileSearch className="w-5 h-5" />, label: 'Generating Summary' },
    { icon: <Sparkles className="w-5 h-5" />, label: 'Crafting Quiz & RAG' },
  ];

  return (
    <div className="max-w-2xl mx-auto py-16 px-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-brand-500/5 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center text-center transition-colors">
      {/* Animated Spinner Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-brand-500 rounded-full blur-2xl opacity-30 animate-pulse" />
        <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 p-6 rounded-3xl shadow-lg border border-brand-400/30">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 font-heading">Analyzing Your Lecture</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-10 font-normal leading-relaxed">
        Our AI pipeline is extracting concepts, building your summary, translating notes, and preparing practice quizzes. This typically takes 15–30 seconds.
      </p>

      {/* Step Cards Grid */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
        {steps.map((step, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.3, repeatType: 'reverse' }}
            className="flex flex-col items-center space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800"
          >
            <div className="text-brand-600 dark:text-brand-400 p-1.5 bg-brand-50 dark:bg-brand-950/80 rounded-xl">{step.icon}</div>
            <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider leading-tight">{step.label}</span>
          </motion.div>
        ))}
      </div>
      
      {/* Animated Gradient Progress Line */}
      <div className="mt-10 w-full max-w-sm h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-800">
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          className="w-1/2 h-full bg-gradient-to-r from-transparent via-brand-500 to-transparent"
        />
      </div>
    </div>
  );
};

export default ProgressTracker;

