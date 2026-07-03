// Shapes an availability document for API responses.
function toAvailabilityResponse(availability) {
  return {
    id: availability._id,
    employeeId: availability.employeeId,
    dayOfWeek: availability.dayOfWeek,
    availableFrom: availability.availableFrom,
    availableTo: availability.availableTo,
  };
}

module.exports = { toAvailabilityResponse };
