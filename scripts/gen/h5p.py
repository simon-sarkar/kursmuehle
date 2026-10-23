"""Builders for mod_hvp json_content (H5P content params) with German UI strings.

Every builder returns a plain dict. Top-level activities are wrapped in
`Hvp` objects (name, library, params, files). Sub-content uses the
{"library", "params", "subContentId", "metadata"} shape H5P expects.
"""
import copy
import json
import os
import uuid

from . import libs

TPL_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")


def _tpl(machine):
    with open(os.path.join(TPL_DIR, f"{machine}.json"), encoding="utf-8") as f:
        return copy.deepcopy(json.load(f)["params"])


def _sid():
    return str(uuid.uuid4())


def _meta(content_type, title):
    return {"contentType": content_type, "license": "U", "title": title,
            "authors": [], "changes": [], "extraTitle": title}


def sub(libname, content_type, title, params):
    return {"library": libs.lib(libname), "params": params,
            "subContentId": _sid(), "metadata": _meta(content_type, title)}


class Hvp:
    """One mod_hvp activity."""

    def __init__(self, name, library, params, files=None, intro="",
                 completion="view", grademax=10, gradepass=0):
        self.name = name
        self.library = library          # e.g. "H5P.InteractiveBook 1.15"
        self.params = params
        self.files = files or []        # list of (local_path, "images/name.png")
        self.intro = intro
        self.completion = completion    # "view" | "pass" | "manual"
        self.grademax = grademax
        self.gradepass = gradepass

    def json_content(self):
        return json.dumps(self.params, ensure_ascii=False, separators=(",", ":"))


# ---------------------------------------------------------------- images
class ImageRef:
    """Image file to be stored inside the hvp content filearea."""

    def __init__(self, local_path, width, height, name=None):
        self.local_path = local_path
        self.name = name or os.path.basename(local_path)
        self.width = width
        self.height = height

    @property
    def h5p_path(self):
        return f"images/{self.name}"

    def file_param(self):
        return {"path": self.h5p_path, "mime": "image/png",
                "copyright": {"license": "U"},
                "width": self.width, "height": self.height}


# ---------------------------------------------------------------- sub-content
def text(html, title="Text"):
    return sub("AdvancedText", "Text", title, {"text": html})


def image(img: ImageRef, alt, title="Bild"):
    d = sub("Image", "Image", title, {
        "file": img.file_param(), "alt": alt, "title": alt,
        "contentName": "Bild", "decorative": False, "expandImage": "Bild vergrößern", "minimizeImage": "Bild verkleinern",
    })
    d["_img"] = img          # collected by the top-level builder, stripped before output
    return d


def _collect_images(items):
    """Pop ImageRefs from sub-content dicts; return file tuples for Hvp(files=...)."""
    files = []
    for it in items:
        img = it.pop("_img", None)
        if img:
            files.append((img.local_path, img.h5p_path))
    return files


def _mc_ui():
    return {
        "checkAnswerButton": "Überprüfen", "submitAnswerButton": "Absenden",
        "showSolutionButton": "Lösung anzeigen", "tryAgainButton": "Wiederholen",
        "tipsLabel": "Tipp anzeigen",
        "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
        "tipAvailable": "Tipp verfügbar", "feedbackAvailable": "Rückmeldung verfügbar",
        "readFeedback": "Rückmeldung vorlesen", "wrongAnswer": "Falsche Antwort",
        "correctAnswer": "Richtige Antwort", "shouldCheck": "Hätte gewählt werden müssen",
        "shouldNotCheck": "Hätte nicht gewählt werden dürfen",
        "noInput": "Bitte antworte, bevor du die Lösung ansiehst",
        "a11yCheck": "Die Antworten überprüfen. Die Eingaben werden als richtig, falsch oder unbeantwortet markiert.",
        "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
        "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet.",
    }


def multichoice(question, answers, title="Frage", single=True, random=True,
                retry=True, feedback_ranges=None):
    """answers: list of (text, correct, feedback_if_chosen[, feedback_if_not_chosen])"""
    ans = []
    for a in answers:
        txt, correct = a[0], a[1]
        chosen = a[2] if len(a) > 2 else ""
        notchosen = a[3] if len(a) > 3 else ""
        ans.append({"text": f"<div>{txt}</div>\n", "correct": bool(correct),
                    "tipsAndFeedback": {"tip": "", "chosenFeedback": chosen,
                                        "notChosenFeedback": notchosen}})
    params = {
        "question": f"<p>{question}</p>\n",
        "answers": ans,
        "overallFeedback": feedback_ranges or [{"from": 0, "to": 100}],
        "behaviour": {"enableRetry": retry, "enableSolutionsButton": True,
                      "enableCheckButton": True, "type": "single" if single else "multi",
                      "singlePoint": True, "randomAnswers": random,
                      "showSolutionsRequiresInput": True, "confirmCheckDialog": False,
                      "confirmRetryDialog": False, "autoCheck": False,
                      "passPercentage": 100, "showScorePoints": True},
        "UI": _mc_ui(),
        "confirmCheck": {"header": "Beenden?", "body": "Ganz sicher beenden?",
                         "cancelLabel": "Abbrechen", "confirmLabel": "Beenden"},
        "confirmRetry": {"header": "Wiederholen?", "body": "Ganz sicher wiederholen?",
                         "cancelLabel": "Abbrechen", "confirmLabel": "Bestätigen"},
        "media": {"disableImageZooming": False},
    }
    return sub("MultiChoice", "Multiple Choice", title, params)


def truefalse(question, correct: bool, fb_correct="", fb_wrong="", title="Richtig oder falsch?"):
    params = {
        "question": f"<p>{question}</p>\n",
        "correct": "true" if correct else "false",
        "behaviour": {"enableRetry": True, "enableSolutionsButton": True,
                      "enableCheckButton": True, "confirmCheckDialog": False,
                      "confirmRetryDialog": False, "autoCheck": False,
                      "feedbackOnCorrect": fb_correct, "feedbackOnWrong": fb_wrong},
        "l10n": {"trueText": "Richtig", "falseText": "Falsch",
                 "score": "Du hast @score von @total Punkten erreicht.",
                 "checkAnswer": "Überprüfen", "submitAnswer": "Absenden",
                 "showSolutionButton": "Lösung anzeigen", "tryAgain": "Wiederholen",
                 "wrongAnswerMessage": "Falsche Antwort", "correctAnswerMessage": "Richtige Antwort",
                 "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
                 "a11yCheck": "Die Antworten überprüfen. Die Eingaben werden als richtig, falsch oder unbeantwortet markiert.",
                 "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
                 "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet."},
        "confirmCheck": {"header": "Beenden?", "body": "Ganz sicher beenden?",
                         "cancelLabel": "Abbrechen", "confirmLabel": "Beenden"},
        "confirmRetry": {"header": "Wiederholen?", "body": "Ganz sicher wiederholen?",
                         "cancelLabel": "Abbrechen", "confirmLabel": "Bestätigen"},
        "media": {"disableImageZooming": False},
    }
    return sub("TrueFalse", "True/False Question", title, params)


def dragtext(task, text_field, title="Wörter zuordnen", instant=False):
    """text_field: lines with *droppable* words, e.g. 'Die *Rolle* sagt ...'"""
    params = {
        "taskDescription": f"<p>{task}</p>\n",
        "textField": text_field,
        "overallFeedback": [{"from": 0, "to": 100}],
        "checkAnswer": "Überprüfen", "submitAnswer": "Absenden", "tryAgain": "Wiederholen",
        "showSolution": "Lösung anzeigen", "dropZoneIndex": "Ablagezone @index.",
        "empty": "Ablagezone @index ist leer.", "contains": "Ablagezone @index enthält das Element @draggable.",
        "ariaDraggableIndex": "@index von @count ziehbaren Elementen.",
        "tipLabel": "Tipp anzeigen", "correctText": "Richtig!", "incorrectText": "Falsch!",
        "resetDropTitle": "Ablage zurücksetzen", "resetDropDescription": "Bist du sicher, dass du diese Ablagezone zurücksetzen möchtest?",
        "grabbed": "Element ist gegriffen.", "cancelledDragging": "Ziehen abgebrochen.",
        "correctAnswer": "Richtige Antwort:", "feedbackHeader": "Rückmeldung",
        "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
        "a11yCheck": "Die Antworten überprüfen. Die Eingaben werden als richtig, falsch oder unbeantwortet markiert.",
        "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
        "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet.",
        "behaviour": {"enableRetry": True, "enableSolutionsButton": True,
                      "enableCheckButton": True, "instantFeedback": instant},
    }
    return sub("DragText", "Drag the Words", title, params)


def markwords(task, text_field, title="Wörter markieren"):
    params = {
        "taskDescription": f"<p>{task}</p>\n",
        "textField": f"<p>{text_field}</p>\n",
        "overallFeedback": [{"from": 0, "to": 100}],
        "checkAnswerButton": "Überprüfen", "submitAnswerButton": "Absenden",
        "tryAgainButton": "Wiederholen", "showSolutionButton": "Lösung anzeigen",
        "behaviour": {"enableRetry": True, "enableSolutionsButton": True,
                      "enableCheckButton": True, "showScorePoints": True},
        "correctAnswer": "Richtig!", "incorrectAnswer": "Falsch!", "missedAnswer": "Übersehen!",
        "displaySolutionDescription": "Die Aufgabe wurde mit der Lösung aktualisiert.",
        "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
        "a11yFullTextLabel": "Vollständiger Aufgabentext", "a11yClickableTextLabel": "Vollständiger Text, in dem Wörter markiert werden können",
        "a11ySolutionModeHeader": "Lösungsmodus", "a11yCheckingHeader": "Überprüfen-Modus",
        "a11yCheck": "Die Antworten überprüfen. Die Eingaben werden als richtig, falsch oder unbeantwortet markiert.",
        "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
        "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet.",
    }
    return sub("MarkTheWords", "Mark the Words", title, params)


def summary(intro, statements, title="Zusammenfassung"):
    """statements: list of lists, first entry = correct statement."""
    params = {
        "intro": f"<p>{intro}</p>\n",
        "summaries": [{"summary": [f"<p>{t}</p>" for t in s], "subContentId": _sid(), "tip": ""} for s in statements],
        "overallFeedback": [{"from": 0, "to": 100}],
        "solvedLabel": "Fortschritt:", "scoreLabel": "Falsche Antworten:",
        "resultLabel": "Dein Ergebnis", "labelCorrect": "Richtig.",
        "labelIncorrect": "Falsch! Bitte versuche es noch einmal.",
        "alternativeIncorrectLabel": "Falsch", "labelCorrectAnswers": "Richtige Antworten.",
        "tipButtonLabel": "Tipp anzeigen", "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
        "progressText": "Fortschritt :num von :total",
    }
    return sub("Summary", "Summary", title, params)


def singlechoiceset(questions, title="Schnellquiz", auto_continue=True):
    """questions: list of (question, [correct, wrong, wrong, ...])"""
    params = {
        "choices": [{"subContentId": _sid(), "question": f"<p>{q}</p>\n", "answers": [f"<p>{t}</p>" for t in a]}
                    for q, a in questions],
        "overallFeedback": [{"from": 0, "to": 100}],
        "behaviour": {"autoContinue": auto_continue, "timeoutCorrect": 2000,
                      "timeoutWrong": 3000, "soundEffectsEnabled": True,
                      "enableRetry": True, "enableSolutionsButton": True, "passPercentage": 100},
        "l10n": {"nextButtonLabel": "Nächste Frage", "showSolutionButtonLabel": "Lösung anzeigen",
                 "retryButtonLabel": "Wiederholen", "solutionViewTitle": "Lösung",
                 "correctText": "Richtig!", "incorrectText": "Falsch!",
                 "muteButtonLabel": "Ton ausschalten", "closeButtonLabel": "Schließen",
                 "slideOfTotal": "Folie :num von :total", "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
                 "solutionListQuestionNumber": "Frage :num",
                 "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
                 "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet."},
    }
    return sub("SingleChoiceSet", "Single Choice Set", title, params)


def blanks_params(task, questions, case_sensitive=False, spelling=True):
    p = _tpl("H5P.Blanks")
    p["text"] = task
    p["questions"] = [f"<p>{q}</p>\n" for q in questions]
    p["behaviour"]["caseSensitive"] = case_sensitive
    p["behaviour"]["acceptSpellingErrors"] = spelling
    return p


def blanks(task, questions, title="Lückentext", **kw):
    return sub("Blanks", "Fill in the Blanks", title, blanks_params(task, questions, **kw))


# ---------------------------------------------------------------- top level
def interactive_book(name, chapters, base_color="#1d5fd1", cover=None, intro=""):
    """chapters: list of (title, [subcontents])"""
    p = _tpl("H5P.InteractiveBook")
    p["behaviour"]["baseColor"] = base_color
    p["next"], p["previous"], p["page"] = "Weiter", "Zurück", "Seite"
    p["chapters"] = []
    files = []
    for ctitle, items in chapters:
        files += _collect_images(items)
        col = {"params": {"content": [{"content": it, "useSeparator": "auto"} for it in items]},
               "library": libs.lib("Column"), "subContentId": _sid(),
               "metadata": _meta("Page", ctitle)}
        p["chapters"].append(col)
    if cover:
        p["showCoverPage"] = True
        p["bookCover"] = {"coverDescription": f"<p style=\"text-align: center;\">{cover['text']}</p>",
                          "coverMedium": {"params": {"contentName": "Bild", "file": cover["image"].file_param(),
                                                     "alt": cover["alt"], "decorative": False},
                                          "library": libs.lib("Image"), "subContentId": _sid(),
                                          "metadata": _meta("Image", cover["alt"])}}
    if cover:
        files.append((cover["image"].local_path, cover["image"].h5p_path))
    return Hvp(name, libs.lib("InteractiveBook"), p, intro=intro, completion="view", files=files)


def question_set(name, questions, pass_pct=70, intro_text=None, feedback=None, completion="pass"):
    p = _tpl("H5P.QuestionSet")
    p["questions"] = questions
    p["passPercentage"] = pass_pct
    if intro_text:
        p["introPage"] = {"showIntroPage": True, "startButtonText": "Los geht's",
                          "introduction": f"<p>{intro_text}</p>"}
    p["endGame"]["message"] = "Dein Ergebnis"
    p["endGame"]["scoreHeader"] = "Punkte"
    p["endGame"]["amountCorrect"] = "@finals von @totals richtig"
    p["endGame"]["overallFeedback"] = feedback or [
        {"from": 0, "to": pass_pct - 1, "feedback": "Noch nicht bestanden. Lies die Seiten noch einmal, dann versuch es wieder – so oft du willst."},
        {"from": pass_pct, "to": 100, "feedback": "Bestanden."}]
    p["texts"]["previous"] = "Zurück"
    p["texts"]["next"] = "Weiter"
    p["texts"]["questionSetInstruction"] = "Frage auswählen"
    return Hvp(name, libs.lib("QuestionSet"), p, completion=completion,
               grademax=len(questions), gradepass=round(len(questions) * pass_pct / 100, 2))


def dialog_cards(name, cards, title="", description="", mode="normal", intro=""):
    """cards: list of (front_html, back_html[, tip_front[, ImageRef]])"""
    p = _tpl("H5P.Dialogcards")
    p["title"] = title
    p["description"] = description
    p["mode"] = mode
    p["dialogs"] = []
    files = []
    for c in cards:
        d = {"text": f"<p style=\"text-align: center;\">{c[0]}</p>",
             "answer": f"<p style=\"text-align: center;\">{c[1]}</p>", "tips": {}}
        if len(c) > 2 and c[2]:
            d["tips"] = {"front": c[2]}
        if len(c) > 3 and c[3]:
            d["image"] = c[3].file_param()
            d["imageAltText"] = c[0]
            files.append((c[3].local_path, c[3].h5p_path))
        p["dialogs"].append(d)
    return Hvp(name, libs.lib("Dialogcards"), p, intro=intro, completion="view", files=files)


def blanks_activity(name, task, questions, intro="", **kw):
    p = blanks_params(task, questions, **kw)
    return Hvp(name, libs.lib("Blanks"), p, intro=intro, completion="view", grademax=10)


def drag_question(name, zones, elements, width=760, height=480, intro="",
                  background: ImageRef | None = None, title="", cols=2, el_h=40):
    """Sorting task with automatic layout.

    zones: list of labels -> drop zones side by side in the upper part
    elements: list of (html, zone_index or None) -> grid in the lower part
    Pixel sizes are converted to em (16px = 1em at nominal width).
    """
    p = _tpl("H5P.DragQuestion")
    p["question"]["settings"]["size"] = {"width": width, "height": height}
    if background:
        p["question"]["settings"]["background"] = background.file_param()
    em = lambda px: round(px / 16, 2)
    pct_x = lambda px: round(px / width * 100, 2)
    pct_y = lambda px: round(px / height * 100, 2)
    n_el = len(elements)
    rows = (n_el + cols - 1) // cols
    gap = 14                      # vertical pitch = el_h + gap (verified: 40 px box + 14 px -> no overlap)
    label_room = 26               # DragQuestion 1.15 draws the zone label as a tab ABOVE the zone
    el_area_h = rows * (el_h + gap) + gap
    zone_h = height - el_area_h - label_room - gap
    nz = len(zones)
    zone_w = (width - gap * (nz + 1)) / nz
    dz = []
    for i, label in enumerate(zones):
        zx = gap + i * (zone_w + gap)
        dz.append({"x": pct_x(zx), "y": pct_y(label_room), "width": em(zone_w), "height": em(zone_h),
                   "correctElements": [], "showLabel": True, "backgroundOpacity": 100,
                   "tipsAndFeedback": {"tip": ""}, "single": False, "autoAlign": True,
                   "label": f"<div>{label}</div>\n"})
    els = []
    el_w = (width - gap * (cols + 1)) / cols - 24   # drag handle + border need ~24 px
    for i, (html, zone) in enumerate(elements):
        r, c = divmod(i, cols)
        ex = gap + c * (el_w + 24 + gap)
        ey = label_room + zone_h + 2 * gap + r * (el_h + gap)
        els.append({"type": {"library": libs.lib("AdvancedText"), "params": {"text": f"<div>{html}</div>\n"},
                             "subContentId": _sid(), "metadata": _meta("Text", f"Element {i+1}")},
                    "x": pct_x(ex), "y": pct_y(ey), "width": em(el_w), "height": em(el_h),
                    "dropZones": [str(z) for z in range(len(zones))],
                    "backgroundOpacity": 100, "multiple": False})
        if zone is not None:
            dz[zone]["correctElements"].append(str(i))
    p["question"]["task"] = {"elements": els, "dropZones": dz}
    p["behaviour"]["applyPenalties"] = False
    p["behaviour"]["enableScoreExplanation"] = False
    p["behaviour"]["showTitle"] = bool(title)
    p["scoreExplanation"] = ""
    p["title"] = title
    return Hvp(name, libs.lib("DragQuestion"), p, intro=intro, completion="view", grademax=len(elements))


# ---------------------------------------------------------------- branching
class Branch:
    """Helper to assemble a Branching Scenario graph.

    add_text(key, title, html, next_key)              -> plain content node
    add_question(key, question, alternatives)         -> alternatives: list of (text, next_key or END(...))
    END(title, subtitle) marks an ending.
    """

    def __init__(self):
        self.nodes = []      # list of dict(key=..., build=...)
        self.index = {}

    def _reg(self, key):
        self.index[key] = len(self.nodes)

    def add_text(self, key, title, html, next_key, img: ImageRef | None = None):
        self._reg(key)
        self.nodes.append({"key": key, "kind": "text", "title": title, "html": html,
                           "next": next_key, "img": img})

    def add_question(self, key, question, alternatives, title="Entscheidung"):
        self._reg(key)
        self.nodes.append({"key": key, "kind": "q", "title": title,
                           "question": question, "alts": alternatives})

    @staticmethod
    def END(title, subtitle, score=0):
        return {"end": True, "title": title, "subtitle": subtitle, "score": score}

    def _target(self, nxt):
        if isinstance(nxt, dict) and nxt.get("end"):
            return -1, {"title": nxt["title"], "subtitle": nxt["subtitle"],
                        "endScreenScore": nxt["score"]}
        return self.index[nxt], {"title": "", "subtitle": "", "endScreenScore": 0}

    def build(self):
        content = []
        for n in self.nodes:
            if n["kind"] == "text":
                nid, fb = self._target(n["next"])
                if n["img"]:
                    html = (f'<p><img src="{n["img"].h5p_path}" style="max-width:100%;height:auto;" '
                            f'alt=""></p>' + n["html"])
                else:
                    html = n["html"]
                node = {"type": {"library": libs.lib("AdvancedText"),
                                 "params": {"text": html},
                                 "subContentId": _sid(), "metadata": _meta("Text", n["title"])},
                        "showContentTitle": True, "proceedButtonText": "Weiter", "nextContentId": nid,
                        "forceContentFinished": "useBehavioural",
                        "feedback": fb, "contentBehaviour": "useBehavioural"}
            else:
                alts = []
                for text_, nxt in n["alts"]:
                    nid, fb = self._target(nxt)
                    alts.append({"text": text_, "nextContentId": nid, "addFeedback": nid == -1,
                                 "feedback": fb})
                node = {"type": {"library": libs.lib("BranchingQuestion"),
                                 "params": {"branchingQuestion": {
                                     "alternatives": alts,
                                     "question": f"<p>{n['question']}</p>"}},
                                 "subContentId": _sid(),
                                 "metadata": _meta("Branching Question", n["title"])},
                        "showContentTitle": False, "proceedButtonText": "Weiter", "nextContentId": -1,
                        "forceContentFinished": "useBehavioural",
                        "feedback": {"title": "", "subtitle": "", "endScreenScore": 0},
                        "contentBehaviour": "useBehavioural"}
            content.append(node)
        return content


def branching_scenario(name, branch: Branch, start_title, start_subtitle,
                       start_img: ImageRef | None = None, intro="", files=None):
    p = _tpl("H5P.BranchingScenario")
    bs = p["branchingScenario"]
    bs["content"] = branch.build()
    bs["startScreen"] = {"startScreenTitle": start_title, "startScreenSubtitle": start_subtitle}
    if start_img:
        bs["startScreen"]["startScreenImage"] = start_img.file_param()
    bs["endScreens"] = [{"endScreenTitle": "Geschafft", "endScreenSubtitle": "Du bist am Ende der Geschichte angekommen.",
                         "contentId": -1, "endScreenScore": 0}]
    bs["behaviour"]["enableBackwardsNavigation"] = True
    bs["l10n"]["startScreenButtonText"] = "Geschichte starten"
    bs["l10n"]["endScreenButtonText"] = "Noch einmal anders entscheiden"
    return Hvp(name, libs.lib("BranchingScenario"), p, intro=intro, completion="view", files=files or [])
