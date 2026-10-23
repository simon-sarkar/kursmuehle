"""Library versions installed on lernplattform.bycs.de (mod_hvp).

Confirmed from test exports (2026-10-22): the six top-level types.
Sub-content versions marked PROVISIONAL until export 3 arrives.
"""

LIBS = {
    # confirmed
    "InteractiveBook": "H5P.InteractiveBook 1.15",
    "Column": "H5P.Column 1.22",
    "BranchingScenario": "H5P.BranchingScenario 1.11",
    "QuestionSet": "H5P.QuestionSet 1.21",
    "DragQuestion": "H5P.DragQuestion 1.15",
    "Blanks": "H5P.Blanks 1.14",
    "Dialogcards": "H5P.Dialogcards 1.9",
    # PROVISIONAL (sub-content)
    "AdvancedText": "H5P.AdvancedText 1.1",
    "Image": "H5P.Image 1.1",
    "MultiChoice": "H5P.MultiChoice 1.16",
    "TrueFalse": "H5P.TrueFalse 1.8",
    "DragText": "H5P.DragText 1.10",
    "MarkTheWords": "H5P.MarkTheWords 1.11",
    "Summary": "H5P.Summary 1.10",
    "SingleChoiceSet": "H5P.SingleChoiceSet 1.11",
    "BranchingQuestion": "H5P.BranchingQuestion 1.0",
    "CoursePresentation": "H5P.CoursePresentation 1.27",
}


def lib(name: str) -> str:
    return LIBS[name]


def split(libstr: str):
    mn, ver = libstr.split(" ")
    major, minor = ver.split(".")
    return mn, int(major), int(minor)
