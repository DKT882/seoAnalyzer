import { Router } from 'express';
import {
  analyzeUrl,
  compareCompetitors,
  getDomainOverview,
  getDataSources,
  getJob,
  getHistory,
  exportReport,
} from './controllers/analyzerController.js';

export const apiRouter = Router();

apiRouter.post('/analyze', analyzeUrl);
apiRouter.post('/competitors/compare', compareCompetitors);
apiRouter.get('/domain-overview', getDomainOverview);
apiRouter.get('/settings/data-sources', getDataSources);
apiRouter.get('/jobs/:id', getJob);
apiRouter.get('/history', getHistory);
apiRouter.get('/export/:id', exportReport);
