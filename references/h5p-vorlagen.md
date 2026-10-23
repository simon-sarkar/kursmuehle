# Anhang A – H5P-Vorlagen (`json_content`) mit deutschen Oberflächentexten, Stand 22.10.2026

Jede Vorlage ist genau das, was der ByCS-Editor für einen leeren Inhalt speichert. Inhalte einsetzen, Oberflächentexte unverändert lassen. Bei Interactive Book `next`/`previous`/`page` zusätzlich auf „Weiter“/„Zurück“/„Seite“ setzen (die Plattform-Vorlage lässt sie englisch).

### H5P.Blanks 1.14 (Hauptinhalt)

```json
{
 "media": {
  "type": {
   "params": {}
  },
  "disableImageZooming": false
 },
 "text": "Trage die fehlenden Wörter ein!",
 "overallFeedback": [
  {
   "from": 0,
   "to": 100
  }
 ],
 "showSolutions": "Lösung anzeigen",
 "tryAgain": "Wiederholen",
 "checkAnswer": "Überprüfen",
 "submitAnswer": "Absenden",
 "notFilledOut": "Bitte fülle alle Lücken aus, um die Lösung ansehen zu können",
 "answerIsCorrect": "':ans' ist korrekt",
 "answerIsWrong": "':ans' ist falsch",
 "answeredCorrectly": "Korrekt beantwortet",
 "answeredIncorrectly": "Falsch beantwortet",
 "solutionLabel": "Korrekte Antwort:",
 "inputLabel": "Lücke @num von @total",
 "inputHasTipLabel": "Tipp verfügbar",
 "tipLabel": "Tipp",
 "behaviour": {
  "enableRetry": true,
  "allowRetryIfCorrect": false,
  "enableSolutionsButton": true,
  "enableCheckButton": true,
  "autoCheck": false,
  "caseSensitive": true,
  "showSolutionsRequiresInput": true,
  "separateLines": false,
  "confirmCheckDialog": false,
  "confirmRetryDialog": false,
  "acceptSpellingErrors": false
 },
 "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
 "a11yCheck": "Die Antworten überprüfen. Die Eingaben werden als richtig, falsch oder unbeantwortet markiert.",
 "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
 "a11yRetry": "Die Aufgabe wiederholen. Alle Eingaben werden zurückgesetzt und die Aufgabe wird erneut gestartet.",
 "a11yCheckingModeHeader": "Überprüfen-Modus aktiv",
 "confirmCheck": {
  "header": "Beenden?",
  "body": "Ganz sicher beenden?",
  "cancelLabel": "Abbrechen",
  "confirmLabel": "Beenden"
 },
 "confirmRetry": {
  "header": "Wiederholen?",
  "body": "Ganz sicher wiederholen?",
  "cancelLabel": "Abbrechen",
  "confirmLabel": "Bestätigen"
 }
}
```

### H5P.BranchingScenario 1.11 (Hauptinhalt)

```json
{
 "branchingScenario": {
  "content": [],
  "endScreens": [
   {
    "endScreenTitle": "",
    "endScreenSubtitle": "",
    "contentId": -1,
    "endScreenScore": 0
   }
  ],
  "scoringOptionGroup": {
   "scoringOption": "no-score",
   "includeInteractionsScores": true
  },
  "startScreen": {
   "startScreenTitle": "",
   "startScreenSubtitle": ""
  },
  "behaviour": {
   "enableBackwardsNavigation": false,
   "forceContentFinished": false,
   "randomizeBranchingQuestions": false
  },
  "l10n": {
   "startScreenButtonText": "Kurs starten",
   "endScreenButtonText": "Kurs neu starten",
   "backButtonText": "Zurück",
   "disableProceedButtonText": "Nötig, um das aktuelle Modul abzuschließen",
   "replayButtonText": "Video wiederholen",
   "scoreText": "Deine Punktzahl:",
   "fullscreenAria": "Vollbild"
  }
 }
}
```

### H5P.Dialogcards 1.9 (Hauptinhalt)

```json
{
 "mode": "normal",
 "dialogs": [
  {
   "text": "<p style=\"text-align: center;\"></p>",
   "answer": "<p style=\"text-align: center;\"></p>",
   "tips": {}
  }
 ],
 "behaviour": {
  "enableRetry": true,
  "disableBackwardsNavigation": false,
  "scaleTextNotCard": false,
  "randomCards": false,
  "maxProficiency": 5,
  "quickProgression": false
 },
 "answer": "Umdrehen",
 "next": "Weiter",
 "prev": "Zurück",
 "retry": "Wiederholen",
 "correctAnswer": "Ich hatte es richtig!",
 "incorrectAnswer": "Ich hatte es falsch!",
 "round": "Runde @round",
 "cardsLeft": "Verbleibende Karten: @number",
 "nextRound": "Weiter mit Runde @round",
 "startOver": "Von vorne anfangen",
 "showSummary": "Weiter",
 "summary": "Zusammenfassung",
 "summaryCardsRight": "Richtige Karten:",
 "summaryCardsWrong": "Falsche Karten:",
 "summaryCardsNotShown": "Nicht angezeigt Karten:",
 "summaryOverallScore": "Gesamtpunkte",
 "summaryCardsCompleted": "Karten, die du fertig gelernt hast:",
 "summaryCompletedRounds": "Abgeschlossene Runden:",
 "summaryAllDone": "Gut gemacht! Du hattest alle @cards Karten @max -mal hintereinander richtig!",
 "progressText": "Karte @card von @total",
 "cardFrontLabel": "Kartenvorderseite",
 "cardBackLabel": "Kartenrückseite",
 "tipButtonLabel": "Tipp anzeigen",
 "audioNotSupported": "Dein Browser unterstützt diese Tondatei nicht",
 "confirmStartingOver": {
  "header": "Von vorne anfangen?",
  "body": "Dein gesamter Fortschritt bisher wird gelöscht. Bist du sicher, dass du von vorne anfangen möchtest?",
  "cancelLabel": "Abbrechen",
  "confirmLabel": "Ja, von vorne anfangen"
 },
 "title": "",
 "description": ""
}
```

### H5P.DragQuestion 1.15 (Hauptinhalt)

```json
{
 "scoreShow": "Überprüfen",
 "submit": "Übermitteln",
 "tryAgain": "Wiederholen",
 "scoreExplanation": "Richtige Antworten geben +1 Punkte. Bei falschen Antworten gibt es -1 Punkt. Die kleinstmögliche Punktzahl ist 0.",
 "question": {
  "settings": {
   "size": {
    "width": 620,
    "height": 310
   }
  },
  "task": {
   "elements": [],
   "dropZones": []
  }
 },
 "overallFeedback": [
  {
   "from": 0,
   "to": 100
  }
 ],
 "behaviour": {
  "enableRetry": true,
  "enableCheckButton": true,
  "singlePoint": false,
  "applyPenalties": true,
  "enableScoreExplanation": true,
  "dropZoneHighlighting": "dragging",
  "autoAlignSpacing": 2,
  "enableFullScreen": false,
  "showScorePoints": true,
  "showTitle": true,
  "dragHandleVisibility": true
 },
 "grabbablePrefix": "Ziehbares Element {num} von {total}.",
 "grabbableSuffix": "Abgelegt in Ablagezone {num}.",
 "dropzonePrefix": "Ablagezone {num} von {total}.",
 "noDropzone": "Keine Ablagezone.",
 "tipLabel": "Hinweis zeigen",
 "tipAvailable": "Hinweis verfügbar",
 "correctAnswer": "Richtige Antwort",
 "wrongAnswer": "Falsche Antwort",
 "feedbackHeader": "Rückmeldung",
 "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
 "scoreExplanationButtonLabel": "Zeige Erklärung der Punktevergabe",
 "a11yCheck": "Die Antworten überprüfen. Die Eingaben werden als richtig, falsch oder unbeantwortet markiert.",
 "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet.",
 "localize": {
  "fullscreen": "Vollbild",
  "exitFullscreen": "Vollbild beenden"
 }
}
```

### H5P.InteractiveBook 1.15 (Hauptinhalt)

```json
{
 "showCoverPage": false,
 "bookCover": {
  "coverDescription": "<p style=\"text-align: center;\"></p>",
  "coverMedium": {
   "params": {}
  }
 },
 "chapters": [
  {
   "params": {
    "content": [
     {
      "content": {
       "params": {}
      },
      "useSeparator": "auto"
     },
     {
      "content": {
       "params": {}
      },
      "useSeparator": "auto"
     }
    ]
   },
   "library": "H5P.Column 1.22",
   "subContentId": "28cbbeea-3360-42f2-b62b-16772c388ef1",
   "metadata": {
    "contentType": "Page",
    "license": "U",
    "title": "Unbenannt: Page",
    "authors": [],
    "changes": [],
    "extraTitle": "Unbenannt: Page"
   }
  }
 ],
 "behaviour": {
  "baseColor": "#1768c4",
  "defaultTableOfContents": true,
  "progressIndicators": true,
  "progressAuto": true,
  "displaySummary": true,
  "enableRetry": true
 },
 "read": "Öffnen",
 "displayTOC": "Inhaltsverzeichnis anzeigen",
 "hideTOC": "Inhaltsverzeichnis ausblenden",
 "page": "Page",
 "next": "Next",
 "nextPage": "Nächste Seite",
 "previous": "Previous",
 "previousPage": "Vorherige Seite",
 "chapterCompleted": "Seite abgeschlossen!",
 "partCompleted": "@pages von @total Seiten abgeschlossen",
 "incompleteChapter": "Unvollständige Seite",
 "navigateToTop": "Nach oben springen",
 "markAsFinished": "Ich habe diese Seite abgeschlossen",
 "fullscreen": "Vollbild",
 "exitFullscreen": "Vollbild beenden",
 "bookProgressSubtext": "@count von @total Seiten",
 "interactionsProgressSubtext": "@count von @total Interaktionen",
 "submitReport": "Report absenden",
 "restartLabel": "Neustart",
 "summaryHeader": "Zusammenfassung",
 "allInteractions": "Alle Interaktionen",
 "unansweredInteractions": "Unbeantwortete Interaktionen",
 "scoreText": "@score / @maxscore",
 "leftOutOfTotalCompleted": "@left von @max Interaktionen abgeschlossen",
 "noInteractions": "Keine Interaktionen",
 "score": "Punkte",
 "summaryAndSubmit": "Zusammenfassung und Einsenden",
 "noChapterInteractionBoldText": "Du hast noch keine Seiten bearbeitet.",
 "noChapterInteractionText": "Du musst wenigstens eine Seite bearbeiten, um die Zusammenfassung zu sehen.",
 "yourAnswersAreSubmittedForReview": "Deine Antworten wurden zur Begutachtung versendet!",
 "bookProgress": "Buchfortschritt",
 "interactionsProgress": "Interaktionsfortschritt",
 "totalScoreLabel": "Gesamtpunktzahl",
 "a11y": {
  "progress": "Seite @page von @total.",
  "menu": "Inhaltsverzeichnis ein- bzw. ausschalten"
 }
}
```

### H5P.QuestionSet 1.21 (Hauptinhalt)

```json
{
 "introPage": {
  "showIntroPage": false,
  "startButtonText": "Quiz starten",
  "introduction": ""
 },
 "progressType": "dots",
 "passPercentage": 50,
 "questions": [
  {
   "params": {}
  }
 ],
 "disableBackwardsNavigation": false,
 "randomQuestions": false,
 "endGame": {
  "showResultPage": true,
  "showSolutionButton": true,
  "showRetryButton": true,
  "noResultMessage": "Quiz beendet",
  "message": "Results",
  "amountCorrect": "@finals of @totals correct",
  "scoreBarLabel": "Du hast @score von @total Punkten erreicht.",
  "scoreHeader": "Score",
  "overallFeedback": [
   {
    "from": 0,
    "to": 100
   }
  ],
  "solutionButtonText": "Lösung anzeigen",
  "retryButtonText": "Wiederholen",
  "finishButtonText": "Beenden",
  "submitButtonText": "Absenden",
  "showAnimations": false,
  "skippable": false,
  "skipButtonText": "Video überspringen"
 },
 "override": {
  "checkButton": true
 },
 "texts": {
  "prevButton": "Zurück",
  "previous": "Previous",
  "nextButton": "Weiter",
  "next": "Next",
  "finishButton": "Beenden",
  "submitButton": "Absenden",
  "textualProgress": "Aktuelle Frage: @current von @total Fragen",
  "jumpToQuestion": "Frage %d von %total",
  "questionLabel": "Frage",
  "readSpeakerProgress": "Frage @current von @total",
  "unansweredText": "Unbeantwortet",
  "answeredText": "Beantwortet",
  "currentQuestionText": "Aktuelle Frage",
  "navigationLabel": "Fragen",
  "questionSetInstruction": "Choose question to display"
 }
}
```

### Bausteine (Unterinhalte) – `params` je Bibliothek

Einbetten als `{"library": "<Name Version>", "params": {…}, "subContentId": "<uuid4>", "metadata": {"contentType": "<Typ>", "license": "U", "title": "…", "authors": [], "changes": [], "extraTitle": "…"}}`.

#### H5P.AdvancedText 1.1

```json
{
 "text": "<p>asfsygdfgsd</p>"
}
```

#### H5P.BranchingQuestion 1.0

```json
{
 "branchingQuestion": {
  "alternatives": [
   {
    "nextContentId": 2,
    "feedback": {
     "title": "",
     "subtitle": ""
    },
    "text": "asdasd"
   },
   {
    "nextContentId": 1,
    "feedback": {
     "title": "",
     "subtitle": ""
    },
    "text": "asd"
   }
  ],
  "question": "<p>asdasd</p>"
 }
}
```

#### H5P.DragText 1.10

```json
{
 "media": {
  "type": {
   "params": {}
  },
  "disableImageZooming": false
 },
 "taskDescription": "Ziehe die Wörter in die richtigen Felder!",
 "overallFeedback": [
  {
   "from": 0,
   "to": 100
  }
 ],
 "checkAnswer": "Überprüfen",
 "submitAnswer": "Absenden",
 "tryAgain": "Wiederholen",
 "showSolution": "Lösung anzeigen",
 "dropZoneIndex": "Ablagefeld @index.",
 "empty": "Ablagefeld @index ist leer.",
 "contains": "Ablagefeld @index enthält ziehbaren Text @draggable.",
 "ariaDraggableIndex": "@index von @count ziehbaren Texten.",
 "tipLabel": "Tipp anzeigen",
 "correctText": "Richtig!",
 "incorrectText": "Falsch!",
 "resetDropTitle": "Ablagefelder zurücksetzen",
 "resetDropDescription": "Bist du sicher, dass du dieses Ablagefeld zurücksetzen möchtest?",
 "grabbed": "Ziehbarer Text wurde aufgenommen.",
 "cancelledDragging": "Ziehen abgebrochen.",
 "correctAnswer": "Korrekte Antwort:",
 "feedbackHeader": "Rückmeldung",
 "behaviour": {
  "enableRetry": true,
  "enableSolutionsButton": true,
  "enableCheckButton": true,
  "instantFeedback": false
 },
 "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
 "a11yCheck": "Die Antworten überprüfen. Die Eingaben werden als richtig, falsch oder unbeantwortet markiert.",
 "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
 "a11yRetry": "Die Aufgabe wiederholen. Alle Eingaben werden zurückgesetzt und die Aufgabe wird erneut gestartet."
}
```

#### H5P.Image 1.1

```json
{
 "decorative": false,
 "contentName": "Bild",
 "expandImage": "Bild vergrößern",
 "minimizeImage": "Bild verkleinern",
 "file": {
  "path": "images/file-6ada2241e9540.jpg#tmp",
  "mime": "image/jpeg",
  "copyright": {
   "license": "U"
  },
  "width": 1024,
  "height": 559
 }
}
```

#### H5P.MarkTheWords 1.11

```json
{
 "media": {
  "type": {
   "params": {}
  },
  "disableImageZooming": false
 },
 "overallFeedback": [
  {
   "from": 0,
   "to": 100
  }
 ],
 "checkAnswerButton": "Überprüfen",
 "submitAnswerButton": "Absenden",
 "tryAgainButton": "Wiederholen",
 "showSolutionButton": "Lösung anzeigen",
 "behaviour": {
  "enableRetry": true,
  "enableSolutionsButton": true,
  "enableCheckButton": true,
  "showScorePoints": true
 },
 "correctAnswer": "Richtig!",
 "incorrectAnswer": "Falsch!",
 "missedAnswer": "Nicht gefunden!",
 "displaySolutionDescription": "Die Lösungen sind nun im Text markiert.",
 "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
 "a11yFullTextLabel": "Gesamter lesbarer Text",
 "a11yClickableTextLabel": "Gesamter Text, wo Wörter markiert werden können",
 "a11ySolutionModeHeader": "Lösungsmodus",
 "a11yCheckingHeader": "Antworten überprüfen-Modus",
 "a11yCheck": "Die Antworten überprüfen. Die Auswahlen werden als richtig, falsch oder fehlend markiert.",
 "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
 "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet.",
 "taskDescription": "<p>afsdfasdfasdfasdfasdfsd adsf</p>",
 "textField": "<p>gaga</p>"
}
```

#### H5P.MultiChoice 1.16

```json
{
 "media": {
  "type": {
   "params": {}
  },
  "disableImageZooming": false
 },
 "answers": [
  {
   "correct": true,
   "tipsAndFeedback": {
    "tip": "",
    "chosenFeedback": "",
    "notChosenFeedback": ""
   },
   "text": "<div>ddd</div>"
  },
  {
   "correct": false,
   "tipsAndFeedback": {
    "tip": "",
    "chosenFeedback": "",
    "notChosenFeedback": ""
   },
   "text": "<div>sdfsdf</div>"
  }
 ],
 "overallFeedback": [
  {
   "from": 0,
   "to": 100
  }
 ],
 "behaviour": {
  "enableRetry": true,
  "enableSolutionsButton": true,
  "enableCheckButton": true,
  "type": "auto",
  "singlePoint": false,
  "randomAnswers": true,
  "showSolutionsRequiresInput": true,
  "confirmCheckDialog": false,
  "confirmRetryDialog": false,
  "autoCheck": false,
  "passPercentage": 100,
  "showScorePoints": true
 },
 "UI": {
  "checkAnswerButton": "Überprüfen",
  "submitAnswerButton": "Absenden",
  "showSolutionButton": "Lösung anzeigen",
  "tryAgainButton": "Wiederholen",
  "tipsLabel": "Hinweis anzeigen",
  "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
  "tipAvailable": "Hinweis verfügbar",
  "feedbackAvailable": "Rückmeldung verfügbar",
  "readFeedback": "Rückmeldung vorlesen",
  "wrongAnswer": "Falsche Antwort",
  "correctAnswer": "Richtige Antwort",
  "shouldCheck": "Hätte gewählt werden müssen",
  "shouldNotCheck": "Hätte nicht gewählt werden sollen",
  "noInput": "Bitte antworte, bevor du die Lösung ansiehst",
  "a11yCheck": "Die Antworten überprüfen. Die Auswahlen werden als richtig, falsch oder fehlend markiert.",
  "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
  "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet."
 },
 "confirmCheck": {
  "header": "Beenden?",
  "body": "Ganz sicher beenden?",
  "cancelLabel": "Abbrechen",
  "confirmLabel": "Beenden"
 },
 "confirmRetry": {
  "header": "Wiederholen?",
  "body": "Ganz sicher wiederholen?",
  "cancelLabel": "Abbrechen",
  "confirmLabel": "Bestätigen"
 },
 "question": "<p>asdfsadf</p>"
}
```

#### H5P.SingleChoiceSet 1.11

```json
{
 "choices": [
  {
   "subContentId": "c446ea29-4eea-411b-aaa1-675db3422fbd",
   "question": "<p>agsdgasdfsdf</p>",
   "answers": [
    "<p>fdsaf</p>",
    "<p>asdfasdf</p>"
   ]
  },
  {
   "subContentId": "272d1ae0-5c73-4614-a55f-83617740d6ed",
   "question": "<p>asdfasdf</p>",
   "answers": [
    "<p>fasdfdsf</p>",
    "<p>afsdfasdfasdf</p>"
   ]
  }
 ],
 "overallFeedback": [
  {
   "from": 0,
   "to": 100
  }
 ],
 "behaviour": {
  "autoContinue": true,
  "timeoutCorrect": 2000,
  "timeoutWrong": 3000,
  "soundEffectsEnabled": true,
  "enableRetry": true,
  "enableSolutionsButton": true,
  "passPercentage": 100
 },
 "l10n": {
  "nextButtonLabel": "Weiter",
  "nextButton": "Next",
  "showResultsButtonLabel": "Show results",
  "retryButtonLabel": "Wiederholen",
  "solutionViewTitle": "Lösung",
  "correctText": "Richtig!",
  "incorrectText": "Falsch!",
  "shouldSelect": "Hätte gewählt werden müssen",
  "shouldNotSelect": "Hätte nicht gewählt werden sollen",
  "muteButtonLabel": "Stumm schalten",
  "closeButtonLabel": "Schließen",
  "slideOfTotal": "Seite :num von :total",
  "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
  "solutionListQuestionNumber": "Frage :num",
  "a11yShowSolution": "Die Lösung anzeigen. Die richtigen Lösungen werden in der Aufgabe angezeigt.",
  "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt und die Aufgabe wird erneut gestartet.",
  "resultHeader": "Dein Ergebnis:",
  "totalScore": ":score von :maxScore korrekt",
  "resultTableHeader": "Frage",
  "resultScoreTableHeader": "Punkte",
  "correctAnswerIntroduction": "Richtige Antwort"
 }
}
```

#### H5P.Summary 1.10

```json
{
 "intro": "<p>Wähle die korrekte Aussage.</p>",
 "summaries": [
  {
   "subContentId": "38d58334-0659-4e14-bf6d-852e426507f8",
   "summary": [
    "<p>fasdfasdfasdfasdf</p>",
    "<p>afsdfasdfasdfasdfasdfasdfasdfasdfasdf</p>"
   ],
   "tip": ""
  }
 ],
 "overallFeedback": [
  {
   "from": 0,
   "to": 100
  }
 ],
 "solvedLabel": "Fortschritt:",
 "scoreLabel": "Falsche Antworten:",
 "resultLabel": "Dein Ergebnis",
 "labelCorrect": "Richtig.",
 "labelIncorrect": "Falsch! Bitte versuche es noch einmal.",
 "alternativeIncorrectLabel": "Falsch",
 "labelCorrectAnswers": "Richtige Antwort(en).",
 "tipButtonLabel": "Tipp anzeigen",
 "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
 "progressText": "Fortschritt :num von :total"
}
```

#### H5P.TrueFalse 1.8

```json
{
 "media": {
  "type": {
   "params": {}
  },
  "disableImageZooming": false
 },
 "correct": "false",
 "behaviour": {
  "enableRetry": true,
  "enableSolutionsButton": true,
  "enableCheckButton": true,
  "confirmCheckDialog": false,
  "confirmRetryDialog": false,
  "autoCheck": false
 },
 "l10n": {
  "trueText": "Wahr",
  "falseText": "Falsch",
  "score": "Du hast @score von @total Punkten erreicht.",
  "checkAnswer": "Überprüfen",
  "submitAnswer": "Absenden",
  "showSolutionButton": "Lösung anzeigen",
  "tryAgain": "Wiederholen",
  "wrongAnswerMessage": "Falsche Antwort",
  "correctAnswerMessage": "Richtige Antwort",
  "scoreBarLabel": "Du hast :num von :total Punkten erreicht.",
  "a11yCheck": "Die Antworten überprüfen. Die Antwort wird als richtig, falsch oder unbeantwortet markiert.",
  "a11yShowSolution": "Die Lösung anzeigen. Die richtige Lösung wird in der Aufgabe angezeigt.",
  "a11yRetry": "Die Aufgabe wiederholen. Alle Versuche werden zurückgesetzt, und die Aufgabe wird erneut gestartet."
 },
 "confirmCheck": {
  "header": "Beenden?",
  "body": "Ganz sicher beenden?",
  "cancelLabel": "Abbrechen",
  "confirmLabel": "Beenden"
 },
 "confirmRetry": {
  "header": "Wiederholen?",
  "body": "Ganz sicher wiederholen?",
  "cancelLabel": "Abbrechen",
  "confirmLabel": "Bestätigen"
 },
 "question": "<p>asdfasdfasdf</p>"
}
```

---

