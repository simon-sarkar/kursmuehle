"""HTML-Bausteine für Textfelder, Seiten und H5P-Textblöcke (inline-styled, filtersicher).

Nur CSS, das der Filter der ByCS-Lernplattform durchlässt (Tabellen, inline-block, Rahmen, Hintergründe).
Das Theme zeichnet einen Rahmen um jede <td>, daher setzt jede Zelle ihren Rahmen explizit.
Der Parser (gen/kursdatei.py) ruft diese Funktionen auf; Python-Kursinhalte (Fallback) können sie direkt importieren.
"""

EMOJI = False   # aus steckbrief design.emoji_marker, gesetzt in build.py

INK = "#0B1220"
MUTED = "#5B6475"
LINE = "#E6E9EF"
LINE_CARD = "#E3E7EE"
HUE = "#1D5FD1"          # Standard-Akzentfarbe

TBL = 'style="width:100%;table-layout:fixed;border-collapse:separate;border-spacing:{sp};margin:{m};border:0"'


# ---------------------------------------------------------------- Textbausteine
def img(name, alt="", radius=12):
    return (f'<p><img src="@@PLUGINFILE@@/{name}" alt="{alt}" '
            f'style="width:100%;height:auto;border-radius:{radius}px;display:block"></p>')


def img_row(name, alt, html):
    """Bild links (140 px), Text rechts – eine Zeile pro Begriff."""
    return (f'<table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 10px 0;border:0"><tr>'
            f'<td style="border:0;width:150px;padding:0 16px 0 0;vertical-align:middle">'
            f'<img src="@@PLUGINFILE@@/{name}" alt="{alt}" style="width:140px;height:auto;border-radius:10px;display:block"></td>'
            f'<td style="border:0;vertical-align:middle;line-height:1.5">{html}</td></tr></table>')


def lead(text):
    return f'<p style="font-size:1.15em;line-height:1.5;color:{INK};margin:14px 0 6px 0">{text}</p>'


def p(text):
    return f'<p style="line-height:1.55;margin:8px 0">{text}</p>'


def box(title, html, hue=HUE, bg="#F4F7FB"):
    return (f'<div style="border-left:5px solid {hue};background:{bg};border-radius:0 12px 12px 0;'
            f'padding:14px 18px;margin:16px 0">'
            f'<div style="font-weight:700;color:{hue};margin-bottom:6px">{title}</div>{html}</div>')


def steps(items, hue=HUE):
    lis = "".join(
        f'<li style="margin:8px 0;padding-left:6px;line-height:1.5">{it}</li>' for it in items)
    return f'<ol style="padding-left:26px;margin:10px 0">{lis}</ol>'


def bullets(items):
    lis = "".join(f'<li style="margin:6px 0;line-height:1.5">{it}</li>' for it in items)
    return f'<ul style="padding-left:22px;margin:10px 0">{lis}</ul>'


def chips(items, hue=HUE):
    return "".join(
        f'<span style="display:inline-block;border:1.5px solid {hue};color:{hue};border-radius:999px;'
        f'padding:3px 12px;margin:4px 6px 4px 0;font-size:.92em;font-weight:600">{it}</span>' for it in items)


def two_col(left_title, left_html, right_title, right_html, hue_l="#BE123C", hue_r="#15803D"):
    cell = ('<td style="border:0;vertical-align:top;width:50%;padding:12px 14px;border-radius:12px;'
            'background:{bg};border-top:5px solid {hue}"><div style="font-weight:700;color:{hue};'
            'margin-bottom:6px">{t}</div>{h}</td>')
    return ('<table style="width:100%;border-spacing:10px 0;margin:14px -10px;border-collapse:separate;border:0"><tr>'
            + cell.format(bg="#FDF2F4", hue=hue_l, t=left_title, h=left_html)
            + cell.format(bg="#F1F8F3", hue=hue_r, t=right_title, h=right_html)
            + '</tr></table>')


def kv(rows, hue=HUE):
    trs = "".join(
        f'<tr><td style="border:0;border-bottom:1px solid {LINE};padding:8px 12px;font-weight:700;color:{hue};'
        f'white-space:nowrap;vertical-align:top">{k}</td>'
        f'<td style="border:0;border-bottom:1px solid {LINE};padding:8px 12px;line-height:1.5">{v}</td></tr>'
        for k, v in rows)
    return f'<table style="width:100%;border-collapse:collapse;margin:12px 0;border:0">{trs}</table>'


def merk(text, hue=HUE):
    return (f'<div style="background:{hue};color:#fff;border-radius:12px;padding:16px 20px;margin:18px 0;'
            f'font-size:1.08em;line-height:1.5"><span style="font-weight:700;letter-spacing:.08em;'
            f'font-size:.8em;text-transform:uppercase;opacity:.85">Merk dir</span><br>{text}</div>')


def meta_line(parts, hue=HUE):
    return (f'<p style="color:{MUTED};font-size:.95em;margin:6px 0 14px 0">'
            + ' <span style="color:{hue};font-weight:700">·</span> '.replace("{hue}", hue).join(parts) + '</p>')


def banner(title, subtitle="", image=None, alt="", hue=HUE):
    """Kursbanner: großes Bild (optional) + Titel + ein Satz. Erstes Element in Abschnitt 0.
    Ohne Bild ein Block in Akzentfarbe, damit der Kurs auch vor der Bildlieferung fertig aussieht."""
    sub = f'<div style="font-size:1.05em;margin-top:6px;line-height:1.45;color:{{c}}">{subtitle}</div>' if subtitle else ''
    if image:
        pic = (f'<p style="margin:0"><img src="@@PLUGINFILE@@/{image}" alt="{alt or title}" '
               f'style="width:100%;height:auto;display:block;border-radius:14px 14px 0 0"></p>')
        cell = (f'<td style="border:0;border-left:6px solid {hue};background:{_tint(hue)};border-radius:0 0 14px 14px;'
                f'padding:18px 22px;vertical-align:top">'
                f'<div style="font-size:1.6em;font-weight:800;color:{INK};line-height:1.15">{title}</div>'
                + sub.format(c=MUTED) + '</td>')
    else:
        pic = ''
        cell = (f'<td style="border:0;background:{hue};border-radius:14px;padding:30px 28px;vertical-align:top">'
                f'<div style="font-size:1.7em;font-weight:800;color:#fff;line-height:1.15">{title}</div>'
                + sub.format(c="#E4EAF6") + '</td>')
    return (pic + f'<table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 16px 0;border:0">'
            f'<tr>{cell}</tr></table>')


# ---------------------------------------------------------------- Karten für die Kursseite
def _chip(text, hue, filled=False):
    if filled:
        return (f'<span style="display:inline-block;background:{hue};color:#fff;border-radius:999px;'
                f'padding:3px 11px;margin:3px 6px 3px 0;font-size:.85em;font-weight:600">{text}</span>')
    return (f'<span style="display:inline-block;border:1.5px solid {hue};color:{hue};border-radius:999px;'
            f'padding:2px 11px;margin:3px 6px 3px 0;font-size:.85em;font-weight:600">{text}</span>')


def _tint(hue):
    r, g, b = int(hue[1:3], 16), int(hue[3:5], 16), int(hue[5:7], 16)
    f = lambda c: int(255 - (255 - c) * 0.09)
    return f"#{f(r):02x}{f(g):02x}{f(b):02x}"


def _tile_td(inner, hue=None, top=False, left=False, width=None):
    border = f'border:1px solid {LINE_CARD};'
    if top:
        border += f'border-top:4px solid {hue};'
    if left:
        border += f'border-left:5px solid {hue};'
    w = f'width:{width};' if width else ''
    return (f'<td style="{w}vertical-align:top;background:#fff;{border}border-radius:12px;padding:10px 12px 11px 12px;'
            f'line-height:1.3">{inner}</td>')


def _kicker(text, hue=MUTED):
    return (f'<div style="color:{hue};font-weight:700;font-size:.82em;letter-spacing:.08em;'
            f'text-transform:uppercase;margin:12px 0 8px 0">{text}</div>')


def le_card(num, title, subtitle, duration, steps, hue):
    """Kopfkarte einer Lerneinheit plus Schrittleiste. steps: (label, detail[, emoji])"""
    tint = _tint(hue)
    head = (
        f'<table style="width:100%;border-collapse:separate;border-spacing:0;background:{tint};'
        f'border-radius:14px;margin:2px 0 10px 0;border:0"><tr>'
        f'<td style="border:0;border-left:6px solid {hue};border-radius:14px 0 0 14px;padding:14px 10px 14px 20px;vertical-align:top;width:64px">'
        f'<div style="font-size:2.6em;font-weight:800;color:{hue};line-height:1">{num}</div></td>'
        f'<td style="border:0;padding:14px 20px 14px 8px;vertical-align:top">'
        f'<div style="font-size:1.3em;font-weight:700;color:{INK};line-height:1.2">{title}</div>'
        f'<div style="color:{MUTED};margin-top:4px;line-height:1.4">{subtitle}</div>'
        f'<div style="margin-top:8px">{_chip(duration, hue)}</div>'
        f'</td></tr></table>')
    cells = []
    for i, (label, detail, *em) in enumerate(steps, 1):
        icon = f'<span style="font-size:1.25em;vertical-align:middle;margin-right:6px">{em[0]}</span>' if (em and em[0] and EMOJI) else ''
        inner = (f'<div style="font-weight:700;color:{INK}">{icon}<span style="color:{hue};font-size:.85em;margin-right:5px">{i}</span>{label}</div>'
                 f'<div style="color:{MUTED};font-size:.88em;margin-top:3px">{detail}</div>')
        cells.append(_tile_td(inner))
    strip = f'<table {TBL.format(sp="8px 0", m="0 -8px 6px -8px")}><tr>{"".join(cells)}</tr></table>'
    return head + strip


def fahrplan(items, hue, heading="Dein Weg durch das Themenfeld"):
    """items: (num, title, duration, emoji)"""
    cells = []
    for num, title, dur, icon in items:
        ic = f'<span style="font-size:1.25em;vertical-align:middle">{icon}</span> ' if (EMOJI and icon) else ''
        inner = (f'<div>{ic}'
                 f'<span style="color:{hue};font-weight:700;font-size:.78em;letter-spacing:.08em;vertical-align:middle">LERNEINHEIT {num}</span></div>'
                 f'<div style="font-weight:700;color:{INK};margin-top:4px">{title}</div>'
                 f'<div style="color:{MUTED};font-size:.88em;margin-top:4px">{dur}</div>')
        cells.append(_tile_td(inner, hue, top=True))
    return _kicker(heading) + f'<table {TBL.format(sp="8px 0", m="0 -8px 8px -8px")}><tr>{"".join(cells)}</tr></table>'


def tf_strip(tfs, heading="Die acht Themenfelder", per_row=4):
    """tfs: (num, title, hue, full, emoji) – Kacheln in Reihen zu je per_row."""
    cells = []
    for num, title, hue, full, icon in tfs:
        tag = _chip("ausgearbeitet", hue, filled=True) if full else _chip("exemplarisch", "#9AA3B5")
        ic = f'<span style="font-size:1.3em;vertical-align:middle">{icon}</span> ' if (EMOJI and icon) else ''
        inner = (f'<div>{ic}'
                 f'<span style="color:{hue};font-weight:800;vertical-align:middle">{num:02d}</span></div>'
                 f'<div style="font-weight:600;color:{INK};margin-top:3px;font-size:.95em">{title}</div>'
                 f'<div style="margin-top:4px">{tag}</div>')
        cells.append(_tile_td(inner, hue, left=True))
    rows = "".join(f'<tr>{"".join(cells[i:i + per_row])}</tr>' for i in range(0, len(cells), per_row))
    return _kicker(heading) + f'<table {TBL.format(sp="8px 8px", m="0 -8px 0 -8px")}>{rows}</table>'


def tf_info(kompetenz, les, note, hue):
    """Leitkompetenz links, Lerneinheiten rechts, optionale Anmerkung darunter."""
    rows = "".join(
        f'<tr><td style="border:0;border-bottom:1px solid {LINE_CARD};padding:7px 10px 7px 0;color:{hue};font-weight:700;'
        f'white-space:nowrap;vertical-align:top;width:48px">LE {i+1}</td>'
        f'<td style="border:0;border-bottom:1px solid {LINE_CARD};padding:7px 0;line-height:1.4">{t}</td></tr>'
        for i, t in enumerate(les))
    note_html = f'<div style="color:{MUTED};font-size:.9em;margin-top:8px">{note}</div>' if note else ""
    return (f'<table style="width:100%;border-collapse:separate;border-spacing:0;margin:8px 0 4px 0;border:0"><tr>'
            f'<td style="border:0;vertical-align:top;width:40%;padding:0 16px 0 0">'
            f'<div style="background:{_tint(hue)};border-radius:12px;padding:12px 16px;border-left:5px solid {hue}">'
            f'{_kicker("Leitkompetenz", hue).replace("margin:12px 0 8px 0", "margin:0 0 4px 0")}'
            f'<div style="line-height:1.45">{kompetenz}</div></div></td>'
            f'<td style="border:0;vertical-align:top;padding:0">'
            f'<table style="width:100%;border-collapse:collapse;border:0">{rows}</table>{note_html}</td>'
            f'</tr></table>')
