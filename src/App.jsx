import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Import page components
import Home from './pages/Home';
import Events from './pages/Events';
import Employees from './pages/Employees';
import About from './pages/About';
import AttendanceHistory from './pages/AttendanceHistory';
import MonthlyAttendance from './pages/MonthlyAttendance'; // ✅ Extension hatao

// Import navigation component
import Navigation from './components/Navigation';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/attendance-history" element={<AttendanceHistory />} />
        <Route path="/daily-attendance" element={<MonthlyAttendance />} /> {/* ✅ Fix */}
        <Route path="/events" element={<Events />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}
