#!/usr/bin/env python3
"""Render each activity in Chromium via h5p-standalone, collect console errors, interact, screenshot."""
import json, os, sys, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get('H5PTEST', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
CONTENT = os.environ.get('CONTENT', f'{BASE}/content')
SHOTS = os.environ.get('SHOTS', f'{BASE}/shots')
WEB = os.environ.get('WEB', f'{BASE}/web')
BS_PATH = [int(x) for x in os.environ.get('BS_PATH', '1').split(',')]
REPORT = os.environ.get('REPORT', f'{BASE}/report.json')
PORT = int(os.environ.get('PORT', '8765'))
only = sys.argv[1:]
os.makedirs(SHOTS, exist_ok=True)
report = {}

def shot(page, name, n, full=True):
    p = f'{SHOTS}/{name}_{n}.png'
    page.screenshot(path=p, full_page=full)
    return p

def wait_ready(page):
    page.wait_for_function('window.__h5pReady || window.__h5pError', timeout=60000)
    page.wait_for_timeout(1500)

def rects(page, sel):
    return page.evaluate('''(sel)=>[...document.querySelectorAll(sel)].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,text:(e.innerText||'').trim().slice(0,60),vis:!!(r.width&&r.height)&&getComputedStyle(e).visibility!=='hidden'}})''', sel)

def overlaps(a, b):
    return not (a['x']+a['w'] <= b['x'] or b['x']+b['w'] <= a['x'] or a['y']+a['h'] <= b['y'] or b['y']+b['h'] <= a['y'])

def clipped(page, sel):
    """elements whose scrollWidth/Height exceed client box (text cut off) with overflow hidden"""
    return page.evaluate('''(sel)=>[...document.querySelectorAll(sel)].filter(e=>{const cs=getComputedStyle(e);return (cs.overflow==='hidden'||cs.overflowY==='hidden'||cs.overflowX==='hidden')&&(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2)}).map(e=>({cls:e.className.toString().slice(0,80),sh:e.scrollHeight,ch:e.clientHeight,sw:e.scrollWidth,cw:e.clientWidth,text:(e.innerText||'').trim().slice(0,50)}))''', sel)

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for a in sorted(os.listdir(CONTENT)):
        if only and a not in only: continue
        meta = json.load(open(f'{CONTENT}/{a}/meta.json'))
        name = f"{a}_{meta['mainLibrary'].split('.')[-1]}"
        r = {'name': meta['name'], 'lib': f"{meta['mainLibrary']} {meta['major']}.{meta['minor']}", 'console': [], 'pageerrors': [], 'failed_requests': [], 'notes': [], 'shots': []}
        report[a] = r
        ctx = browser.new_context(viewport={'width': 1100, 'height': 900}, locale='de-DE')
        page = ctx.new_page()
        page.on('console', lambda m, r=r: r['console'].append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e, r=r: r['pageerrors'].append(str(e)))
        page.on('requestfailed', lambda q, r=r: r['failed_requests'].append(q.url))
        page.on('response', lambda resp, r=r: r['failed_requests'].append(f'{resp.status} {resp.url}') if resp.status >= 400 else None)
        page.goto(f'http://127.0.0.1:{PORT}/{os.path.basename(WEB)}/{a}/index.html')
        try:
            wait_ready(page)
        except Exception as e:
            r['notes'].append(f'timeout waiting for H5P init: {e}')
        r['init_error'] = page.evaluate('window.__h5pError')
        fr = page.frames[1] if len(page.frames) > 1 else page.main_frame
        r['frames'] = [f.url for f in page.frames]
        r['rendered'] = fr.evaluate('''()=>{const c=document.querySelector('.h5p-content, .h5p-container');return !!c && c.getBoundingClientRect().height>50}''')
        r['shots'].append(shot(page, name, 0))
        try:
            lib = meta['mainLibrary']
            if lib == 'H5P.InteractiveBook':
                # chapters in side menu
                titles = fr.evaluate('''()=>[...document.querySelectorAll('.h5p-interactive-book-navigation-chapter-button, .section-button')].map(e=>(e.classList.contains('section-button')?'  - ':'')+e.innerText.trim())''')
                r['notes'].append(f'chapters in menu: {titles}')
                # close cover if present
                cover = fr.query_selector('.h5p-interactive-book-cover-readbutton button, .h5p-interactive-book-cover-readbutton')
                if cover:
                    cover.click(); page.wait_for_timeout(800)
                n = 1
                r['shots'].append(shot(page, name, n)); n += 1
                for i in range(12):
                    nxt = fr.query_selector('.h5p-interactive-book-status-header .h5p-theme-next:not([disabled]), .h5p-theme-next:not([disabled])')
                    if not nxt: break
                    nxt.click(); page.wait_for_timeout(900)
                    r['shots'].append(shot(page, name, n)); n += 1
                r['notes'].append(f'pages visited: {n-1}')
                r['clipped'] = clipped(fr, '.h5p-interactive-book-chapter *')
                r['images'] = fr.evaluate('''()=>[...document.querySelectorAll('.h5p-image img, img.h5p-image')].map(i=>({src:i.getAttribute('src').split('/').slice(-2).join('/'),ok:i.complete&&i.naturalWidth>0,w:i.naturalWidth,h:i.naturalHeight,dispW:Math.round(i.getBoundingClientRect().width)}))''')
                r['blanks'] = fr.evaluate('''()=>[...document.querySelectorAll('.h5p-blanks')].map(b=>({inputs:b.querySelectorAll('input.h5p-text-input').length, tips:b.querySelectorAll('.h5p-blanks-tip, .joubel-tip-container, .h5p-tip-container').length, rawStars:(b.innerText.match(/\\*/g)||[]).length}))''')
            elif lib == 'H5P.BranchingScenario':
                n = 1
                start = fr.query_selector('.h5p-start-button')
                if start:
                    start.click(); page.wait_for_timeout(1200)
                    r['shots'].append(shot(page, name, n)); n += 1
                else:
                    r['notes'].append('no start button found')
                path = []
                for i in range(15):
                    page.wait_for_timeout(300)
                    # branching question?
                    alts = fr.query_selector_all('.h5p-branching-question-alternative')
                    if alts:
                        t = fr.evaluate('''()=>[...document.querySelectorAll('.h5p-branching-question-alternative')].map(e=>e.innerText.trim().slice(0,50))''')
                        path.append(f'Q: {t}')
                        qi = sum(1 for x in path if x.startswith('Q:')) - 1
                        choice = BS_PATH[qi] if qi < len(BS_PATH) else 0
                        path[-1] += f' => pick {choice}'
                        alts[min(choice, len(alts)-1)].click(); page.wait_for_timeout(1200)
                        r['shots'].append(shot(page, name, n)); n += 1
                        continue
                    end = fr.query_selector('.h5p-end-screen:not(.h5p-hidden), .h5p-branching-scenario-end-screen:not(.h5p-hidden)')
                    if end and end.is_visible():
                        path.append('END'); r['shots'].append(shot(page, name, n)); n += 1; break
                    btn = fr.query_selector('.h5p-proceed-button:visible, .h5p-nav-button-wrapper:visible')
                    if btn:
                        title = fr.evaluate('''()=>{const e=document.querySelector('.h5p-current-screen .h5p-branching-scenario-screen-title, .h5p-current-screen h1, .h5p-current-screen .h5p-branching-scenario-title');return e?e.innerText.trim():''}''')
                        path.append(f'content: {title}')
                        btn.click(); page.wait_for_timeout(1200)
                        r['shots'].append(shot(page, name, n)); n += 1
                        continue
                    r['notes'].append('no interactive element found, stopping'); break
                r['notes'].append('path: ' + ' -> '.join(path))
            elif lib == 'H5P.DragQuestion':
                dr = [x for x in rects(fr, '.h5p-draggable') ]
                dz = [x for x in rects(fr, '.h5p-dropzone')]
                r['notes'].append(f'draggables: {len(dr)} visible={sum(1 for x in dr if x["vis"])}; dropzones: {len(dz)} visible={sum(1 for x in dz if x["vis"])}')
                ov = []
                items = [('drag', x) for x in dr] + [('zone', x) for x in dz]
                for i in range(len(items)):
                    for j in range(i+1, len(items)):
                        if overlaps(items[i][1], items[j][1]):
                            ov.append(f"{items[i][0]} '{items[i][1]['text']}' x {items[j][0]} '{items[j][1]['text']}'")
                r['overlaps'] = ov
                r['clipped'] = clipped(fr, '.h5p-draggable, .h5p-dropzone')
                r['draggables'] = dr; r['dropzones'] = dz
                r['shots'].append(shot(page, name, 1))
            elif lib == 'H5P.QuestionSet':
                btn = fr.query_selector('button.h5p-theme-quiz, .qs-startbutton button')
                if btn:
                    btn.click(); page.wait_for_timeout(1000)
                q = fr.evaluate('''()=>{const e=[...document.querySelectorAll('.h5p-question-introduction')].find(e=>e.offsetHeight>0);return e?e.innerText.trim().slice(0,200):''}''')
                r['notes'].append(f'first question: {q!r}')
                r['shots'].append(shot(page, name, 1))
                # click through all questions
                n = 2
                for i in range(20):
                    nxt = fr.query_selector('.h5p-theme-next:visible:not(.h5p-visibility-hidden), .qs-footer .next:visible')
                    if not nxt: break
                    nxt.click(); page.wait_for_timeout(700)
                    r['shots'].append(shot(page, name, n)); n += 1
                r['notes'].append(f'question screens visited: {n-1}')
            elif lib == 'H5P.Blanks':
                r['blanks'] = fr.evaluate('''()=>[...document.querySelectorAll('.h5p-blanks')].map(b=>({inputs:b.querySelectorAll('input.h5p-text-input').length, tips:b.querySelectorAll('.h5p-blanks-tip, .joubel-tip-container, .h5p-tip-container').length, rawStars:(b.innerText.match(/\\*/g)||[]).length, text:b.innerText.slice(0,300)}))''')
                tip = fr.query_selector('.h5p-blanks-tip, .joubel-tip-container, .h5p-tip-container')
                if tip:
                    tip.click(); page.wait_for_timeout(600)
                    r['notes'].append('tip text: ' + fr.evaluate('''()=>{const e=document.querySelector('.h5p-blanks-tip-text, .joubel-tip-text, .h5p-tip-text, [class*=tip] [class*=text]');return e?e.innerText.trim().slice(0,80):'(not found)'}'''))
                r['shots'].append(shot(page, name, 1))
                r['clipped'] = clipped(fr, '.h5p-blanks *')
            elif lib == 'H5P.Dialogcards':
                txt = fr.evaluate('''()=>[...document.querySelectorAll('.h5p-dialogcards-card-text')].map(e=>e.innerText.trim().slice(0,60))''')
                r['notes'].append(f'card texts: {txt[:3]}')
                turn = fr.query_selector('button.h5p-theme-flip, .h5p-dialogcards-turn')
                if turn:
                    turn.click(); page.wait_for_timeout(800)
                    r['shots'].append(shot(page, name, 1))
                nxt = fr.query_selector('button.h5p-theme-next, .h5p-dialogcards-next')
                if nxt:
                    nxt.click(); page.wait_for_timeout(800)
                    r['shots'].append(shot(page, name, 2))
                r['clipped'] = clipped(fr, '.h5p-dialogcards-card-content *')
        except Exception as e:
            r['notes'].append(f'interaction error: {e}')
            r['shots'].append(shot(page, name, 99))
        r['console_after'] = list(r['console'])
        ctx.close()
    browser.close()

json.dump(report, open(REPORT, 'w'), ensure_ascii=False, indent=1)
for a, r in report.items():
    print('=' * 60); print(a, r['name'], r['lib'])
    print(' rendered:', r.get('rendered'), 'init_error:', r.get('init_error'))
    print(' pageerrors:', r['pageerrors'])
    print(' console:', [c for c in r['console'] if 'favicon' not in c])
    print(' failed_requests:', r['failed_requests'])
    for k in ('overlaps', 'clipped', 'images', 'blanks'):
        if k in r: print(f' {k}:', r[k])
    for n in r['notes']: print(' note:', n)
    print(' shots:', [os.path.basename(s) for s in r['shots']])
