"""HTML-Bausteine für Textfelder, Seiten und H5P-Textblöcke (inline-styled, filtersicher).

Nur CSS, das der Filter der ByCS-Lernplattform durchlässt (Tabellen, inline-block, Rahmen, Hintergründe; spec §K).
Das Theme zeichnet einen Rahmen um jede <td>, daher setzt jede Zelle ihren Rahmen explizit.
Der Parser (gen/kursdatei.py) ruft diese Funktionen auf; Python-Kursinhalte (Fallback) können sie direkt importieren.

Designvorlagen: ein Token-Satz je Vorlage (Farben, Rundung, Abstände, Kartenform, Schriftgrößen) in VORLAGEN.
`set_vorlage("schlicht"|"kacheln"|"magazin")` schaltet um (build.py liest `design.vorlage` aus dem Steckbrief);
alle Bausteine lesen die Tokens beim Aufruf aus D. Standard ist „schlicht“, Emojis sind aus.
"""

EMOJI = False   # aus steckbrief design.emoji_marker, gesetzt in build.py

HUE = "#1D5FD1"          # Standard-Akzentfarbe (kurs.md `farbe:` überschreibt sie)

VORLAGEN = {
    # ruhig, weiße Karten mit Haarlinie, leichte Rundung – Standard
    "schlicht": {
        "ink": "#0B1220", "muted": "#5B6475", "line": "#E6E9EF", "line_card": "#E3E7EE",
        "r": 12, "r_lg": 14, "r_sm": 8,          # Rundung: Karten, Banner, kleine Flächen
        "tint": 0.09,                            # Stärke der Akzent-Tönung auf Flächen
        "pad": "14px 18px", "tile_pad": "10px 12px 11px 12px", "gap": 8,
        "tile": "border",                        # Kartenform: weiße Karte mit Haarlinie
        "lead": "1.15em", "h2": "1.3em", "merk": "fill", "kicker": "uppercase",
    },
    # Kacheln: getönte Flächen in der Akzentfarbe, stärkere Rundung, mehr Luft
    "kacheln": {
        "ink": "#0B1220", "muted": "#5B6475", "line": "#E6E9EF", "line_card": "#DDE3EC",
        "r": 18, "r_lg": 22, "r_sm": 10,
        "tint": 0.13,
        "pad": "16px 20px", "tile_pad": "14px 16px 15px 16px", "gap": 10,
        "tile": "tint",                          # Kartenform: getönte Kachel ohne Rahmen
        "lead": "1.18em", "h2": "1.3em", "merk": "fill", "kicker": "uppercase",
    },
    # Magazin: keine Rundung, Linien statt Flächen, mehr Weißraum, größere Einleitungen
    "magazin": {
        "ink": "#17171A", "muted": "#6A6F7A", "line": "#D8DAE0", "line_card": "#17171A",
        "r": 0, "r_lg": 0, "r_sm": 0,
        "tint": 0.05,
        "pad": "16px 22px", "tile_pad": "12px 14px 14px 0", "gap": 14,
        "tile": "rule",                          # Kartenform: Linie oben, keine Fläche
        "lead": "1.28em", "h2": "1.45em", "merk": "outline", "kicker": "uppercase",
    },
}
VORLAGE = "schlicht"
D = dict(VORLAGEN[VORLAGE])


def set_vorlage(name):
    """Token-Satz umschalten. Unbekannte Namen sind ein Fehler (keine stille Rückfalllösung)."""
    global VORLAGE, D, INK, MUTED, LINE, LINE_CARD
    name = (name or "schlicht").strip().lower()
    if name not in VORLAGEN:
        raise ValueError(f"Designvorlage „{name}“ unbekannt (erlaubt: {', '.join(VORLAGEN)})")
    VORLAGE = name
    D = dict(VORLAGEN[name])
    INK, MUTED, LINE, LINE_CARD = D["ink"], D["muted"], D["line"], D["line_card"]


INK = MUTED = LINE = LINE_CARD = ""
set_vorlage(VORLAGE)

TBL = 'style="width:100%;table-layout:fixed;border-collapse:separate;border-spacing:{sp};margin:{m};border:0"'


def _tint(hue, strength=None):
    """Helle Tönung der Akzentfarbe (Flächen hinter Text)."""
    s = D["tint"] if strength is None else strength
    r, g, b = int(hue[1:3], 16), int(hue[3:5], 16), int(hue[5:7], 16)
    f = lambda c: int(255 - (255 - c) * s)
    return f"#{f(r):02x}{f(g):02x}{f(b):02x}"


def _r(key="r"):
    return f"{D[key]}px"


# ---------------------------------------------------------------- Textbausteine
def h2(text, hue=None):
    """Zwischenüberschrift im Lesetext."""
    rule = f'border-bottom:1px solid {D["line"]};padding-bottom:4px;' if VORLAGE == "magazin" else ''
    return (f'<h3 style="font-size:{D["h2"]};font-weight:700;color:{D["ink"]};line-height:1.25;'
            f'margin:22px 0 8px 0;{rule}">{text}</h3>')


def img(name, alt="", caption=None, radius=None):
    """Bild in voller Breite, optional mit Unterschrift."""
    r = D["r"] if radius is None else radius
    pic = (f'<img src="@@PLUGINFILE@@/{name}" alt="{alt}" '
           f'style="width:100%;height:auto;border-radius:{r}px;display:block">')
    if not caption:
        return f'<p>{pic}</p>'
    return (f'<p style="margin:12px 0">{pic}'
            f'<span style="display:block;color:{D["muted"]};font-size:.92em;line-height:1.4;margin-top:6px">{caption}</span></p>')


def img_row(name, alt, html):
    """Bild links (140 px), Text rechts – eine Zeile pro Begriff."""
    return (f'<table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 10px 0;border:0"><tr>'
            f'<td style="border:0;width:150px;padding:0 16px 0 0;vertical-align:middle">'
            f'<img src="@@PLUGINFILE@@/{name}" alt="{alt}" style="width:140px;height:auto;border-radius:{_r("r_sm")};display:block"></td>'
            f'<td style="border:0;vertical-align:middle;line-height:1.5">{html}</td></tr></table>')


def lead(text):
    return f'<p style="font-size:{D["lead"]};line-height:1.5;color:{D["ink"]};margin:14px 0 6px 0">{text}</p>'


def p(text):
    return f'<p style="line-height:1.55;margin:8px 0">{text}</p>'


def highlight(text, hue=HUE):
    """Hervorgehobener Satz (Kernaussage) – Akzentlinie links, getönt, ohne Titel."""
    return (f'<p style="border-left:4px solid {hue};background:{_tint(hue)};padding:10px 16px;margin:14px 0;'
            f'border-radius:0 {_r("r_sm")} {_r("r_sm")} 0;font-size:1.05em;line-height:1.5;color:{D["ink"]}">{text}</p>')


def mark(text, hue=HUE):
    """Inline-Hervorhebung (==so==)."""
    return f'<span style="background:{_tint(hue, 0.18)};padding:0 .25em;border-radius:3px">{text}</span>'


def box(title, html, hue=HUE, bg=None):
    bg = bg or _tint(hue)
    if VORLAGE == "magazin":
        frame = f'border-top:3px solid {hue};border-bottom:1px solid {D["line"]};background:{bg};'
    elif VORLAGE == "kacheln":
        frame = f'background:{bg};border-radius:{_r()};'
    else:
        frame = f'border-left:5px solid {hue};background:{bg};border-radius:0 {_r()} {_r()} 0;'
    return (f'<div style="{frame}padding:{D["pad"]};margin:16px 0">'
            f'<div style="font-weight:700;color:{hue};margin-bottom:6px">{title}</div>{html}</div>')


def steps(items, hue=HUE):
    lis = "".join(
        f'<li style="margin:8px 0;padding-left:6px;line-height:1.5">{it}</li>' for it in items)
    return f'<ol style="padding-left:26px;margin:10px 0">{lis}</ol>'


def schritte(items, hue=HUE, title=""):
    """Schritt-für-Schritt-Anleitung: Nummer im Kreis links, Schritt rechts."""
    trs = []
    for i, it in enumerate(items, 1):
        num = (f'<span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;'
               f'border-radius:{"0" if VORLAGE == "magazin" else "999px"};background:{hue};color:#fff;font-weight:700">{i}</span>')
        trs.append(f'<tr><td style="border:0;width:40px;padding:6px 10px 6px 0;vertical-align:top">{num}</td>'
                   f'<td style="border:0;border-bottom:1px solid {D["line"]};padding:8px 0 10px 0;line-height:1.5;vertical-align:top">{it}</td></tr>')
    head = f'<div style="font-weight:700;color:{D["ink"]};margin:14px 0 4px 0">{title}</div>' if title else ''
    return head + f'<table style="width:100%;border-collapse:collapse;margin:6px 0 14px 0;border:0">{"".join(trs)}</table>'


def bullets(items):
    lis = "".join(f'<li style="margin:6px 0;line-height:1.5">{it}</li>' for it in items)
    return f'<ul style="padding-left:22px;margin:10px 0">{lis}</ul>'


def chips(items, hue=HUE):
    return "".join(
        f'<span style="display:inline-block;border:1.5px solid {hue};color:{hue};border-radius:999px;'
        f'padding:3px 12px;margin:4px 6px 4px 0;font-size:.92em;font-weight:600">{it}</span>' for it in items)


def two_col(left_title, left_html, right_title, right_html, hue_l="#BE123C", hue_r="#15803D"):
    cell = ('<td style="border:0;vertical-align:top;width:50%;padding:12px 14px;border-radius:{r};'
            'background:{bg};border-top:5px solid {hue}"><div style="font-weight:700;color:{hue};'
            'margin-bottom:6px">{t}</div>{h}</td>')
    return ('<table style="width:100%;border-spacing:10px 0;margin:14px -10px;border-collapse:separate;border:0"><tr>'
            + cell.format(bg=_tint(hue_l), hue=hue_l, t=left_title, h=left_html, r=_r())
            + cell.format(bg=_tint(hue_r), hue=hue_r, t=right_title, h=right_html, r=_r())
            + '</tr></table>')


def kv(rows, hue=HUE):
    """Zweispaltig: Begriff (farbig) | Erklärung."""
    trs = "".join(
        f'<tr><td style="border:0;border-bottom:1px solid {D["line"]};padding:8px 12px;font-weight:700;color:{hue};'
        f'white-space:nowrap;vertical-align:top">{k}</td>'
        f'<td style="border:0;border-bottom:1px solid {D["line"]};padding:8px 12px;line-height:1.5">{v}</td></tr>'
        for k, v in rows)
    return f'<table style="width:100%;border-collapse:collapse;margin:12px 0;border:0">{trs}</table>'


def table(header, rows, hue=HUE):
    """Vergleichstabelle mit Kopfzeile und beliebig vielen Spalten; erste Spalte fett."""
    th = "".join(
        f'<td style="border:0;border-bottom:2px solid {hue};padding:8px 8px 8px 0;font-weight:700;color:{hue};'
        f'vertical-align:bottom;line-height:1.3">{h}</td>' for h in header)
    trs = []
    for r in rows:
        tds = "".join(
            f'<td style="border:0;border-bottom:1px solid {D["line"]};padding:8px 8px 8px 0;line-height:1.45;vertical-align:top;'
            f'{"font-weight:700;color:" + D["ink"] if i == 0 else ""}">{c}</td>' for i, c in enumerate(r))
        trs.append(f'<tr>{tds}</tr>')
    # Spaltenbreite nach Inhalt (kein table-layout:fixed), damit vier Spalten auch auf dem Handy lesbar bleiben
    return (f'<table style="width:100%;border-collapse:collapse;margin:12px 0;border:0;font-size:.97em">'
            f'<tr>{th}</tr>{"".join(trs)}</table>')


def merk(text, hue=HUE):
    label = (f'<span style="font-weight:700;letter-spacing:.08em;font-size:.8em;text-transform:uppercase;'
             f'opacity:.85">Merk dir</span><br>')
    if D["merk"] == "outline":
        return (f'<div style="border:2px solid {hue};color:{D["ink"]};padding:{D["pad"]};margin:18px 0;'
                f'font-size:1.08em;line-height:1.5">{label.replace("opacity:.85", f"color:{hue}")}{text}</div>')
    return (f'<div style="background:{hue};color:#fff;border-radius:{_r()};padding:16px 20px;margin:18px 0;'
            f'font-size:1.08em;line-height:1.5">{label}{text}</div>')


def meta_line(parts, hue=HUE):
    return (f'<p style="color:{D["muted"]};font-size:.95em;margin:6px 0 14px 0">'
            + f' <span style="color:{hue};font-weight:700">·</span> '.join(parts) + '</p>')


def banner(title, subtitle="", image=None, alt="", hue=HUE):
    """Kursbanner: großes Bild (optional) + Titel + ein Satz. Erstes Element in Abschnitt 0.
    Ohne Bild ein Block in Akzentfarbe, damit der Kurs auch vor der Bildlieferung fertig aussieht."""
    sub = f'<div style="font-size:1.05em;margin-top:6px;line-height:1.45;color:{{c}}">{subtitle}</div>' if subtitle else ''
    r = _r("r_lg")
    if image:
        pic = (f'<p style="margin:0"><img src="@@PLUGINFILE@@/{image}" alt="{alt or title}" '
               f'style="width:100%;height:auto;display:block;border-radius:{r} {r} 0 0"></p>')
        if VORLAGE == "magazin":
            frame = f'border-top:4px solid {hue};border-bottom:1px solid {D["line"]};'
        else:
            frame = f'border-left:6px solid {hue};background:{_tint(hue)};border-radius:0 0 {r} {r};'
        cell = (f'<td style="border:0;{frame}padding:18px 22px;vertical-align:top">'
                f'<div style="font-size:1.6em;font-weight:800;color:{D["ink"]};line-height:1.15">{title}</div>'
                + sub.format(c=D["muted"]) + '</td>')
    else:
        pic = ''
        cell = (f'<td style="border:0;background:{hue};border-radius:{r};padding:30px 28px;vertical-align:top">'
                f'<div style="font-size:1.7em;font-weight:800;color:#fff;line-height:1.15">{title}</div>'
                + sub.format(c="#E4EAF6") + '</td>')
    return (pic + f'<table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 16px 0;border:0">'
            f'<tr>{cell}</tr></table>')


# ---------------------------------------------------------------- Karten für die Kursseite
def _chip(text, hue, filled=False):
    r = "0" if VORLAGE == "magazin" else "999px"
    if filled:
        return (f'<span style="display:inline-block;background:{hue};color:#fff;border-radius:{r};'
                f'padding:3px 11px;margin:3px 6px 3px 0;font-size:.85em;font-weight:600">{text}</span>')
    return (f'<span style="display:inline-block;border:1.5px solid {hue};color:{hue};border-radius:{r};'
            f'padding:2px 11px;margin:3px 6px 3px 0;font-size:.85em;font-weight:600">{text}</span>')


def _tile_td(inner, hue=None, top=False, left=False, width=None):
    """Eine Kachel der Schritt-, Fahrplan- und Themenfeldleisten – Form nach Vorlage."""
    hue = hue or HUE
    kind = D["tile"]
    if kind == "tint":
        style = f'background:{_tint(hue)};border:0;'
        if top or left:
            style += f'border-top:4px solid {hue};'
    elif kind == "rule":
        style = f'background:#fff;border:0;border-top:2px solid {hue if (top or left) else D["ink"]};'
    else:
        style = f'background:#fff;border:1px solid {D["line_card"]};'
        if top:
            style += f'border-top:4px solid {hue};'
        if left:
            style += f'border-left:5px solid {hue};'
    w = f'width:{width};' if width else ''
    return (f'<td style="{w}vertical-align:top;{style}border-radius:{_r()};padding:{D["tile_pad"]};'
            f'line-height:1.3">{inner}</td>')


def _kicker(text, hue=None):
    return (f'<div style="color:{hue or D["muted"]};font-weight:700;font-size:.82em;letter-spacing:.08em;'
            f'text-transform:{D["kicker"]};margin:12px 0 8px 0">{text}</div>')


def _strip(cells):
    g = D["gap"]
    return f'<table {TBL.format(sp=f"{g}px 0", m=f"0 -{g}px 6px -{g}px")}><tr>{"".join(cells)}</tr></table>'


def le_card(num, title, subtitle, duration, steps, hue):
    """Kopfkarte einer Lerneinheit plus Schrittleiste. steps: (label, detail[, emoji]).
    title None: kompakte Karte nur mit Dauer und Phasen (wenn das Banner den Titel schon trägt)."""
    cells = []
    for i, (label, detail, *em) in enumerate(steps, 1):
        icon = f'<span style="font-size:1.25em;vertical-align:middle;margin-right:6px">{em[0]}</span>' if (em and em[0] and EMOJI) else ''
        inner = (f'<div style="font-weight:700;color:{D["ink"]}">{icon}<span style="color:{hue};font-size:.85em;margin-right:5px">{i}</span>{label}</div>'
                 f'<div style="color:{D["muted"]};font-size:.88em;margin-top:3px">{detail}</div>')
        cells.append(_tile_td(inner, hue))
    strip = _strip(cells)
    if title is None:
        head = _kicker(f'Ablauf{" · " + duration if duration else ""}', hue).replace("margin:12px 0 8px 0", "margin:4px 0 6px 0")
        return head + strip
    r = _r("r_lg")
    if VORLAGE == "magazin":
        frame, numcell = f'border-top:4px solid {hue};border-bottom:1px solid {D["line"]};', f'border:0;padding:14px 10px 14px 0;'
    else:
        frame, numcell = f'background:{_tint(hue)};border-radius:{r};', f'border:0;border-left:6px solid {hue};border-radius:{r} 0 0 {r};padding:14px 10px 14px 20px;'
    head = (
        f'<table style="width:100%;border-collapse:separate;border-spacing:0;{frame}margin:2px 0 10px 0;border:0"><tr>'
        f'<td style="{numcell}vertical-align:top;width:64px">'
        f'<div style="font-size:2.6em;font-weight:800;color:{hue};line-height:1">{num}</div></td>'
        f'<td style="border:0;padding:14px 20px 14px 8px;vertical-align:top">'
        f'<div style="font-size:1.3em;font-weight:700;color:{D["ink"]};line-height:1.2">{title}</div>'
        f'<div style="color:{D["muted"]};margin-top:4px;line-height:1.4">{subtitle}</div>'
        f'<div style="margin-top:8px">{_chip(duration, hue)}</div>'
        f'</td></tr></table>')
    return head + strip


def fahrplan(items, hue, heading="Dein Weg durch das Themenfeld"):
    """items: (num, title, duration, emoji)"""
    cells = []
    for num, title, dur, icon in items:
        ic = f'<span style="font-size:1.25em;vertical-align:middle">{icon}</span> ' if (EMOJI and icon) else ''
        inner = (f'<div>{ic}'
                 f'<span style="color:{hue};font-weight:700;font-size:.78em;letter-spacing:.08em;vertical-align:middle">LERNEINHEIT {num}</span></div>'
                 f'<div style="font-weight:700;color:{D["ink"]};margin-top:4px">{title}</div>'
                 f'<div style="color:{D["muted"]};font-size:.88em;margin-top:4px">{dur}</div>')
        cells.append(_tile_td(inner, hue, top=True))
    return _kicker(heading) + _strip(cells)


def tf_strip(tfs, heading="Die acht Themenfelder", per_row=4):
    """tfs: (num, title, hue, full, emoji) – Kacheln in Reihen zu je per_row."""
    cells = []
    for num, title, hue, full, icon in tfs:
        tag = _chip("ausgearbeitet", hue, filled=True) if full else _chip("exemplarisch", "#9AA3B5")
        ic = f'<span style="font-size:1.3em;vertical-align:middle">{icon}</span> ' if (EMOJI and icon) else ''
        inner = (f'<div>{ic}'
                 f'<span style="color:{hue};font-weight:800;vertical-align:middle">{num:02d}</span></div>'
                 f'<div style="font-weight:600;color:{D["ink"]};margin-top:3px;font-size:.95em">{title}</div>'
                 f'<div style="margin-top:4px">{tag}</div>')
        cells.append(_tile_td(inner, hue, left=True))
    rows = "".join(f'<tr>{"".join(cells[i:i + per_row])}</tr>' for i in range(0, len(cells), per_row))
    g = D["gap"]
    return _kicker(heading) + f'<table {TBL.format(sp=f"{g}px {g}px", m=f"0 -{g}px 0 -{g}px")}>{rows}</table>'


def tf_info(kompetenz, les, note, hue):
    """Leitkompetenz links, Lerneinheiten rechts, optionale Anmerkung darunter."""
    rows = "".join(
        f'<tr><td style="border:0;border-bottom:1px solid {D["line"]};padding:7px 10px 7px 0;color:{hue};font-weight:700;'
        f'white-space:nowrap;vertical-align:top;width:48px">LE {i+1}</td>'
        f'<td style="border:0;border-bottom:1px solid {D["line"]};padding:7px 0;line-height:1.4">{t}</td></tr>'
        for i, t in enumerate(les))
    note_html = f'<div style="color:{D["muted"]};font-size:.9em;margin-top:8px">{note}</div>' if note else ""
    if VORLAGE == "magazin":
        frame = f'border-top:3px solid {hue};padding:12px 0'
    else:
        frame = f'background:{_tint(hue)};border-radius:{_r()};padding:12px 16px;border-left:5px solid {hue}'
    return (f'<table style="width:100%;border-collapse:separate;border-spacing:0;margin:8px 0 4px 0;border:0"><tr>'
            f'<td style="border:0;vertical-align:top;width:40%;padding:0 16px 0 0">'
            f'<div style="{frame}">'
            f'{_kicker("Leitkompetenz", hue).replace("margin:12px 0 8px 0", "margin:0 0 4px 0")}'
            f'<div style="line-height:1.45">{kompetenz}</div></div></td>'
            f'<td style="border:0;vertical-align:top;padding:0">'
            f'<table style="width:100%;border-collapse:collapse;border:0">{rows}</table>{note_html}</td>'
            f'</tr></table>')
