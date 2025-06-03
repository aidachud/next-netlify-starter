import pdfplumber
import fitz  # PyMuPDF
import re
import os
import tkinter as tk
from tkinter import filedialog, messagebox, Listbox, Scrollbar, Button, Label, Entry, END

# ================= Extraction (pdfplumber) =================

def extract_teams_by_column_alignment(text, debug=False):
    r"""
    Given a page's raw text (with line breaks), find lines like:
        [whitespace] Age   TeamName   Seed Time
    using regex:
        \s+(\d{1,2})\s+([A-Z][A-Za-z\-& ]+)\s+\d{1,2}:\d{2}\.\d{2}
    capturing group(2) = TeamName. Returns a set of matched team names.
    """
    teams = set()
    line_pattern = re.compile(r'\s+(\d{1,2})\s+([A-Z][A-Za-z\-& ]+)\s+\d{1,2}:\d{2}\.\d{2}')
    for line in text.split('\n'):
        match = line_pattern.search(line)
        if match:
            team = match.group(2).strip()
            if debug:
                print(f"[MATCHED] {team}  \u2190  '{line.strip()}'")
            teams.add(team)
        elif debug:
            print(f"[SKIP] '{line.strip()}'")
    return teams

def get_teams_from_pdf(pdf_path, debug=False):
    """
    Open the PDF via pdfplumber, iterate over each page's extracted text,
    find every team code using extract_teams_by_column_alignment, and return
    a sorted list of unique team codes.
    """
    all_teams = set()
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            if debug:
                snippet = text[:200].replace('\n', '\\n')
                print(f"\n=== Page {page_num} Preview ===\n{snippet}...\n")
            teams = extract_teams_by_column_alignment(text, debug)
            all_teams.update(teams)
    return sorted(all_teams)

# ================= Highlighting (annotation-based, yellow) =================

def highlight_team_in_pdf(pdf_path, team_code, output_path):
    r"""
    Highlight each occurrence of team_code with a yellow band across the
    left or right half column. Uses PyMuPDF annotations for best results.
    """
    # Remove any existing file to avoid permission issues
    if os.path.exists(output_path):
        try:
            os.remove(output_path)
        except Exception:
            raise Exception(
                f"Cannot overwrite '{output_path}'.\n"
                "Please close that file in any PDF viewer and try again."
            )

    doc = fitz.open(pdf_path)
    match_count = 0

    for page in doc:
        page_width = page.rect.width
        half = page_width / 2.0

        matches = page.search_for(team_code)
        if not matches:
            continue

        for r in matches:
            y0_band = r.y0 - 2
            y1_band = r.y1 + 2

            if r.x0 < half:
                annot_rect = fitz.Rect(0, y0_band, half, y1_band)
            else:
                annot_rect = fitz.Rect(half, y0_band, page_width, y1_band)

            annot = page.add_rect_annot(annot_rect)
            annot.set_colors(fill=(1, 1, 0), stroke=None)
            annot.set_opacity(0.2)
            annot.update()
            match_count += 1

    doc.save(output_path, garbage=3, deflate=True)
    doc.close()
    return match_count

# ================= GUI Logic (tkinter) =================

def select_pdf():
    chosen = filedialog.askopenfilename(
        title="Select Heat Sheet PDF",
        filetypes=[("PDF files", "*.pdf")]
    )
    if not chosen:
        return
    entry_pdf_path.delete(0, END)
    entry_pdf_path.insert(0, chosen)
    populate_teams(chosen)

def populate_teams(pdf_path):
    listbox_teams.delete(0, END)
    try:
        teams = get_teams_from_pdf(pdf_path, debug=False)
    except Exception as e:
        messagebox.showerror("Error Reading PDF", str(e))
        return

    if not teams:
        listbox_teams.insert(END, "(no teams found)")
    else:
        for t in teams:
            listbox_teams.insert(END, t)

def highlight_selected_team():
    pdf_path = entry_pdf_path.get().strip()
    if not os.path.isfile(pdf_path):
        messagebox.showerror("Invalid PDF", "Please select a valid PDF file first.")
        return

    sel = listbox_teams.curselection()
    if not sel:
        messagebox.showwarning("No Team Selected", "Please select a team to highlight.")
        return

    team_code = listbox_teams.get(sel[0])
    if team_code.startswith("("):
        messagebox.showwarning("Invalid Team", "No actual team was selected.")
        return

    base_name = os.path.splitext(pdf_path)[0]
    output_pdf = f"{base_name}_highlighted_{team_code}.pdf"

    try:
        count = highlight_team_in_pdf(pdf_path, team_code, output_pdf)
    except Exception as e:
        messagebox.showerror("Highlight Error", str(e))
        return

    if count:
        messagebox.showinfo(
            "Done",
            f"\u2705 Created {count} yellow highlights for '{team_code}'.\n\n"
            f"Saved to:\n{output_pdf}"
        )
    else:
        messagebox.showinfo(
            "No Occurrences",
            f"\u26a0\ufe0f No swimmers from '{team_code}' were found in the document."
        )

# ================= Build the Tkinter GUI =================

root = tk.Tk()
root.title("Swim Team Highlighter – Yellow Annotations")

Label(root, text="PDF Path:").grid(row=0, column=0, sticky="w", padx=5, pady=5)
entry_pdf_path = Entry(root, width=60)
entry_pdf_path.grid(row=0, column=1, padx=5, pady=5)
Button(root, text="Browse...", command=select_pdf).grid(row=0, column=2, padx=5, pady=5)

Label(root, text="Select a Team to Highlight (20% yellow annotations):").grid(
    row=1, column=0, columnspan=3, sticky="w", padx=5
)

listbox_teams = Listbox(root, width=50, height=15)
listbox_teams.grid(row=2, column=0, columnspan=2, padx=5, pady=5, sticky="w")
scrollbar = Scrollbar(root, orient="vertical", command=listbox_teams.yview)
scrollbar.grid(row=2, column=2, sticky="ns")
listbox_teams.config(yscrollcommand=scrollbar.set)

Button(root, text="Highlight Team in PDF", command=highlight_selected_team).grid(
    row=3, column=0, columnspan=3, pady=10
)

root.mainloop()
