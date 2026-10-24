#!/usr/bin/env python3
"""Erzeugt Logo, Wortmarke, Banner und Badges der Kursmühle als SVG. Aufruf: python3 docs/make_logo.py"""
import math, os

FG, BG, AC = "#2a2a2a", "#f3e9d8", "#d9a441"
FONT = "Segoe UI, Helvetica Neue, Arial, sans-serif"
TEETH, PHASE = 10, 54.0  # Zahnrad: Zähnezahl und Mitte des ersten Zahns (Grad, SVG-Winkel ab +x im Uhrzeigersinn)
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


def mark(fg, bg, ac, hx=128, hy=98, gap=5, kontur=True, css=False):
    """Mühle: Turm, vier Flügel hinter dem Zahnrad, dünner Rand in Hintergrundfarbe trennt Rad und Flügel,
    Nabe in Akzentfarbe, Kacheln als Fenster. Zahnrad: 10 Zähne, Phase 54° -> jeder Flügel sitzt auf einer
    Zahnflanke mit einem Zahn direkt daneben; gegenüberliegende Flügel gleich, links/rechts und oben/unten
    gespiegelt (Simon 24.10.2026, Variante B). Bei anderer Zähnezahl müsste die Phase neu bestimmt werden.
    gap = Breite des Trennrands: 5 für helle Mühle auf dunklem Grund, 4 für dunkle Mühle auf hellem Grund
    (heller Spalt wirkt optisch breiter als dunkler, Simon 24.10.2026).
    AP13.2: Flügel und Zahnrad bilden die Gruppe `rad` (dreht sich auf der Landingpage um die Nabe hx/hy); Turm, Fenster
    und Nabe liegen außerhalb, die Fenster unter den Flügeln. Die Flügel haben eine Kontur in Hintergrundfarbe
    (`kontur`), damit sie sich beim Drehen nicht mit dem Turm vermischen: doppelte Breite hinter der Füllung
    (paint-order), sichtbar ist also derselbe Rand wie am Zahnrad, und ruhend bleibt das Bild gleich.
    css=True: Klassen statt Farben für die eingebettete Fassung (fg/bg/ac sind dann Klassennamen), Farben und
    Randbreite setzt das CSS der Seite."""
    if css:
        rad, f_fg, f_bg, f_ac = 'class="rad"', f'class="{fg}"', f'class="{bg}"', f'class="{ac}"'
        f_zahn, f_fluegel = f'class="{fg} l-k"', f'class="{fg} l-kf"'
    else:
        rad, f_fg, f_bg, f_ac = 'id="rad"', f'fill="{fg}"', f'fill="{bg}"', f'fill="{ac}"'
        f_zahn = f'fill="{fg}" stroke="{bg}" stroke-width="{gap}" stroke-linejoin="round"'
        f_fluegel = f_fg + (f' stroke="{bg}" stroke-width="{2 * gap}" stroke-linejoin="round" paint-order="stroke"'
                            if kontur else "")
    sails = "".join(
        f'<g transform="rotate({a} {hx} {hy})"><path d="M{hx-7},{hy-40} L{hx+7},{hy-40} L{hx+15},{hy-96} Q{hx},{hy-108} {hx-15},{hy-96} Z" {f_fluegel}/></g>'
        for a in (45, 135, 225, 315))
    gear = cog(hx, hy, 50, 38, TEETH, phase_deg=PHASE)
    return f'''<path d="M100,236 L156,236 L147,150 L109,150 Z" {f_fg}/>
  <rect x="115" y="170" width="12" height="12" rx="3" {f_bg}/>
  <rect x="131" y="170" width="12" height="12" rx="3" {f_bg}/>
  <rect x="115" y="188" width="12" height="12" rx="3" {f_bg}/>
  <rect x="131" y="188" width="12" height="12" rx="3" {f_ac}/>
  <g {rad}>{sails}
  <path d="{gear}" {f_zahn}/></g>
  <circle cx="{hx}" cy="{hy}" r="22" {f_bg}/>
  <circle cx="{hx}" cy="{hy}" r="9" {f_ac}/>'''


def icon(fg, bg, ac, gap=5, kontur=True):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Kursmühle">\n'
            f'  <rect width="256" height="256" rx="56" fill="{bg}"/>\n  {mark(fg, bg, ac, gap=gap, kontur=kontur)}\n</svg>')


def icon_inline():
    """Logo für die Kacheln der Landingpage und des Impressums (AP13.2), inline, damit sich die Gruppe `rad` drehen
    kann; Farben über die Klassen l-m (Mühle), l-g (Grund), l-a (Akzent), l-k/l-kf (Rand), siehe CSS der Seiten."""
    return ('<svg class="logo" viewBox="0 0 256 256" aria-hidden="true" focusable="false">'
            '<rect width="256" height="256" rx="56" class="l-g"/>' + mark("l-m", "l-g", "l-a", css=True) + '</svg>')


def einbetten(name):
    """Schreibt icon_inline() in docs/<name> zwischen <!-- logo --> und <!-- /logo --> (jede Stelle)."""
    pfad = os.path.join(HERE, name)
    teile = open(pfad, encoding="utf-8").read().split("<!-- logo -->")
    for i in range(1, len(teile)):
        teile[i] = icon_inline() + teile[i][teile[i].index("<!-- /logo -->"):]
    open(pfad, "w", encoding="utf-8").write("<!-- logo -->".join(teile))


def wortmarke():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160">
  <g transform="translate(16,16) scale(0.5)"><rect width="256" height="256" rx="56" fill="{FG}"/>{mark(BG, FG, AC)}</g>
  <text x="172" y="86" font-family="{FONT}" font-size="64" font-weight="700" fill="{FG}" letter-spacing="-1">Kursmühle</text>
  <text x="175" y="122" font-family="{FONT}" font-size="22" fill="#6b6257">für die ByCS-Lernplattform</text>
</svg>'''


def motiv():
    """Wasserzeichen-Motiv: dieselbe Mühle wie im Logo ohne Turm, exakt 1,5-fach (Flügelfuß 40 -> 60, Rad 50 -> 75), um
    den Nullpunkt; Trennrand 5 statt proportional 8, sonst wirken die Flügel bei 7 % Deckung zu weit vom Rad getrennt
    (Simon 24.10.2026). Banner und Oberfläche (wasserzeichen.svg) nutzen es."""
    return "".join(
        f'<g transform="rotate({a})"><path d="M-10.5,-60 L10.5,-60 L22.5,-144 Q0,-162 -22.5,-144 Z"/></g>' for a in (45, 135, 225, 315)
    ) + f'<path d="{cog(0, 0, 75, 57, TEETH, phase_deg=PHASE)}" stroke="{BG}" stroke-width="5" stroke-linejoin="round"/>' \
      + f'<circle r="33" fill="{BG}"/><circle r="14"/>'


def banner():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300" viewBox="0 0 1200 300" role="img" aria-label="Kursmühle – für die ByCS-Lernplattform">
  <rect width="1200" height="300" rx="18" fill="{BG}"/>
  <g transform="translate(60,46) scale(0.8)"><rect width="256" height="256" rx="56" fill="{FG}"/>{mark(BG, FG, AC)}</g>
  <text x="300" y="150" font-family="{FONT}" font-size="66" font-weight="700" fill="{FG}" letter-spacing="-1">Kursmühle</text>
  <text x="304" y="196" font-family="{FONT}" font-size="25" fill="#3d3833">für die ByCS-Lernplattform</text>
  <g transform="translate(1040,150)" fill="{FG}" opacity="0.07">{motiv()}</g>
</svg>'''


def wasserzeichen():
    """Motiv des Banners allein, Anthrazit mit 7 % Deckung auf Creme; die Oberfläche (web/) legt es rechts unter die
    Knöpfe (Desktop und iPad)."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="330" height="330" viewBox="-165 -165 330 330" aria-hidden="true">
  <g fill="{FG}" opacity="0.07">{motiv()}</g>
</svg>'''


def muster(rapport, deckung=0.06):
    """Seitenhintergrund der Oberfläche (AP12a): das Motiv des Wasserzeichens gekachelt, zwei Motive je Kachel diagonal
    versetzt, Anthrazit mit `deckung`. `rapport` = Kantenlänge der Kachel in px; die Oberfläche legt Karten und Flächen
    opak darüber, das Muster bleibt in den Zwischenräumen. AP13 (Befund des Autors 24.10.: „locker“ zu blass und zu
    klein): Deckung 6 statt 4 %, Rapport 260 und 170 statt 200 und 130."""
    m = rapport * 0.32 / 330            # Motiv (330 Einheiten breit) auf etwa ein Drittel der Kachel
    a, b = rapport / 4, rapport * 3 / 4
    teil = lambda x, y: f'<g transform="translate({x:.1f},{y:.1f}) scale({m:.4f})">{motiv()}</g>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{rapport}" height="{rapport}" viewBox="0 0 {rapport} {rapport}" aria-hidden="true">
  <g fill="{FG}" opacity="{deckung}">{teil(a, a)}{teil(b, b)}</g>
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
        "logo-light.svg": icon(FG, BG, AC, gap=4),  # Creme-Quadrat, dunkle Mühle (für dunkle Flächen), schmalerer Rand
        "wortmarke.svg": wortmarke(),
        "banner-kursmuehle-v10.svg": banner(),
        "wasserzeichen.svg": wasserzeichen(),
        "muster-locker.svg": muster(260),        # Standard der Oberfläche (AP12a, kräftiger seit AP13)
        "muster-dicht.svg": muster(170),
        "badge-version.svg": badge("Version", version, 62, 48),
        "badge-status.svg": badge("Status", "Beta", 52, 48),          # Stufe der neuesten Version (2.x Beta)
        "badge-lizenz.svg": badge("Lizenz", "nicht kommerziell", 52, 116, BG),
        "badge-plattform.svg": badge("Plattform", "ByCS-Lernplattform · Moodle 5.2", 68, 196, BG),
    }
    for name, svg in files.items():
        open(os.path.join(HERE, name), "w", encoding="utf-8").write(svg + "\n")
    for name in ("index.html", "impressum.html"):
        einbetten(name)
    print("ok", version, ", ".join(files), "+ Logo in index.html, impressum.html")
