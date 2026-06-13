import { motion } from 'framer-motion';
import { Sparkles, Loader2, BrainCircuit, Mic2, FileSearch } from 'lucide-react';

const ProgressTracker = () => {
  const steps = [
    { icon: <Mic2 className="w-5 h-5" />, label: 'Transcribing Audio' },
    { icon: <BrainCircuit className="w-5 h-5" />, label: 'Analysing Context' },
    { icon: <FileSearch className="w-5 h-5" />, label: 'Generating Summary' },
    { icon: <Sparkles className="w-5 h-5" />, label: 'Crafting Quiz' },
  ];

  return (
    <div className="max-w-2xl mx-auto py-20 px-8 bg-white dark:bg-gray-900 rounded-7xl shadow-2xl shadow-brand-500/10 dark:shadow-brand-950/20 border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center transition-colors">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-brand-500 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="relative bg-brand-600 p-8 rounded-5xl shadow-xl">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      </div>

      <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Analysing your Lecture</h2>
      <p className="text-gray-500 dark:text-gray-400 font-medium mb-12">Our AI is extracting key concepts and generating your study materials. This usually takes 15-30 seconds.</p>

      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
        {steps.map((step, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.4, repeatType: 'reverse' }}
            className="flex flex-col items-center space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
          >
            <div className="text-brand-500 dark:text-brand-400">{step.icon}</div>
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-tight">{step.label}</span>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-12 w-full max-w-xs h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-1/2 h-full bg-linear-to-r from-transparent via-brand-500 to-transparent"
        />
      </div>
    </div>
  );
};

export default ProgressTracker;
