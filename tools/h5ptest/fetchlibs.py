#!/usr/bin/env python3
"""Clone H5P libraries (exact major.minor) from GitHub into libs/lib/<Name>-<M.m>, recursing preloadedDependencies."""
import json, os, subprocess, sys, re, shutil

BASE = os.environ.get('H5PTEST', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
LIBDIR = f'{BASE}/libs/lib'
REG = json.load(open(f'{BASE}/libs/libraryRegistry.json')) if os.path.exists(f'{BASE}/libs/libraryRegistry.json') else {}  # optional: Registry aus h5p-cli
EXTRA = {
    'Drop': 'https://github.com/h5p/drop',
    'Tether': 'https://github.com/h5p/tether',
    'H5P.TextUtilities': 'https://github.com/otacke/h5p-text-utilities',
}
BRANCH_FALLBACK = ['master', 'release', 'legacy', 'stable']
os.makedirs(LIBDIR, exist_ok=True); os.makedirs(f'{BASE}/libs', exist_ok=True)
log = []

def sh(cmd, cwd=None, check=True):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if check and r.returncode:
        raise RuntimeError(f'{cmd}\n{r.stdout}\n{r.stderr}')
    return r.stdout

def repo_url(name):
    if name in EXTRA: return EXTRA[name]
    e = REG.get(name)
    if e and e.get('repo', {}).get('url'): return e['repo']['url']
    guess = 'h5p-' + re.sub(r'(?<!^)(?=[A-Z])', '-', name.replace('H5P.', '')).lower()
    return f'https://github.com/h5p/{guess}'

def pick_ref(url, maj, mi):
    out = sh(f'git ls-remote --tags --heads {url}.git', check=False)
    tags = [l.split('refs/tags/')[1] for l in out.splitlines() if 'refs/tags/' in l and not l.endswith('^{}')]
    cand = [t for t in tags if re.fullmatch(rf'{maj}\.{mi}\.\d+', t)]
    if cand:
        return max(cand, key=lambda t: int(t.split('.')[2])), 'tag'
    heads = [l.split('refs/heads/')[1] for l in out.splitlines() if 'refs/heads/' in l]
    for b in BRANCH_FALLBACK:
        if b in heads:
            lj = sh(f'curl -sL {url.replace("github.com","raw.githubusercontent.com")}/{b}/library.json', check=False)
            try:
                d = json.loads(lj)
                if str(d['majorVersion']) == maj and str(d['minorVersion']) == mi:
                    return b, 'branch'
            except Exception:
                pass
    return None, None

def fetch(name, maj, mi, seen):
    key = f'{name}-{maj}.{mi}'
    if key in seen: return
    seen.add(key)
    dest = f'{LIBDIR}/{key}'
    if not os.path.isdir(dest):
        url = repo_url(name)
        ref, kind = pick_ref(url, maj, mi)
        if not ref:
            log.append(f'MISSING {key}: no tag/branch for {maj}.{mi} at {url}')
            print(log[-1]); return
        print(f'clone {key} <- {url} @ {ref} ({kind})')
        sh(f'git clone -q --depth 1 --branch {ref} {url}.git {dest}')
        log.append(f'OK {key} <- {url} @ {ref}')
    lj = json.load(open(f'{dest}/library.json'))
    actual = f"{lj['majorVersion']}.{lj['minorVersion']}.{lj['patchVersion']}"
    if str(lj['majorVersion']) != maj or str(lj['minorVersion']) != mi:
        log.append(f'VERSION MISMATCH {key}: library.json says {actual}')
    # build if necessary
    pj = f'{dest}/package.json'
    if os.path.exists(pj):
        p = json.load(open(pj))
        if 'build' in p.get('scripts', {}):
            need = False
            for f in lj.get('preloadedJs', []) + lj.get('preloadedCss', []):
                if not os.path.exists(f"{dest}/{f['path']}"): need = True
            if need:
                print(f'build {key}')
                try:
                    sh('npm ci --no-audit --no-fund 2>&1 || npm install --no-audit --no-fund 2>&1', cwd=dest)
                    sh('npm run build 2>&1', cwd=dest)
                    log.append(f'BUILT {key}')
                except Exception as e:
                    log.append(f'BUILD FAILED {key}: {str(e)[-800:]}')
                    print(log[-1])
    for d in lj.get('preloadedDependencies', []):
        fetch(d['machineName'], str(d['majorVersion']), str(d['minorVersion']), seen)

if __name__ == '__main__':
    seen = set()
    for spec in sys.argv[1:]:
        n, v = spec.split(' ')
        maj, mi = v.split('.')
        fetch(n, maj, mi, seen)
    open(f'{BASE}/libs/fetch.log', 'a').write('\n'.join(log) + '\n')
    print('\n'.join(log))
