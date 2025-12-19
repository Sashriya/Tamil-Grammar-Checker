# ============================
#  TAMIL GRAMMAR ENGINE v1.0
# ============================

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from docx import Document
import re
import json
import Levenshtein   # pip install python-Levenshtein

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================
#  LOAD TAMIL DICTIONARY
# ============================

TAMIL_DICT = {
"""^p^p to ^p
^p space to ^p
^p" space to ^p"
^p' space to ^p'
 Space . , ?!
 .,?! Space
 ? " to ?"
 ? " Space
. . to ..
 ... " 
 ..." Space
 ? ' to ?'
 ?' space
 .. To ...
 .... To ...
 " To "
 ' to '
 ?? 
 !!
… to ...
" to "
' to '"""
}
  # temporary small sample



# ============================
#  REGEX RULES
# ============================

DOUBLE_SPACE_RE = re.compile(r"\s{2,}")
PARA_RE = re.compile(r"\n{2,}")  # multiple ^p
OPEN_QUOTE_SPACE = re.compile(r'^\s*["\']\s+')

PUNCT_BEFORE = re.compile(r'\s+([.,?!])')     # space before punctuation
PUNCT_AFTER = re.compile(r'([.,?!])(?=[^\s"\'])')

ELLIPSIS_2 = re.compile(r'\s*\.\.\s*')        # . .
ELLIPSIS_4 = re.compile(r'\s*\.{4,}\s*')      # ....
UNICODE_ELLIPSIS = re.compile(r'…')

MULTI_SPACES = re.compile(r" {2,}")

# ============================
#  FORMAT CLEANUP ENGINE
# ============================

def apply_formatting_rules(text):

    original = text

    # 1) ^p^p → ^p
    text = PARA_RE.sub("\n", text)

    # 2) ^p + space → ^p
    text = re.sub(r"\n\s+", "\n", text)

    # 3) ^p" space → ^p"
    text = re.sub(r'\n"\s+', '\n"', text)
    text = re.sub(r"\n'\s+", "\n'", text)

    # 4) Remove space before punctuation
    text = PUNCT_BEFORE.sub(r'\1', text)

    # 5) Add space after punctuation
    text = PUNCT_AFTER.sub(r'\1 ', text)

    # 6) Fix ? "
    text = text.replace('? "', '?"')
    text = text.replace('!"', '!"')
    text = text.replace('." "', '."')

    # 7) Fix special punct combos
    text = ELLIPSIS_2.sub("..", text)
    text = ELLIPSIS_4.sub("...", text)

    text = UNICODE_ELLIPSIS.sub("...", text)

    # 8) Replace multiple spaces → single space
    text = MULTI_SPACES.sub(" ", text)

    return text


# ============================
#  GRAMMAR RULES (Tamil Ilakkanam)
# ============================

def grammar_rules(text):
    issues = []

    patterns = [
        (r"நான்\s+\w+ார்கள்", "Plural verb used with நான்"),
        (r"அவர்கள்\s+\w+ான்", "Singular male verb with அவர்கள்"),
        (r"அவள்\s+\w+ான்", "Male verb used with female subject"),
        (r"அவன்\s+\w+ாள்", "Female verb used with male subject"),
    ]

    for patt, msg in patterns:
        for m in re.finditer(patt, text):
            issues.append({
                "type": "grammar",
                "match": m.group(),
                "message": msg
            })

    return issues


# ============================
#  SANDHI CHECKER
# ============================

SANDHI_RULES = {
    ("த்", "அ"): "த்த",
    ("த்", "உ"): "த்து",
    ("ப்", "அ"): "ப்ப",
    ("ம்", "ப"): "ம்ப",
    ("ங்", "க"): "ங்க",
}

def sandhi_rules(words):
    issues = []

    for i in range(len(words) - 1):
        w1 = words[i]
        w2 = words[i+1]

        last = w1[-1]
        first = w2[0]

        if (last, first) in SANDHI_RULES:
            issues.append({
                "type": "sandhi",
                "word1": w1,
                "word2": w2,
                "correct_join": SANDHI_RULES[(last, first)]
            })

    return issues


# ============================
#  SPELLING ENGINE
# ============================

def spelling_rules(words):
    issues = []

    for w in words:

        if w in TAMIL_DICT:
            continue

        # Suggest closest Tamil words
        suggestions = []
        for dw in TAMIL_DICT:
            if Levenshtein.distance(w, dw) <= 2:
                suggestions.append(dw)
            if len(suggestions) >= 5:
                break

        issues.append({
            "type": "spelling",
            "word": w,
            "suggestions": suggestions
        })

    return issues


# ============================
#  HIGHLIGHT ENGINE
# ============================

def highlight(text, issues):
    red_text = text

    for i in issues:
        if "match" in i:
            red_text = red_text.replace(
                i["match"],
                f"<span class='wrong'>{i['match']}</span>"
            )

        if i["type"] == "spelling":
            w = i["word"]
            red_text = red_text.replace(
                w,
                f"<span class='wrong'>{w}</span>"
            )

    return red_text


# ============================
#  MAIN PROCESSOR
# ============================

def process(text):

    formatted = apply_formatting_rules(text)

    words = formatted.split()

    grammar = grammar_rules(formatted)
    sandhi = sandhi_rules(words)
    spelling = spelling_rules(words)

    all_issues = grammar + sandhi + spelling

    red = highlight(formatted, all_issues)

    # Green highlight only for corrected formatting parts
    green = formatted.replace("  ", "<span class='correct'> </span>")

    return {
        "formatted_text": formatted,
        "highlighted_original": red,
        "highlighted_corrected": green,
        "issues": all_issues
    }


# ============================
#  DOCX + TEXT ENDPOINT
# ============================

@app.post("/proofread")
async def proofread(text: str = Form(None), file: UploadFile = File(None)):

    if file:
        doc = Document(file.file)
        paragraphs = [p.text for p in doc.paragraphs]
        full_text = "\n".join(paragraphs)

        res = process(full_text)
        return {
            "text_extracted": full_text,
            "highlighted_original": res["highlighted_original"],
            "highlighted_corrected": res["highlighted_corrected"],
            "corrected_text": res["formatted_text"],
            "issues": res["issues"]
        }

    if text:
        return process(text)

    return {"error": "No input received"}
