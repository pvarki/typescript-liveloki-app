import dotenv from 'dotenv';
import WebSocket from 'ws';

dotenv.config();

const DEFAULT_JETSTREAM_URL = process.env.JETSTREAM_URL || 'wss://jetstream2.us-east.bsky.network/subscribe';
const DEFAULT_COLLECTIONS = process.env.JETSTREAM_WANTED_COLLECTIONS || 'app.bsky.feed.post';

const KEYWORDS_RAW = process.env.HARVESTER_KEYWORDS || '';
const KEYWORDS = KEYWORDS_RAW
  .split(',')
  .map((k) => k.trim().toLowerCase())
  .filter((k) => k.length > 0);

const MATCH_ALL_IF_NO_KEYWORDS = (process.env.HARVESTER_MATCH_ALL_IF_NO_KEYWORDS ?? '1') !== '0';
const RECONNECT_ENABLED = (process.env.HARVESTER_RECONNECT ?? '1') !== '0';
const INITIAL_RECONNECT_DELAY_MS = Number.parseInt(process.env.HARVESTER_RECONNECT_DELAY_MS ?? '1000', 10);
const MAX_RECONNECT_DELAY_MS = Number.parseInt(process.env.HARVESTER_RECONNECT_DELAY_MAX_MS ?? '30000', 10);

const BATTLELOG_BASE_URL = process.env.BATTLELOG_BASE_URL || process.env.HARVESTER_BATTLELOG_URL || '';
const BATTLELOG_EVENTS_PATH = process.env.BATTLELOG_EVENTS_PATH || '/api/events';
const SEND_TO_BATTLELOG = (process.env.HARVESTER_SEND_TO_BATTLELOG ?? '0') === '1';
const HARVESTER_API_KEY = process.env.HARVESTER_API_KEY || '';

let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
let shuttingDown = false;

function buildJetstreamUrl() {
  const url = new URL(DEFAULT_JETSTREAM_URL);
  const collections = DEFAULT_COLLECTIONS.split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (collections.length > 0 && !url.searchParams.has('wantedCollections')) {
    for (const collection of collections) {
      url.searchParams.append('wantedCollections', collection);
    }
  }

  return url.toString();
}

function shouldKeepEvent(envelope) {
  const { kind, commit } = envelope;
  if (kind !== 'commit' || !commit) return false;
  if (commit.collection !== 'app.bsky.feed.post') return false;
  if (commit.operation !== 'create') return false;
  return true;
}

function matchKeywords(text) {
  const lowered = (text || '').toLowerCase();
  if (KEYWORDS.length === 0) return [];
  return KEYWORDS.filter((keyword) => lowered.includes(keyword));
}

function microsecondsToIso(timeUs) {
  if (!timeUs) return undefined;

  const numeric = typeof timeUs === 'string' ? Number.parseInt(timeUs, 10) : timeUs;
  if (!Number.isFinite(numeric)) return undefined;

  const millis = Math.floor(numeric / 1000);
  return new Date(millis).toISOString();
}

function buildBattlelogEvent(output) {
  const { time_us: timeUs, did, text, matchedKeywords, createdAt } = output;

  const creationTimeIso = microsecondsToIso(timeUs) ?? (createdAt ? new Date(createdAt).toISOString() : undefined);
  const eventTimeIso = createdAt || creationTimeIso || new Date().toISOString();

  let keywords = [];
  if (Array.isArray(matchedKeywords) && matchedKeywords.length > 0) {
    keywords = matchedKeywords;
  } else if (KEYWORDS.length > 0) {
    keywords = KEYWORDS;
  }

  return {
    header: text || '(no title)',
    link: '',
    source: 'Harvester - Bluesky',
    admiralty_reliability: '',
    admiralty_accuracy: '',
    event_time: eventTimeIso,
    keywords,
    hcoe_domains: [],
    location: '',
    location_lat: undefined,
    location_lng: undefined,
    author: did || '',
    notes: '',
    creation_time: creationTimeIso,
  };
}

async function sendToBattlelog(output) {
  if (!SEND_TO_BATTLELOG || !BATTLELOG_BASE_URL) {
    return;
  }

  const url = new URL(BATTLELOG_EVENTS_PATH, BATTLELOG_BASE_URL).toString();
  const eventPayload = buildBattlelogEvent(output);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HARVESTER_API_KEY ? { 'x-harvester-key': HARVESTER_API_KEY } : {}),
      },
      body: JSON.stringify({ events: [eventPayload] }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Failed to send event to Battlelog:', response.status, text);
    }
  } catch (error) {
    console.error('Error sending event to Battlelog:', error);
  }
}

function handleMessage(raw) {
  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse Jetstream message:', error);
    return;
  }

  if (!shouldKeepEvent(envelope)) return;

  const { time_us: timeUs = null, did = null, commit } = envelope;
  const { collection, operation, record = {}, uri = null } = commit;
  const text = typeof record.text === 'string' ? record.text : '';

  let matchedKeywords = [];
  if (KEYWORDS.length === 0 && MATCH_ALL_IF_NO_KEYWORDS) {
    matchedKeywords = [];
  } else {
    matchedKeywords = matchKeywords(text);
    if (matchedKeywords.length === 0) return;
  }

  const output = {
    time_us: timeUs,
    did,
    collection,
    operation,
    uri,
    matchedKeywords,
    text,
    langs: record.langs ?? undefined,
    tags: record.tags ?? undefined,
    createdAt: record.createdAt ?? undefined,
  };

  process.stdout.write(`${JSON.stringify(output)}\n`);

  // Fire-and-forget send to Battlelog if configured
  void sendToBattlelog(output);
}

function start() {
  const url = buildJetstreamUrl();
  console.log(`Connecting to Jetstream at ${url}`);
  if (KEYWORDS.length > 0) {
    console.log(`Filtering posts containing any of: ${KEYWORDS.join(', ')}`);
  } else if (MATCH_ALL_IF_NO_KEYWORDS) {
    console.log('No HARVESTER_KEYWORDS set; passing through all posts');
  } else {
    console.log('No HARVESTER_KEYWORDS set and MATCH_ALL_IF_NO_KEYWORDS=0; nothing will be emitted');
  }

  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('Jetstream connection open');
    reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  });

  ws.on('message', (data) => {
    handleMessage(data.toString());
  });

  ws.on('error', (error) => {
    console.error('Jetstream error:', error);
  });

  ws.on('close', (code, reason) => {
    console.warn(`Jetstream connection closed: code=${code}, reason=${reason.toString()}`);

    if (shuttingDown || !RECONNECT_ENABLED) {
      console.log('Shutting down harvester');
      return;
    }

    const delay = reconnectDelayMs;
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
    console.log(`Reconnecting to Jetstream in ${delay} ms`);
    setTimeout(start, delay);
  });

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('Received shutdown signal, closing Jetstream connection...');
    ws.close(1000, 'harvester shutting down');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
