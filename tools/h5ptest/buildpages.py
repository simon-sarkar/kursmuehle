#!/usr/bin/env python3
"""Build h5p.json (with recursive preloadedDependencies) and an index.html per activity."""
import json, os
BASE = os.environ.get('H5PTEST', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
LIB = f'{BASE}/libs/lib'
CONTENT = os.environ.get('CONTENT', f'{BASE}/content')
WEB = os.environ.get('WEB', f'{BASE}/web')
ROOT = os.path.dirname(os.path.abspath(__file__))  # Wurzel des http.server
rel = lambda p: os.path.relpath(os.path.abspath(p), ROOT)

def deps(name, maj, mi, acc, missing):
    key = f'{name}-{maj}.{mi}'
    if key in acc: return
    p = f'{LIB}/{key}/library.json'
    if not os.path.exists(p):
        missing.add(key); return
    acc[key] = {'machineName': name, 'majorVersion': int(maj), 'minorVersion': int(mi)}
    lj = json.load(open(p))
    for d in lj.get('preloadedDependencies', []):
        deps(d['machineName'], str(d['majorVersion']), str(d['minorVersion']), acc, missing)

for a in sorted(os.listdir(CONTENT)):
    meta = json.load(open(f'{CONTENT}/{a}/meta.json'))
    acc, missing = {}, set()
    for l in meta['libs']:
        n, v = l.split(' '); maj, mi = v.split('.')
        deps(n, maj, mi, acc, missing)
    h5p = {
        'title': meta['name'], 'language': 'de', 'mainLibrary': meta['mainLibrary'],
        'embedTypes': ['div'], 'license': 'U',
        'preloadedDependencies': list(acc.values()),
    }
    json.dump(h5p, open(f'{CONTENT}/{a}/h5p.json', 'w'), ensure_ascii=False, indent=1)
    print(a, 'deps:', len(acc), 'missing:', sorted(missing))
    os.makedirs(f'{WEB}/{a}', exist_ok=True)
    open(f'{WEB}/{a}/index.html', 'w').write(f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>{a}</title>
<style>body{{margin:0;padding:16px;background:#fff;font-family:sans-serif}} #h5p{{max-width:1000px}}</style>
</head><body>
<div id="h5p"></div>
<script src="/node_modules/h5p-standalone/dist/main.bundle.js"></script>
<script>
window.__h5pReady = false; window.__h5pError = null;
new H5PStandalone.H5P(document.getElementById('h5p'), {{
  h5pJsonPath: '/{rel(CONTENT)}/{a}',
  librariesPath: '/{rel(LIB)}',
  frameJs: '/node_modules/h5p-standalone/dist/frame.bundle.js',
  frameCss: '/node_modules/h5p-standalone/dist/styles/h5p.css',
  fullScreen: false,
}}).then(function(){{ window.__h5pReady = true; }}).catch(function(e){{ window.__h5pError = String(e && e.stack || e); console.error('H5P init failed: ' + window.__h5pError); }});
</script>
</body></html>''')
