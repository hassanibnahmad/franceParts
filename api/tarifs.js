import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// lazy-init supabase admin client to avoid import-time failures when envs are missing
let supabase = null;

function getIdFromUrl(req) {
  try {
    const m = (req.url || '').match(/\/api\/tarifs\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch (e) { return null; }
}

// Basic admin auth reused from other API handlers: supports UPLOAD_SECRET or x-upload-token
async function isAuthorized(req) {
  const expected = process.env.UPLOAD_SECRET;
  const tokenSecret = process.env.UPLOAD_TOKEN_SECRET;
  let authorized = false;
  if (tokenSecret) {
    const providedToken = req.headers['x-upload-token'] || req.headers['X-Upload-Token'];
    if (providedToken) {
      try {
        const crypto = await import('crypto');
        const parts = String(providedToken).split('.');
        if (parts.length === 2) {
          const [b, mac] = parts;
          const expectedMac = crypto.createHmac('sha256', String(tokenSecret)).update(b).digest('hex');
          if (crypto.timingSafeEqual(Buffer.from(expectedMac, 'hex'), Buffer.from(mac, 'hex'))) {
            const json = Buffer.from(b, 'base64url').toString('utf8');
            const obj = JSON.parse(json);
            if (!obj.exp || Date.now() <= obj.exp) authorized = true;
          }
        }
      } catch (e) { /* ignore */ }
    }
  }
  if (!authorized && expected) {
    const provided = req.headers['x-upload-secret'] || req.headers['X-Upload-Secret'];
    if (provided && provided === expected) authorized = true;
  }
  return authorized;
}

const DEFAULT_PRICING = [
  { service: 'Diagnostic rapide', price: '29€', description: 'Diagnostic électronique complet de votre véhicule', features: ['Lecture des codes défaut', 'Rapport détaillé', 'Conseils de réparation', 'Durée: 30 minutes'], popular: false },
  { service: "Pièce d'occasion", price: 'À partir de 15€', description: "Pièces d'occasion vérifiées et garanties", features: ['Pièces testées', 'Garantie 6 mois', 'Large choix', 'Disponibilité immédiate'], popular: true },
  { service: 'Pièce neuve', price: 'À partir de 49€', description: "Pièces neuves d'origine constructeur", features: ["Pièces d'origine", 'Garantie constructeur', 'Commande rapide', 'Livraison possible'], popular: false },
  { service: 'Entretien complet', price: '149€', description: 'Révision complète de votre véhicule', features: ['Vidange + filtre', 'Contrôle freins', 'Contrôle suspension', 'Rapport détaillé'], popular: false },
  { service: 'Expertise véhicule', price: '89€', description: 'Analyse approfondie de l\'état de votre véhicule avant achat ou vente', features: ['Contrôle technique', 'Rapport détaillé', 'Évaluation prix', 'Conseils d\'expert'], popular: false },
  { service: 'Commande de pièces', price: 'Sur devis', description: 'Recherche et commande de pièces spécifiques pour véhicules français', features: ['Recherche sur mesure', 'Délai garanti', 'Toutes marques', 'Suivi de commande'], popular: false }
];

export default async function handler(req, res) {
  try {
    // CORS helper
    const setCors = () => {
      const origin = req.headers.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, x-upload-secret');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    };
    setCors();
    const DEBUG = process.env.DEBUG_API === 'true';
    if (DEBUG) console.log('[tarifs] incoming', { method: req.method, url: req.url, headers: req.headers });
    if (req.method === 'OPTIONS') return res.status(204).end();

    // lazy init supabase
    if (!supabase) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('tarifs handler missing SUPABASE envs');
        return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE env' });
      }
      try {
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      } catch (e) {
        console.error('tarifs supabase init failed', e);
        return res.status(500).json({ error: 'Server misconfigured: supabase init failed' });
      }
    }
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('tarifs').select('*').order('created_at', { ascending: true });
      if (error) { console.error('supabase select tarifs error', error); return res.status(500).json({ error: error.message || 'Select failed' }); }
      return res.status(200).json({ data });
    }

    // Admin-only endpoints below
    const authorized = await isAuthorized(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      // support seed action if path ends with /seed
      if ((req.url || '').endsWith('/seed')) {
        try {
          // remove existing rows then insert defaults
          await supabase.from('tarifs').delete().neq('id', '');
          const inserts = DEFAULT_PRICING.map(p => ({ service: p.service, price: p.price, description: p.description, features: p.features, popular: p.popular || false }));
          const { data, error } = await supabase.from('tarifs').insert(inserts).select();
          if (error) { console.error('seed insert error', error); return res.status(500).json({ error: error.message || 'Seed failed' }); }
          return res.status(200).json({ data });
        } catch (e) { console.error('seed error', e); return res.status(500).json({ error: 'Seed failed' }); }
      }

      const payload = req.body;
      if (!payload || !payload.service) return res.status(400).json({ error: 'Invalid payload' });
      const toInsert = { service: payload.service, price: payload.price || '', description: payload.description || '', features: payload.features || [], popular: !!payload.popular };
      const { data, error } = await supabase.from('tarifs').insert([toInsert]).select().single();
      if (error) { console.error('supabase insert tarifs error', error); return res.status(500).json({ error: error.message || 'Insert failed' }); }
      return res.status(200).json({ data });
    }

    if (req.method === 'PUT') {
      const id = getIdFromUrl(req) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id in URL or body' });
      const updates = req.body;
      delete updates.id;
      const { data, error } = await supabase.from('tarifs').update(updates).eq('id', id).select().single();
      if (error) { console.error('supabase update tarifs error', error); return res.status(500).json({ error: error.message || 'Update failed' }); }
      return res.status(200).json({ data });
    }

    if (req.method === 'DELETE') {
      const id = getIdFromUrl(req) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id in URL or body' });
      const { error } = await supabase.from('tarifs').delete().eq('id', id);
      if (error) { console.error('supabase delete tarifs error', error); return res.status(500).json({ error: error.message || 'Delete failed' }); }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('tarifs handler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
