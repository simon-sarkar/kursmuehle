"""Render design assets (banners, mock screenshots, badge) HTML -> PNG with Playwright."""
import asyncio
import math
import os

from playwright.async_api import async_playwright


INK = "#0B1220"
INK2 = "#141C2E"
PAPER = "#FFFFFF"
MUTED = "#8B93A5"
HUES = {0: "#1D5FD1", 1: "#1D5FD1", 2: "#6D28D9", 3: "#0F766E", 4: "#15803D",
        5: "#B45309", 6: "#BE123C", 7: "#4F46E5", 8: "#C2410C"}

BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.disp{font-family:'Inter Display','Inter',sans-serif}
"""


def _motif(hue, seed, w, h, kind, xr=None, zoom=None):
    """Abstract geometric accent, deterministic per section. xr: rechte Bezugskante des Motivs (Standard w = rechts im
    Banner; Motivmitte liegt etwa bei xr - 270). zoom: SVG-transform für die ganze Gruppe (Kachel)."""
    xr = w if xr is None else xr
    parts = []
    if kind == "rings":
        cx, cy = xr - 260, h / 2
        for i in range(6):
            r = 40 + i * 42
            parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{hue}" '
                         f'stroke-opacity="{0.9 - i*0.13:.2f}" stroke-width="{10 - i}"/>')
    elif kind == "dots":
        for gx in range(10):
            for gy in range(6):
                r = 4 + ((gx * 7 + gy * 3 + seed) % 9)
                parts.append(f'<circle cx="{xr-460+gx*44}" cy="{h/2-110+gy*44}" r="{r}" '
                             f'fill="{hue}" fill-opacity="{0.35+((gx+gy)%4)*0.18:.2f}"/>')
    elif kind == "bars":
        for i in range(9):
            bh = 60 + (math.sin(i * 1.3 + seed) + 1) * 110
            parts.append(f'<rect x="{xr-470+i*48}" y="{h/2-bh/2}" width="30" height="{bh}" rx="15" '
                         f'fill="{hue}" fill-opacity="{0.4+ (i%3)*0.25:.2f}"/>')
    elif kind == "arcs":
        for i in range(5):
            r = 90 + i * 55
            parts.append(f'<path d="M {xr-140} {h/2+r} A {r} {r} 0 0 1 {xr-140-r} {h/2}" fill="none" '
                         f'stroke="{hue}" stroke-opacity="{0.95-i*0.17:.2f}" stroke-width="14" stroke-linecap="round"/>')
    elif kind == "grid":
        for gx in range(7):
            for gy in range(4):
                if (gx + gy + seed) % 3:
                    parts.append(f'<rect x="{xr-480+gx*62}" y="{h/2-110+gy*62}" width="46" height="46" rx="10" '
                                 f'fill="{hue}" fill-opacity="{0.3+((gx*gy)%3)*0.25:.2f}"/>')
    elif kind == "waves":
        for i in range(5):
            y = h / 2 - 90 + i * 45
            d = f"M {xr-520} {y} " + " ".join(
                f"Q {xr-520+ j*70+35} {y + (-30 if (j+i)%2 else 30)} {xr-520+(j+1)*70} {y}" for j in range(6))
            parts.append(f'<path d="{d}" fill="none" stroke="{hue}" stroke-opacity="{0.95-i*0.17:.2f}" stroke-width="10" stroke-linecap="round"/>')
    elif kind == "tris":
        for i in range(6):
            s = 70 + (i % 3) * 30
            xx, yy = xr - 480 + (i % 3) * 150, h / 2 - 100 + (i // 3) * 150
            parts.append(f'<polygon points="{xx},{yy+s} {xx+s/2},{yy} {xx+s},{yy+s}" fill="{hue}" '
                         f'fill-opacity="{0.35+(i%4)*0.18:.2f}"/>')
    elif kind == "lines":
        for i in range(12):
            parts.append(f'<line x1="{xr-520+i*38}" y1="{h/2-130}" x2="{xr-380+i*38}" y2="{h/2+130}" '
                         f'stroke="{hue}" stroke-opacity="{0.25+(i%4)*0.2:.2f}" stroke-width="12" stroke-linecap="round"/>')
    g = "".join(parts)
    if zoom:
        g = f'<g transform="{zoom}">{g}</g>'
    return f'<svg width="{w}" height="{h}" style="position:absolute;inset:0">{g}</svg>'


KINDS = {0: "rings", 1: "rings", 2: "dots", 3: "waves", 4: "arcs", 5: "bars", 6: "grid", 7: "tris", 8: "lines"}


def banner_html(num, title, subtitle, chips, w=1600, h=420, hue=None, kicker=None, small=False, kind=None):
    hue = hue or HUES.get(num, HUES[0])
    kind = kind or KINDS.get(num, "rings")
    numeral = f'<div class="disp" style="font-size:{"150px" if not small else "96px"};font-weight:800;color:{hue};line-height:.9;letter-spacing:-.04em">{num:02d}</div>' if isinstance(num, int) and num > 0 else ""
    chip_html = "".join(f'<span style="display:inline-block;border:1.5px solid rgba(255,255,255,.28);color:#D7DCE6;border-radius:999px;padding:8px 16px;font-size:{"20px" if not small else "17px"};margin-right:10px;letter-spacing:.01em">{c}</span>' for c in chips)
    kick = f'<div style="color:{hue};font-weight:700;font-size:{"22px" if not small else "18px"};letter-spacing:.14em;text-transform:uppercase;margin-bottom:14px">{kicker}</div>' if kicker else ""
    return f"""<html><head><style>{BASE_CSS}</style></head><body>
<div id="shot" style="width:{w}px;height:{h}px;background:linear-gradient(135deg,{INK} 0%,{INK2} 100%);position:relative;overflow:hidden;color:#fff">
{_motif(hue, num if isinstance(num,int) else 0, w, h, kind)}
<div style="position:absolute;left:0;top:0;bottom:0;width:14px;background:{hue}"></div>
<div style="position:absolute;left:72px;top:0;bottom:0;display:flex;align-items:center;gap:48px;max-width:{w-560}px">
  {numeral}
  <div>
    {kick}
    <div class="disp" style="font-size:{"66px" if not small else "46px"};font-weight:700;line-height:1.05;letter-spacing:-.02em;max-width:{w-760}px">{title}</div>
    <div style="font-size:{"27px" if not small else "22px"};color:#B9C0CE;margin-top:16px;max-width:{w-760}px;line-height:1.35">{subtitle}</div>
    <div style="margin-top:{"30px" if not small else "20px"}">{chip_html}</div>
  </div>
</div>
</div></body></html>"""


KACHEL_ZOOM = {"rings": (1.0, 0, 0), "arcs": (1.2, 30, -160), "waves": (1.35, 40, 0), "lines": (1.15, -15, 0)}


def kachel_html(num, hue=None, w=900, h=600, kind=None):
    """Kachelbild ohne Text: dunkler Grund der Banner, Motiv in der Akzentfarbe mittig (format_tiles schneidet cover auf
    die Kachel zu, der Rand darf verloren gehen). num wählt Motiv und Farbe aus der Folge, damit jeder Abschnitt ein eigenes
    Bild bekommt."""
    hue = hue or HUES.get(num % len(HUES) or 1, HUES[1])
    kind = kind or KINDS.get((num - 1) % 8 + 1, "rings")
    glow = f"radial-gradient(circle at 50% 50%,{hue}33 0%,transparent 62%)"
    # Motiv mittig und größer (Kachel wird klein angezeigt); arcs ist ein Viertelkreis, sein Schwerpunkt liegt unten links
    z, dx, dy = KACHEL_ZOOM.get(kind, (1.25, 0, 0))
    zoom = f"translate({w / 2 + dx} {h / 2 + dy}) scale({z}) translate({-w / 2} {-h / 2})"
    return f"""<html><head><style>{BASE_CSS}</style></head><body>
<div id="shot" style="width:{w}px;height:{h}px;background:{glow},linear-gradient(135deg,{INK} 0%,{INK2} 100%);position:relative;overflow:hidden">
{_motif(hue, num, w, h, kind, xr=w / 2 + 270, zoom=zoom)}
</div></body></html>"""


def serp_html(query):
    res = [
        ("ad", "Neues Smartphone ab 1 €* – jetzt Vertrag sichern", "mobilfunk-deal24.de", "",
         "Top-Smartphones mit Vertrag. Nur heute: Wechselbonus 100 €. Jetzt zuschlagen – Angebot endet bald!*"),
        ("org", "Smartphone lädt nicht oder lädt langsam – Ursachen und Lösungen", "support.nordvia.de", "› hilfe › akku",
         "Prüfe zuerst Kabel und Netzteil mit einem anderen Gerät. Entferne Staub aus der Ladebuchse. Wenn das Gerät warm ist, lädt es aus Sicherheitsgründen langsamer …"),
        ("org", "Handy lädt nicht mehr, Akku bleibt bei 80 % – was tun?", "frag-die-community.de", "› smartphones",
         "12 Antworten · Beste Antwort: Bei mir war es die Einstellung „Akkuschutz“, die bei 80 % stoppt. Einstellungen → Akku → Ladelimit ausschalten. Hat bei 3 Leuten hier geholfen."),
        ("org", "7 GENIALE Tricks, die dein Handy SOFORT wieder laden lassen!!!", "techblitz-news.net", "› lifehacks",
         "Trick Nr. 4 wird dich umhauen! Diese Methode kennt fast niemand – und sie funktioniert bei JEDEM Handy. 14. März 2019"),
        ("video", "Ladebuchse reinigen in 2 Minuten – ohne Werkzeugschaden", "tube-howto.de", "· 3:12",
         "Zahnstocher aus Holz, nicht aus Metall. Gerät vorher ausschalten. Zeigt den Vorgang Schritt für Schritt."),
        ("org", "Lithium-Ionen-Akkumulator – Wikipedia", "de.wikipedia.org", "› wiki",
         "Ein Lithium-Ionen-Akkumulator ist ein Akkumulator auf Basis von Lithium-Verbindungen in allen drei Phasen der elektrochemischen Zelle …"),
    ]
    items = []
    for kind, title, dom, path, snip in res:
        label = '<span style="font-weight:700;color:#1F2937;margin-right:8px">Anzeige</span>' if kind == "ad" else ""
        vid = '<span style="display:inline-block;background:#111;color:#fff;font-size:12px;padding:2px 6px;border-radius:4px;margin-right:8px">▶ Video</span>' if kind == "video" else ""
        items.append(f"""<div style="margin:0 0 28px 0;max-width:680px">
  <div style="font-size:14px;color:#202124;display:flex;align-items:center;gap:8px"><span style="width:26px;height:26px;border-radius:50%;background:#e8eaed;display:inline-block"></span>{label}<span>{dom}</span><span style="color:#5f6368">{path}</span></div>
  <div style="font-size:21px;color:#1a0dab;margin:6px 0 4px 0;line-height:1.3">{vid}{title}</div>
  <div style="font-size:15px;color:#4d5156;line-height:1.5">{snip}</div>
</div>""")
    return f"""<html><head><style>{BASE_CSS}</style></head><body>
<div id="shot" style="width:900px;background:#fff;padding:0 0 10px 0">
<div style="display:flex;align-items:center;gap:28px;padding:22px 40px;border-bottom:1px solid #e3e5e8">
  <div class="disp" style="font-size:26px;font-weight:800;color:#1D5FD1">Suche</div>
  <div style="flex:0 0 560px;height:46px;border:1px solid #dfe1e5;border-radius:24px;box-shadow:0 1px 6px rgba(32,33,36,.18);display:flex;align-items:center;padding:0 20px;font-size:17px;color:#202124">{query}<span style="margin-left:auto;color:#4285f4;font-size:20px">⌕</span></div>
</div>
<div style="padding:12px 40px 0 40px;font-size:14px;color:#5f6368;display:flex;gap:26px"><span style="color:#1a73e8;border-bottom:3px solid #1a73e8;padding-bottom:8px">Alle</span><span>Bilder</span><span>Videos</span><span>News</span><span>Shopping</span><span style="margin-left:auto">Tools ▾</span></div>
<div style="padding:20px 40px 0 40px;font-size:14px;color:#70757a">Ungefähr 1.240.000 Ergebnisse (0,41 Sekunden)</div>
<div style="padding:24px 40px 0 40px">{"".join(items)}</div>
</div></body></html>"""


def chat_html(messages, title="KI-Assistent", w=1100):
    """messages: list of (role, html)."""
    rows = []
    for role, html in messages:
        if role == "user":
            rows.append(f'<div style="display:flex;justify-content:flex-end;margin:18px 0"><div style="max-width:70%;background:#1D5FD1;color:#fff;border-radius:18px 18px 4px 18px;padding:14px 18px;font-size:18px;line-height:1.45">{html}</div></div>')
        else:
            rows.append(f'<div style="display:flex;gap:14px;margin:18px 0"><div style="width:38px;height:38px;border-radius:50%;background:#0B1220;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex:none">KI</div><div style="max-width:78%;background:#F3F4F6;color:#111827;border-radius:18px 18px 18px 4px;padding:14px 18px;font-size:18px;line-height:1.5">{html}</div></div>')
    return f"""<html><head><style>{BASE_CSS} ol,ul{{padding-left:22px;margin:8px 0}} li{{margin:4px 0}} p{{margin:6px 0}}</style></head><body>
<div id="shot" style="width:{w}px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
<div style="padding:16px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px"><div style="width:12px;height:12px;border-radius:50%;background:#22c55e"></div><div style="font-weight:600;font-size:17px;color:#111827">{title}</div><div style="margin-left:auto;color:#9ca3af;font-size:14px">Neuer Chat</div></div>
<div style="padding:10px 28px 24px 28px">{"".join(rows)}</div>
<div style="margin:0 28px 24px 28px;border:1px solid #e5e7eb;border-radius:14px;padding:14px 18px;color:#9ca3af;font-size:17px">Nachricht schreiben …</div>
</div></body></html>"""


def clickbait_html():
    return f"""<html><head><style>{BASE_CSS}</style></head><body>
<div id="shot" style="width:1100px;background:#fff">
<div style="background:#ff2d55;color:#fff;padding:12px 30px;font-weight:800;font-size:18px;display:flex;justify-content:space-between"><span>⚡ TECHBLITZ NEWS</span><span>Angebot endet in 09:58 ▮</span></div>
<div style="padding:28px 30px 10px 30px">
 <div class="disp" style="font-size:40px;font-weight:800;line-height:1.1;color:#111">7 GENIALE Tricks, die dein Handy SOFORT wieder laden lassen!!!</div>
 <div style="color:#888;font-size:15px;margin-top:10px">von Redaktion · Gesponsert · <span style="color:#ff2d55">1,2 Mio. Leser</span></div>
 <div style="margin:22px 0;height:260px;border-radius:12px;background:linear-gradient(135deg,#ffe4ea,#ffd166);display:flex;align-items:center;justify-content:center;color:#b91c1c;font-weight:800;font-size:30px;text-align:center;padding:20px">„Handy-Hersteller HASSEN diesen Trick“</div>
 <p style="font-size:19px;line-height:1.6;color:#222">Ein Schüler aus Bayern hat zufällig entdeckt, wie man den Akku <b>dauerhaft auf 100 %</b> hält. Experten sind sprachlos. Und das Beste: Es kostet dich nur <b>heute</b> nichts …</p>
 <div style="margin:18px 0;background:#ff2d55;color:#fff;text-align:center;padding:18px;border-radius:10px;font-weight:800;font-size:22px">JETZT TRICK FREISCHALTEN ➜ (nur noch 3 Plätze)</div>
 <div style="font-size:15px;color:#444;margin-top:16px"><b>★★★★★ Lisa M.:</b> „Funktioniert sofort!!“ &nbsp; <b>★★★★★ Kevin R.:</b> „Unglaublich, danke!!!“ &nbsp; <b>★★★★★ Anna_99:</b> „Hab’s allen geschickt“</div>
 <div style="font-size:13px;color:#aaa;margin-top:26px;border-top:1px solid #eee;padding-top:10px">Startseite · Datenschutz · Kontakt</div>
</div>
</div></body></html>"""


def badge_html(label="Problemlösen", hue="#1D5FD1", sub="Alltagskompetenz"):
    return f"""<html><head><style>{BASE_CSS}</style></head><body style="background:transparent">
<div id="shot" style="width:600px;height:600px;position:relative;background:transparent">
<svg width="600" height="600" viewBox="0 0 600 600" style="position:absolute;inset:0">
 <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{hue}"/><stop offset="1" stop-color="#0B1220"/></linearGradient></defs>
 <circle cx="300" cy="300" r="290" fill="url(#g)"/>
 <circle cx="300" cy="300" r="252" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="6" stroke-dasharray="28 16"/>
 <circle cx="300" cy="300" r="205" fill="#0B1220" fill-opacity=".55"/>
 <path d="M 215 310 L 275 370 L 395 240" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
<div class="disp" style="position:absolute;left:0;right:0;top:420px;text-align:center;color:#fff;font-weight:800;font-size:40px;letter-spacing:-.01em">{label}</div>
<div style="position:absolute;left:0;right:0;top:470px;text-align:center;color:#D7DCE6;font-weight:600;font-size:21px;letter-spacing:.12em;text-transform:uppercase">{sub}</div>
</div></body></html>"""


async def _render(jobs):
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        page = await browser.new_page(device_scale_factor=1)
        for html, out, scale in jobs:
            await page.set_content(html)
            await page.wait_for_timeout(50)
            el = await page.query_selector("#shot")
            await el.screenshot(path=out, omit_background=True, scale="css" if scale == 1 else "device")
        await browser.close()


def render_all(jobs):
    """jobs: list of (html, out_path[, scale])"""
    jobs = [(j[0], j[1], j[2] if len(j) > 2 else 1) for j in jobs]
    asyncio.run(_render(jobs))
