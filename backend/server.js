require('dotenv').config();
require('./db/postgres');
const express = require('express');
const cors = require('cors');
const authRouter            = require('./routes/auth');
const usersRouter           = require('./routes/users');
const reposRouter           = require('./routes/repos');
const githubAccountsRouter  = require('./routes/githubAccounts');
const githubAppRouter       = require('./routes/githubApp');
const analysisRouter        = require('./routes/analysis');
const deepAnalysisRouter    = require('./routes/deepAnalysis');
const portfoliosRouter      = require('./routes/portfolios');
const searchRouter          = require('./routes/search');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth',            authRouter);
app.use('/api/users',           usersRouter);
app.use('/api/repos',           reposRouter);
app.use('/api/github-accounts', githubAccountsRouter);
app.use('/api/github-app',      githubAppRouter);
app.use('/api/analysis',       analysisRouter);
app.use('/api/deep-analysis',  deepAnalysisRouter);
app.use('/api/portfolios', portfoliosRouter);
app.use('/api/search',     searchRouter);

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
