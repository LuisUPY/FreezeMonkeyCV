"""Build the one-page Word report from the student's sample document."""

from copy import deepcopy
from io import BytesIO
from pathlib import Path
from shutil import copyfile
from zipfile import ZipFile

import math
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[2]
REFERENCE = Path("/Users/jerry/Downloads/DS_Task8.docx")
OUTPUT = ROOT / "output/binary_tree_experiment_report.docx"
CHART = ROOT / "tmp/docx/search_chart.png"

rows = [
    (100, "Plain binary tree", 50.50, 100.00),
    (100, "BST random", 7.10, 7.63),
    (100, "BST sorted", 50.50, 54.25),
    (1000, "Plain binary tree", 510.28, 1000.00),
    (1000, "BST random", 11.50, 12.67),
    (1000, "BST sorted", 477.63, 524.38),
    (10000, "Plain binary tree", 5106.19, 10000.00),
    (10000, "BST random", 16.68, 17.38),
    (10000, "BST sorted", 4759.51, 5043.70),
]

# A conventional Office-style chart, with the same numbers as the PDF.
im = Image.new("RGB", (1400, 445), "white")
draw = ImageDraw.Draw(im)
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 22)
small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
colors = {"Plain binary tree": "#4472C4", "BST random": "#ED7D31", "BST sorted": "#777777"}
left, right, top, bottom = 110, 1330, 15, 305

def x_pos(n):
    return int(left + (math.log10(n) - 2) / 2 * (right - left))

def y_pos(value):
    return int(bottom - math.log10(value) / 4 * (bottom - top))

def dashed_line(a, b, color):
    distance = math.dist(a, b)
    for i in range(0, int(distance), 18):
        first = i / distance
        last = min(i + 11, distance) / distance
        p = (a[0] + (b[0] - a[0]) * first, a[1] + (b[1] - a[1]) * first)
        q = (a[0] + (b[0] - a[0]) * last, a[1] + (b[1] - a[1]) * last)
        draw.line((p, q), fill=color, width=3)

for value in (1, 10, 100, 1000, 10000):
    y = y_pos(value)
    draw.line((left, y, right, y), fill="#D9D9D9", width=2)
    draw.text((left - 15, y), f"{value:,}", fill="#333333", font=small, anchor="rm")
draw.line((left, top, left, bottom, right, bottom), fill="#444444", width=2)
for n in (100, 1000, 10000):
    draw.text((x_pos(n), bottom + 11), f"{n:,}", fill="#333333", font=small, anchor="mt")
draw.text(((left + right) / 2, 370), "Number of keys", fill="#333333", font=font, anchor="mm")
for name, color in colors.items():
    group = [r for r in rows if r[1] == name]
    for value_index in (2, 3):
        points = [(x_pos(r[0]), y_pos(r[value_index])) for r in group]
        for a, b in zip(points, points[1:]):
            if value_index == 2:
                draw.line((a, b), fill=color, width=4)
            else:
                dashed_line(a, b, color)
        for x, y in points:
            draw.ellipse((x-5, y-5, x+5, y+5), fill="white" if value_index == 3 else color,
                         outline=color, width=3)
for x, (name, color) in zip((220, 570, 900), colors.items()):
    draw.line((x, 420, x+45, 420), fill=color, width=4)
    draw.text((x+54, 420), name, fill="#333333", font=small, anchor="lm")
im.save(CHART)

# Preserve the original document package, section settings, and styles.
copyfile(REFERENCE, OUTPUT)
with ZipFile(REFERENCE) as archive:
    logo = archive.read("word/media/image1.png")
doc = Document(OUTPUT)
body = doc.element.body
for child in list(body):
    if child.tag != qn("w:sectPr"):
        body.remove(child)

normal = doc.styles["Normal"]
normal.font.name = "Times New Roman"
normal.font.size = Pt(10)
normal.font.color.rgb = RGBColor(0, 0, 0)
normal.paragraph_format.space_after = Pt(4)
normal.paragraph_format.line_spacing = 1.0
title_style = doc.styles["Title"]
title_style.font.name = "Times New Roman"
title_style.font.size = Pt(14)
title_style.font.bold = True
title_style.font.color.rgb = RGBColor(0, 0, 0)
title_style.paragraph_format.space_after = Pt(4)
for style_name in ("Heading 1", "Heading 2"):
    style = doc.styles[style_name]
    style.font.name = "Times New Roman"
    style.font.color.rgb = RGBColor(0, 0, 0)

section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = section.bottom_margin = Inches(.78)
section.left_margin = section.right_margin = Inches(.9)

def set_cell_border(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = tcPr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tcPr.append(borders)
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:color"), "D9D9D9")
        borders.append(el)

def shade(cell, fill):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    cell._tc.get_or_add_tcPr().append(shd)

def paragraph(text="", bold=False, before=0, after=3):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    run = p.add_run(text)
    run.bold = bold
    return p

header = doc.add_table(rows=1, cols=2)
header.autofit = False
header.columns[0].width = Inches(4.6)
header.columns[1].width = Inches(2.0)
header.cell(0, 0).width = Inches(4.6)
header.cell(0, 1).width = Inches(2.0)
left = header.cell(0, 0)
left.text = ""
p = left.paragraphs[0]
p.paragraph_format.space_after = Pt(0)
p.add_run("UNIVERSIDAD POLITECNICA DE YUCATAN\n").bold = True
p.add_run("TSU-CIENCIAS-DE-DATOS\n")
p.add_run("DATA STRUCTURE")
right = header.cell(0, 1)
right.text = ""
p = right.paragraphs[0]
p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
p.paragraph_format.space_after = Pt(0)
p.add_run().add_picture(BytesIO(logo), width=Inches(1.65))
for row in header.rows:
    for cell in row.cells:
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

p = doc.add_paragraph(style="Title")
p.add_run("Plain Binary Tree and BST Search")
paragraph("Luis Gerardo Escalante Velazquez", after=7)
paragraph("I inserted the same random keys into a plain binary tree and two BSTs, then searched for 100 present and 100 absent keys at each size. The sorted BST used the same keys in ascending order.", after=7)

paragraph("Results", bold=True, after=3)
table = doc.add_table(rows=1, cols=4)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False
widths = [Inches(.68), Inches(2.45), Inches(1.5), Inches(1.5)]
for i, width in enumerate(widths):
    table.columns[i].width = width
for i, label in enumerate(("n", "Tree", "Found", "Absent")):
    cell = table.rows[0].cells[i]
    cell.width = widths[i]
    cell.text = label
    shade(cell, "E7E6E6")
    for run in cell.paragraphs[0].runs:
        run.bold = True
for n, tree, found, absent in rows:
    cells = table.add_row().cells
    for i, value in enumerate((f"{n:,}", tree, f"{found:,.2f}", f"{absent:,.2f}")):
        cells[i].width = widths[i]
        cells[i].text = value
    for i in (0, 2, 3):
        cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
for row in table.rows:
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))
    for cell in row.cells:
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_border(cell)
        for p in cell.paragraphs:
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.space_before = Pt(0)
            for run in p.runs:
                run.font.size = Pt(8.5)

paragraph("Figure 1. Average nodes visited (solid: found; dashed: absent). The vertical axis uses a log scale.", before=6, after=1)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(4)
p.add_run().add_picture(str(CHART), width=Inches(6.3))

paragraph("Discussion", bold=True, after=3)
paragraph("The plain tree stores keys without ordering. Its level-order search checks nodes one at a time, so an absent key visits all n nodes and a present key usually takes about half as many visits. The random BST uses each comparison to choose one branch, which kept searches short in this experiment.", after=4)
paragraph("When I inserted the BST keys in sorted order, each new key became the previous key's right child. This made a chain, so searches took hundreds or thousands of visits instead of about 7 to 17. Level-order insertion keeps the plain tree complete by levels because its queue always fills the earliest available left or right child before moving to later nodes.", after=3)
paragraph("Method: Python random seed 42; unique even keys from 0 to 999,998; absent queries were odd values from the same range. A node counts as visited when its key is checked.", after=0)

doc.save(OUTPUT)
print(OUTPUT)
