import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import History from './pages/History';

function App() {
  const activeStyle = "text-blue-600 border-b-2 border-blue-600 pb-1";
  const inactiveStyle = "text-gray-600 hover:text-blue-600 transition-colors";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-gray-800">🎓 Lecture AI</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <NavLink 
                  to="/" 
                  className={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                  end
                >
                  Process Lecture
                </NavLink>
                <NavLink 
                  to="/history" 
                  className={({ isActive }) => isActive ? activeStyle : inactiveStyle}
                >
                  Session History
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
