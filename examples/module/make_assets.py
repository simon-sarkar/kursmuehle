"""Platzhalter-Dateien für den Beispielkurs erzeugen (selbst erstellt, keine Fremdinhalte).

usage: python3 examples/module/make_assets.py   -> assets/arbeitsblatt.pdf, assets/checkliste.pdf, assets/schloss.png
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")


def pdf(path, title, lines):
    """Einseitiges PDF ohne Abhängigkeiten (Helvetica, A4)."""
    content = ["BT", "/F1 18 Tf", "72 770 Td", f"({title}) Tj", "/F1 12 Tf", "0 -36 Td"]
    for ln in lines:
        content += [f"({ln}) Tj", "0 -20 Td"]
    content.append("ET")
    stream = "\n".join(content).encode("latin-1")
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
            b"/Resources << /Font << /F1 5 0 R >> >> >>",
            b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    with open(path, "wb") as f:
        f.write(bytes(out))


def schloss(path):
    img = Image.new("RGB", (640, 400), "#F5F3FF")
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((220, 170, 420, 340), radius=24, fill="#6D28D9")
    d.arc((250, 70, 390, 230), 180, 360, fill="#4C1D95", width=22)
    d.line((250, 150, 250, 180), fill="#4C1D95", width=22)
    d.line((390, 150, 390, 180), fill="#4C1D95", width=22)
    d.ellipse((300, 220, 340, 260), fill="#F5F3FF")
    d.rectangle((312, 250, 328, 300), fill="#F5F3FF")
    img.save(path)


if __name__ == "__main__":
    os.makedirs(ASSETS, exist_ok=True)
    pdf(os.path.join(ASSETS, "arbeitsblatt.pdf"), "Arbeitsblatt: Passwort-Check",
        ["1. Schreib drei Passwoerter auf, die du nicht mehr benutzen wuerdest.",
         "2. Bilde aus vier Woertern eine Passphrase, die du dir merken kannst.",
         "3. Wie lang ist sie? Zaehle die Zeichen.",
         "4. Welche Dienste brauchen bei dir ein eigenes Passwort?"])
    pdf(os.path.join(ASSETS, "checkliste.pdf"), "Checkliste: Sicheres Passwort",
        ["[ ] mindestens 12 Zeichen",
         "[ ] kein Name, kein Geburtsdatum, kein Dienstname",
         "[ ] fuer jeden wichtigen Dienst ein eigenes Passwort",
         "[ ] zweiter Faktor aktiviert, wo der Dienst ihn anbietet",
         "[ ] im Passwort-Manager oder an einem sicheren Ort notiert"])
    schloss(os.path.join(ASSETS, "schloss.png"))
    print("ok", sorted(os.listdir(ASSETS)))
