import { Router, type Request, type Response } from 'express';
import { fetchStats, recordVisit } from '../services/statsService';

const router = Router();

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await fetchStats();
    res.json(stats);
  } catch (error) {
    console.error('[stats] failed to fetch stats', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

router.post('/stats/visit', async (_req: Request, res: Response) => {
  try {
    const stats = await recordVisit();
    res.json(stats);
  } catch (error) {
    console.error('[stats] failed to record visit', error);
    res.status(500).json({ message: 'Failed to record visit' });
  }
});

export default router;
