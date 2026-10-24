"""Bildgröße aus dem Dateikopf lesen (PNG, JPEG, GIF), ohne Pillow.

Der Bau braucht von einem Bild nur Breite und Höhe (H5P-Parameter). Pillow bleibt den Bildrendern (`render.py`,
`banner.py`) vorbehalten; so läuft der Generator auch in Pyodide und auf Rechnern ohne Pillow.
"""
import struct

ENDUNGEN = (".png", ".jpg", ".jpeg", ".gif")


def ist_bild(name):
    return name.lower().endswith(ENDUNGEN)


def mimetyp(name):
    n = name.lower()
    if n.endswith(".png"):
        return "image/png"
    if n.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if n.endswith(".gif"):
        return "image/gif"
    return "application/octet-stream"


def groesse(data):
    """(Breite, Höhe) aus den Bytes eines PNG, JPEG oder GIF; ValueError, wenn der Kopf nicht lesbar ist."""
    if data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
        w, h = struct.unpack(">II", data[16:24])
        return int(w), int(h)
    if data[:6] in (b"GIF87a", b"GIF89a"):
        w, h = struct.unpack("<HH", data[6:10])
        return int(w), int(h)
    if data[:2] == b"\xff\xd8":
        i, n = 2, len(data)
        while i + 9 < n:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:   # Marker ohne Länge
                i += 2
                continue
            if marker == 0xFF:
                i += 1
                continue
            seg = struct.unpack(">H", data[i + 2:i + 4])[0]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):   # SOFn
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return int(w), int(h)
            i += 2 + seg
        raise ValueError("JPEG ohne SOF-Marker")
    raise ValueError("kein PNG, JPEG oder GIF")


def groesse_datei(path):
    with open(path, "rb") as f:
        return groesse(f.read())
