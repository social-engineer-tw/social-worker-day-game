from pathlib import Path
import re

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "submission" / "作品說明書.md"
OUTPUT = ROOT / "submission" / "作品說明書.docx"


def set_run_font(run, name="Microsoft JhengHei", size=11, bold=None, color="000000"):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)


def clean_markdown(text):
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    return text.strip()


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("第 ")
    set_run_font(run, size=9, color="666666")
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    paragraph._p.append(fld)
    run = paragraph.add_run(" 頁")
    set_run_font(run, size=9, color="666666")


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(0.72)
section.bottom_margin = Inches(0.7)
section.left_margin = Inches(0.82)
section.right_margin = Inches(0.82)
section.header_distance = Inches(0.3)
section.footer_distance = Inches(0.35)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Microsoft JhengHei"
normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft JhengHei")
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.35

title_style = styles["Title"]
title_style.font.name = "Microsoft JhengHei"
title_style._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft JhengHei")
title_style.font.size = Pt(22)
title_style.font.bold = True
title_style.font.color.rgb = RGBColor(0, 0, 0)
title_style.paragraph_format.space_after = Pt(16)
title_ppr = title_style._element.get_or_add_pPr()
title_border = title_ppr.find(qn("w:pBdr"))
if title_border is not None:
    title_ppr.remove(title_border)

for style_name, size, before, after in [
    ("Heading 1", 15, 15, 7),
    ("Heading 2", 12.5, 10, 5),
]:
    style = styles[style_name]
    style.font.name = "Microsoft JhengHei"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft JhengHei")
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor(0, 0, 0)
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)
    style.paragraph_format.keep_with_next = True

doc.core_properties.title = "2026 三好 AI 創新應用競賽作品說明書"
doc.core_properties.subject = "社會組 AI 數位應用實作類"
doc.core_properties.author = "參賽團隊"
doc.core_properties.keywords = "社工 公共教育 互動遊戲 AI 輔助開發"

footer = section.footer
footer_para = footer.paragraphs[0]
add_page_number(footer_para)

lines = SOURCE.read_text(encoding="utf-8").splitlines()
first_body = True
for raw in lines:
    line = raw.strip()
    if not line:
        continue
    if line.startswith("# "):
        paragraph = doc.add_paragraph(style="Title")
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.add_run(clean_markdown(line[2:]))
        set_run_font(run, size=22, bold=True)
        subtitle = doc.add_paragraph()
        subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
        subrun = subtitle.add_run("社會組  AI 數位應用實作類")
        set_run_font(subrun, size=11, bold=True, color="4A5A67")
        subtitle.paragraph_format.space_after = Pt(14)
        continue
    if line.startswith("## "):
        paragraph = doc.add_paragraph(clean_markdown(line[3:]), style="Heading 1")
        if line.startswith("## 一 "):
            paragraph.paragraph_format.space_before = Pt(4)
        continue
    if line.startswith("### "):
        doc.add_paragraph(clean_markdown(line[4:]), style="Heading 2")
        continue
    if line.startswith("- "):
        paragraph = doc.add_paragraph(style="List Bullet")
        run = paragraph.add_run(clean_markdown(line[2:]))
        set_run_font(run, size=11)
        paragraph.paragraph_format.space_after = Pt(3)
        paragraph.paragraph_format.line_spacing = 1.25
        continue

    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.widow_control = True
    paragraph.paragraph_format.keep_together = False
    run = paragraph.add_run(clean_markdown(line))
    set_run_font(run, size=11)
    if first_body:
        paragraph.paragraph_format.space_before = Pt(2)
        first_body = False

doc.add_paragraph()
source_heading = doc.add_paragraph("競賽規格來源", style="Heading 1")
source = doc.add_paragraph()
source.add_run("佛光大學 2026 三好 AI 創新應用競賽官方網站：https://3goodai.fgu.edu.tw/  核對日期：2026 年 11 月 11 日")
for run in source.runs:
    set_run_font(run, size=9.5, color="555555")

doc.save(OUTPUT)
print(OUTPUT)
