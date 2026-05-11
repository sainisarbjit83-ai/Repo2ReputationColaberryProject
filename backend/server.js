require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRouter     = require('./routes/auth');
const usersRouter    = require('./routes/users');
const reposRouter    = require('./routes/repos');
const analysisRouter = require('./routes/analysis');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth',     authRouter);
app.use('/api/users',    usersRouter);
app.use('/api/repos',    reposRouter);
app.use('/api/analysis', analysisRouter);

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
