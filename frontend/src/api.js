export function authFetch(url, options = {}, onUnauthorized) {
  const token = localStorage.getItem('token')

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  }

  return fetch(url, { ...options, headers }).then(res => {
    if (res.status === 401) {
      if (onUnauthorized) onUnauthorized('Session expired. Please log in again.')
      return null
    }
    return res
  })
}
