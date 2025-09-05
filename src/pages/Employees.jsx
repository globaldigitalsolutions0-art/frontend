import { useState, useEffect } from 'react';
import { getJSON } from '../lib/api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newName, setNewName] = useState('');
  const [newShift, setNewShift] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [newShiftStartTime, setNewShiftStartTime] = useState('');
  const [newShiftEndTime, setNewShiftEndTime] = useState('');
  const [newShiftStartPeriod, setNewShiftStartPeriod] = useState('AM');
  const [newShiftEndPeriod, setNewShiftEndPeriod] = useState('PM');
  const [addingShift, setAddingShift] = useState(false);
  const [deletingShiftId, setDeletingShiftId] = useState(null);

  // Load employees and shifts data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesData, shiftsData] = await Promise.all([
        getJSON('/api/employees'),
        getJSON('/api/shifts')
      ]);
      console.log('Fetched employees:', employeesData); // Debug log
      console.log('Fetched shifts:', shiftsData); // Debug log
      setEmployees(employeesData);
      setShifts(shiftsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format time for display
  const formatTime = (time, period) => {
    if (!time) return '';
    return `${time} ${period}`;
  };

  // Format shift for display in dropdown and table
  const formatShiftLabel = (shift) => {
    return `${shift.start_time} ${shift.start_period} - ${shift.end_time} ${shift.end_period}`;
  };

  // Handle saving employee details
  async function handleSave(employee_no) {
    if (!newName.trim()) {
      alert('Please enter a name');
      return;
    }
    if (!newShift) {
      alert('Please select a shift time');
      return;
    }

    setSavingId(employee_no);
    try {
      const response = await fetch(`/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_no,
          name: newName.trim(),
          shift_id: newShift,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const updatedEmployee = await response.json();
      
      // Update the employees list
      setEmployees(employees.map(emp => 
        emp.employee_no === employee_no ? updatedEmployee : emp
      ));
      
      // Reset editing state
      setEditingEmployee(null);
      setNewName('');
      setNewShift('');
    } catch (err) {
      console.error('Error saving employee:', err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  }

  // Handle deleting employee details
  async function handleDelete(employee_no) {
    if (!confirm("Are you sure you want to delete this employee's name and shift?")) {
      return;
    }

    setDeletingId(employee_no);
    try {
      const response = await fetch(`/api/employees/${employee_no}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      // Update the employees list
      setEmployees(employees.map(emp => 
        emp.employee_no === employee_no ? { ...emp, name: null, shift_id: null, has_details: false } : emp
      ));
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  // Start editing an employee
  function startEditing(employee) {
    setEditingEmployee(employee.employee_no);
    setNewName(employee.name || '');
    setNewShift(employee.shift_id || '');
  }

  // Handle adding new shift
  async function handleAddShift() {
    if (!newShiftStartTime || !newShiftEndTime) {
      alert('Please enter both start and end times for the shift');
      return;
    }

    setAddingShift(true);
    try {
      const response = await fetch(`/api/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_time: newShiftStartTime,
          start_period: newShiftStartPeriod,
          end_time: newShiftEndTime,
          end_period: newShiftEndPeriod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const newShiftData = await response.json();
      
      // Update the shifts list
      setShifts([...shifts, newShiftData]);
      
      // Refresh employees to reflect any changes
      await loadData();
      
      // Reset inputs
      setNewShiftStartTime('');
      setNewShiftEndTime('');
      setNewShiftStartPeriod('AM');
      setNewShiftEndPeriod('PM');
    } catch (err) {
      console.error('Error adding shift:', err);
      alert(`Failed to add shift: ${err.message}`);
    } finally {
      setAddingShift(false);
    }
  }

  // Handle deleting shift
  async function handleDeleteShift(id) {
    if (!confirm('Are you sure you want to delete this shift?')) {
      return;
    }

    setDeletingShiftId(id);
    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      // Update the shifts list
      setShifts(shifts.filter(shift => shift._id !== id));
      
      // Refresh employees to reflect updated shift assignments
      await loadData();
    } catch (err) {
      console.error('Error deleting shift:', err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingShiftId(null);
    }
  }

  return (
    <div className="w-full px-4 py-8 max-w-none">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Employee Management</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">Loading data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6">
          Error loading data: {error}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Manage Shifts Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Manage Shifts</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Add New Shift */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      value={newShiftStartTime}
                      onChange={(e) => setNewShiftStartTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      value={newShiftStartPeriod}
                      onChange={(e) => setNewShiftStartPeriod(e.target.value)}
                      className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      value={newShiftEndTime}
                      onChange={(e) => setNewShiftEndTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      value={newShiftEndPeriod}
                      onChange={(e) => setNewShiftEndPeriod(e.target.value)}
                      className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAddShift}
                  disabled={addingShift}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {addingShift ? 'Adding...' : 'Add New Shift'}
                </button>
              </div>

              {/* List of Shifts */}
              {shifts.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">No shifts added yet.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Time</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {shifts.map(shift => (
                      <tr key={shift._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatShiftLabel(shift)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDeleteShift(shift._id)}
                            disabled={deletingShiftId === shift._id}
                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {deletingShiftId === shift._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="mb-6 bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-800">
              {employees.length} employees found. 
              {employees.filter(e => e.has_details).length} have both names and shifts assigned.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Employees without complete details */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Employees Without Complete Details</h2>
              </div>
              <div className="p-6">
                {employees.filter(e => !e.has_details).length === 0 ? (
                  <p className="text-gray-500 italic text-center py-4">All employees have complete details.</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {employees
                      .filter(e => !e.has_details)
                      .map(employee => (
                        <li key={employee.employee_no} className="py-4">
                          <div className="flex flex-col space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-700">Employee #: {employee.employee_no}</span>
                              {employee.name && <span className="text-sm text-gray-500">Name: {employee.name} (Shift missing)</span>}
                              {employee.shift_id && <span className="text-sm text-gray-500">Shift: {shifts.find(s => s._id === employee.shift_id)?.start_time} {shifts.find(s => s._id === employee.shift_id)?.start_period} - {shifts.find(s => s._id === employee.shift_id)?.end_time} {shifts.find(s => s._id === employee.shift_id)?.end_period} (Name missing)</span>}
                            </div>
                            
                            {editingEmployee === employee.employee_no ? (
                              <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  placeholder="Enter employee name"
                                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  autoFocus
                                />
                                <select
                                  value={newShift}
                                  onChange={(e) => setNewShift(e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Select shift time</option>
                                  {shifts.map(shift => (
                                    <option key={shift._id} value={shift._id}>
                                      {formatShiftLabel(shift)}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex space-x-3">
                                  <button
                                    onClick={() => handleSave(employee.employee_no)}
                                    disabled={savingId === employee.employee_no}
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                                  >
                                    {savingId === employee.employee_no ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingEmployee(null)}
                                    className="flex-1 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditing(employee)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors w-fit"
                              >
                                Add/Edit Details
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Employees with complete details */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Employees With Complete Details</h2>
              </div>
              <div className="overflow-x-auto">
                {employees.filter(e => e.has_details).length === 0 ? (
                  <p className="text-gray-500 italic text-center py-8">No employees have complete details yet.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Time</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {employees
                        .filter(e => e.has_details)
                        .map(employee => (
                          <tr key={employee.employee_no} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.employee_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {editingEmployee === employee.employee_no ? (
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  autoFocus
                                />
                              ) : (
                                employee.name
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {editingEmployee === employee.employee_no ? (
                                <select
                                  value={newShift}
                                  onChange={(e) => setNewShift(e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Select shift time</option>
                                  {shifts.map(shift => (
                                    <option key={shift._id} value={shift._id}>
                                      {formatShiftLabel(shift)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                shifts.find(s => s._id === employee.shift_id)
                                  ? formatShiftLabel(shifts.find(s => s._id === employee.shift_id))
                                  : 'Unknown Shift'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {editingEmployee === employee.employee_no ? (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => handleSave(employee.employee_no)}
                                    disabled={savingId === employee.employee_no}
                                    className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                                  >
                                    {savingId === employee.employee_no ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingEmployee(null)}
                                    className="border border-gray-300 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => startEditing(employee)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(employee.employee_no)}
                                    disabled={deletingId === employee.employee_no}
                                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                                  >
                                    {deletingId === employee.employee_no ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}