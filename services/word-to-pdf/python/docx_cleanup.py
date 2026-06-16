"""
Post-process pdf2docx output to remove intermittent blank pages.

pdf2docx emits one section break per PDF page (nextPage) and encodes
vertical gaps from the source PDF as large paragraph spacing. Font
substitution can push content past a section boundary; the next
forced page break then produces a blank page. These passes flatten
section breaks and cap pathological spacing while preserving content.
"""

from __future__ import annotations

from typing import Any

from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def _int_attr(value: str | None, default: int) -> int:
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def normalize_multi_column_sections(document: Any) -> int:
    """Collapse spurious multi-column sections to single column."""
    body = document.element.body
    changed = 0
    for cols in body.iter(qn("w:cols")):
        num_attr = cols.get(qn("w:num"))
        try:
            num = int(num_attr) if num_attr else 1
        except ValueError:
            num = 1
        if num <= 1:
            continue
        cols.set(qn("w:num"), "1")
        for child in list(cols):
            cols.remove(child)
        changed += 1
    for type_el in body.iter(qn("w:type")):
        if type_el.get(qn("w:val")) == "nextColumn":
            type_el.set(qn("w:val"), "continuous")
    return changed


def fix_page_margins(document: Any) -> int:
    """Ensure header/footer reservations do not exceed body margins."""
    body = document.element.body
    fixed = 0
    for pg in body.iter(qn("w:pgMar")):
        top = _int_attr(pg.get(qn("w:top")), 720)
        bottom = _int_attr(pg.get(qn("w:bottom")), 720)
        header = _int_attr(pg.get(qn("w:header")), 720)
        footer = _int_attr(pg.get(qn("w:footer")), 720)
        changed = False
        if header > top - 20:
            pg.set(qn("w:header"), str(max(0, top - 20)))
            changed = True
        if footer > bottom - 20:
            pg.set(qn("w:footer"), str(max(0, bottom - 20)))
            changed = True
        if changed:
            fixed += 1
    return fixed


def flatten_per_page_sections(document: Any) -> int:
    """Convert per-page nextPage section breaks to continuous."""
    body = document.element.body
    sect_prs = list(body.iter(qn("w:sectPr")))
    if len(sect_prs) <= 1:
        return 0

    for sp in sect_prs:
        if sp.find(qn("w:headerReference")) is not None:
            return 0
        if sp.find(qn("w:footerReference")) is not None:
            return 0

    pg_sizes: set[tuple[str | None, str | None, str | None]] = set()
    for sp in sect_prs:
        sz = sp.find(qn("w:pgSz"))
        if sz is not None:
            pg_sizes.add((sz.get(qn("w:w")), sz.get(qn("w:h")), sz.get(qn("w:orient"))))
    if len(pg_sizes) > 1:
        return 0

    converted = 0
    for sp in sect_prs:
        parent = sp.getparent()
        if parent is None or parent.tag != qn("w:pPr"):
            continue
        type_el = sp.find(qn("w:type"))
        if type_el is None:
            type_el = OxmlElement("w:type")
            sp.insert(0, type_el)
        if type_el.get(qn("w:val")) != "continuous":
            type_el.set(qn("w:val"), "continuous")
            converted += 1
    return converted


def clamp_paragraph_spacing(document: Any, *, max_twips: int = 480) -> int:
    """Cap inflated w:before / w:after spacing that causes blank pages."""
    body = document.element.body
    clamped = 0
    for spacing in body.iter(qn("w:spacing")):
        for attr in (qn("w:before"), qn("w:after")):
            value = spacing.get(attr)
            if not value or not value.isdigit():
                continue
            if int(value) > max_twips:
                spacing.set(attr, str(max_twips))
                clamped += 1
    return clamped


def tighten_section_break_paragraphs(document: Any) -> int:
    """Minimize formatting on empty paragraphs that only carry section breaks."""
    body = document.element.body
    tightened = 0
    for para in body.iter(qn("w:p")):
        p_pr = para.find(qn("w:pPr"))
        if p_pr is None or p_pr.find(qn("w:sectPr")) is None:
            continue
        text = "".join(t.text or "" for t in para.iter(qn("w:t"))).strip()
        if text:
            continue
        if any(True for _ in para.iter(qn("w:tbl"))):
            continue
        if any(True for _ in para.iter(qn("w:drawing"))):
            continue
        if any(True for _ in para.iter(qn("w:pict"))):
            continue

        spacing = p_pr.find(qn("w:spacing"))
        if spacing is None:
            spacing = OxmlElement("w:spacing")
            p_pr.append(spacing)
        spacing.set(qn("w:before"), "0")
        spacing.set(qn("w:after"), "0")
        spacing.set(qn("w:line"), "240")
        spacing.set(qn("w:lineRule"), "auto")

        r_pr = para.find(qn("w:rPr"))
        if r_pr is None:
            run = para.find(qn("w:r"))
            if run is not None:
                r_pr = OxmlElement("w:rPr")
                run.insert(0, r_pr)
        if r_pr is not None:
            sz = r_pr.find(qn("w:sz"))
            if sz is None:
                sz = OxmlElement("w:sz")
                r_pr.append(sz)
            sz.set(qn("w:val"), "2")
        tightened += 1
    return tightened


def cleanup_docx_blank_pages(document: Any) -> dict[str, int]:
    """Run all blank-page mitigation passes. Returns per-pass counts."""
    return {
        "multi_column_normalized": normalize_multi_column_sections(document),
        "page_margins_fixed": fix_page_margins(document),
        "sections_flattened": flatten_per_page_sections(document),
        "spacing_clamped": clamp_paragraph_spacing(document),
        "section_breaks_tightened": tighten_section_break_paragraphs(document),
    }


def clamp_spacing_to_page_height(document: Any, *, max_ratio: float = 0.12) -> int:
    """Cap paragraph spacing relative to each section's page height (fidelity mode)."""
    body = document.element.body
    clamped = 0
    current_max = 480

    def _page_height_twips(sect_pr) -> int:
        sz = sect_pr.find(qn("w:pgSz"))
        if sz is None:
            return 15840
        h = sz.get(qn("w:h"))
        return int(h) if h and h.isdigit() else 15840

    sect_prs = list(body.iter(qn("w:sectPr")))
    for sp in sect_prs:
        current_max = max(480, int(_page_height_twips(sp) * max_ratio))

    for spacing in body.iter(qn("w:spacing")):
        for attr in (qn("w:before"), qn("w:after")):
            value = spacing.get(attr)
            if not value or not value.isdigit():
                continue
            if int(value) > current_max:
                spacing.set(attr, str(current_max))
                clamped += 1
    return clamped


def fidelity_docx_cleanup(document: Any) -> dict[str, int]:
    """
    Post-process fidelity DOCX without merging pages.

    Preserves per-page section breaks and page boundaries while fixing
    margin conflicts and pathological spacing that cause blank pages.
    """
    return {
        "multi_column_normalized": normalize_multi_column_sections(document),
        "page_margins_fixed": fix_page_margins(document),
        "spacing_clamped": clamp_spacing_to_page_height(document),
        "section_breaks_tightened": tighten_section_break_paragraphs(document),
    }
