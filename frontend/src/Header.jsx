import { useState } from 'react'
import ProfileCard from "./ProfileCard"
import RepoCard from "./RepoCard"

function Header() {
  const [username, setUsername] = useState('')
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [repos, setRepos] = useState([])

  const handleSearch = () => {
    setLoading(true)
    setError(null)
    fetch(`http://localhost:5000/api/github/${username}`)
      .then(res => {
        if (!res.ok) {
          setError("User not found")
          setUserData(null)
          setLoading(false)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) {
          console.log(data)
          setUserData(data.profile)
          setRepos(data.repos)
          setLoading(false)
        }
      })
  }

  const sortedRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)

  return (
    <>
      <h1>Repo2Reputation 🚀</h1>
      <input
        placeholder="Enter GitHub username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px" }}
        onFocus={(e) => { e.target.style.borderColor = "#4f46e5"; e.target.style.outline = "none" }}
        onBlur={(e) => e.target.style.borderColor = "#ccc"}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch()
          }
        }}
      />
      <button
        onClick={handleSearch}
        disabled={loading}
        style={{ padding: "10px 20px", marginTop: "10px", borderRadius: "6px", border: "none", backgroundColor: "#4f46e5", color: "white", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
        onMouseEnter={(e) => e.target.style.backgroundColor = "#4338ca"}
        onMouseLeave={(e) => e.target.style.backgroundColor = "#4f46e5"}
      >
        {loading ? "Searching..." : "Search"}
      </button>
      {loading && (
        <div style={{ marginTop: "20px" }}>
          <div style={{
            width: "30px",
            height: "30px",
            border: "4px solid #ccc",
            borderTop: "4px solid #4f46e5",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }} />
        </div>
      )}
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
      {userData && <ProfileCard userData={userData} />}
      {repos.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Repositories</h3>
          {sortedRepos.map((repo, index) => <RepoCard key={repo.id} repo={repo} isTop={index === 0} />)}
        </div>
      )}
    </>
  )
}

export default Header
