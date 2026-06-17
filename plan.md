# Widget System Design

Design for the Taistelu-Lokki dashboard widget system.
Builds on the existing react-grid-layout implementation in `typescript-liveloki-app` (new-ui branch).

**Philosophy:** Provide simple, generic building blocks. Users compose their own dashboards for their own needs. No guided workflows, no opinionated layouts, no auto-switching. The system is a toolkit, not a product.

---

## 1. Widgets

Each widget is a self-contained tool. Users place as many instances as they want, in any arrangement, on any dashboard.

**View mode interaction:** Most widgets are interactive in view mode — clicking table rows, checking todo items, starting timers, submitting forms. View mode locks the *dashboard layout* (no drag, no resize, no delete), not the widget content. Edit mode is for rearranging and configuring widgets; view mode is for using them. Widgets that have their own controls (Timer start/stop, Todo checkboxes, Form submit) disable those controls in edit mode to prevent accidental interaction while dragging.

---

### 1.1 Map

Native OpenLayers map widget. Implementation is based on [IntelMap](https://github.com/Elderx/IntelMap) — use its codebase as the reference for architecture patterns, layer definitions, data source integrations, and interaction handling. We copy a subset of IntelMap's features, not all of them.

**Core idea:** Every map capability is a feature that can be toggled on or off in the widget's config panel. A map widget with everything off is a static image — fixed position, fixed zoom, one layer, no interaction. A map widget with everything on is a full interactive map with real-time tracking, drawing tools, weather overlays, and search. The user decides where on that spectrum each map instance sits.

This means the same widget type can serve as:
- A static snapshot (fixed view of a location, no controls)
- A simple pan/zoom map (one layer, interactive)
- A monitoring view (AIS tracking enabled, weather radar on, but no drawing)
- A planning tool (drawing enabled, measurements, multiple layers)
- A full-featured operational map (everything on)

Users can place multiple map instances on the same dashboard, each configured differently.

**Available features (all opt-in via config):**

| Feature | What it enables | Default |
|---------|----------------|---------|
| **Pan & zoom** | Drag to pan, scroll to zoom, pinch on touch | Off |
| **Layer switching** | UI control to switch between base layers | Off |
| **Overlay toggles** | UI controls to enable/disable overlay layers | Off |
| **AIS vessel tracking** | Real-time vessel positions via Digitraffic MQTT, color-coded by type, with type filtering | Off |
| **Aircraft tracking** | Real-time aircraft positions via OpenSky Network, configurable polling interval | Off |
| **Weather radar** | FMI radar overlay with historical playback and animation controls | Off |
| **Weather stations** | FMI observation data (temperature, wind, humidity, snow, pressure) as map markers | Off |
| **Train locations** | Real-time Finnish train positions and station markers via Digitraffic | Off |
| **Traffic cameras** | Finnish traffic camera locations with live image preview via Fintraffic ArcGIS | Off |
| **GPX tracks** | Import GPX files, display tracks with elevation/speed coloring and charts | Off |
| **Drawing tools** | Markers, lines, polygons, circles with persistence and sharing | Off |
| **Measurement** | Distance and area measurement tools | Off |
| **Search** | Nominatim geocoding search bar | Off |
| **Location tracking** | Show user's own position on map | Off |
| **Click to select** | Click entities/markers on map to publish `selectedItem` | Off |

Features that are off are completely hidden — no UI controls shown, no data fetched, no event listeners attached.

**Base layers** (from IntelMap — include the full set, user picks one in config):
- Finnish MML WMTS: Taustakartta, Maastokartta, Selkokartta, Ortokuva
- OpenStreetMap, OpenTopoMap
- Mapbox: Light, Dark, Streets, Outdoors
- Esri World Imagery, ArcGIS NatGeo
- NASA GIBS: Blue Marble, VIIRS Night Lights, MODIS Clouds
- CartoDB Dark, Stadia, Thunderforest, Jawg
- MapAnt orienteering maps

**Overlay layers** (from IntelMap — available when overlay toggles are enabled):
- Digiroad (Finnish road network via WMS)
- OpenSeaMap (maritime: buoys, lighthouses, shipping lanes)
- OpenRailwayMap
- UAS/airspace restriction zones (FlyK API)
- Custom WMS (user provides URL, widget parses GetCapabilities)

**Excluded from IntelMap** (not needed in widget context):
- Split-screen dual map — the dashboard grid handles multi-map layouts natively
- IntelMap's own authentication and user management — the dashboard handles auth
- IntelMap's header bar, settings menu, admin panel — replaced by widget config panel

**Tile provider API keys** (Mapbox, Jawg, Thunderforest, etc.) are configured once at deploy time via environment variables — same pattern as IntelMap's `src/config/constants.js`. These are not per-widget settings. Base layers that require a missing key are hidden from the layer selector.

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| **Position** | | |
| Center latitude | number | Map center lat (default: 60.45) |
| Center longitude | number | Map center lng (default: 22.24) |
| Zoom level | number | Initial zoom (default: 5) |
| **Base layer** | | |
| Base layer | select | Which base layer to show (default: OSM) |
| **Enabled features** | | |
| Pan & zoom | toggle | Allow map interaction (default: off) |
| Layer switching | toggle | Show base layer selector on map (default: off) |
| Overlay toggles | toggle | Show overlay layer controls on map (default: off) |
| AIS tracking | toggle | Enable vessel tracking (default: off) |
| Aircraft tracking | toggle | Enable aircraft tracking (default: off) |
| Weather radar | toggle | Enable FMI radar overlay (default: off) |
| Weather stations | toggle | Enable weather observation markers (default: off) |
| Train locations | toggle | Enable train positions and stations (default: off) |
| Traffic cameras | toggle | Enable traffic camera markers (default: off) |
| GPX tracks | toggle | Enable GPX file import and display (default: off) |
| Drawing tools | toggle | Enable drawing toolbar (default: off) |
| Measurement | toggle | Enable measurement tools (default: off) |
| Search | toggle | Show search bar on map (default: off) |
| Location tracking | toggle | Show own position (default: off) |
| Click to select | toggle | Click map entities to select them (default: off) |
| **Feature-specific settings** (shown only when feature is enabled) | | |
| AIS: vessel type filter | multi-select | Which vessel types to show |
| AIS: stale timeout | number | Minutes before a vessel marker is pruned |
| Aircraft: polling interval | number | Seconds between position updates (min 11) |
| Weather radar: animation speed | number | Playback FPS |
| Weather stations: measurements | multi-select | Which values to show (temp, wind, humidity, snow, pressure) |
| GPX: color mode | select | Solid / Elevation / Speed |
| Overlays: active overlays | multi-select | Which overlay layers are on |
| Custom WMS URL | text | URL for a custom WMS service |

The config panel uses progressive disclosure — feature-specific settings only appear when that feature is toggled on. A minimal map has just 3 fields visible (lat, lng, zoom). A full-featured map might show 20+.

**Grid:** Default `12x8`, min `4x3`

**Query params:**
- **Publishes:** `selectedItem` — ID of clicked entity (only when "Click to select" is enabled)
- **Reads:** `selectedItem` — highlights the matching entity on the map (only when "Click to select" is enabled)

---

### 1.2 Data Table

Configurable table showing rows of data from a selectable source. The user picks which data collection to display and which columns to show. Rows are clickable.

The existing implementation fetches Battlelog events and displays them with Fuse.js full-text search, sticky headers, alternating row stripes, and configurable column visibility. The evolution is to make the data source selectable rather than hardcoded to Battlelog.

**Behavior:**
- Fetches data from the configured source via SWR (auto-refreshing)
- Renders a scrollable HTML table with sticky header row
- Full-text search input with fuzzy matching (Fuse.js, threshold 0.3) — searches only visible columns, highlights matches
- Click any row to select it — publishes the row ID to `selectedItem` query param
- If `selectedItem` is set, highlights the matching row
- Sort by clicking column headers
- Alternating row backgrounds for readability
- Cell content is line-clamped (3 lines max) to keep rows compact

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| Data source | select | Which data collection to display (events, entities, or any registered source) |
| Visible columns | checkboxes | Toggle visibility per column, with "All" and preset buttons |
| Default sort | select + toggle | Column to sort by and ascending/descending |
| Page size | select | Rows per page: 25, 50, or 100 |

**Grid:** Default `12x6`, min `6x3`

**Query params:**
- **Publishes:** `selectedItem` — ID of the clicked row
- **Reads:** `selectedItem` — highlights the matching row if present

---

### 1.3 Detail View

Shows the full details of a single selected item. When the user clicks a row in a Data Table, an event in the Events Feed, or a marker on a Timeline, the Detail View displays everything known about that item.

This is a new widget. The existing app has `EventDetailOverlay` (a modal) — the Detail View replaces that pattern with a persistent, placeable widget that lives in the grid alongside other widgets.

**Behavior:**
- Reads `selectedItem` from query params
- Fetches the full record for that item from the API
- Renders all fields as a property list: label on the left, value on the right
- Different item types may have different fields — the view adapts based on what the data contains
- Relationships or references to other items are rendered as clickable links — clicking one updates `selectedItem`
- When nothing is selected, shows an empty state: "Select an item to view details"
- When loading, shows a skeleton/spinner

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| (none) | — | Fully driven by `selectedItem` query param |

**Grid:** Default `6x6`, min `4x3`

**Query params:**
- **Publishes:** `selectedItem` — when clicking a related item link within the detail view
- **Reads:** `selectedItem` — which item to fetch and display

---

### 1.4 Timeline

Horizontal time axis with event markers. The user can scrub to any point in time, zoom in/out, and click markers to select events.

The existing implementation uses `vis-timeline` to render Battlelog events as point markers on an interactive timeline. The evolution is to make the data source configurable and to publish the scrub position as a `time` query param so other widgets can react to temporal navigation.

**Behavior:**
- Fetches events from the configured source
- Renders each event as a point marker on a horizontal time axis, positioned by its timestamp
- Markers show a tooltip on hover with the event summary
- Interactive: pan by dragging, zoom with scroll wheel, pinch on touch
- Current time indicator (vertical line at "now")
- Click a marker to select that event — publishes to `selectedItem`
- Scrubbing (dragging the viewport or using playback controls) publishes `time` param
- Playback controls: play/pause and speed selector for stepping through historical events
- If `selectedItem` is set, highlights the corresponding marker

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| Time window | select | Default visible range: last 1h, 4h, 12h, 24h, or custom start/end |
| Data source | select | Which event collection to display |
| Filters | multi-select | Filter events by type, source, or other attributes |

**Grid:** Default `24x3` (full dashboard width, compact height), min `8x2`

**Query params:**
- **Publishes:** `time` — current scrub position as ISO 8601 timestamp; `selectedItem` — ID of clicked marker
- **Reads:** `selectedItem` — highlights the corresponding marker on the timeline

---

### 1.5 Events Feed

Chronological scrolling list of events. A simple, compact alternative to the Data Table for monitoring incoming events in real time.

This is a new widget. Think of it as a live log — newest events appear at the bottom (or top), and the list auto-scrolls to stay current unless the user has scrolled away.

**Behavior:**
- Fetches events from the configured source via SWR (auto-refreshing)
- Renders a compact vertical list, one line per event: timestamp, type/source badge, summary text
- Auto-scrolls to the latest event unless the user has manually scrolled up (scroll lock) — a subtle indicator shows when new events are available below
- Click an event to select it — publishes to `selectedItem`
- If `selectedItem` is set, highlights the matching event
- Supports filtering by type, source, or severity via config

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| Data source | select | Which event collection to display |
| Filters | multi-select | Filter by type, source, or other attributes |
| Auto-scroll | toggle | Whether to auto-scroll to latest (default: on) |
| Max items | select | Maximum items to keep in the list: 50, 100, or 200 |
| Order | select | Newest first or newest last |

**Grid:** Default `6x6`, min `4x3`

**Query params:**
- **Publishes:** `selectedItem` — ID of the clicked event
- **Reads:** `selectedItem` — highlights the matching event; `time` — scrolls to the event nearest the given timestamp and disables auto-scroll (the user is reviewing history via the timeline, not watching live). Auto-scroll re-enables when the `time` param is cleared (timeline returns to "now")

---

### 1.6 Event Submission Form

Submit new events to the system. The existing implementation supports two modes: a full Battlelog event form and a minimal title/notes form.

**Behavior:**
- Displays input fields for submitting a new event
- **Battlelog mode:** Header (required), source, link, author, reliability (Admiralty A-F), accuracy (1-6), event time, location (text + lat/lng), keywords (comma-separated with autocomplete from API), HCOE domains, notes
- **Minimal mode:** Title (required) and notes
- Submit button sends data to the API, shows toast on success/error
- Clears form after successful submission
- Triggers SWR cache revalidation so other widgets (Data Table, Timeline, Events Feed) pick up the new event immediately
- Supports pre-populating fields via URL query params (`header`, `source`, `keywords`, etc.)

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| Form mode | select | "Battlelog event submission" or "Minimal title/notes" |

**Grid:** Default `6x6`, min `4x4`

**Query params:**
- **Publishes:** nothing (triggers data refresh via SWR `mutate`)
- **Reads:** URL query params for field pre-population (`header`, `source`, `keywords`)

---

### 1.7 Video Feed

HLS/RTMP/direct video stream player. Supports live streams, recorded video, and embedded players (YouTube, etc.).

**Behavior:**
- Renders a video player based on the configured source URL and playback mode
- **Auto mode** (default): Detects format from URL — `.m3u8` plays as HLS, `.mp4`/`.webm`/`.ogv` plays as native video, other URLs treated as embeds
- **HLS mode:** Uses hls.js for `.m3u8` playlists (falls back to native HLS on Safari). Appends `/index.m3u8` if the URL doesn't end with it
- **Direct mode:** Native HTML5 `<video>` element for direct video files
- **Embed mode:** Renders an iframe (for YouTube, Vimeo, or any embeddable player)
- Supports basic auth for protected streams — username/password embedded in URL for direct access, sent as Authorization header for HLS via hls.js `xhrSetup`
- Handles autoplay blocking gracefully — shows "Press play to start" instead of an error
- Title bar shown above the video if configured
- Black background, `object-fit: contain`
- **Credential handling:** Username/password are stored in the widget config (persisted in the database) and used to construct authenticated URLs. These credentials may appear in browser history and network logs. Widget configs containing stream credentials should not be shared via copy/paste to untrusted parties

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| Title | text | Optional title shown above the video |
| Source URL | text | HLS playlist (.m3u8), direct video file, RTMP URL, or embeddable URL |
| Playback mode | select | Auto / HLS / Direct / Embed |
| Username | text | Optional basic auth username |
| Password | password | Optional basic auth password |
| Autoplay | toggle | Start playing automatically (default: on) |
| Muted | toggle | Start muted (default: on, required for autoplay in most browsers) |
| Show controls | toggle | Show native video controls (default: on) |

**Grid:** Default `8x6`, min `4x3`

**Query params:** None.

---

### 1.8 External Embed

IFrame widget for embedding any external web application. Use it for Grafana dashboards, monitoring tools, documentation, agency-specific systems, or anything with a URL.

**Behavior:**
- Renders a full-size iframe pointed at the configured URL
- Optional periodic refresh (reloads the iframe on an interval)
- Pointer events can be toggled — when off, the iframe is view-only and mouse events pass through to the dashboard (useful for display-only embeds where you don't want accidental clicks stealing focus)
- No title bar or chrome in view mode — the embedded content fills the entire widget

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| URL | text | The URL to embed |
| Refresh interval | select | Never / 30s / 60s / 5m — reloads the iframe periodically |
| Allow interaction | toggle | Enable pointer events on the iframe (default: on) |

**Grid:** Default `8x6`, min `4x3`

**Query params:** None.

---

### 1.9 Metric

Single big number with a label. A glanceable indicator for any value the user cares about.

The existing implementation is a manually configured display — the user types the value into the config panel. Future evolution could bind to a live data source, but the current version is intentionally simple.

**Behavior:**
- Renders a large monospace number (the value), centered in the widget
- Label above in uppercase, muted color
- Optional unit suffix to the right of the value, smaller font
- Status color applied to the value text: normal (default foreground), green (success), amber (warning), red (danger)
- No interaction — this is a pure display widget

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| Label | text | Text shown above the value (e.g., "Units Deployed") |
| Value | text | The number or text to display (e.g., "42") |
| Unit | text | Optional suffix (e.g., "%", "ms", "km/h") |
| Status | select | Color of the value: normal / success / warning / danger |

**Grid:** Default `3x2`, min `2x2`

**Query params:** None.

---

### 1.10 Clock

Digital clock showing current time and date. Updates every second.

**Behavior:**
- Displays time in 24-hour format: `HH:MM:SS`
- Date below in long format: "Monday, January 1, 2025"
- Monospace font, vertically centered
- Updates every 1 second

**Config panel:** None.

**Grid:** Default `4x3`, min `3x2`

**Query params:** None.

---

### 1.11 Note

Free-text display. Use for anything: shift handover notes, standing orders, reminders, scratch pad, meeting notes.

**Behavior:**
- View mode: renders the text as read-only with preserved whitespace and line breaks
- Empty state shows placeholder text: "No content — configure in edit mode"
- Content is edited exclusively through the config panel (right-click > Settings in edit mode)
- Content is persisted in the widget config and saved with the dashboard

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| Note text | textarea | The note content |

**Grid:** Default `4x4`, min `3x3`

**Query params:** None.

---

### 1.12 Timer

Countdown timer with browser notifications. Supports both relative durations ("30 minutes") and absolute targets ("14:30").

**Behavior:**
- **Relative mode:** User types a duration string like `30 minutes`, `1h 15m`, `2h 30m 45s`. Parser accepts hours/hrs/h, minutes/mins/min/m, seconds/secs/sec/s in any combination
- **Absolute mode:** User picks a time (HH:MM). Timer counts down to that time today
- Display shows remaining time: `MM:SS` for under an hour, `HH:MM:SS` for longer
- "Ends at" subtext shows the target time
- Controls: Start, Stop, Clear
- When the timer reaches zero, fires a browser notification (requests permission on first use). Falls back to in-app toast if notifications are denied
- Timer state (endAt, startedAt, status) is persisted in the dashboard immediately, so it survives page reloads
- In dashboard edit mode, timer controls are disabled to prevent accidental interaction while dragging/resizing

**Config panel:**

| Field | Type | Description |
|-------|------|-------------|
| Mode | toggle | Relative ("In 30m") or Absolute ("At 14:30") |
| Duration / Time | text / time | The countdown input |

_Note: The timer is primarily configured through its own inline UI in view mode, not through the config panel._

**Grid:** Default `5x4`, min `3x3`

**Query params:** None.

---

### 1.13 Todo

Drag-and-drop task list with color coding. A simple checklist that lives on the dashboard.

**Behavior:**
- Add tasks via a text input at the top (press Enter or click Add)
- Each task has: checkbox (done/not done), text label, optional background color, delete button
- Check a task to mark it done — text gets strikethrough and muted color
- Delete button (X) appears on hover in view mode, always visible in edit mode
- Tasks persist in the widget config and save with the dashboard

**Config panel (where tasks are managed):**

| Field | Type | Description |
|-------|------|-------------|
| New task | text + button | Add a new task |
| Task list | sortable list | Drag-and-drop to reorder tasks. Each task shows: drag handle, text (editable), color picker (9 presets: red, orange, yellow, green, cyan, blue, purple, pink, slate), delete button |

**Grid:** Default `5x4`, min `3x3`

**Query params:** None.

---

## 2. Widget-to-Widget Communication

### Mechanism: Query Params

Widgets communicate through URL query parameters. Any widget can read or write any param. This gives deep linking, shareable URLs, and browser back/forward for free.

**Core params:**

| Param | Purpose | Example |
|-------|---------|---------|
| `selectedItem` | Currently selected item ID | `unit-42` |
| `time` | Point-in-time for temporal widgets | `2024-01-15T14:30:00Z` |

These are the two params that multiple widgets share. The system doesn't enforce a fixed vocabulary — any widget can publish or read any param name. For example, the Event Submission Form reads `header`, `source`, and `keywords` params for field pre-population. Any widget (or external link) that sets those params will pre-fill the form. This is by convention, not by contract — widgets discover each other's params from this document, not from a runtime registry.

### How It Works

```
┌─────────────┐     setParam('selectedItem', 'unit-42')     ┌──────────────┐
│ Data Table  │ ────────────────────────────────────────────> │  URL State   │
└─────────────┘                                               │ ?selectedItem│
                                                              │  =unit-42   │
┌─────────────┐     useParam('selectedItem') -> 'unit-42'    │              │
│ Detail View │ <──────────────────────────────────────────── │              │
└─────────────┘                                               └──────────────┘
```

Implementation: a thin hook over React Router's `useSearchParams`:

```typescript
// Write
const { setParam } = useWidgetParams();
setParam('selectedItem', item.id);

// Read
const { param } = useWidgetParams();
const itemId = param('selectedItem');
```

### Rules

1. **Any widget can read any param.** No ownership.
2. **Last writer wins.** User attention is sequential — this is correct.
3. **Handle missing params.** Null means nothing selected — show empty state or default.
4. **Config vs params.** Widget config (columns, filters) is persisted in the dashboard layout. Query params are ephemeral interaction state.
5. **Survives reload.** The app uses hash-based routing (`/#/d/:dashboardId?selectedItem=X&time=...`). The browser preserves the full hash across page reloads, so query param state is not lost. Sharing the URL shares the full interaction state.

---

## 3. Widget Management

### Edit / View Mode

**View mode** (default): Dashboard locked. No drag, no resize, no delete. Top bar minimal. All interaction goes to widget content.

**Edit mode** (`Cmd+E` / `Ctrl+E`): Top bar expands. Widgets show drag handles and resize handles. Widget palette available. Right-click any widget to open the context menu.

### Widget Context Menu

Right-click a widget in edit mode to open a Blueprint `ContextMenu2`. This is the primary way to interact with widgets during editing — it replaces scattered UI buttons (delete X, settings icon) with a single discoverable menu.

```
┌─────────────────────────┐
│ ⚙  Settings             │
│ ─────────────────────── │
│ ⎘  Copy                 │
│ ⎗  Paste                │
│ ⊕  Duplicate            │
│ ─────────────────────── │
│ ⤢  Reset size           │
│ ─────────────────────── │
│ ✕  Delete               │
└─────────────────────────┘
```

| Action | What it does | Shortcut |
|--------|-------------|----------|
| **Settings** | Opens the right-side config panel for this widget | — |
| **Copy** | Copies widget (type + config + size) to clipboard as JSON | `Cmd+C` |
| **Paste** | Pastes widget from clipboard onto this dashboard | `Cmd+V` |
| **Duplicate** | Instant copy+paste — places a clone next to the original | `Cmd+D` |
| **Reset size** | Restores widget to its default width and height | — |
| **Delete** | Removes the widget from the dashboard | `Delete` / `Backspace` |

The context menu is also available by right-clicking empty dashboard space (no widget selected):

```
┌─────────────────────────┐
│ ⎗  Paste                │
│ ⊕  Add widget...        │
│ ─────────────────────── │
│ ⚙  Dashboard settings   │
└─────────────────────────┘
```

**Implementation:** Blueprint's `ContextMenu2` component wraps each `WidgetWrapper`. The menu items are `MenuItem` components from `@blueprintjs/core`. Keyboard shortcuts are registered via Blueprint's `HotkeysProvider` and only active in edit mode.

### Adding Widgets

Widget palette drawer with search. Click a widget to add it at the first available position with default size. Palette stays open for adding multiple widgets. Also accessible via the empty-area context menu ("Add widget...").

### Configuring Widgets

Right-side config panel opens when "Settings" is selected from the context menu (or when a widget is double-clicked in edit mode). Each widget defines its own config fields. Changes apply immediately, auto-saved.

### Copy / Paste

Widgets can be copied to the clipboard and pasted — within the same dashboard, to a different dashboard, or to a completely different Taistelu-Lokki instance.

**Copy:** Serializes the widget's type, full config, and grid size to the system clipboard as plain text JSON.

**Paste:** Reads the clipboard, validates it contains a recognized widget type, and places a new instance at the first available grid position. New instance ID is generated — it's a copy, not a move.

**Duplicate** is a shortcut for copy+paste in one action — skips the clipboard entirely, just clones the widget.

**What's in the clipboard:**

```json
{
  "type": "map",
  "config": {
    "lat": 60.17,
    "lng": 24.94,
    "zoom": 12,
    "baseLayer": "mml-taustakartta",
    "panZoom": true,
    "aisTracking": true,
    "aisVesselTypes": ["cargo", "tanker", "passenger"]
  },
  "size": { "w": 12, "h": 8 }
}
```

The clipboard content is plain text JSON — portable, inspectable, shareable. Paste it in Slack or save it as a file to build a collection of widget presets.

**Validation on paste:** If the clipboard content is not valid JSON or doesn't have a recognized widget `type`, the paste is silently ignored.

### Dashboard Management

- **Create:** "+ New" in top bar. Blank dashboard with a name.
- **Switch:** Dropdown in top bar.
- **Delete:** In dashboard settings.
- **Duplicate:** Copy existing dashboard as starting point.

### Dashboard Settings

| Setting | Options | Default |
|---------|---------|---------|
| Name | Free text | "Dashboard N" |
| Grid columns | 12 / 16 / 20 / 24 / 32 | 24 |
| Row height | 30 / 40 / 50 / 60 px | 50 |
| Gap | 0 / 2 / 4 / 8 px | 4 |
| Padding | 0 / 4 / 8 / 16 px | 4 |
| Widget borders | None / Subtle / Visible | Subtle |
| Widget headers | Always / Edit-only / Never | Edit-only |

---

## 4. Visual Design

### Principles

1. **Content over chrome.** Minimize borders, headers, gaps. Maximize widget content area.
2. **Color from data, not UI.** Dashboard frame is neutral. Color comes from the widgets themselves.
3. **Dark theme only.**

### Widget Chrome

**View mode:** No borders, no headers, no handles. Widgets separated by gap + background color only.

**Edit mode:** Subtle 1px border to show widget boundaries. Drag handle area at the top. Resize handle in bottom-right corner. Selection ring (2px accent) on the selected widget. Content slightly dimmed. No visible buttons — all actions (settings, copy, delete, etc.) live in the right-click context menu.

### Gaps

Default 4px. Configurable per dashboard (0 / 2 / 4 / 8 px). Larger gaps for wall displays, smaller for dense layouts.

---

## 5. Implementation Notes

### What Stays As-Is

- react-grid-layout core (`DashboardGrid.tsx`)
- Widget registration pattern (`WidgetDescriptor` interface)
- Dashboard CRUD store and API
- Edit/View mode toggle
- Auto-save mechanism (2s debounce)
- Theme system (dark only — CSS custom properties + Blueprint `bp6-dark`)
- Notification system (browser notifications with in-app fallback)
- SWR data fetching with 10s refresh interval

### What Needs Changes

1. **Map widget:** New native OpenLayers widget based on IntelMap codebase — core map rendering, layered feature toggles, progressive config panel. This is the biggest new widget. Reference IntelMap's `src/map/` (init, layers, overlays), `src/ais/`, `src/weather/`, `src/draw/`, `src/radar/`, `src/trains/`, `src/trafficCameras/`, `src/gpx/` for implementation patterns
2. **Widget context menu:** Blueprint `ContextMenu2` on each `WidgetWrapper` — settings, copy, paste, duplicate, z-order, reset size, delete. Also on empty dashboard area for paste and add. Keyboard shortcuts via `HotkeysProvider` (only active in edit mode)
3. **Widget copy/paste:** Serialize selected widget (type + config + size) to clipboard as JSON on copy, deserialize and place on paste. Works cross-dashboard and cross-instance
4. **Query param hook:** `useWidgetParams` wrapping `useSearchParams` — thin pub/sub over URL state
5. **Detail View widget:** New widget that fetches and renders any selected item
6. **Events Feed widget:** New scrolling list with auto-scroll and scroll-lock
7. **External Embed widget:** New iframe wrapper with refresh interval and pointer-events toggle
8. **Data Table evolution:** Make data source selectable instead of hardcoded to Battlelog
9. **Timeline evolution:** Make data source selectable, publish `time` param on scrub
10. **Widget wrapper:** Make header/border conditional on dashboard settings + edit mode, remove visible buttons (context menu replaces them)
11. **Dashboard settings:** Add border style, header visibility, gap size to dashboard model
12. **Dashboard duplicate:** Add copy action to dashboard CRUD

### Build Order

1. **Map widget (core)** — static OpenLayers map with base layer selection, position/zoom config. No interaction yet. Pull map init and layer definitions from IntelMap's `src/map/init.js`, `src/map/layers.js`, `src/config/constants.js`
2. **Map widget (interaction)** — add pan/zoom toggle, click-to-select, query param integration
3. **Map widget (overlays)** — add overlay toggle system, pull from IntelMap's `src/map/overlays.js`
4. **Map widget (tracking)** — add AIS vessel tracking (`src/ais/`), aircraft tracking (`src/aircraft/`), train locations (`src/trains/`), traffic cameras (`src/trafficCameras/`)
5. **Map widget (weather)** — add radar and station overlays from `src/weather/` and `src/radar/`
6. **Map widget (tools)** — add drawing (`src/draw/`), measurement, GPX import (`src/gpx/`), search (`src/search/`)
7. **Widget copy/paste** — clipboard serialization, `Cmd+C`/`Cmd+V` in edit mode
8. **External Embed** — iframe wrapper, straightforward
9. **Events Feed** — new scrolling list widget, validates SWR data flow
10. **Detail View** — new widget, replaces the `EventDetailOverlay` modal with an in-grid widget
11. **Query param hook** — `useWidgetParams`, then wire into Map, Data Table, Detail View, Timeline, Events Feed
12. **Data Table + Timeline evolution** — make data source selectable, add query param integration
13. **Dashboard settings** — border/header/gap configurability
