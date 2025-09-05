import { useState, useEffect, useMemo } from 'react';
import { getJSON } from '../lib/api';

// Helper function to format time
function fmtTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString('en-US', {
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

export default function Events() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [query, setQuery] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data from API
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const events = await getJSON(`/api/events?start=${startDate}&end=${endDate}`);
      setEvents(events);
    } catch (err) {
      console.error("API Error:", err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  }

  // Load data when dates change
  useEffect(() => {
    load();
  }, [startDate, endDate]);

  // Filter events based on search query and employee filter
  const filtered = useMemo(() => {
    if (!events) return [];
    return events.filter(e => {
      const matchesQuery = !query || 
        (e.person_name && e.person_name.toLowerCase().includes(query.toLowerCase())) ||
        (e.employee_no && e.employee_no.toString().includes(query)) ||
        (e.card_no && e.card_no.toString().includes(query)) ||
        (e.event_type && e.event_type.toLowerCase().includes(query.toLowerCase())) ||
        (e.device_ip && e.device_ip.includes(query));
      
      const matchesEmployee = !employeeFilter || e.employee_no === employeeFilter;
      
      return matchesQuery && matchesEmployee;
    });
  }, [events, query, employeeFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-4">
        <h1 className="text-2xl font-bold mb-6">Events Log</h1>
        
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex flex-wrap gap-4 mb-6 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee Filter</label>
              <select
                value={employeeFilter}
                onChange={e => setEmployeeFilter(e.target.value)}
                className="rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">All Employees</option>
                {[...new Set(events.map(e => e.employee_no))].map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, employee #, card #, event type, or device"
                className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            
            <button
              onClick={() => download(`events-${startDate}-to-${endDate}.csv`, toCSV(filtered))}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-white shadow hover:opacity-90"
              disabled={!filtered.length}
            >
              Export CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="bg-gray-100 text-left text-sm">
                  <th className="p-3 w-36">Date</th>
                  <th className="p-3 w-28">Employee #</th>
                  <th className="p-3 w-36">Name</th>
                  <th className="p-3 w-28">Card #</th>
                  <th className="p-3 w-36">Event Time (PKT)</th>
                  <th className="p-3 w-28">Event Type</th>
                  <th className="p-3 w-28">Door</th>
                  <th className="p-3 w-28">Reader</th>
                  <th className="p-3 w-28">Device IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={i} className="border-t text-sm hover:bg-gray-50">
                    <td className="p-3">{e.work_date}</td>
                    <td className="p-3">{e.employee_no}</td>
                    <td className="p-3 font-medium">{e.person_name ?? "—"}</td>
                    <td className="p-3">{e.card_no ?? "—"}</td>
                    <td className="p-3">{fmtTime(e.event_time)}</td>
                    <td className="p-3">{e.event_type}</td>
                    <td className="p-3">{e.door_no}</td>
                    <td className="p-3">{e.reader_no}</td>
                    <td className="p-3">{e.device_ip}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      No events for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-amber-700">
            Error loading from API: <code>{error}</code>
          </p>
        )}
      </div>
    </div>
  );
}