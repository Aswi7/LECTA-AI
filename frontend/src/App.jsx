import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { BookOpen, History as HistoryIcon, Sparkles, Moon, Sun, Cpu } from 'lucide-react';
import Home from './pages/Home';
import History from './pages/History';

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    // Default to Light Mode if not explicitly set to 'dark'
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const activeStyle = "flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all duration-300";
  const inactiveStyle = "flex items-center space-x-2 px-4 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 hover:text-brand-600 dark:hover:text-brand-400 font-bold text-sm transition-all duration-300";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {/* Navigation Header */}
        <nav className="glass sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              
              {/* Brand Logo & Title */}
              <NavLink to="/" className="flex items-center space-x-3.5 group cursor-pointer">
                <div className="relative">
                  <div className="absolute inset-0 bg-brand-500 rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition-opacity duration-300" />
                  <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 p-2.5 rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
                      LECTA<span className="text-brand-600 dark:text-brand-400">.AI</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50">
                      v2.0
                    </span>
                  </div>
                  <p className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:block">
                    Multilingual Learning Assistant
                  </p>
                </div>
              </NavLink>
              
              {/* Navigation Links & Controls */}
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5 bg-slate-200/70 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-300/60 dark:border-slate-800/60 shadow-inner">
                  <NavLink 
                    to="/" 
                    className={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                    end
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Workspace</span>
                  </NavLink>
                  <NavLink 
                    to="/history" 
                    className={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                  >
                    <HistoryIcon className="w-4 h-4" />
                    <span>Vault</span>
                  </NavLink>
                </div>

                <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 mx-1 hidden sm:block" />

                {/* Theme Toggle Button */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-300 dark:border-slate-800 shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
                  aria-label="Toggle Theme"
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-brand-600" />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Viewport */}
        <main className="grow">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </div>
        </main>

        {/* Application Footer */}
        <footer className="py-8 border-t border-slate-200 dark:border-slate-900 text-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>LECTA-AI &bull; Powered by Whisper, ChromaDB, HuggingFace &amp; Ollama Llama 3.2</span>
            </div>
            <p>&copy; 2026 LECTAAI. Advanced Academic AI Assistant.</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;


