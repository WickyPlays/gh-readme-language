require('dotenv').config();

import express, { Application } from 'express';
import path from 'path';
import indexRouter from './api/routes/indexRoutes';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Do I still need this now?
// app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use('/', indexRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;