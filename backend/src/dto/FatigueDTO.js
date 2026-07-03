// Shapes a fatigue assessment for API responses.
function toAssessmentResponse(assessment) {
  const employee = assessment.employeeId && assessment.employeeId.name ? assessment.employeeId : null;
  return {
    id: assessment._id,
    shiftId: assessment.shiftId,
    employeeId: employee ? employee._id : assessment.employeeId,
    employeeName: employee ? employee.name : undefined,
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    flags: assessment.flags,
    aiExplanation: assessment.aiExplanation,
    suggestedAlternative: assessment.suggestedAlternative,
    generatedAt: assessment.generatedAt,
  };
}

module.exports = { toAssessmentResponse };
