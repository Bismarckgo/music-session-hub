// CST — DAW Watcher (MIE Fase 4)
// Observa carpetas de proyectos de DAW y emite eventos al endpoint firmado
// /api/public/daw/ingest. Funciona offline: encola en disco y sincroniza al
// reconectar.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DAW_BY_EXT = {
  '.als': 'Ableton Live',
  '.logicx': 'Logic Pro',
  '.flp': 'FL Studio',
  '.ptx': 'Pro Tools',
  '.cpr': 'Cubase',
  '.rpp': 'Reaper',
  '.band': 'GarageBand',
  '.song': 'Studio One',
  '.bwproject': 'Bitwig Studio',
};
const PROJECT_EXTS = Object.keys(DAW_BY_EXT);
const BOUNCE_EXTS = ['.wav', '.aiff', '.aif', '.mp3', '.flac'];

const POLL_MS = 15000;
const FLUSH_MS = 20000;

function defaultRoots() {
  const home = os.homedir();
  return [
    path.join(home, 'Music'),
    path.join(home, 'Documents'),
    path.join(home, 'Music', 'Ableton'),
    path.join(home, 'Music', 'Logic'),
    path.join(home, 'Documents', 'Image-Line', 'FL Studio', 'Projects'),
    path.join(home, 'Documents', 'Pro Tools'),
  ].filter((p) => safeExists(p));
}

function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch (err) {
    console.warn('[CST watcher] no se pudo escribir', file, err.message);
  }
}

/**
 * @param {{ dataDir: string, appUrl: string, onStatus?: (s: any) => void }} opts
 */
function createDawWatcher(opts) {
  const dataDir = opts.dataDir;
  const configFile = path.join(dataDir, 'cst-watcher.json');
  const stateFile = path.join(dataDir, 'cst-watcher-state.json');
  const queueFile = path.join(dataDir, 'cst-watcher-queue.json');

  let config = readJson(configFile, null);
  if (!config) {
    config = {
      enabled: true,
      // Pega aquí tu ID de usuario y el secreto de ingesta (Configuración → DAW Watcher en la app)
      userId: '',
      secret: '',
      endpoint: `${opts.appUrl.replace(/\/$/, '')}/api/public/daw/ingest`,
      folders: defaultRoots(),
      maxDepth: 4,
    };
    writeJson(configFile, config);
  }
  if (!config.endpoint) {
    config.endpoint = `${opts.appUrl.replace(/\/$/, '')}/api/public/daw/ingest`;
  }

  /** @type {Record<string, { mtime: number, bounces?: number }>} */
  let seen = readJson(stateFile, {});
  /** @type {any[]} */
  let queue = readJson(queueFile, []);
  let timer = null;
  let flushTimer = null;
  let flushing = false;

  function status(extra) {
    if (opts.onStatus) {
      opts.onStatus({ configFile, queued: queue.length, tracked: Object.keys(seen).length, ...extra });
    }
  }

  function walk(dir, depth, out) {
    if (depth > (config.maxDepth ?? 4)) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();
      // Logic/GarageBand projects are bundles (directories)
      if (PROJECT_EXTS.includes(ext)) {
        out.push(full);
        continue;
      }
      if (entry.isDirectory()) walk(full, depth + 1, out);
    }
  }

  function projectMtime(projectPath) {
    try {
      const st = fs.statSync(projectPath);
      if (!st.isDirectory()) return st.mtimeMs;
      // Bundle: usa el mtime más reciente de su contenido
      let latest = st.mtimeMs;
      for (const name of fs.readdirSync(projectPath)) {
        try {
          const child = fs.statSync(path.join(projectPath, name));
          if (child.mtimeMs > latest) latest = child.mtimeMs;
        } catch {
          /* ignore */
        }
      }
      return latest;
    } catch {
      return 0;
    }
  }

  function countBounces(projectPath) {
    const parent = path.dirname(projectPath);
    let count = 0;
    const candidates = [parent, path.join(parent, 'Bounces'), path.join(parent, 'Bounced Files'), path.join(parent, 'Exports')];
    for (const dir of candidates) {
      try {
        for (const name of fs.readdirSync(dir)) {
          if (BOUNCE_EXTS.includes(path.extname(name).toLowerCase())) count++;
        }
      } catch {
        /* ignore */
      }
    }
    return count;
  }

  function projectName(projectPath) {
    return path.basename(projectPath, path.extname(projectPath));
  }

  function enqueue(event) {
    queue.push({ ...event, client_event_id: crypto.randomUUID() });
    writeJson(queueFile, queue);
    status({ lastEvent: event.event });
  }

  function scan() {
    if (!config.enabled) return;
    const folders = (config.folders && config.folders.length ? config.folders : defaultRoots()).filter(safeExists);
    /** @type {string[]} */
    const projects = [];
    for (const folder of folders) walk(folder, 0, projects);

    for (const projectPath of projects) {
      const ext = path.extname(projectPath).toLowerCase();
      const daw = DAW_BY_EXT[ext] ?? 'Desconocido';
      const mtime = projectMtime(projectPath);
      const bounces = countBounces(projectPath);
      const prev = seen[projectPath];

      if (!prev) {
        enqueue({
          event: 'project_detected',
          daw,
          project_name: projectName(projectPath),
          project_path: projectPath,
          started_at: new Date(mtime || Date.now()).toISOString(),
        });
      } else if (mtime > prev.mtime + 1000) {
        enqueue({
          event: 'session_saved',
          daw,
          project_name: projectName(projectPath),
          project_path: projectPath,
          started_at: new Date(mtime).toISOString(),
        });
      }

      if (prev && bounces > (prev.bounces ?? 0)) {
        enqueue({
          event: 'bounce_exported',
          daw,
          project_name: projectName(projectPath),
          project_path: projectPath,
          bounce_count: bounces,
          started_at: new Date().toISOString(),
        });
      }

      seen[projectPath] = { mtime, bounces };
    }
    writeJson(stateFile, seen);
  }

  async function flush() {
    if (flushing || queue.length === 0) return;
    if (!config.userId || !config.secret) {
      status({ warning: 'Falta userId o secret en cst-watcher.json' });
      return;
    }
    flushing = true;
    try {
      while (queue.length > 0) {
        const event = queue[0];
        const body = JSON.stringify(event);
        const signature = crypto.createHmac('sha256', config.secret).update(body).digest('hex');
        let res;
        try {
          res = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-cst-user-id': config.userId,
              'x-cst-signature': signature,
            },
            body,
          });
        } catch {
          // Sin conexión: conserva la cola para el próximo intento.
          status({ offline: true });
          break;
        }
        if (res.status >= 500) {
          status({ warning: `Servidor respondió ${res.status}; se reintentará` });
          break;
        }
        // 2xx o 4xx (payload inválido) → se descarta para no bloquear la cola.
        queue.shift();
        writeJson(queueFile, queue);
        if (!res.ok) status({ warning: `Evento rechazado (${res.status})` });
      }
    } finally {
      flushing = false;
      status({});
    }
  }

  return {
    configFile,
    start() {
      if (!config.enabled) {
        status({ disabled: true });
        return;
      }
      scan();
      flush();
      timer = setInterval(scan, POLL_MS);
      flushTimer = setInterval(flush, FLUSH_MS);
      status({ started: true });
    },
    stop() {
      if (timer) clearInterval(timer);
      if (flushTimer) clearInterval(flushTimer);
      timer = null;
      flushTimer = null;
    },
  };
}

module.exports = { createDawWatcher, DAW_BY_EXT };