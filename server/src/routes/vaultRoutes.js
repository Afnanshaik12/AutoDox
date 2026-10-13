import { Router } from 'express';
import { 
  listProfiles, 
  createProfile, 
  updateProfile, 
  deleteProfile,
  seedDefaultProfiles,
  listAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  searchVault
} from '../controllers/vaultController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Enforce authentication across all vault endpoints
router.use(authenticateToken);

// Live Vault Search
router.get('/search', searchVault);


// Profile Management Routes
router.get('/profiles', listProfiles);
router.post('/profiles', createProfile);
router.post('/profiles/seed', seedDefaultProfiles);
router.put('/profiles/:id', updateProfile);
router.delete('/profiles/:id', deleteProfile);

// Attribute Management Routes
router.get('/attributes', listAttributes);
router.post('/attributes', createAttribute);
router.put('/attributes/:id', updateAttribute);
router.delete('/attributes/:id', deleteAttribute);

export default router;
