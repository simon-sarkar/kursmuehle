#!/usr/bin/env python3
"""Erzeugt Logo, Wortmarke, Banner und Badges der Kursmühle als SVG. Aufruf: python3 docs/make_logo.py"""
import math, os

FG, BG, AC = "#2a2a2a", "#f3e9d8", "#d9a441"
FONT = "Segoe UI, Helvetica Neue, Arial, sans-serif"
HERE = os.path.dirname(os.path.abspath(__file__))


def cog(cx, cy, r_out, r_in, teeth, phase_deg=0.0):
    """Zahnrad als Pfad; phase_deg legt die Mitte des ersten Zahns fest."""
    pts = []
    step = 2 * math.pi / teeth
    for i in range(teeth):
        a0 = math.radians(phase_deg) - step / 2 + i * step
        for frac, r in [(0.0, r_in), (0.2, r_in), (0.3, r_out), (0.7, r_out), (0.8, r_in)]:
            a = a0 + frac * step
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"


def mark(fg, bg, ac, hx=128, hy=98):
    """Mühle: Turm, vier Flügel hinter dem Zahnrad (13 Zähne, ungerade -> nie spiegelsymmetrisch zu den Flügeln),
    dünner Rand in Hintergrundfarbe trennt Rad und Flügel, Nabe in Akzentfarbe, Kacheln als Fenster."""
    sails = "".join(
        f'<g transform="rotate({a} {hx} {hy})"><path d="M{hx-7},{hy-40} L{hx+7},{hy-40} L{hx+15},{hy-96} Q{hx},{hy-108} {hx-15},{hy-96} Z" fill="{fg}"/></g>'
        for a in (45, 135, 225, 315))
    gear = cog(hx, hy, 50, 38, 13, phase_deg=45)
    return f'''<path d="M100,236 L156,236 L147,150 L109,150 Z" fill="{fg}"/>
  {sails}
  <path d="{gear}" fill="{fg}" stroke="{bg}" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="{hx}" cy="{hy}" r="22" fill="{bg}"/>
  <circle cx="{hx}" cy="{hy}" r="9" fill="{ac}"/>
  <rect x="115" y="170" width="12" height="12" rx="3" fill="{bg}"/>
  <rect x="131" y="170" width="12" height="12" rx="3" fill="{bg}"/>
  <rect x="115" y="188" width="12" height="12" rx="3" fill="{bg}"/>
  <rect x="131" y="188" width="12" height="12" rx="3" fill="{ac}"/>'''


def icon(fg, bg, ac):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Kursmühle">\n'
            f'  <rect width="256" height="256" rx="56" fill="{bg}"/>\n  {mark(fg, bg, ac)}\n</svg>')


def wortmarke():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160">
  <g transform="translate(16,16) scale(0.5)"><rect width="256" height="256" rx="56" fill="{FG}"/>{mark(BG, FG, AC)}</g>
  <text x="172" y="86" font-family="{FONT}" font-size="64" font-weight="700" fill="{FG}" letter-spacing="-1">Kursmühle</text>
  <text x="175" y="122" font-family="{FONT}" font-size="22" fill="#6b6257">Lernplattform-Kurse aus einem Prompt</text>
</svg>'''


def banner():
    # Wasserzeichen rechts = dieselbe Mühle wie im Logo (Flügel am Zahnkranz), ohne Turm
    motif = "".join(
        f'<g transform="rotate({a})"><path d="M-10,-66 L10,-66 L22,-144 Q0,-162 -22,-144 Z"/></g>' for a in (45, 135, 225, 315)
    ) + f'<path d="{cog(0, 0, 75, 57, 13, phase_deg=45)}" stroke="{BG}" stroke-width="8" stroke-linejoin="round"/>' 
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300" viewBox="0 0 1200 300" role="img" aria-label="Kursmühle – Lernplattform-Kurse aus einem Prompt">
  <rect width="1200" height="300" rx="18" fill="{BG}"/>
  <g transform="translate(60,46) scale(0.8)"><rect width="256" height="256" rx="56" fill="{FG}"/>{mark(BG, FG, AC)}</g>
  <text x="300" y="150" font-family="{FONT}" font-size="66" font-weight="700" fill="{FG}" letter-spacing="-1">Kursmühle</text>
  <text x="304" y="196" font-family="{FONT}" font-size="25" fill="#3d3833">Lernplattform-Kurse aus einem Prompt</text>
  <g transform="translate(1040,150)" fill="{FG}" opacity="0.07">{motif}<circle r="33" fill="{BG}"/><circle r="14"/></g>
</svg>'''


def badge(left, right, lw, rw, rightfill=AC, rightfg=FG):
    w = lw + rw
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="22" viewBox="0 0 {w} 22" role="img" aria-label="{left}: {right}">
  <rect width="{w}" height="22" rx="5" fill="{FG}"/>
  <rect x="{lw}" width="{rw}" height="22" rx="5" fill="{rightfill}"/><rect x="{lw}" width="6" height="22" fill="{rightfill}"/>
  <text x="{lw/2}" y="15" font-family="{FONT}" font-size="12" font-weight="600" fill="{BG}" text-anchor="middle">{left}</text>
  <text x="{lw+rw/2}" y="15" font-family="{FONT}" font-size="12" font-weight="600" fill="{rightfg}" text-anchor="middle">{right}</text>
</svg>'''


if __name__ == "__main__":
    version = open(os.path.join(HERE, "..", "CHANGELOG.md"), encoding="utf-8").read().split("## ", 2)[1].split(" ")[0]
    files = {
        "logo.svg": icon(BG, FG, AC),          # dunkles Quadrat, helle Mühle (Hauptfassung, wie im Banner)
        "logo-light.svg": icon(FG, BG, AC),    # Creme-Quadrat, dunkle Mühle (für dunkle Flächen)
        "wortmarke.svg": wortmarke(),
        "banner-kursmuehle-v8.svg": banner(),
        "badge-version.svg": badge("Version", version, 62, 48),
        "badge-status.svg": badge("Status", "Tech-Demo → 1.0", 52, 110),
        "badge-lizenz.svg": badge("Lizenz", "nicht kommerziell", 52, 116, BG),
        "badge-plattform.svg": badge("Plattform", "ByCS-Lernplattform · Moodle 5.2", 68, 196, BG),
    }
    for name, svg in files.items():
        open(os.path.join(HERE, name), "w", encoding="utf-8").write(svg + "\n")
    print("ok", version, ", ".join(files))
