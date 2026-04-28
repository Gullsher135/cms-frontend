export const API_BASE = 'https://cms-backend-bjd0.onrender.com/api'

export const ROLE_ROUTES = {
  admin: ['/', '/admin', '/reception', '/doctor', '/lab', '/pharmacy', '/records'],
  receptionist: ['/', '/reception', '/records'],
  counter: ['/', '/reception', '/records'],
  doctor: ['/', '/doctor', '/records'],
  lab: ['/', '/lab', '/records'],
  pharmacy: ['/', '/pharmacy', '/records'],
}

export const CLINIC_NAME = "Nexone Clinic";
export const CLINIC_ADDRESS = "123 Healthcare Blvd, Medical City"; // optional
export const CLINIC_PHONE = "+92 300 1234567"; // optional
export const SOFTWARE_BRANDING = "Powered by Nexone Clinic CMS";
