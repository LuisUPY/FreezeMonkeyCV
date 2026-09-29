import math
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "output"))
from plain_binary_tree_experiment import run_experiment  # noqa: E402


results = run_experiment()
scratch = ROOT / "tmp/pdfs/tree_report_base.pdf"
final = ROOT / "output/pdf/binary_tree_experiment_report.pdf"
source = ROOT / "output/plain_binary_tree_experiment.py"

navy = colors.HexColor("#18253b")
blue = colors.HexColor("#2364a7")
orange = colors.HexColor("#cf6d27")
green = colors.HexColor("#2d8663")
muted = colors.HexColor("#5d6b7a")
grid = colors.HexColor("#d8dee6")
pale = colors.HexColor("#f4f7fa")

c = canvas.Canvas(str(scratch), pagesize=(612, 792))
c.setTitle("Plain Binary Tree vs. Binary Search Tree")
c.setAuthor("Tree Search Experiment")

c.setFillColor(navy)
c.setFont("Helvetica-Bold", 18)
c.drawString(44, 750, "Binary Tree Search Experiment")
c.setFillColor(muted)
c.setFont("Helvetica", 9)
c.drawString(44, 732, "Level-order binary tree vs. random and sorted binary search trees")

c.setFillColor(pale)
c.roundRect(44, 695, 524, 27, 4, stroke=0, fill=1)
c.setFillColor(navy)
c.setFont("Helvetica", 8.2)
c.drawString(53, 707, "Method: seed 42; 100 found and 100 absent queries per size; same queries for all three trees.")
c.drawString(53, 698, "Unique random even keys; absent keys are random odd values from the same numeric range.")

c.setFont("Helvetica-Bold", 10.5)
c.drawString(44, 676, "Average nodes visited per search")

left, right, top, row_h = 44, 568, 663, 19
col_x = (52, 115, 351, 472)
c.setFillColor(navy)
c.rect(left, top - row_h, right - left, row_h, stroke=0, fill=1)
c.setFillColor(colors.white)
c.setFont("Helvetica-Bold", 8.5)
for x, label in zip(col_x, ("n", "Tree", "Found", "Absent")):
    c.drawString(x, top - 13, label)

display_name = {
    "Plain binary tree": "Plain binary tree",
    "BST, random insertion": "BST - random order",
    "BST, sorted insertion": "BST - sorted order",
}
for i, (n, name, found, absent) in enumerate(results):
    row_top = top - row_h * (i + 1)
    if i % 3 == 0:
        c.setFillColor(pale)
        c.rect(left, row_top - row_h * 3, right - left, row_h * 3, stroke=0, fill=1)
    c.setStrokeColor(grid)
    c.line(left, row_top - row_h, right, row_top - row_h)
    c.setFillColor(navy)
    c.setFont("Helvetica", 8.8)
    c.drawString(col_x[0], row_top - 13, f"{n:,}" if i % 3 == 0 else "")
    c.drawString(col_x[1], row_top - 13, display_name[name])
    c.drawRightString(441, row_top - 13, f"{found:,.2f}")
    c.drawRightString(559, row_top - 13, f"{absent:,.2f}")

c.setFillColor(navy)
c.setFont("Helvetica-Bold", 10.5)
c.drawString(44, 451, "Visited nodes scale sharply when sorted insertion makes a BST a chain")

plot_left, plot_right, plot_bottom, plot_top = 98, 548, 294, 427
x_positions = {100: 108, 1000: 325, 10000: 542}

def y_position(value):
    return plot_bottom + math.log10(value) / 4 * (plot_top - plot_bottom)


c.setStrokeColor(grid)
c.setFillColor(muted)
c.setFont("Helvetica", 7.7)
for value in (1, 10, 100, 1000, 10000):
    y = y_position(value)
    c.line(plot_left, y, plot_right, y)
    c.drawRightString(plot_left - 9, y - 2.5, f"{value:,}")

c.setStrokeColor(navy)
c.line(plot_left, plot_bottom, plot_right, plot_bottom)
c.line(plot_left, plot_bottom, plot_left, plot_top)
c.setFillColor(muted)
for n, x in x_positions.items():
    c.drawCentredString(x, plot_bottom - 14, f"{n:,}")
c.setFont("Helvetica", 8)
c.drawCentredString(323, 263, "Number of inserted keys (n)")
c.saveState()
c.translate(54, 360)
c.rotate(90)
c.drawCentredString(0, 0, "Average visited nodes (log scale)")
c.restoreState()

series = {
    "Plain binary tree": blue,
    "BST, random insertion": green,
    "BST, sorted insertion": orange,
}
for name, color in series.items():
    for metric_index, is_absent in ((2, False), (3, True)):
        points = [(x_positions[n], y_position(row[metric_index]))
                  for row in results if (n := row[0]) and row[1] == name]
        c.setStrokeColor(color)
        c.setLineWidth(1.9 if not is_absent else 1.5)
        c.setDash([4, 2] if is_absent else [])
        for (x1, y1), (x2, y2) in zip(points, points[1:]):
            c.line(x1, y1, x2, y2)
        c.setDash([])
        c.setFillColor(color)
        for x, y in points:
            if is_absent:
                c.circle(x, y, 2.6, stroke=1, fill=0)
            else:
                c.circle(x, y, 2.4, stroke=0, fill=1)

legend_y = 246
c.setFont("Helvetica", 7.7)
for x, name, label in ((46, "Plain binary tree", "Plain tree"),
                       (184, "BST, random insertion", "BST random"),
                       (324, "BST, sorted insertion", "BST sorted")):
    c.setStrokeColor(series[name])
    c.setLineWidth(2)
    c.line(x, legend_y, x + 18, legend_y)
    c.setFillColor(navy)
    c.drawString(x + 23, legend_y - 2.7, label)
c.setFillColor(muted)
c.drawString(466, legend_y - 2.7, "solid: found")
c.drawString(466, legend_y - 13, "dashed: absent")

c.setFillColor(navy)
c.setFont("Helvetica-Bold", 10.5)
c.drawString(44, 218, "Why the results differ")
style = ParagraphStyle("body", fontName="Helvetica", fontSize=8.6,
                       leading=11.4, textColor=navy, alignment=TA_LEFT)
paragraphs = [
    "<b>Plain tree:</b> Its nodes have no key ordering, so level-order search checks "
    "nodes one by one. A missing key visits all n nodes; a found key usually visits about half.",
    "<b>Random BST:</b> Each comparison chooses one subtree. Random insertion keeps "
    "paths relatively short here, giving roughly 7-17 visits, including absent searches.",
    "<b>Sorted BST:</b> Every new key becomes the right child of the previous maximum. "
    "The tree becomes a chain, and search cost rises toward n. The plain tree stays "
    "complete by levels because insertion always fills the earliest open child slot "
    "in its queue, left before right.",
]
y = 205
for paragraph in paragraphs:
    p = Paragraph(paragraph, style)
    _, h = p.wrap(524, 100)
    p.drawOn(c, 44, y - h)
    y -= h + 5

c.setStrokeColor(grid)
c.line(44, 58, 568, 58)
c.setFillColor(muted)
c.setFont("Helvetica", 7.4)
c.drawString(44, 44, "Complete runnable Python source is attached to this PDF and supplied as a separate .py file.")
c.drawRightString(568, 44, "1 / 1")
c.save()

writer = PdfWriter()
writer.append(str(scratch))
writer.add_attachment(source.name, source.read_bytes())
with final.open("wb") as stream:
    writer.write(stream)

reader = PdfReader(str(final))
assert len(reader.pages) == 1
assert source.name in reader.attachments
print(final)
