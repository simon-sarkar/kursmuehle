"""Inline-styled HTML building blocks for Moodle labels/pages and H5P text blocks."""

INK = "#0B1220"
MUTED = "#5B6475"
LINE = "#E6E9EF"


def img(name, alt="", radius=12):
    return (f'<p><img src="@@PLUGINFILE@@/{name}" alt="{alt}" '
            f'style="width:100%;height:auto;border-radius:{radius}px;display:block"></p>')


def lead(text):
    return f'<p style="font-size:1.15em;line-height:1.5;color:{INK};margin:14px 0 6px 0">{text}</p>'


def p(text):
    return f'<p style="line-height:1.55;margin:8px 0">{text}</p>'


def box(title, html, hue="#1D5FD1", bg="#F4F7FB"):
    return (f'<div style="border-left:5px solid {hue};background:{bg};border-radius:0 12px 12px 0;'
            f'padding:14px 18px;margin:16px 0">'
            f'<div style="font-weight:700;color:{hue};margin-bottom:6px">{title}</div>{html}</div>')


def steps(items, hue="#1D5FD1"):
    lis = "".join(
        f'<li style="margin:8px 0;padding-left:6px;line-height:1.5">{it}</li>' for it in items)
    return f'<ol style="padding-left:26px;margin:10px 0">{lis}</ol>'


def bullets(items):
    lis = "".join(f'<li style="margin:6px 0;line-height:1.5">{it}</li>' for it in items)
    return f'<ul style="padding-left:22px;margin:10px 0">{lis}</ul>'


def chips(items, hue="#1D5FD1"):
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


def kv(rows, hue="#1D5FD1"):
    trs = "".join(
        f'<tr><td style="border:0;border-bottom:1px solid {LINE};padding:8px 12px;font-weight:700;color:{hue};'
        f'white-space:nowrap;vertical-align:top">{k}</td>'
        f'<td style="border:0;border-bottom:1px solid {LINE};padding:8px 12px;line-height:1.5">{v}</td></tr>'
        for k, v in rows)
    return f'<table style="width:100%;border-collapse:collapse;margin:12px 0;border:0">{trs}</table>'


def merk(text, hue="#1D5FD1"):
    return (f'<div style="background:{hue};color:#fff;border-radius:12px;padding:16px 20px;margin:18px 0;'
            f'font-size:1.08em;line-height:1.5"><span style="font-weight:700;letter-spacing:.08em;'
            f'font-size:.8em;text-transform:uppercase;opacity:.85">Merk dir</span><br>{text}</div>')


def meta_line(parts, hue="#1D5FD1"):
    return (f'<p style="color:{MUTED};font-size:.95em;margin:6px 0 14px 0">'
            + ' <span style="color:{hue};font-weight:700">·</span> '.replace("{hue}", hue).join(parts) + '</p>')
