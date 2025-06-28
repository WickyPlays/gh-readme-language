import express from 'express';
import { getUserRepos } from '../controllers/indexController';

const router = express.Router();

router.get('/api/:username', getUserRepos);

export default router;