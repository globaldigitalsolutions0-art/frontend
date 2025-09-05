import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-4">
        <h1 className="text-2xl font-bold mb-6">About Attendance System</h1>
        
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Overview</h2>
          
          <p className="mb-4">
            This attendance management system is designed to track employee check-ins and check-outs 
            through card-based access control. The system provides a comprehensive dashboard for 
            monitoring attendance records, identifying missing entries, and exporting data for 
            further analysis.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Key Features</h2>
          
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Real-time attendance tracking</li>
            <li>Employee filtering and search capabilities</li>
            <li>Date range selection for historical data</li>
            <li>Missing attendance record identification</li>
            <li>Detailed event viewing for each attendance record</li>
            <li>CSV export functionality for reporting</li>
          </ul>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Technical Information</h2>
          
          <p className="mb-4">
            The system consists of a React frontend and an Express.js backend with MongoDB for data storage. 
            The frontend communicates with the backend through RESTful API endpoints to retrieve and 
            display attendance data.
          </p>
          
          <div className="mt-8">
            <Link 
              to="/" 
              className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow hover:opacity-90"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}