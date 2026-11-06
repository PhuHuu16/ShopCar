// Values stored in the database are codes; the websites translate them for display.
const FUELS = ['gasoline', 'diesel', 'hybrid', 'electric'];
const TRANSMISSIONS = ['automatic', 'manual'];
const BODY_TYPES = ['sedan', 'suv', 'crossover', 'hatchback', 'mpv', 'pickup', 'coupe'];
const CONDITIONS = ['new', 'used'];
const ORDER_STATUSES = ['PENDING', 'APPROVED', 'CANCELED'];
const CUSTOMER_STATUSES = ['active', 'blocked'];
// showroom = pay when picking up the car; vnpay = online deposit first
const PAYMENT_METHODS = ['showroom', 'vnpay'];
// none = nothing to pay online; pending = waiting for the customer to pay
const PAYMENT_STATUSES = ['none', 'pending', 'paid', 'failed'];

module.exports = {
  FUELS, TRANSMISSIONS, BODY_TYPES, CONDITIONS, ORDER_STATUSES, CUSTOMER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES
};
