import { useState, useEffect, useMemo } from 'react';
import { getJSON } from '../lib/api';
import '../App.css';

// Helper function to format time
function fmtTime(timeString) {
  if (!timeString) return "—";
  
  // Check if the timeString is already in HH:mm format
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${hour12}:${minutes} ${ampm}`;
  }
  
  // If it's a full ISO date string, parse it normally
  return new Date(timeString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Helper function to convert data to CSV
function toCSV(data) {
  if (!data || !data.length) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(","));
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      return `"${val === null || val === undefined ? '' : val}"`;
    });
    csvRows.push(values.join(","));
  }
  return csvRows.join("\n");
}

// Helper function to download data
function download(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Helper function to determine if a time is before 7 AM
function isBeforeCutoffTime(timeString) {
  if (!timeString) return false;
  
  let hour, minute;
  
  // Check if the timeString is already in HH:mm format
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    [hour, minute] = timeString.split(':').map(Number);
  } else {
    // If it's a full ISO date string, parse it
    const date = new Date(timeString);
    hour = date.getHours();
    minute = date.getMinutes();
  }
  
  // Return true if time is before 7 AM (07:00)
  return hour < 7;
}

// Helper function to determine if a record belongs to the current shift
function isCurrentShift(record, currentDate) {
  if (!record || !record.work_date) return false;
  
  // Get the current time to determine if we're after midnight but before 7 AM
  // or after 2 PM (start of shift)
  const now = new Date();
  const currentHour = now.getHours();
  const isEarlyMorning = currentHour < 7;
  const isAfternoonShift = currentHour >= 14; // 2 PM or later
  
  const recordDate = new Date(record.work_date);
  const today = new Date(currentDate);
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Format dates to YYYY-MM-DD for comparison
  const recordDateStr = recordDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  // If it's early morning (before 7 AM), consider yesterday's records as part of today's shift
  if (isEarlyMorning) {
    // Show yesterday's records and today's early morning records (before 7 AM)
    if (recordDateStr === yesterdayStr || 
        (recordDateStr === todayStr && record.check_in && isBeforeCutoffTime(record.check_in))) {
      return true;
    }
  } else if (isAfternoonShift) {
    // After 2 PM, show today's records for the current shift
    // This includes all records from today and any early morning records from tomorrow (before 7 AM)
    if (recordDateStr === todayStr || 
        (recordDateStr === tomorrowStr && record.check_in && isBeforeCutoffTime(record.check_in))) {
      return true;
    }
  } else {
    // Between 7 AM and 2 PM, we're in the previous shift's morning hours
    // Show records from yesterday after 2 PM and today's records before 2 PM
    if (recordDateStr === todayStr && (!record.check_in || currentHour < 14)) {
      return true;
    }
    
    // Previous day records but before 7 AM (part of previous day's shift)
    if (recordDateStr === yesterdayStr && record.check_out && isBeforeCutoffTime(record.check_out)) {
      return true;
    }
  }
  
  return false;
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(() => {
    // Force refresh current date to ensure it's accurate
    // Create a new Date object to get the current date and time
    const now = new Date();
    // Convert to ISO string and extract just the date portion (YYYY-MM-DD)
    return now.toISOString().split('T')[0];
  });
  
  const [query, setQuery] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [records, setRecords] = useState([]);
  const [events, setEvents] = useState([]);
  const [presentEmployees, setPresentEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalData, setModalData] = useState(null);

  // Load data from API
  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Get the current time to determine if we're after midnight but before 7 AM
      // or after 2 PM (start of shift)
      const now = new Date();
      const currentHour = now.getHours();
      const isEarlyMorning = currentHour < 7;
      const isAfternoonShift = currentHour >= 14; // 2 PM or later
      
      // Get yesterday and today for shift consideration
      const today = new Date(currentDate);
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Determine date range based on current time
      let startDate, endDate;
      
      // Get tomorrow for afternoon shift consideration
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (isEarlyMorning) {
        // If it's early morning (before 7 AM), we're looking at yesterday's shift that extends to today
        startDate = yesterday.toISOString().split('T')[0]; // Yesterday
        endDate = today.toISOString().split('T')[0]; // Today
      } else if (isAfternoonShift) {
        // If it's afternoon shift (after 2 PM), we're starting today's shift that extends to tomorrow morning
        startDate = today.toISOString().split('T')[0]; // Today
        endDate = tomorrow.toISOString().split('T')[0]; // Tomorrow (to include early morning records)
      } else {
        // Between 7 AM and 2 PM, we're in the previous shift's morning hours
        startDate = yesterday.toISOString().split('T')[0]; // Yesterday for shift consideration
        endDate = today.toISOString().split('T')[0]; // Today
      }
      
      const [attendance, events, presentEmployeesList] = await Promise.all([
        getJSON(`/api/attendance?start=${startDate}&end=${endDate}`),
        getJSON(`/api/events?start=${startDate}&end=${endDate}`),
        getJSON('/api/present-employees'),
      ]);
      setRecords(attendance);
      setEvents(events);
      setPresentEmployees(presentEmployeesList);
    } catch (err) {
      console.error("API Error:", err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  }

  // Load data when current date changes
  useEffect(() => {
    load();
  }, [currentDate]);

  // Calculate missing employees for today
  const missingEmployees = useMemo(() => {
    if (!records.length) return [];
    
    // Find unique employee numbers in records
    const employees = [...new Set(records.map(r => r.employee_no))];
    
    // Find employees with no current shift records
    const missing = [];
    for (const emp of employees) {
      if (!records.some(r => isCurrentShift(r, currentDate) && r.employee_no === emp)) {
        missing.push({ employee_no: emp });
      }
    }
    
    return missing;
  }, [currentDate, records]);

  // Filter records based on search query, employee filter, and current shift
  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter(r => {
      const matchesQuery = !query || 
        (r.person_name && r.person_name.toLowerCase().includes(query.toLowerCase())) ||
        (r.employee_no && r.employee_no.toString().includes(query)) ||
        (r.card_no && r.card_no.toString().includes(query));
      
      const matchesEmployee = !employeeFilter || r.employee_no === employeeFilter;
      
      // Only show records for current shift (today or yesterday before 7 AM)
      const isInCurrentShift = isCurrentShift(r, currentDate);
      
      return matchesQuery && matchesEmployee && isInCurrentShift;
    });
  }, [records, query, employeeFilter, currentDate]);

  // Show duplicate events for a specific date and employee
  function showDuplicates(date, empNo) {
    const filtered = events.filter(e => 
      e.work_date === date && e.employee_no === empNo
    );
    setModalData(filtered);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-4 py-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Today's Attendance</h1>
            <p className="text-gray-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {new Date().getHours() < 7 
                ? ' (Showing overnight shift from yesterday)' 
                : new Date().getHours() >= 14 
                  ? ' (Showing afternoon shift starting at 2 PM)'
                  : ' (Showing morning hours from previous shift)'}
            </p>
          </div>
          <div className="bg-white p-2 rounded-xl shadow-sm flex items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold mr-3">
              AD
            </div>
            <div>
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap gap-4 mb-6 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Date</label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="date"
                  value={currentDate}
                  onChange={e => setCurrentDate(e.target.value)}
                  className="pl-10 w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                />
                <button 
                  onClick={() => {
                    const now = new Date();
                    setCurrentDate(now.toISOString().split('T')[0]);
                  }}
                  className="ml-2 p-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  title="Set to today's date"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee Filter</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <select
                  value={employeeFilter}
                  onChange={e => setEmployeeFilter(e.target.value)}
                  className="pl-10 w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                >
                  <option value="">All Employees</option>
                  {[...new Set(records.map(r => r.employee_no))].map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Records</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, employee #, or card #"
                  className="pl-10 w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                />
              </div>
            </div>
            
            <button
              onClick={() => download(`attendance-${currentDate}.csv`, toCSV(filtered))}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-white shadow-md hover:shadow-lg transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!filtered.length}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Export CSV
            </button>
          </div>
          
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          )}
          
          {/* Present Employees List */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-start mb-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 flex items-center">
                  Present Employees
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {presentEmployees.length}
                  </span>
                  <button 
                    onClick={load} 
                    className="ml-2 p-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    title="Refresh employee list"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </h3>
              </div>
            </div>
            
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {presentEmployees.map(employee => (
                <div key={employee.employee_no} className="bg-white p-3 rounded-lg shadow-sm flex items-center">
                  <div className="h-8 w-8 flex-shrink-0 mr-3 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {employee.person_name ? employee.person_name.charAt(0).toUpperCase() : "—"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{employee.person_name || "Unknown"}</p>
                    <p className="text-xs text-gray-500">#{employee.employee_no}</p>
                  </div>
                </div>
              ))}
              
              {presentEmployees.length === 0 && !loading && (
                <div className="col-span-full text-center py-4 text-gray-500">
                  No employees found in current shift
                </div>
              )}
              
              {loading && (
                <div className="col-span-full text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading employees...</span>
                </div>
              )}
            </div>
          </div>
          
          {missingEmployees.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Missing Employees Detected
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    There are {missingEmployees.length} employees missing from today's attendance records.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {!loading && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Attendance Records</h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {filtered.length} records found
                </span>
              </div>
              
              <div className="overflow-x-auto rounded-xl shadow-inner">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100 text-left text-sm text-gray-600 uppercase font-medium">
                      <th className="p-4">Date</th>
                      <th className="p-4">Employee #</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Card #</th>
                      <th className="p-4">Check In</th>
                      <th className="p-4">Check Out</th>
                      <th className="p-4">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((r, i) => (
                      <tr
                        key={`${r.work_date}-${r.employee_no}`}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => showDuplicates(r.work_date, r.employee_no)}
                      >
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                            <div className="text-sm font-medium text-gray-900">{r.work_date}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {r.employee_no}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 mr-3 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              {r.person_name ? r.person_name.charAt(0).toUpperCase() : "—"}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{r.person_name ?? "—"}</div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-500">{r.card_no ?? "—"}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {fmtTime(r.check_in)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {fmtTime(r.check_out)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                            {r.total_minutes != null ? (r.total_minutes / 60).toFixed(2) : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
                          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {modalData && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Event Details for {modalData[0]?.employee_no} on {modalData[0]?.work_date}</h2>
                <button
                  onClick={() => setModalData(null)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee #</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card #</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Time</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Door</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reader</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device IP</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modalData.map((e, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.work_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{e.employee_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.person_name ?? "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.card_no ?? "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtTime(e.event_time)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {e.event_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.door_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.reader_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.device_ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setModalData(null)}
                  className="rounded-xl bg-gray-600 px-4 py-2 text-white shadow-sm hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 mb-6 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}