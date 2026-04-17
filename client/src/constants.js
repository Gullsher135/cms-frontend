export const API_BASE = 'http://localhost:5000/api'

export const ROLE_ROUTES = {
  admin: ['/', '/admin', '/reception', '/doctor', '/lab', '/pharmacy', '/records'],
  receptionist: ['/', '/reception', '/records'],
  counter: ['/', '/reception', '/records'],
  doctor: ['/', '/doctor', '/records'],
  lab: ['/', '/lab', '/records'],
  pharmacy: ['/', '/pharmacy', '/records'],
}
