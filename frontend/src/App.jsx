import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { BookOpen, History as HistoryIcon, Sparkles, Moon, Sun } from 'lucide-react';
import Home from './pages/Home';
import History from './pages/History';

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
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

  const activeStyle = "flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-500 text-white shadow-md transition-all duration-300";
  const inactiveStyle = "flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-600 dark:hover:text-brand-400 transition-all duration-300";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans transition-colors duration-300">
        {/* Modern Navigation Bar */}
        <nav className="glass sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex-shrink-0 flex items-center space-x-3 group">
                <div className="bg-brand-500 p-2 rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400 font-heading tracking-tight">
                  LECTAAI
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex sm:space-x-4">
                  <NavLink 
                    to="/" 
                    className={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                    end
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="font-semibold text-sm">Process</span>
                  </NavLink>
                  <NavLink 
                    to="/history" 
                    className={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                  >
                    <HistoryIcon className="w-4 h-4" />
                    <span className="font-semibold text-sm">History</span>
                  </NavLink>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2 hidden sm:block"></div>

                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-all active:scale-95"
                  aria-label="Toggle Theme"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </div>
        </main>

        {/* Simple Footer */}
        <footer className="py-8 border-t border-gray-100 dark:border-gray-900 text-center">
          <p className="text-sm text-gray-400">
            &copy; 2026 LECTAAI. Powered by Advanced AI.
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
