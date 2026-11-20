export function isNewStaffTurn(message, prev) {
  if (message.sender !== 'admin' || !message.staffName) return false;
  return !(prev?.sender === 'admin' && prev.staffName === message.staffName);
}
