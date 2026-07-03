// Shapes a shift document for API responses.
// If employeeId was populated, include the employee's name for convenience.
function toShiftResponse(shift) {
  const employee = shift.employeeId && shift.employeeId.name ? shift.employeeId : null;
  return {
    id: shift._id,
    employeeId: employee ? employee._id : shift.employeeId,
    employeeName: employee ? employee.name : undefined,
    startTime: shift.startTime,
    endTime: shift.endTime,
    shiftType: shift.shiftType,
    status: shift.status,
    createdAt: shift.createdAt,
  };
}

module.exports = { toShiftResponse };
