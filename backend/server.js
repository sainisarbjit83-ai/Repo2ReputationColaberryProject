require('dotenv').config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const authRouter = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");


const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});
app.get("/api/github/:username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;

    const userResponse = await axios.get(
      `https://api.github.com/users/${username}`
    );

    const repoResponse = await axios.get(
      `https://api.github.com/users/${username}/repos`
    );

    const { name, avatar_url, followers, public_repos } = userResponse.data
    const profile = { name, avatar: avatar_url, followers, public_repos }

    const repos = [...repoResponse.data]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map(({ name, stargazers_count, html_url, description, language, updated_at }) => ({
        name,
        stars: stargazers_count,
        url: html_url,
        description,
        language,
        updated_at
      }))

    res.json({ profile, repos });
  } catch (error) {
  console.error("GitHub API ERROR:", error.message);
  res.status(500).json({ error: error.message });
}
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

