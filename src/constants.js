export const API_BASE = 'https://cms-backend-bjd0.onrender.com/api'

export const ROLE_ROUTES = {
  admin: ['/', '/admin', '/reception', '/doctor', '/lab', '/pharmacy', '/records'],
  receptionist: ['/', '/reception', '/records'],
  counter: ['/', '/reception', '/records'],
  doctor: ['/', '/doctor', '/records'],
  lab: ['/', '/lab', '/records'],
  pharmacy: ['/', '/pharmacy', '/records'],
}
