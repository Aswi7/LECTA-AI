import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ChevronDown, 
  Clock, 
  Sparkles, 
  Plus, 
  Mic, 
  ArrowUp, 
  X, 
  Moon, 
  Sun, 
  History as VaultIcon, 
  BookOpen, 
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ isDark, toggleTheme, isMobileOpen, setIsMobileOpen }) => {
  const [sessions, setSessions] = useState([]);
  const [showCreditBanner, setShowCreditBanner] = useState(true);
  const [sidebarInput, setSidebarInput] = useState('');

  useEffect(() => {
    const fetchRecentSessions = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/history?page=1&limit=5');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.results || []);
        }
      } catch (err) {
        console.error('Sidebar session fetch error:', err);
      }
    };
    fetchRecentSessions();
  }, []);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-80 bg-[#0F1916] text-emerald-100 flex flex-col border-r border-[#233A33] transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:static shrink-0 select-none
      `}>
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#20332E]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-1 cursor-pointer group">
              <span className="font-extrabold text-white text-base tracking-tight group-hover:text-emerald-300 transition-colors font-heading">
                Lecture Buddy
              </span>
              <ChevronDown className="w-4 h-4 text-emerald-400 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="flex items-center space-x-1 text-emerald-300">
            <NavLink 
              to="/history" 
              className="p-1.5 hover:text-white hover:bg-[#182823] rounded-lg transition-colors" 
              title="Vault History"
            >
              <Clock className="w-4 h-4" />
            </NavLink>
            <button 
              onClick={toggleTheme} 
              className="p-1.5 hover:text-white hover:bg-[#182823] rounded-lg transition-colors cursor-pointer"
              title={isDark ? "Switch to Light Canvas" : "Switch to Dark Canvas"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
            </button>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 hover:text-white hover:bg-[#182823] rounded-lg transition-colors lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-xs">
          
          {/* Active Workspace Status Card */}
          <div className="space-y-3">
            <p className="text-emerald-200/80 font-medium leading-relaxed">
              Fill make the workspace controls double, remove the semester progress block, and add private lecture notes with cloud persistence.
            </p>

            {/* Inner Dark Card */}
            <div className="bg-[#182823] border border-[#263E37] rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Added notes, cleaned UI</span>
              </div>
              
              <div className="flex items-center space-x-2 pt-1">
                <NavLink 
                  to="/history"
                  className="px-4 py-1.5 rounded-full border border-[#325248] text-emerald-100 hover:text-white hover:border-emerald-400 font-semibold transition-all"
                >
                  Details
                </NavLink>
                <div className="px-4 py-1.5 rounded-full bg-[#1F362F] text-emerald-300 font-bold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Previewing</span>
                </div>
              </div>
            </div>

            <p className="text-emerald-200/70 font-normal leading-relaxed">
              Removed the semester option, wired the workspace buttons, added private lecture notes with device/Cloud saving, and changed downloads to PDFs; final preview verification remains because...
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="pt-2 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80 px-2">
              Workspace Navigation
            </span>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `
                flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all
                ${isActive ? 'bg-[#1D322B] text-white border border-emerald-500/40' : 'text-emerald-200/70 hover:bg-[#182823] hover:text-white'}
              `}
            >
              <div className="flex items-center space-x-2.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Lecture Workspace</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) => `
                flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all
                ${isActive ? 'bg-[#1D322B] text-white border border-emerald-500/40' : 'text-emerald-200/70 hover:bg-[#182823] hover:text-white'}
              `}
            >
              <div className="flex items-center space-x-2.5">
                <VaultIcon className="w-4 h-4 text-teal-400" />
                <span>Study Vault Archive</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
            </NavLink>
          </div>

          {/* Recent Lectures History List */}
          {sessions.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80 px-2">
                Recent Lectures
              </span>
              <div className="space-y-1">
                {sessions.map((s) => (
                  <NavLink
                    key={s.session_id}
                    to="/history"
                    className="block p-2.5 rounded-xl bg-[#14221E] hover:bg-[#1B2F2A] border border-[#233A33] transition-colors"
                  >
                    <p className="font-bold text-white truncate">{s.filename || 'Untitled Lecture'}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-emerald-300/80">
                      <span>{(s.target_language || 'ta').toUpperCase()}</span>
                      <span className="text-emerald-400 font-mono">#{s.session_id.slice(0, 6)}</span>
                    </div>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Credits & Input Section */}
        <div className="p-4 border-t border-[#20332E] space-y-3 bg-[#0C1412]">
          {/* Credit Banner */}
          {showCreditBanner && (
            <div className="bg-[#162520] border border-[#253D36] rounded-2xl p-3 space-y-2.5 relative">
              <button
                onClick={() => setShowCreditBanner(false)}
                className="absolute top-2.5 right-2.5 text-emerald-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <p className="font-bold text-emerald-100 text-xs pr-4">
                0 free credits remaining today
              </p>
              
              <button 
                type="button"
                className="w-full py-2 bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Upgrade now
              </button>
            </div>
          )}

          {/* Bottom Sidebar Input Pill */}
          <div className="relative bg-[#14221E] border border-[#253D36] rounded-2xl p-2 flex items-center space-x-2">
            <button type="button" className="p-1 text-emerald-400 hover:text-white cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
            
            <input
              type="text"
              placeholder="Ask Lovable..."
              value={sidebarInput}
              onChange={(e) => setSidebarInput(e.target.value)}
              className="grow bg-transparent text-xs text-white placeholder-emerald-400/60 focus:outline-none"
            />

            <div className="flex items-center space-x-1">
              <button type="button" className="px-2 py-1 bg-[#1F362F] text-[10px] font-bold text-emerald-200 rounded-lg flex items-center space-x-1 cursor-pointer">
                <span>Build</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <button type="button" className="p-1 text-emerald-400 hover:text-white cursor-pointer">
                <Mic className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 bg-[#253F37] hover:bg-[#059669] text-emerald-200 hover:text-white rounded-lg transition-colors cursor-pointer">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
