import { ROLE_ROUTES } from '../constants'

function Gate({ role, route, children }) {
  if (!ROLE_ROUTES[role]?.includes(route)) {
    return (
      <section className="form-panel">
        <h2>Access Denied</h2>
        <p>Your role does not have permission for this screen.</p>
      </section>
    )
  }
  return children
}

export default Gate
