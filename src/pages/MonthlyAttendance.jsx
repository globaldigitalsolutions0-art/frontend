import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const MonthlyAttendance = () => {
  const [data, setData] = useState({ dates: [], employees: [], attendance: {} });
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3001/api/monthly-attendance?month=${month}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [month]);

  const handleMonthChange = (e) => {
    setMonth(e.target.value);
  };

  const downloadExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Employee', 'Total Days', 'Late Days', 'On Time Days', 'Total Hours', 'Saturday Days', 'SUNDAY Days', ...data.dates.map(date => {
          const isSunday = dayjs(date).day() === 0;
          const isSaturday = dayjs(date).day() === 6;
          if (isSunday) return `🔴 ${date} (${dayjs(date).format('ddd')})`;
          if (isSaturday) return `🟣 ${date} (${dayjs(date).format('ddd')})`;
          return `${date} (${dayjs(date).format('ddd')})`;
        })],
        ...data.employees.map(emp => {
          // Calculate stats for Excel
          const totalMinutes = data.dates.reduce((sum, date) => {
            const record = data.attendance[date]?.[emp.employee_no];
            return sum + (record?.total_minutes || 0);
          }, 0);
          const totalHours = Math.floor(totalMinutes / 60);
          const remainingMinutes = totalMinutes % 60;
          const totalHoursDisplay = totalMinutes > 0 ? `${totalHours}h ${remainingMinutes}m` : 'N/A';
          
          return [
            `${emp.person_name || 'Unknown'} (${emp.employee_no})`,
            emp.total_days || 0,
            emp.late_count || 0,
            emp.early_count || 0,
            totalHoursDisplay,
            emp.saturday_count || 0,
            emp.sunday_count || 0,
            ...data.dates.map(date => {
              const record = data.attendance[date]?.[emp.employee_no] || {};
              const dayOfWeek = dayjs(date).day();
              const isSunday = dayOfWeek === 0;
              const isSaturday = dayOfWeek === 6;
              
              if (record.check_in || record.check_out) {
                const parts = [];
                if (record.check_in) parts.push(record.check_in);
                if (record.check_out) parts.push(record.check_out);
                if (record.total_minutes) {
                  const hours = Math.floor(record.total_minutes / 60);
                  const mins = record.total_minutes % 60;
                  parts.push(`${hours}h ${mins}m`);
                }
                if (record.late_status) parts.push(record.late_status);
                return parts.join('\n');
              }
              
              if (isSunday) return '🔴 SUNDAY - RED DAY';
              if (isSaturday) return '🟣 Saturday';
              return '';
            })
          ];
        })
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `${month}_attendance.xlsx`, { bookType: 'xlsx', type: 'binary' });
    } catch (err) {
      console.error('Error generating Excel file:', err);
      alert('Failed to generate Excel file. Please try again.');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md max-w-md mx-auto mt-4 text-center text-sm">
      Error: {error}
    </div>
  );

  return (
    <div className="w-full px-4 py-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Monthly Attendance</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Select Month:</span>
            <input
              type="month"
              value={month}
              onChange={handleMonthChange}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
            />
          </div>
          <button
            onClick={downloadExcel}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full bg-white text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 px-3 py-2 border-b border-r border-gray-200 bg-gray-50 text-left font-semibold text-gray-700 min-w-36">
                Employee
              </th>
              <th className="px-2 py-2 border-b border-r border-gray-200 bg-gray-50 text-center font-semibold text-gray-700 min-w-16">
                <div className="flex flex-col">
                  <span>Total</span>
                  <span className="text-xs text-gray-500">Days</span>
                </div>
              </th>
              <th className="px-2 py-2 border-b border-r border-gray-200 bg-gray-50 text-center font-semibold text-red-600 min-w-16">
                <div className="flex flex-col">
                  <span>Late</span>
                  <span className="text-xs text-gray-400">Days</span>
                </div>
              </th>
              <th className="px-2 py-2 border-b border-r border-gray-200 bg-gray-50 text-center font-semibold text-green-600 min-w-16">
                <div className="flex flex-col">
                  <span>On Time</span>
                  <span className="text-xs text-gray-400">Days</span>
                </div>
              </th>
              <th className="px-2 py-2 border-b border-r border-gray-200 bg-gray-50 text-center font-semibold text-blue-600 min-w-20">
                <div className="flex flex-col">
                  <span>Total</span>
                  <span className="text-xs text-gray-400">Hours</span>
                </div>
              </th>
              <th className="px-2 py-2 border-b border-r border-gray-200 bg-gray-50 text-center font-semibold text-purple-600 min-w-16">
                <div className="flex flex-col">
                  <span>Saturday</span>
                  <span className="text-xs text-gray-400">Days</span>
                </div>
              </th>
              <th className="px-2 py-2 border-b border-r border-gray-200 bg-red-50 text-center font-semibold text-red-700 min-w-16">
                <div className="flex flex-col">
                  <span className="font-bold">SUNDAY</span>
                  <span className="text-xs text-red-500">Days</span>
                </div>
              </th>
              {data.dates.map((date) => {
                const isSunday = dayjs(date).day() === 0;
                const isSaturday = dayjs(date).day() === 6;
                
                return (
                  <th
                    key={date}
                    className={`px-3 py-2 border-b border-gray-200 text-center font-semibold min-w-24 ${
                      isSunday 
                        ? 'bg-red-100 text-red-700' 
                        : isSaturday 
                        ? 'text-purple-600' 
                        : 'text-gray-700'
                    }`}
                    style={isSaturday ? { backgroundColor: '#FAF5FF' } : {}}
                  >
                    <div className="flex flex-col">
                      <span className={isSunday ? 'font-bold' : ''}>
                        {isSunday ? '🔴 ' : ''}{date}
                      </span>
                      <span className={`text-xs ${
                        isSunday 
                          ? 'text-red-600 font-bold' 
                          : isSaturday 
                          ? 'text-purple-500' 
                          : 'text-gray-500'
                      }`}>
                        ({dayjs(date).format('ddd')})
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.employees.map((emp) => {
              // Calculate summary statistics for this employee
              const employeeStats = {
                totalDays: emp.total_days || 0,
                lateDays: emp.late_count || 0,
                onTimeDays: emp.early_count || 0,
                saturdayDays: emp.saturday_count || 0,
                sundayDays: emp.sunday_count || 0,
                totalMinutes: 0
              };
              
              // Calculate total working hours from daily records
              data.dates.forEach(date => {
                const record = data.attendance[date]?.[emp.employee_no];
                if (record?.total_minutes) {
                  employeeStats.totalMinutes += record.total_minutes;
                }
              });
              
              const totalHours = Math.floor(employeeStats.totalMinutes / 60);
              const remainingMinutes = employeeStats.totalMinutes % 60;
              const totalHoursDisplay = employeeStats.totalMinutes > 0 
                ? `${totalHours}h ${remainingMinutes}m` 
                : emp.total_days > 0 ? 'N/A' : 'None';
              
              return (
                <tr key={emp.employee_no}>
                  <td className="sticky left-0 z-5 px-3 py-2 whitespace-nowrap font-medium text-gray-900 bg-white border-r border-gray-200">
                    <div className="flex flex-col">
                      <span>{emp.person_name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500">({emp.employee_no})</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">
                    <span className="font-medium text-gray-700">{employeeStats.totalDays}</span>
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">
                    <span className={`font-medium ${employeeStats.lateDays > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {employeeStats.lateDays}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">
                    <span className={`font-medium ${employeeStats.onTimeDays > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {employeeStats.onTimeDays}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">
                    <span className={`font-medium text-xs ${employeeStats.totalMinutes > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {totalHoursDisplay}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200">
                    <span className={`font-medium ${employeeStats.saturdayDays > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                      {employeeStats.saturdayDays}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center border-r border-gray-200 bg-red-50">
                    <span className={`font-bold ${employeeStats.sundayDays > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                      {employeeStats.sundayDays}
                    </span>
                  </td>
                  {data.dates.map((date) => {
                    const record = data.attendance[date]?.[emp.employee_no] || {};
                    const isSunday = dayjs(date).day() === 0;
                    const isSaturday = dayjs(date).day() === 6;
                    const hasOnlyOutTime = !record.check_in && record.check_out;
                    let cellClass = "px-3 py-2 whitespace-nowrap text-center border-r border-gray-200";
                    
                    if (isSunday) {
                      cellClass += " bg-red-100"; // Full red background for Sunday
                    } else if (isSaturday) {
                      cellClass += " " // Custom purple background for Saturday
                      // Add inline style for exact color
                    } else if (hasOnlyOutTime) {
                      cellClass += " bg-red-50";
                    }
                    
                    return (
                      <td 
                        key={`${date}-${emp.employee_no}`} 
                        className={cellClass}
                        style={isSaturday ? { backgroundColor: '#FAF5FF' } : {}}
                      >
                        {record.check_in || record.check_out ? (
                          <div className="flex flex-col gap-0.5 text-xs">
                            {record.check_in && (
                              <span className={hasOnlyOutTime ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                In: {record.check_in}
                              </span>
                            )}
                            {record.check_out && (
                              <span className={hasOnlyOutTime ? "text-red-600 font-medium" : "text-blue-600 font-medium"}>
                                Out: {record.check_out}
                              </span>
                            )}
                            {record.total_minutes && (
                              <span className="text-gray-500">
                                {Math.floor(record.total_minutes / 60)}h {record.total_minutes % 60}m
                              </span>
                            )}
                          </div>
                        ) : isSunday ? (
                          <span className="text-red-700 font-bold text-xs">🔴 SUNDAY</span>
                        ) : isSaturday ? (
                          <span className="text-purple-600 font-medium text-xs">Saturday</span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyAttendance;