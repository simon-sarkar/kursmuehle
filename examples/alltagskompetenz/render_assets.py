"""Kursbild, Kachelbilder, Banner, Mock-Screenshots und Badge für den Beispielkurs Alltagskompetenz neu rendern (HTML -> PNG).

Braucht Playwright + Chromium. Die PNGs liegen bereits in assets/; dieses Skript ist nur zum Neu-Erzeugen.
usage: python3 examples/alltagskompetenz/render_assets.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts"))
from gen import render as R  # noqa: E402

ASSETS = os.path.join(HERE, "assets")

TF_TITLES = {1: ("Probleme selbst lösen", "Beschreiben, suchen, prüfen – mit Google, Quellen und KI"),
             2: ("Digitale Selbstbestimmung", "Sicherheit, Daten, Medienbalance"),
             3: ("Mentale Gesundheit & Selbstfürsorge", "Stress, Schlaf, Grenzen, Hilfe"),
             4: ("Körper, Ernährung & Gesundheitssystem", "Essen, Bewegung, Arzt, Erste Hilfe"),
             5: ("Geld & Finanzen", "Budget, Konto, Sparen, Schulden"),
             6: ("Konsum, Verträge & Rechte", "Abos, Kündigen, Reklamieren"),
             7: ("Wohnen, Haushalt & Bürokratie", "Mietvertrag, Versicherung, Ämter"),
             8: ("Ich & die anderen", "Kommunikation, Konflikte, Selbstorganisation")}

_TAG = ('<span style="display:inline-block;background:#fff;color:#1D5FD1;font-weight:700;font-size:12px;'
        'letter-spacing:.08em;text-transform:uppercase;border-radius:4px;padding:1px 6px;margin-right:8px;'
        'vertical-align:middle">{}</span>')


def _prompt_html():
    rows = [("Rolle", "Du bist ein Techniker in einem Handy-Reparaturladen."),
            ("Kontext", "Mein Nordvia X3 lädt seit gestern Abend nicht mehr, das Ladesymbol blinkt kurz und geht wieder aus. "
                        "Davor kam ein Update. Anderes Kabel und andere Steckdose habe ich probiert."),
            ("Ziel", "Finde die Ursache. Günstige und ungefährliche Schritte zuerst."),
            ("Format", "Nummerierte Liste, höchstens fünf Schritte. Sag mir bei jedem Schritt, woran ich erkenne, ob er "
                       "geholfen hat. Frag nach, wenn dir Informationen fehlen.")]
    return "".join(f'<div style="margin:4px 0">{_TAG.format(k)}{v}</div>' for k, v in rows)


def jobs():
    # Kursbild und Kachelbilder ohne Text (die Plattform setzt Kursname und Abschnittstitel darüber),
    # Banner mit Text nur im Abschnitt (start.png im Willkommen-Textfeld, tfN.png im Fahrplan).
    j = [(R.banner_html(0, "", "", [], w=1600, h=520), os.path.join(ASSETS, "kurs.png")),
         (R.banner_html(0, "Alltagskompetenz", "Probleme selbst lösen · auf sich achten · mit Geld umgehen · Verträge verstehen",
                        ["Jahrgangsstufe 8–10", "8 Themenfelder"], w=1600, h=520, kicker="Selbstlernkurs"),
          os.path.join(ASSETS, "start.png"))]
    for n, (t, s) in TF_TITLES.items():
        chips = ["4 Lerneinheiten · ca. 100 min"] if n == 1 else ["3 Lerneinheiten", "exemplarisch"]
        j.append((R.banner_html(n, t, s, chips, w=1600, h=420), os.path.join(ASSETS, f"tf{n}.png")))
        j.append((R.kachel_html(n, hue=R.HUES[n]), os.path.join(ASSETS, f"kachel{n}.png")))
    j.append((R.serp_html("Nordvia X3 lädt nicht Ladesymbol blinkt"), os.path.join(ASSETS, "serp.png")))
    j.append((R.chat_html([
        ("user", "mein handy lädt nicht mehr was soll ich machen"),
        ("ai", "<p>Das kann mehrere Ursachen haben. Probiere diese Schritte:</p><ol>"
               "<li>Verwende ein anderes Ladekabel und Netzteil.</li>"
               "<li>Reinige die Ladebuchse vorsichtig.</li>"
               "<li>Öffne <b>Einstellungen → Akku → Ladeelektronik zurücksetzen</b> und bestätige mit OK.</li>"
               "<li>Halte <b>Leiser-Taste und Ein/Aus-Taste 10 Sekunden</b> gedrückt, um den Ladechip neu zu starten.</li>"
               "<li>Wenn nichts hilft: Werksreset über Einstellungen → System.</li></ol>"
               "<p>Danach sollte dein Handy wieder normal laden.</p>")]),
              os.path.join(ASSETS, "chat_bad.png")))
    j.append((R.chat_html([
        ("user", _prompt_html()),
        ("ai", "<p>Zwei Rückfragen, bevor ich etwas vorschlage:</p><ol>"
               "<li>Blinkt das Ladesymbol auch, wenn das Handy <b>ausgeschaltet</b> am Kabel hängt?</li>"
               "<li>Steht in <b>Einstellungen → Akku</b> ein Hinweis wie „Akkuschutz“ oder „Ladelimit“?</li></ol>"
               "<p>Wenn das Update unterbrochen wurde, ist ein <b>Neustart im abgesicherten Modus</b> der erste ungefährliche Schritt. "
               "Daten gehen dabei nicht verloren. Einen Werksreset schlage ich nicht vor, solange wir die Ursache nicht kennen.</p>")],
        title="KI-Assistent"),
              os.path.join(ASSETS, "chat_good.png")))
    j.append((R.clickbait_html(), os.path.join(ASSETS, "clickbait.png")))
    j.append((R.badge_html(), os.path.join(ASSETS, "badge.png")))
    j.append((R.banner_html(0, "Morgen ist das Referat", "Sonntag, 19:30 Uhr. Ein blauer Bildschirm.",
                            ["Du entscheidest"], w=1600, h=520, hue=R.HUES[1]),
              os.path.join(ASSETS, "story.png")))
    return j


if __name__ == "__main__":
    R.render_all(jobs())
