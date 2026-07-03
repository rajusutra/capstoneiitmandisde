// Shapes an employee document for API responses.
function toEmployeeResponse(employee) {
  return {
    id: employee._id,
    name: employee.name,
    employeeCode: employee.employeeCode,
    department: employee.department,
    maxWeeklyHours: employee.maxWeeklyHours,
    contactInfo: employee.contactInfo,
    createdAt: employee.createdAt,
  };
}

module.exports = { toEmployeeResponse };
