"""Light HTML cards for the course page. Purifier-safe CSS only (tables, inline-block, borders, backgrounds).
The ByCS-Lernplattform theme draws a border around every <td>, so every cell sets its border explicitly."""

EMOJI = True   # set from steckbrief design.emoji_marker in build.py

INK = "#0B1220"
MUTED = "#5B6475"
LINE = "#E3E7EE"

TBL = 'style="width:100%;table-layout:fixed;border-collapse:separate;border-spacing:{sp};margin:{m};border:0"'


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
    border = f'border:1px solid {LINE};'
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
    """Head card of a Lerneinheit + step strip. steps: (label, detail[, emoji])"""
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
        icon = f'<span style="font-size:1.25em;vertical-align:middle;margin-right:6px">{em[0]}</span>' if (em and EMOJI) else ''
        inner = (f'<div style="font-weight:700;color:{INK}">{icon}<span style="color:{hue};font-size:.85em;margin-right:5px">{i}</span>{label}</div>'
                 f'<div style="color:{MUTED};font-size:.88em;margin-top:3px">{detail}</div>')
        cells.append(_tile_td(inner))
    strip = f'<table {TBL.format(sp="8px 0", m="0 -8px 6px -8px")}><tr>{"".join(cells)}</tr></table>'
    return head + strip


def fahrplan(items, hue, heading="Dein Weg durch das Themenfeld"):
    """items: (num, title, duration, emoji)"""
    cells = []
    for num, title, dur, icon in items:
        ic = f'<span style="font-size:1.25em;vertical-align:middle">{icon}</span> ' if EMOJI else ''
        inner = (f'<div>{ic}'
                 f'<span style="color:{hue};font-weight:700;font-size:.78em;letter-spacing:.08em;vertical-align:middle">LERNEINHEIT {num}</span></div>'
                 f'<div style="font-weight:700;color:{INK};margin-top:4px">{title}</div>'
                 f'<div style="color:{MUTED};font-size:.88em;margin-top:4px">{dur}</div>')
        cells.append(_tile_td(inner, hue, top=True))
    return _kicker(heading) + f'<table {TBL.format(sp="8px 0", m="0 -8px 8px -8px")}><tr>{"".join(cells)}</tr></table>'


def tf_strip(tfs):
    """tfs: (num, title, hue, full, emoji) – two rows of four."""
    cells = []
    for num, title, hue, full, icon in tfs:
        tag = _chip("ausgearbeitet", hue, filled=True) if full else _chip("exemplarisch", "#9AA3B5")
        ic = f'<span style="font-size:1.3em;vertical-align:middle">{icon}</span> ' if EMOJI else ''
        inner = (f'<div>{ic}'
                 f'<span style="color:{hue};font-weight:800;vertical-align:middle">{num:02d}</span></div>'
                 f'<div style="font-weight:600;color:{INK};margin-top:3px;font-size:.95em">{title}</div>'
                 f'<div style="margin-top:4px">{tag}</div>')
        cells.append(_tile_td(inner, hue, left=True))
    rows = f'<tr>{"".join(cells[:4])}</tr><tr>{"".join(cells[4:])}</tr>'
    return _kicker("Die acht Themenfelder") + f'<table {TBL.format(sp="8px 8px", m="0 -8px 0 -8px")}>{rows}</table>'


def tf_info(kompetenz, les, formats, hue, exemplary=True):
    tint = _tint(hue)
    rows = "".join(
        f'<tr><td style="border:0;border-bottom:1px solid {LINE};padding:7px 10px 7px 0;color:{hue};font-weight:700;'
        f'white-space:nowrap;vertical-align:top;width:48px">LE {i+1}</td>'
        f'<td style="border:0;border-bottom:1px solid {LINE};padding:7px 0;line-height:1.4">{t}</td></tr>'
        for i, t in enumerate(les))
    note = (f'<div style="color:{MUTED};font-size:.9em;margin-top:8px">Exemplarisch angelegt, Aufbau wie Themenfeld 1. '
            f'Geplante Formate: {formats}.</div>' if exemplary else "")
    return (f'<table style="width:100%;border-collapse:separate;border-spacing:0;margin:8px 0 4px 0;border:0"><tr>'
            f'<td style="border:0;vertical-align:top;width:40%;padding:0 16px 0 0">'
            f'<div style="background:{tint};border-radius:12px;padding:12px 16px;border-left:5px solid {hue}">'
            f'{_kicker("Leitkompetenz", hue).replace("margin:12px 0 8px 0", "margin:0 0 4px 0")}'
            f'<div style="line-height:1.45">{kompetenz}</div></div></td>'
            f'<td style="border:0;vertical-align:top;padding:0">'
            f'<table style="width:100%;border-collapse:collapse;border:0">{rows}</table>{note}</td>'
            f'</tr></table>')
