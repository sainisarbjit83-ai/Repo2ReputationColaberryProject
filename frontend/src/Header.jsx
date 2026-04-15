import { useState } from 'react'

function Header() {
  const [username, setUsername] = useState('')
  const [userData, setUserData] = useState(null)

  const handleSearch = () => {
    fetch(`https://api.github.com/users/${username}`)
      .then(res => res.json())
      .then(data => setUserData(data))
  }

  return (
    <>
      <h1>Repo2Reputation 🚀</h1>
      <input
        placeholder="Enter GitHub username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={handleSearch}>
        Search
      </button>
      {userData && <p>{userData.login}</p>}
    </>
  )
}

export default Header
