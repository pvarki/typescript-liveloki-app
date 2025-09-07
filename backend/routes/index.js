import express from 'express';
import eventRoutes from './eventRoutes.js';
import rmRoutes from './rmRoutes.js';
import fs from 'fs';
import path from 'path';
import CoT from '@tak-ps/node-cot';
import { XMLParser } from 'fast-xml-parser';

const router = express.Router();

router.use('/api', eventRoutes);
router.use('/rmapi', rmRoutes);

router.use('/api/v1', eventRoutes);
router.use('/api/v1', rmRoutes);

// Simple COT -> GeoJSON aggregation endpoint
router.get('/api/cot/geojson', async (req, res) => {
  try {
    const dir = path.resolve(process.cwd(), 'DP-Testing');
    // Recursively collect COT/XML files
    const files = [];
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop();
      const ents = fs.readdirSync(cur, { withFileTypes: true });
      for (const ent of ents) {
        const p = path.join(cur, ent.name);
        if (ent.isDirectory()) stack.push(p);
        else if (/\.(cot|xml)$/i.test(ent.name)) files.push(p);
      }
      if (files.length > 5000) break;
    }
    const features = [];
    for (const file of files.slice(0, 5000)) {
      let xml = '';
      try { xml = fs.readFileSync(file, 'utf8'); } catch { continue; }
      let added = false;
      // Attempt CoT parsing
      try {
        const cot = new CoT(xml);
        const gj = cot.to_geojson();
        if (gj && typeof gj === 'object') {
          if (gj.type === 'Feature') { features.push(gj); added = true; }
          else if (gj.type === 'FeatureCollection' && Array.isArray(gj.features)) { features.push(...gj.features); added = true; }
          else if (gj.type && (gj.type === 'Point' || gj.type === 'LineString' || gj.type === 'Polygon' || gj.type === 'MultiPoint' || gj.type === 'MultiLineString' || gj.type === 'MultiPolygon' || gj.type === 'GeometryCollection')) {
            features.push({ type: 'Feature', geometry: gj, properties: { uid: (cot && cot.raw && cot.raw.event && cot.raw.event.$ && cot.raw.event.$.uid) || null } });
            added = true;
          }
        }
      } catch {}
      // Fallback per-file: simple lat/lon extraction
      if (!added) {
        try {
          const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
          const parsed = parser.parse(xml);
          const point = parsed?.event?.point || parsed?.Event?.point || parsed?.Event?.Point;
          const lat = point?.lat != null ? parseFloat(point.lat) : (point?.y != null ? parseFloat(point.y) : NaN);
          const lon = point?.lon != null ? parseFloat(point.lon) : (point?.x != null ? parseFloat(point.x) : NaN);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { uid: path.basename(file) } });
          } else {
            // Last resort: regex attributes with single quotes
            const latMatch = xml.match(/(?:lat|y)='([^']+)'/i);
            const lonMatch = xml.match(/(?:lon|x)='([^']+)'/i);
            const lat2 = latMatch ? parseFloat(latMatch[1]) : NaN;
            const lon2 = lonMatch ? parseFloat(lonMatch[1]) : NaN;
            if (Number.isFinite(lat2) && Number.isFinite(lon2)) {
              features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon2, lat2] }, properties: { uid: path.basename(file) } });
            }
          }
        } catch {}
      }
    }
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
