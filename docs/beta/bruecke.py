#!/usr/bin/env python3
"""Kursmühle-Brücke: verbindet die Mühle im Browser mit deiner eigenen KI auf diesem Rechner.

Start (Python 3.9 oder neuer, nichts zu installieren; Windows: `py` statt `python3`, Python von python.org):

    python3 bruecke.py                       ein Programm wie Claude Code oder Codex holt die Aufträge ab (siehe
                                             https://kursmuehle.de/verbinden.md)
    python3 bruecke.py --anbieter openai     mit eigenem Zugangsschlüssel: openai, anthropic, mistral oder ollama
                       [--modell NAME] [--adresse URL]

Die Brücke zeigt eine Adresse und einen Code aus sechs Ziffern. Den Code gibst du in der Mühle unter „Eigene KI“ ein.
Sie lauscht nur auf 127.0.0.1 (andere Rechner erreichen sie nicht) und schreibt nichts auf die Platte außer einer Kopie
der Mühle in ~/.kursmuehle/start/ (beim ersten Start geladen, etwa 15 MB; `--aktualisieren` holt sie neu). Unter
http://127.0.0.1:48127/start/ läuft dann die Mühle selbst, in jedem Browser.

Der Schlüssel kommt aus der Umgebungsvariable (OPENAI_API_KEY, ANTHROPIC_API_KEY, MISTRAL_API_KEY) oder aus einer
Abfrage beim Start; er steht nie in einer Datei oder einer Logzeile. Aufträge und Antworten liegen nur im Speicher.

Schnittstelle (jede Anfrage mit `Authorization: Bearer <Code>`):
    GET    /status                       {version, modus, modell, name, bereit, wartend}
    POST   /gespraech                    {gespraech}
    DELETE /gespraech/<id>
    POST   /auftrag {gespraech, text}    {auftrag}
    GET    /antwort/<auftrag>            {text} oder {fehler}; 204, solange sie fehlt
    nur im Modus agent:
    GET    /auftrag?warten=60[&name=N]   {auftrag, gespraech, text, fortsetzung}; 204 nach der Wartezeit; `name`
                                         (höchstens 40 Zeichen: Buchstaben, Ziffern, Leerzeichen, Punkt, Bindestrich)
                                         zeigt die Mühle neben „Eigene KI“
    POST   /antwort {auftrag, text}      {ok}

Kursmühle, https://kursmuehle.de · Lizenz: PolyForm Noncommercial 1.0.0
"""
import argparse
import getpass
import json
import mimetypes
import os
import re
import secrets
import shutil
import ssl
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = "1"
PORT = 48127
SEITE = "https://kursmuehle.de"
QUELLE = SEITE + "/start/"
SYSTEM = "Antworte nur mit der Kursdatei nach dem Format im Auftrag."
MAX_TOKENS = 8192
GROESSE = 4 * 1024 * 1024          # größte Anfrage in Bytes
SPERRE = 60                        # Sekunden nach fünf falschen Codes
VERFALL = 2 * 3600                 # ein Gespräch ohne Auftrag verfällt
AUFTRAG_ZEIT = 10 * 60             # so lange wartet ein Auftrag auf seine Antwort
ABFRAGE = 60                       # längstes `warten=` beim Abholen
NAME = re.compile(r"(?:[^\W_]|[ .-]){1,40}")    # Name des Agenten (AP13.8): Buchstaben, Ziffern, Leerzeichen, . und -

# Je Anbieter: Adresse, Pfad, Umgebungsvariable, Standardmodell, Format der Anfrage. Standard ist nach der Modellregel
# der Startseite das neueste Modell ohne Zusatz (keins mit mini, fast, flash, lite, nano, small); `--modell` wählt ein
# kleineres.
ANBIETER = {
    "openai": {"adresse": "https://api.openai.com", "pfad": "/v1/chat/completions", "schluessel": "OPENAI_API_KEY",
               "modell": "gpt-5", "format": "openai", "tokens": "max_completion_tokens"},
    "anthropic": {"adresse": "https://api.anthropic.com", "pfad": "/v1/messages", "schluessel": "ANTHROPIC_API_KEY",
                  "modell": "claude-sonnet-5-5", "format": "anthropic", "tokens": "max_tokens",
                  "kopf": {"anthropic-version": "2023-06-01"}},
    "mistral": {"adresse": "https://api.mistral.ai", "pfad": "/v1/chat/completions", "schluessel": "MISTRAL_API_KEY",
                "modell": "mistral-large-latest", "format": "openai", "tokens": "max_tokens"},
    "ollama": {"adresse": "http://127.0.0.1:11434", "pfad": "/api/chat", "schluessel": None,
               "modell": "qwen3:14b", "format": "ollama"},
}
TYPEN = {".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".json": "application/json",
         ".svg": "image/svg+xml", ".css": "text/css", ".html": "text/html", ".zip": "application/zip",
         ".whl": "application/octet-stream", ".md": "text/plain"}


def log(*teile):
    print(time.strftime("%H:%M:%S"), *teile, flush=True)


# --- Anbieter ---------------------------------------------------------------------------------------------------

def anfrage_bauen(a, modell, verlauf):
    """Kopfzeilen und Rumpf für einen Aufruf mit dem ganzen Verlauf (Nutzer- und Modellnachrichten)."""
    kopf = {"content-type": "application/json"}
    kopf.update(a.get("kopf", {}))
    if a["format"] == "anthropic":
        kopf["x-api-key"] = a["key"]
        rumpf = {"model": modell, "max_tokens": MAX_TOKENS, "system": SYSTEM, "messages": verlauf}
    elif a["format"] == "ollama":
        rumpf = {"model": modell, "stream": False, "messages": [{"role": "system", "content": SYSTEM}] + verlauf,
                 "options": {"num_ctx": 32768, "num_predict": MAX_TOKENS}}
    else:
        kopf["authorization"] = "Bearer " + a["key"]
        rumpf = {"model": modell, a["tokens"]: MAX_TOKENS,
                 "messages": [{"role": "system", "content": SYSTEM}] + verlauf}
    return kopf, rumpf


def antwort_lesen(a, daten):
    if a["format"] == "anthropic":
        return "".join(t.get("text", "") for t in daten.get("content", []) if t.get("type") == "text")
    if a["format"] == "ollama":
        return daten["message"]["content"]
    return daten["choices"][0]["message"]["content"]


def fehler_lesen(roh):
    """Meldung eines Anbieters aus seiner Fehlerantwort (JSON mit error.message, error oder message)."""
    try:
        d = json.loads(roh)
    except ValueError:
        return roh.strip()[:300]
    e = d.get("error", d) if isinstance(d, dict) else d
    if isinstance(e, dict):
        return str(e.get("message") or e.get("detail") or e)[:300]
    return str(e)[:300]


def anbieter_fragen(a, modell, verlauf):
    kopf, rumpf = anfrage_bauen(a, modell, verlauf)
    req = urllib.request.Request(a["adresse"].rstrip("/") + a["pfad"], data=json.dumps(rumpf).encode("utf-8"),
                                 headers=kopf, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=AUFTRAG_ZEIT) as r:
            return antwort_lesen(a, json.loads(r.read().decode("utf-8"))), None
    except urllib.error.HTTPError as e:
        return None, f"{e.code}: " + fehler_lesen(e.read().decode("utf-8", "replace"))
    except (urllib.error.URLError, OSError) as e:
        return None, "Anbieter nicht erreichbar: " + str(getattr(e, "reason", e))
    except (ValueError, KeyError, IndexError, TypeError):
        return None, "Antwort des Anbieters unlesbar"


# --- Zustand im Speicher -----------------------------------------------------------------------------------------

class Bruecke:
    def __init__(self, modus, code, anbieter=None, modell=None, zeit=1.0, abfrage=ABFRAGE):
        self.modus, self.code, self.anbieter, self.modell = modus, code, anbieter, modell
        self.zeit, self.abfrage = zeit, abfrage
        self.lock = threading.Condition()
        self.gespraeche = {}          # id -> {verlauf, zuletzt, auftraege, lock}
        self.auftraege = {}           # id -> {gespraech, text, status, antwort, fehler, start, fortsetzung}
        self.offen = []               # Agentenmodus: Aufträge, die noch niemand abgeholt hat
        self.fehlversuche, self.gesperrt_bis, self.agent_zuletzt, self.agent_wartet = 0, 0.0, 0.0, 0
        self.agent_name = None        # nennt der Agent beim Abholen einen Namen, steht er im Status

    # Code prüfen; nach fünf Fehlversuchen nimmt die Brücke 60 s lang keinen Code an
    def pruefen(self, kopf):
        with self.lock:
            if time.time() < self.gesperrt_bis:
                return 429
            gegeben = (kopf or "")[7:] if (kopf or "").startswith("Bearer ") else ""
            if secrets.compare_digest(gegeben.encode(), self.code.encode()):
                return 200
            self.fehlversuche += 1
            if self.fehlversuche >= 5:
                self.fehlversuche, self.gesperrt_bis = 0, time.time() + SPERRE * self.zeit
            return 401

    def aufraeumen(self):
        jetzt = time.time()
        for gid, g in list(self.gespraeche.items()):
            if jetzt - g["zuletzt"] > VERFALL * self.zeit:
                self.gespraech_weg(gid)
        for aid, a in self.auftraege.items():
            if a["status"] in ("offen", "abgeholt") and jetzt - a["start"] > AUFTRAG_ZEIT * self.zeit:
                a["status"], a["fehler"] = "fertig", "Keine Antwort nach 10 Minuten"
                if aid in self.offen:
                    self.offen.remove(aid)

    def gespraech_neu(self):
        gid = secrets.token_hex(8)
        self.gespraeche[gid] = {"verlauf": [], "zuletzt": time.time(), "auftraege": [], "lock": threading.Lock()}
        return gid

    def gespraech_weg(self, gid):
        g = self.gespraeche.pop(gid, None)
        for aid in (g or {}).get("auftraege", []):
            self.auftraege.pop(aid, None)
            if aid in self.offen:
                self.offen.remove(aid)

    def auftrag_neu(self, gid, text):
        g = self.gespraeche[gid]
        aid = secrets.token_hex(8)
        self.auftraege[aid] = {"gespraech": gid, "text": text, "status": "offen", "antwort": None, "fehler": None,
                               "start": time.time(), "fortsetzung": bool(g["auftraege"])}
        g["auftraege"].append(aid)
        g["zuletzt"] = time.time()
        if self.modus == "agent":
            self.offen.append(aid)
            self.lock.notify_all()
        else:
            threading.Thread(target=self.anbieter_lauf, args=(aid,), daemon=True).start()
        return aid

    def anbieter_lauf(self, aid):
        a = self.auftraege[aid]
        g = self.gespraeche.get(a["gespraech"])
        if not g:
            return
        with g["lock"]:                       # Aufträge eines Gesprächs nacheinander, damit der Verlauf stimmt
            start = time.time()
            verlauf = g["verlauf"] + [{"role": "user", "content": a["text"]}]
            text, fehler = anbieter_fragen(self.anbieter, self.modell, verlauf)
            with self.lock:
                if text is not None:
                    g["verlauf"] = verlauf + [{"role": "assistant", "content": text}]
                a.update(status="fertig", antwort=text, fehler=fehler)
            log(f"Auftrag {len(a['text'].encode())} B -> {len((text or '').encode())} B, "
                f"{time.time() - start:.1f} s, schluessel" + (", Fehler" if fehler else ""))

    def abholen(self, warten):
        ende = time.time() + max(0.0, min(warten, self.abfrage))
        with self.lock:
            self.agent_wartet += 1
            try:
                while True:
                    self.agent_zuletzt = time.time()
                    self.aufraeumen()
                    if self.offen:
                        aid = self.offen.pop(0)
                        a = self.auftraege[aid]
                        a["status"] = "abgeholt"
                        return {"auftrag": aid, "gespraech": a["gespraech"], "text": a["text"],
                                "fortsetzung": a["fortsetzung"]}
                    rest = ende - time.time()
                    if rest <= 0:
                        return None
                    self.lock.wait(rest)
            finally:
                self.agent_wartet -= 1
                self.agent_zuletzt = time.time()

    def status(self):
        bereit = self.modus == "schluessel" or self.agent_wartet > 0 or \
            time.time() - self.agent_zuletzt < self.abfrage + 30
        return {"version": VERSION, "modus": self.modus, "modell": self.modell if self.modus == "schluessel" else None,
                "name": self.agent_name if self.modus == "agent" else None, "bereit": bereit,
                "wartend": len(self.offen)}


# --- HTTP ----------------------------------------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = "Kursmuehle-Bruecke/" + VERSION

    def log_message(self, *a):         # keine Pfade, keine Inhalte im Log
        pass

    @property
    def b(self):
        return self.server.bruecke

    def herkunft_erlaubt(self, origin):
        port = self.server.server_address[1]
        if origin in (SEITE, f"http://127.0.0.1:{port}", f"http://localhost:{port}"):
            return True
        return self.server.entwicklung and re.fullmatch(r"http://(localhost|127\.0\.0\.1)(:\d+)?", origin) is not None

    def senden(self, code, daten=None, typ="application/json", extra=None):
        roh = b"" if daten is None else (daten if isinstance(daten, bytes) else
                                         json.dumps(daten, ensure_ascii=False).encode("utf-8"))
        self.send_response(code)
        origin = self.headers.get("Origin")
        if origin and self.herkunft_erlaubt(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        if daten is not None:
            self.send_header("Content-Type", typ + ("; charset=utf-8" if typ.startswith(("text/", "application/j"))
                                                    else ""))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(roh)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(roh)

    def zulassen(self):
        """Host gegen DNS-Rebinding, Origin gegen fremde Seiten; eine Anfrage ohne Origin (Agent, curl) darf."""
        port = self.server.server_address[1]
        if self.headers.get("Host") not in (f"127.0.0.1:{port}", f"localhost:{port}"):
            self.senden(403, {"fehler": "Host nicht erlaubt"})
            return False
        origin = self.headers.get("Origin")
        if origin is not None and not self.herkunft_erlaubt(origin):
            self.senden(403, {"fehler": "Herkunft nicht erlaubt"})
            return False
        return True

    def rumpf(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > GROESSE:
            raise ValueError("zu groß")
        d = json.loads(self.rfile.read(n).decode("utf-8") or "{}") if n else {}
        if not isinstance(d, dict):
            raise ValueError("kein Objekt")
        return d

    def do_OPTIONS(self):
        if not self.zulassen():
            return
        self.senden(204, extra={"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
                                "Access-Control-Allow-Headers": "authorization, content-type",
                                "Access-Control-Max-Age": "600", "Access-Control-Allow-Private-Network": "true"})

    def do_GET(self):
        self.verteilen("GET")

    def do_HEAD(self):
        self.verteilen("GET")

    def do_POST(self):
        self.verteilen("POST")

    def do_DELETE(self):
        self.verteilen("DELETE")

    def verteilen(self, methode):
        if not self.zulassen():
            return
        teil = urllib.parse.urlsplit(self.path)
        pfad, frage = teil.path, urllib.parse.parse_qs(teil.query)
        if methode == "GET" and (pfad == "/" or pfad == "/start" or pfad.startswith("/start/")):
            return self.muehle(pfad)
        p = self.b.pruefen(self.headers.get("Authorization"))
        if p == 429:
            return self.senden(429, {"fehler": "Zu viele falsche Codes; in einer Minute noch einmal"})
        if p == 401:
            return self.senden(401, {"fehler": "Code falsch"})
        try:
            d = self.rumpf() if methode == "POST" else {}
        except ValueError:
            return self.senden(400, {"fehler": "Anfrage unlesbar"})
        b = self.b
        if methode == "GET" and pfad == "/auftrag" and b.modus == "agent":
            try:
                warten = float((frage.get("warten") or ["0"])[0])
            except ValueError:
                warten = 0.0
            name = " ".join((frage.get("name") or [""])[0].split())
            if NAME.fullmatch(name):                # ein ungültiger Name ändert nichts, das Abholen läuft weiter
                with b.lock:
                    b.agent_name = name
            r = b.abholen(warten)
            return self.senden(200, r) if r else self.senden(204)
        with b.lock:
            b.aufraeumen()
            if methode == "GET" and pfad == "/status":
                return self.senden(200, b.status())
            if methode == "POST" and pfad == "/gespraech":
                return self.senden(200, {"gespraech": b.gespraech_neu()})
            m = re.fullmatch(r"/gespraech/([0-9a-f]+)", pfad)
            if methode == "DELETE" and m:
                b.gespraech_weg(m.group(1))
                return self.senden(200, {"ok": True})
            if methode == "POST" and pfad == "/auftrag":
                gid, text = d.get("gespraech"), d.get("text")
                if gid not in b.gespraeche:
                    return self.senden(404, {"fehler": "Gespräch unbekannt"})
                if not isinstance(text, str) or not text.strip():
                    return self.senden(400, {"fehler": "Auftrag ohne Text"})
                return self.senden(200, {"auftrag": b.auftrag_neu(gid, text)})
            m = re.fullmatch(r"/antwort/([0-9a-f]+)", pfad)
            if methode == "GET" and m:
                a = b.auftraege.get(m.group(1))
                if not a:
                    return self.senden(404, {"fehler": "Auftrag unbekannt"})
                if a["status"] != "fertig":
                    return self.senden(204)
                return self.senden(200, {"fehler": a["fehler"]} if a["fehler"] else {"text": a["antwort"]})
            if methode == "POST" and pfad == "/antwort" and b.modus == "agent":
                a = b.auftraege.get(d.get("auftrag"))
                if not a:
                    return self.senden(404, {"fehler": "Auftrag unbekannt"})
                text, fehler = d.get("text"), d.get("fehler")
                if not isinstance(text, str) and not isinstance(fehler, str):
                    return self.senden(400, {"fehler": "Antwort ohne Text"})
                a.update(status="fertig", antwort=text, fehler=None if isinstance(text, str) else fehler)
                g = b.gespraeche.get(a["gespraech"])
                if g:
                    g["zuletzt"] = time.time()
                log(f"Auftrag {len(a['text'].encode())} B -> {len((text or '').encode())} B, "
                    f"{time.time() - a['start']:.1f} s, agent")
                return self.senden(200, {"ok": True})
        return self.senden(404, {"fehler": "Unbekannt"})

    def muehle(self, pfad):
        """Die Mühle aus dem Cache: nur Dateien aus der geladenen Liste, gleiche Herkunft wie die Brücke."""
        m = self.server.muehle
        if pfad in ("/", "/start"):
            return self.senden(302 if m else 404, b"" if m else {"fehler": "Mühle nicht geladen"},
                               extra={"Location": "/start/"} if m else None)
        rel = urllib.parse.unquote(pfad[len("/start/"):]) or "index.html"
        if not m or rel not in m["dateien"]:
            return self.senden(404, {"fehler": "Nicht gefunden"})
        with open(os.path.join(m["ordner"], *rel.split("/")), "rb") as f:
            roh = f.read()
        ext = os.path.splitext(rel)[1].lower()
        self.senden(200, roh, TYPEN.get(ext) or mimetypes.guess_type(rel)[0] or "application/octet-stream")


# --- Mühle laden ---------------------------------------------------------------------------------------------------

def sicherer_pfad(rel):
    return isinstance(rel, str) and rel and not rel.startswith(("/", "\\")) and \
        all(t not in ("", ".", "..") for t in rel.split("/")) and "\\" not in rel and ":" not in rel


def holen(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()


def muehle_laden(quelle, aktualisieren):
    """Mühle nach ~/.kursmuehle/start/ laden (Liste aus dateien.json); vorhandener Stand bleibt ohne --aktualisieren."""
    basis = os.path.join(os.path.expanduser("~"), ".kursmuehle")
    ordner, stand = os.path.join(basis, "start"), os.path.join(basis, "stand.json")
    if not aktualisieren and os.path.exists(stand):
        try:
            with open(stand, encoding="utf-8") as f:
                s = json.load(f)
            if all(os.path.exists(os.path.join(ordner, *p.split("/"))) for p in s["dateien"]):
                try:
                    neu = json.loads(holen(quelle.rstrip("/") + "/dateien.json").decode("utf-8")).get("version")
                    if neu and neu != s.get("version"):
                        print(f"Die Mühle {neu} ist erschienen (hier: {s.get('version')}); "
                              "mit --aktualisieren holst du sie.", flush=True)
                except (urllib.error.URLError, OSError, ValueError, AttributeError):
                    pass
                return {"ordner": ordner, "dateien": set(s["dateien"]), "version": s.get("version")}
        except (ValueError, KeyError, OSError):
            pass
    quelle = quelle.rstrip("/") + "/"
    try:
        liste = json.loads(holen(quelle + "dateien.json").decode("utf-8"))
        dateien = [p for p in liste["dateien"] if sicherer_pfad(p)]
        print(f"Lade die Mühle ({len(dateien)} Dateien) nach {ordner} …", flush=True)
        neu = ordner + ".neu"
        shutil.rmtree(neu, ignore_errors=True)
        for p in dateien:
            ziel = os.path.join(neu, *p.split("/"))
            os.makedirs(os.path.dirname(ziel), exist_ok=True)
            with open(ziel, "wb") as f:
                f.write(holen(quelle + urllib.parse.quote(p)))
        shutil.rmtree(ordner, ignore_errors=True)
        os.replace(neu, ordner)
        with open(stand, "w", encoding="utf-8") as f:
            json.dump({"version": liste.get("version"), "quelle": quelle, "dateien": dateien}, f)
        return {"ordner": ordner, "dateien": set(dateien), "version": liste.get("version")}
    except (urllib.error.URLError, OSError, ValueError, KeyError, ssl.SSLError) as e:
        grund = str(getattr(e, "reason", e))
        tipp = " (macOS: im Ordner von Python „Install Certificates.command“ öffnen)" if "CERTIFICATE" in grund else ""
        print(f"Die Mühle ließ sich nicht laden: {grund}{tipp}. Nutze sie dann unter {QUELLE}.", flush=True)
        return None


# --- Start -----------------------------------------------------------------------------------------------------------

def starten(argv=None, code=None):
    """Server bauen und Startzeilen drucken; serve_forever ruft der Aufrufer (main oder ein Test)."""
    ap = argparse.ArgumentParser(description="Verbindet die Kursmühle mit deiner eigenen KI.")
    ap.add_argument("--agent", action="store_true", help="ein Programm holt die Aufträge ab (Standard)")
    ap.add_argument("--anbieter", choices=sorted(ANBIETER), help="mit eigenem Zugangsschlüssel oder Ollama")
    ap.add_argument("--modell", help="Modellname beim Anbieter")
    ap.add_argument("--adresse", help="andere Adresse des Anbieters")
    ap.add_argument("--port", type=int, default=PORT)
    ap.add_argument("--aktualisieren", action="store_true", help="die Mühle neu laden")
    ap.add_argument("--quelle", default=QUELLE, help=argparse.SUPPRESS)
    ap.add_argument("--entwicklung", action="store_true", help=argparse.SUPPRESS)
    ap.add_argument("--zeit", type=float, default=1.0, help=argparse.SUPPRESS)      # Faktor für Sperre und Verfall
    ap.add_argument("--abfrage", type=float, default=ABFRAGE, help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    if args.agent and args.anbieter:
        ap.error("--agent und --anbieter schließen sich aus")
    anbieter, modell = None, None
    if args.anbieter:
        anbieter = dict(ANBIETER[args.anbieter], name=args.anbieter)
        if args.adresse:
            anbieter["adresse"] = args.adresse
        modell = args.modell or anbieter["modell"]
        if anbieter["schluessel"]:
            key = os.environ.get(anbieter["schluessel"]) or getpass.getpass(
                f"Zugangsschlüssel für {args.anbieter} (Eingabe bleibt unsichtbar): ")
            if not key.strip():
                ap.error("kein Schlüssel")
            anbieter["key"] = key.strip()
    b = Bruecke("schluessel" if anbieter else "agent", code or f"{secrets.randbelow(10 ** 6):06d}", anbieter, modell,
                args.zeit, args.abfrage)
    muehle = muehle_laden(args.quelle, args.aktualisieren)
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    srv.daemon_threads = True
    srv.bruecke, srv.entwicklung, srv.muehle = b, args.entwicklung, muehle
    port = srv.server_address[1]
    print(f"Kursmühle-Brücke {VERSION} läuft (Modus {b.modus}" + (f", {args.anbieter} {modell}" if anbieter else "")
          + ")", flush=True)
    if muehle:
        print(f"Mühle auf diesem Rechner: http://127.0.0.1:{port}/start/", flush=True)
    print(f"Oder in der Mühle unter {QUELLE}: Kachel „Eigene KI“" + (f", Port {port}" if port != PORT else ""),
          flush=True)
    print(f"Code: {b.code}", flush=True)
    print("Beenden mit Strg+C.", flush=True)
    return srv


def main(argv=None):
    srv = starten(argv)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("Brücke beendet.")
    finally:
        srv.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
