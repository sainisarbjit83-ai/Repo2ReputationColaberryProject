function ProfileCard({ userData }) {
  return (
    <div style={{
      border: "1px solid #ddd",
      borderRadius: "10px",
      padding: "20px",
      marginTop: "20px",
      width: "300px",
      textAlign: "center"
    }}>
      <img src={userData.avatar_url} width="100" />
      <h3>{userData.login}</h3>
      <p>{userData.bio || "No bio available"}</p>
      <p>Followers: {userData.followers}</p>
    </div>
  )
}

export default ProfileCard
