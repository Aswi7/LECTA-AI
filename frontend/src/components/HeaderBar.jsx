import { NavLink } from 'react-router-dom';
import { 
  Menu, 
  ChevronDown, 
  Code, 
  Layers, 
  RotateCw, 
  Zap, 
  Share2, 
  Sparkles
} from 'lucide-react';

const HeaderBar = ({ onOpenMobileSidebar }) => {
  return (
    <header className="bg-[#FAF8F5] dark:bg-[#0B1311] border-b border-[#EAE5DC] dark:border-[#20332E] px-4 py-3 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left Section: Mobile Menu, Logo & Mode Switcher */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl bg-white dark:bg-[#131F1C] border border-[#EAE5DC] dark:border-[#20332E] text-slate-700 dark:text-emerald-200 lg:hidden hover:bg-slate-100 dark:hover:bg-[#182823] transition-colors cursor-pointer"
            aria-label="Open Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo & Title */}
          <NavLink to="/" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 rounded-lg bg-[#059669] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black text-slate-900 dark:text-white text-base sm:text-lg tracking-tight font-heading">
              Lecture Buddy
            </span>
          </NavLink>

          {/* Mode Pill Toggle (Preview / Code / Layers) */}
          <div className="hidden md:flex items-center space-x-1 bg-white/80 dark:bg-[#131F1C] p-1 rounded-xl border border-[#EAE5DC] dark:border-[#20332E] shadow-2xs">
            <button className="flex items-center space-x-1.5 px-3 py-1 bg-[#059669] text-white rounded-lg font-bold text-xs shadow-xs">
              <span>Preview</span>
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors">
              <Code className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors">
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Section: Page Selector & Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-white/80 dark:bg-[#131F1C] px-3.5 py-1.5 rounded-xl border border-[#EAE5DC] dark:border-[#20332E] shadow-2xs text-xs font-bold text-slate-800 dark:text-emerald-100">
            <NavLink to="/" className={({ isActive }) => isActive ? "text-[#059669] dark:text-emerald-400" : "hover:text-[#059669]"}>
              Workspace
            </NavLink>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <NavLink to="/history" className={({ isActive }) => isActive ? "text-[#059669] dark:text-emerald-400" : "hover:text-[#059669]"}>
              Vault
            </NavLink>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="p-2 rounded-xl bg-white/80 dark:bg-[#131F1C] border border-[#EAE5DC] dark:border-[#20332E] text-slate-500 dark:text-emerald-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh Page"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center space-x-2">
          <NavLink
            to="/history"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#131F1C] border border-[#EAE5DC] dark:border-[#20332E] text-slate-700 dark:text-emerald-200 font-extrabold text-xs hover:bg-slate-100 dark:hover:bg-[#182823] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Share</span>
          </NavLink>

          <button
            type="button"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#059669] to-teal-700 text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
            <span>Upgrade</span>
          </button>

          <NavLink
            to="/"
            className="px-3.5 py-1.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white font-extrabold text-xs shadow-md transition-colors"
          >
            Publish
          </NavLink>
        </div>

      </div>
    </header>
  );
};

export default HeaderBar;
