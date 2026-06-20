#!/usr/bin/env python3
"""Crawl and compile GenLayer docs research artifacts."""

from __future__ import annotations

import html
import json
import os
import re
import textwrap
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Iterable
from urllib.parse import urldefrag, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md

BASE_URL = "https://docs.genlayer.com/"
LLMS_URL = "https://docs.genlayer.com/llms.txt"
BULK_URL = "https://docs.genlayer.com/full-documentation.txt"
SITEMAP_URL = "https://docs.genlayer.com/sitemap.xml"
ROBOTS_URL = "https://docs.genlayer.com/robots.txt"
TITLE = "GenLayer Full Documentation - StudioNet Builder Research"
ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "raw_pages"
CACHE_DIR = ROOT / "source_cache"
HTML_CACHE_DIR = CACHE_DIR / "html"
USER_AGENT = "genlayer-docs-research/1.0"


@dataclass
class Page:
    url: str
    source_path: str | None
    title: str
    markdown: str
    status_code: int | None
    source_kind: str


def fetch(session: requests.Session, url: str, timeout: int = 45) -> requests.Response:
    return session.get(url, timeout=timeout, headers={"User-Agent": USER_AGENT})


def normalize_url(url: str, base: str = BASE_URL) -> str | None:
    joined, _fragment = urldefrag(urljoin(base, url))
    parsed = urlparse(joined)
    if parsed.scheme not in {"http", "https"}:
        return None
    if parsed.netloc != "docs.genlayer.com":
        return None
    path = parsed.path or "/"
    if path.startswith(("/_next/", "/cdn-cgi/", "/components/")):
        return None
    if path in {"/llms.txt", "/full-documentation.txt", "/sitemap.xml", "/robots.txt"}:
        return None
    if re.search(r"\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|mjs|map|woff2?|ttf|json|xml|txt|pdf)$", path, re.I):
        return None
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def slug_for_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    if not path:
        return "index"
    slug = re.sub(r"[^A-Za-z0-9._-]+", "_", path)
    return slug.strip("_") or "index"


def path_to_url(source_path: str) -> str:
    stem = source_path[:-4] if source_path.endswith(".mdx") else source_path
    if stem == "index":
        return BASE_URL
    return normalize_url("/" + stem) or (BASE_URL.rstrip("/") + "/" + stem)


def parse_sitemap(xml_text: str) -> list[str]:
    urls: list[str] = []
    root = ET.fromstring(xml_text)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    for loc in root.findall(".//sm:loc", ns):
        if loc.text:
            normalized = normalize_url(loc.text)
            if normalized:
                urls.append(normalized)
    return urls


def extract_links(html_text: str, current_url: str) -> list[str]:
    soup = BeautifulSoup(html_text, "html.parser")
    links: list[str] = []
    for tag in soup.find_all("a", href=True):
        normalized = normalize_url(tag["href"], current_url)
        if normalized:
            links.append(normalized)
    return links


def split_bulk_docs(text: str) -> list[tuple[str, str]]:
    markers = list(re.finditer(r"^# ([^\n]+\.mdx)\s*$", text, re.M))
    sections: list[tuple[str, str]] = []
    for idx, marker in enumerate(markers):
        start = marker.end()
        end = markers[idx + 1].start() if idx + 1 < len(markers) else len(text)
        sections.append((marker.group(1).strip(), text[start:end].strip()))
    return sections


def parse_attrs(block: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for key, value in re.findall(r"([A-Za-z_][\w.-]*)=(?:\"([^\"]*)\"|'([^']*)')", block):
        attrs[key] = value[0] if isinstance(value, tuple) else value
    return attrs


def convert_component_block(block: str) -> list[str]:
    attrs = {}
    for match in re.finditer(r"([A-Za-z_][\w.-]*)=(?:\"([^\"]*)\"|'([^']*)')", block):
        attrs[match.group(1)] = match.group(2) or match.group(3)
    title = attrs.get("title")
    href = attrs.get("href")
    desc = attrs.get("description")
    if title and href:
        line = f"- [{title}]({href})"
        if desc:
            line += f" - {desc}"
        return [line]
    if title:
        line = f"- {title}"
        if desc:
            line += f" - {desc}"
        return [line]
    return []


def clean_mdx(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"^---\n.*?\n---\n", "", text, flags=re.S)
    text = re.sub(r"```\s*([A-Za-z0-9_-]+)\s+copy\b", r"```\1", text)

    lines = text.splitlines()
    out: list[str] = []
    in_code = False
    component_buffer: list[str] | None = None

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()

        if stripped.startswith("```"):
            in_code = not in_code
            out.append(line)
            continue

        if in_code:
            out.append(line)
            continue

        if component_buffer is not None:
            component_buffer.append(line)
            if "/>" in stripped or stripped.startswith("</"):
                out.extend(convert_component_block("\n".join(component_buffer)))
                component_buffer = None
            continue

        if not stripped:
            out.append("")
            continue

        if stripped.startswith("import "):
            continue

        if stripped.startswith("{/*") or stripped.endswith("*/}"):
            continue

        if stripped.startswith("<Callout"):
            out.append("> **Note:**")
            continue
        if stripped.startswith("</Callout"):
            out.append("")
            continue

        if re.match(r"^</?(Cards|Tabs|Tabs\.Tab|Steps|Step|Accordion|Accordions)\b", stripped):
            continue
        if re.match(r"^</?(div|span|br|p)\b", stripped):
            if stripped.lower().startswith("<br"):
                out.append("")
            continue

        if re.match(r"^<(CustomCard|Card)\b", stripped):
            if "/>" in stripped:
                out.extend(convert_component_block(stripped))
            else:
                component_buffer = [line]
            continue

        if re.match(r"^<(Image|AddToWallet|Video|iframe|Mermaid|Bleed)\b", stripped):
            continue

        line = re.sub(
            r"<Card\s+([^>]*)/>",
            lambda m: "\n".join(convert_component_block(m.group(0))),
            line,
        )
        line = re.sub(r"</?(?:strong|em|code|kbd)>", "", line)
        line = re.sub(r"<br\s*/?>", "", line)
        line = re.sub(r"<[^>]+>", "", line)
        out.append(html.unescape(line))

    cleaned = "\n".join(out)
    cleaned = cleaned.replace(" (opens in a new tab)", "")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip() + "\n"
    return cleaned


def readable_fallback_title(fallback: str) -> str:
    basename = fallback.replace(".mdx", "").strip("/").split("/")[-1]
    readable = basename.replace("-", " ").replace("_", " ").strip()
    return readable.title() if readable else "Index"


def title_from_markdown(markdown: str, fallback: str) -> str:
    for wanted_level in (1, 2, 3):
        prefix = "#" * wanted_level
        for line in markdown.splitlines():
            match = re.match(rf"^{prefix}\s+(.+?)\s*$", line)
            if match:
                return re.sub(r"\s+", " ", match.group(1)).strip()
    return readable_fallback_title(fallback)


def html_article_to_markdown(html_text: str, url: str) -> str:
    soup = BeautifulSoup(html_text, "html.parser")
    article = soup.select_one("article") or soup.select_one("main") or soup.body
    if article is None:
        return ""
    for selector in [
        ".nextra-breadcrumb",
        "nav",
        "footer",
        "script",
        "style",
        "button",
        ".nextra-toc",
        ".nextra-scrollbar",
        ".nextra-sidebar",
    ]:
        for tag in article.select(selector):
            tag.decompose()
    markdown = md(
        str(article),
        heading_style="ATX",
        bullets="-",
        code_language="",
        strip=["svg"],
    )
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    markdown = re.sub(r"^\s*Copy page\s*$", "", markdown, flags=re.M)
    markdown = markdown.replace(" (opens in a new tab)", "")
    markdown = markdown.strip() + "\n"
    if not re.search(r"^#\s+", markdown, flags=re.M):
        title = BeautifulSoup(html_text, "html.parser").title
        heading = title.string.replace(" | GenLayer Documentation", "") if title and title.string else slug_for_url(url)
        markdown = f"# {heading}\n\n{markdown}"
    return markdown


def ensure_source(markdown: str, url: str, fallback_title: str) -> tuple[str, str]:
    markdown = markdown.strip()
    if not re.search(r"^#\s+", markdown, flags=re.M):
        lines = markdown.splitlines()
        promoted = False
        for idx, line in enumerate(lines):
            match = re.match(r"^#{2,6}\s+(.+?)\s*$", line)
            if match:
                lines[idx] = f"# {match.group(1).strip()}"
                promoted = True
                break
        markdown = "\n".join(lines) if promoted else f"# {readable_fallback_title(fallback_title)}\n\n{markdown}"
    title = title_from_markdown(markdown, fallback_title)
    lines = markdown.splitlines()
    output: list[str] = []
    inserted = False
    for idx, line in enumerate(lines):
        output.append(line)
        if not inserted and line.startswith("# "):
            output.append("")
            output.append(f"Source: {url}")
            inserted = True
            if idx + 1 < len(lines) and lines[idx + 1].strip() == "":
                continue
    return "\n".join(output).strip() + "\n", title


def crawl(session: requests.Session, seed_urls: Iterable[str]) -> tuple[dict[str, dict], list[str]]:
    queue: list[str] = []
    seen: set[str] = set()
    results: dict[str, dict] = {}

    for seed in seed_urls:
        normalized = normalize_url(seed)
        if normalized and normalized not in seen:
            queue.append(normalized)
            seen.add(normalized)

    idx = 0
    while idx < len(queue):
        url = queue[idx]
        idx += 1
        try:
            response = fetch(session, url)
            content_type = response.headers.get("content-type", "")
            results[url] = {
                "status_code": response.status_code,
                "content_type": content_type,
                "length": len(response.text),
            }
            if response.status_code == 200 and "text/html" in content_type:
                (HTML_CACHE_DIR / f"{slug_for_url(url)}.html").write_text(response.text, encoding="utf-8")
                for link in extract_links(response.text, url):
                    if link not in seen:
                        seen.add(link)
                        queue.append(link)
            time.sleep(0.03)
        except Exception as exc:  # noqa: BLE001 - this is a research crawler log.
            results[url] = {"error": repr(exc)}

    return results, queue


def build_markdown_document(pages: list[Page], metadata: dict) -> str:
    generated = metadata["generated"]
    toc_lines = ["## Table of Contents", ""]
    for page in pages:
        anchor = re.sub(r"[^a-z0-9 -]", "", page.title.lower()).replace(" ", "-")
        toc_lines.append(f"- [{page.title}](#{anchor})")
    header = f"""# {TITLE}

Generated: {generated}

Official source: {BASE_URL}

Bulk documentation file discovered: {BULK_URL}

Pages compiled: {len(pages)}

Crawler notes: individual internal documentation pages were fetched from docs.genlayer.com; the official bulk MDX file was used where available to preserve clean code blocks and examples.

"""
    body = [header, "\n".join(toc_lines), "\n---\n"]
    for page in pages:
        body.append(page.markdown.strip())
        body.append("\n---\n")
    return "\n\n".join(body).strip() + "\n"


def normalized_content(markdown: str) -> str:
    text = re.sub(r"^Source: .*$", "", markdown, flags=re.M)
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"`{3}.*?`{3}", "", text, flags=re.S)
    text = re.sub(r"[^A-Za-z0-9]+", " ", text).lower()
    return re.sub(r"\s+", " ", text).strip()


def dedupe_pages(pages: list[Page]) -> tuple[list[Page], list[dict]]:
    """Remove legacy alias pages whose body is near-identical to a page already kept."""
    kept: list[Page] = []
    signatures: list[tuple[Page, str]] = []
    skipped: list[dict] = []

    for page in pages:
        sig = normalized_content(page.markdown)
        duplicate_of: Page | None = None
        for kept_page, kept_sig in signatures:
            if page.title != kept_page.title:
                continue
            if not sig or not kept_sig:
                continue
            shorter, longer = (sig, kept_sig) if len(sig) <= len(kept_sig) else (kept_sig, sig)
            containment = len(shorter) > 120 and shorter in longer
            sample_ratio = SequenceMatcher(None, sig[:3500], kept_sig[:3500]).ratio()
            if containment or sample_ratio >= 0.88:
                duplicate_of = kept_page
                break
        if duplicate_of is not None:
            skipped.append({"url": page.url, "title": page.title, "duplicate_of": duplicate_of.url})
            continue
        kept.append(page)
        signatures.append((page, sig))

    return kept, skipped


def write_pdf(markdown_text: str, pages: list[Page], metadata: dict, output_path: Path) -> None:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, XPreformatted

    font_dir = Path("/usr/share/fonts/truetype/dejavu")
    if (font_dir / "DejaVuSans.ttf").exists():
        pdfmetrics.registerFont(TTFont("DejaVuSans", str(font_dir / "DejaVuSans.ttf")))
        pdfmetrics.registerFont(TTFont("DejaVuSansMono", str(font_dir / "DejaVuSansMono.ttf")))
        body_font = "DejaVuSans"
        mono_font = "DejaVuSansMono"
    else:
        body_font = "Helvetica"
        mono_font = "Courier"

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName=body_font, fontSize=26, leading=32, alignment=TA_CENTER, spaceAfter=24))
    styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName=body_font, fontSize=12, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#333333")))
    styles.add(ParagraphStyle(name="DocH1", parent=styles["Heading1"], fontName=body_font, fontSize=18, leading=22, spaceBefore=18, spaceAfter=8))
    styles.add(ParagraphStyle(name="DocH2", parent=styles["Heading2"], fontName=body_font, fontSize=14, leading=18, spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name="DocH3", parent=styles["Heading3"], fontName=body_font, fontSize=12, leading=15, spaceBefore=10, spaceAfter=5))
    styles.add(ParagraphStyle(name="DocBody", parent=styles["BodyText"], fontName=body_font, fontSize=9, leading=12, spaceAfter=5))
    styles.add(ParagraphStyle(name="DocBullet", parent=styles["BodyText"], fontName=body_font, fontSize=9, leading=12, leftIndent=14, firstLineIndent=-8, spaceAfter=3))
    styles.add(ParagraphStyle(name="DocCode", parent=styles["Code"], fontName=mono_font, fontSize=7, leading=9, leftIndent=6, rightIndent=6, backColor=colors.HexColor("#F3F4F6"), borderPadding=4, spaceBefore=2, spaceAfter=2))
    styles.add(ParagraphStyle(name="DocToc", parent=styles["BodyText"], fontName=body_font, fontSize=8.5, leading=11, leftIndent=12, firstLineIndent=-8, spaceAfter=2))

    def esc(text: str) -> str:
        return html.escape(text).replace("\u200b", "")

    def strip_markdown_inline(text: str) -> str:
        text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"[Image: \1]", text)
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
        text = text.replace("**", "").replace("__", "").replace("`", "")
        return text

    def add_markdown_lines(story: list, text: str) -> None:
        in_code = False
        code_lines: list[str] = []

        def flush_code() -> None:
            nonlocal code_lines
            if not code_lines:
                return
            wrapped: list[str] = []
            for code_line in code_lines:
                if len(code_line) <= 118:
                    wrapped.append(code_line)
                else:
                    wrapped.extend(textwrap.wrap(code_line, width=118, replace_whitespace=False, drop_whitespace=False) or [""])
            for start in range(0, len(wrapped), 34):
                chunk = "\n".join(wrapped[start : start + 34])
                story.append(XPreformatted(esc(chunk), styles["DocCode"]))
            code_lines = []

        table_lines: list[str] = []

        def flush_table() -> None:
            nonlocal table_lines
            if table_lines:
                story.append(XPreformatted(esc("\n".join(table_lines)), styles["DocCode"]))
                table_lines = []

        for raw_line in text.splitlines():
            line = raw_line.rstrip()
            if line.startswith("```"):
                if in_code:
                    flush_code()
                    in_code = False
                else:
                    flush_table()
                    in_code = True
                continue
            if in_code:
                code_lines.append(line)
                continue
            if re.match(r"^\|.*\|$", line.strip()):
                table_lines.append(line)
                continue
            flush_table()
            if not line.strip():
                story.append(Spacer(1, 4))
                continue
            heading = re.match(r"^(#{1,6})\s+(.+)$", line)
            if heading:
                level = len(heading.group(1))
                title = strip_markdown_inline(heading.group(2))
                style = styles["DocH1"] if level == 1 else styles["DocH2"] if level == 2 else styles["DocH3"]
                story.append(Paragraph(esc(title), style))
                continue
            bullet = re.match(r"^\s*[-*]\s+(.+)$", line)
            if bullet:
                story.append(Paragraph(esc(strip_markdown_inline(bullet.group(1))), styles["DocBullet"], bulletText="-"))
                continue
            numbered = re.match(r"^\s*(\d+)\.\s+(.+)$", line)
            if numbered:
                story.append(Paragraph(esc(strip_markdown_inline(numbered.group(2))), styles["DocBullet"], bulletText=f"{numbered.group(1)}."))
                continue
            quote = re.match(r"^\s*>\s*(.+)$", line)
            if quote:
                story.append(Paragraph(esc(strip_markdown_inline(quote.group(1))), styles["DocBody"]))
                continue
            story.append(Paragraph(esc(strip_markdown_inline(line)), styles["DocBody"]))

        flush_code()
        flush_table()

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title=TITLE,
        author="Codex research crawler",
    )

    def page_canvas(canvas, _doc):
        canvas.saveState()
        canvas.setFont(body_font, 7)
        canvas.setFillColor(colors.HexColor("#666666"))
        canvas.drawRightString(7.95 * inch, 0.35 * inch, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    story: list = []
    story.append(Spacer(1, 1.2 * inch))
    story.append(Paragraph(TITLE, styles["CoverTitle"]))
    story.append(Paragraph(f"Generated {metadata['generated']}", styles["CoverSub"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(f"Official source: {BASE_URL}", styles["CoverSub"]))
    story.append(Paragraph(f"Pages compiled: {len(pages)}", styles["CoverSub"]))
    story.append(PageBreak())
    story.append(Paragraph("Table of Contents", styles["DocH1"]))
    for page in pages:
        story.append(Paragraph(esc(page.title), styles["DocToc"], bulletText="-"))
    story.append(PageBreak())
    add_markdown_lines(story, markdown_text)
    doc.build(story, onFirstPage=page_canvas, onLaterPages=page_canvas)


def app_ideas_markdown(generated: str) -> str:
    return f"""# GenLayer App Ideas

Generated: {generated}

Basis: ideas below are derived from the GenLayer documentation concepts covered in the compiled research file: Intelligent Contracts, GenVM Python contracts, non-deterministic blocks, LLM calls, web access/rendering, image processing, validator consensus through the Equivalence Principle, appeals/finality, Studio, and Studionet.

## Top 5 Ranked MVP Ideas

1. **Proof-of-Completion Bounty Judge** - realistic MVP, strong demo, and directly uses natural-language adjudication over live evidence.
2. **Creator Sponsorship Compliance Escrow** - easy to understand, visual, and useful for real creator-agent commerce.
3. **Screenshot SLA Verifier** - compact scope and shows web rendering plus image/evidence analysis clearly.
4. **Hackathon Submission Rubric Judge** - practical for demos because the judging criteria and evidence URLs are simple.
5. **Service Dispute Escrow** - best long-term concept, but broader evidence handling makes it slightly harder.

## 1. Proof-of-Completion Bounty Judge

- **Pitch:** A bounty escrow that releases payment when an Intelligent Contract judges that a submitted URL, GitHub PR, or write-up satisfies the natural-language bounty brief.
- **Why GenLayer is a good fit:** The contract can interpret subjective completion criteria, fetch live evidence from the web, and reach validator consensus on a judgment rather than relying on one centralized reviewer.
- **GenLayer features used:** Intelligent Contracts, live web data access, LLM adjudication, non-deterministic operations, custom validator logic, Equivalence Principle, finality.
- **Main intelligent contract logic:** Store bounty terms and reward, accept a submission URL, fetch the evidence, ask an LLM for structured JSON with `accepted`, `score`, and `reason`, then validate that decision fields match or fall within a rubric tolerance.
- **Simple MVP scope:** One sponsor creates a bounty, one builder submits a URL, the contract resolves accepted/rejected, and the UI shows the stored decision.
- **Frontend pages needed:** Bounty list, create bounty, bounty detail/submission, resolution status.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** It demonstrates the core GenLayer value proposition: a contract judging real-world work from natural-language instructions.

## 2. Creator Sponsorship Compliance Escrow

- **Pitch:** Brands escrow funds and release them automatically when a creator's post satisfies the campaign terms.
- **Why GenLayer is a good fit:** Campaign compliance is subjective and evidence-based; GenLayer can fetch the post, interpret the text/media, and decide if the requirements were met.
- **GenLayer features used:** Web access, natural-language interpretation, image/evidence analysis for screenshots, LLM calls, validator consensus, finality.
- **Main intelligent contract logic:** Store sponsorship rules, fetch a social post or page, optionally render a screenshot, ask the LLM to verify required mentions/links/disclosures, and accept only structured decisions that match the campaign rubric.
- **Simple MVP scope:** Campaign creation, creator URL submission, compliance check, payment release flag.
- **Frontend pages needed:** Campaign dashboard, campaign detail, submit proof, decision result.
- **Difficulty:** Easy to Medium.
- **Hackathon/demo appeal:** Everyone understands brand deals, and the live URL-to-onchain-decision flow is visually persuasive.

## 3. Screenshot SLA Verifier

- **Pitch:** A service-level agreement contract that checks a website or status page and adjudicates whether downtime or broken UI occurred.
- **Why GenLayer is a good fit:** The docs describe web rendering, screenshots, and image-capable LLM prompts; this app turns those into an onchain SLA judge.
- **GenLayer features used:** `gl.nondet.web.render`, screenshot capture, image processing, structured LLM output, custom validation, finality.
- **Main intelligent contract logic:** Capture the target page as HTML or screenshot, classify the page status as operational/degraded/down, validate the result across validators, and store whether the SLA claim is valid.
- **Simple MVP scope:** Register monitored URL, submit claim, run one verification, show result.
- **Frontend pages needed:** Monitor setup, claim page, verification result.
- **Difficulty:** Easy to Medium.
- **Hackathon/demo appeal:** A live screenshot being judged by a contract is a concrete, memorable GenLayer demo.

## 4. Hackathon Submission Rubric Judge

- **Pitch:** A transparent judge that scores hackathon submissions against a published rubric using demo URLs, READMEs, and project descriptions.
- **Why GenLayer is a good fit:** Judging is qualitative, rubric-driven, and benefits from decentralized validation rather than a single opaque score.
- **GenLayer features used:** LLM calls, web data access, structured JSON responses, custom validator functions, numeric tolerance, finality.
- **Main intelligent contract logic:** Fetch submission material, ask for rubric scores and a short rationale, validate score ranges and tolerate small score differences while requiring the pass/fail decision to match.
- **Simple MVP scope:** One rubric, submission URL entry, onchain score, ranked list.
- **Frontend pages needed:** Rubric page, submit project, leaderboard/results.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** It can be used to judge its own demo set and shows explainable AI adjudication.

## 5. Service Dispute Escrow

- **Pitch:** An escrow for freelance or agentic services where GenLayer decides whether work met the written agreement.
- **Why GenLayer is a good fit:** The contract can interpret a natural-language agreement and analyze submitted evidence without a centralized mediator.
- **GenLayer features used:** Intelligent Contracts, natural-language interpretation, evidence URL fetching, LLM adjudication, appeals/finality, validator consensus.
- **Main intelligent contract logic:** Store terms, milestones, and deposit; accept claimant and respondent evidence URLs; return a structured decision such as release, refund, split, or need-more-evidence.
- **Simple MVP scope:** Single milestone escrow, one evidence URL per side, binary release/refund decision.
- **Frontend pages needed:** Create escrow, escrow detail, submit evidence, decision timeline.
- **Difficulty:** Medium to Hard.
- **Hackathon/demo appeal:** It shows GenLayer as a dispute-resolution layer for agentic commerce, which matches the docs' positioning.

## 6. GitHub Issue Bounty Resolver

- **Pitch:** A bounty contract that checks whether a GitHub issue or PR was actually solved.
- **Why GenLayer is a good fit:** GenLayer can fetch GitHub pages/API responses and interpret issue acceptance, tests, and maintainer comments.
- **GenLayer features used:** Web/API access, LLM interpretation, structured validation, custom equivalence logic.
- **Main intelligent contract logic:** Fetch issue and PR data, determine whether the fix is merged or accepted, and release bounty funds when the decision fields agree.
- **Simple MVP scope:** One issue URL, one PR URL, merged/accepted resolution.
- **Frontend pages needed:** Bounty creation, submission, resolver result.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** Developer audiences immediately understand the workflow and can inspect the evidence live.

## 7. Fact-Checked Prediction Market Resolver

- **Pitch:** A prediction market resolver that uses official web sources to decide real-world outcomes.
- **Why GenLayer is a good fit:** Outcome resolution often requires live web data plus semantic judgment over phrasing and source reliability.
- **GenLayer features used:** Web access, LLM adjudication, validator consensus, appeals/finality.
- **Main intelligent contract logic:** Store market question and accepted sources, fetch pages, classify the outcome, and validate that the resolved outcome matches source evidence.
- **Simple MVP scope:** One binary market, one source URL, resolved yes/no/undetermined.
- **Frontend pages needed:** Market list, market detail, resolve market.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** It shows oracle-like behavior without a traditional oracle.

## 8. Receipt Reimbursement Verifier

- **Pitch:** A reimbursement contract that checks receipt images or invoice screenshots against a spending policy.
- **Why GenLayer is a good fit:** Receipts are visual, semi-structured, and require policy interpretation, all of which the docs identify as suitable for image and LLM processing.
- **GenLayer features used:** Image processing, LLM calls with JSON output, custom validation, finality.
- **Main intelligent contract logic:** Analyze an uploaded receipt image URL, extract merchant/date/amount/category, compare against policy, and approve or reject reimbursement.
- **Simple MVP scope:** One policy, one receipt image, approve/reject with amount.
- **Frontend pages needed:** Policy page, submit receipt, reimbursement result.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** It turns visual evidence into an onchain decision.

## 9. DAO Proposal Evidence Summarizer

- **Pitch:** A DAO helper that fetches proposal links and stores a validator-agreed summary, risks, and recommendation.
- **Why GenLayer is a good fit:** Proposal review requires reading unstructured sources and producing semantically equivalent summaries.
- **GenLayer features used:** Web access, LLM summarization, non-comparative validation, vector/storage patterns if expanded.
- **Main intelligent contract logic:** Fetch proposal sources, produce structured summary/risk fields, validate required fields and major claims, then store the result for voters.
- **Simple MVP scope:** Submit proposal URL, generate summary, show result.
- **Frontend pages needed:** Proposal list, submit proposal, summary detail.
- **Difficulty:** Easy to Medium.
- **Hackathon/demo appeal:** It makes governance easier while showing consensus over subjective text.

## 10. Visual Content Policy Gate

- **Pitch:** A publishing gate that checks whether submitted text or images comply with a community policy before minting or listing content.
- **Why GenLayer is a good fit:** Policy enforcement is subjective and often needs both language and image analysis.
- **GenLayer features used:** Natural-language interpretation, image processing, LLM validation, finality.
- **Main intelligent contract logic:** Analyze content against stored policy rules and return JSON with `allowed`, `violations`, and `confidence`; validators agree on the decision fields.
- **Simple MVP scope:** One policy, one image/text URL, allowed/rejected result.
- **Frontend pages needed:** Policy page, submit content, moderation result.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** It demonstrates decentralized AI moderation without a private centralized moderator.

## 11. Real-World Product Availability Escrow

- **Pitch:** A commerce contract that checks whether a product page shows an item as available, sold out, delivered, or materially changed.
- **Why GenLayer is a good fit:** Product pages are live, unstructured, and sometimes need screenshot-level interpretation.
- **GenLayer features used:** Web rendering, web requests, LLM classification, validator consensus.
- **Main intelligent contract logic:** Fetch/render a product or shipping page, classify status, and trigger the agreed escrow outcome.
- **Simple MVP scope:** One product URL, one status check, release/refund flag.
- **Frontend pages needed:** Create check, check detail, result page.
- **Difficulty:** Easy.
- **Hackathon/demo appeal:** It is a compact demo of web-connected contracts reacting to real pages.

## 12. RFP Bid Compliance Judge

- **Pitch:** A contract that checks whether vendor proposals satisfy an RFP's required criteria before they can be accepted.
- **Why GenLayer is a good fit:** RFP compliance is document-heavy, subjective, and rubric-based.
- **GenLayer features used:** LLM interpretation, document/web fetching, structured output validation, custom equivalence logic.
- **Main intelligent contract logic:** Compare proposal text against required fields and constraints, return pass/fail plus missing items, and accept only matching decision fields.
- **Simple MVP scope:** One RFP, one proposal URL, compliance result.
- **Frontend pages needed:** RFP detail, submit proposal, compliance report.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** It shows business-process adjudication with transparent criteria.

## 13. Milestone Grant Payout Judge

- **Pitch:** A grant contract that releases milestone funds when public evidence shows the milestone is complete.
- **Why GenLayer is a good fit:** Milestones are usually written in natural language and proven through repos, demos, docs, or screenshots.
- **GenLayer features used:** Web access, LLM adjudication, structured JSON validation, finality.
- **Main intelligent contract logic:** Store milestone criteria, fetch submitted evidence, decide complete/incomplete, and release the milestone amount if validators agree.
- **Simple MVP scope:** One grant, one milestone, one evidence URL, release flag.
- **Frontend pages needed:** Grant page, submit milestone, payout status.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** It is a realistic public-goods funding use case.

## 14. Agent Task Receipt Verifier

- **Pitch:** An agent-commerce receipt contract where autonomous agents submit task logs and GenLayer verifies whether the requested task was performed.
- **Why GenLayer is a good fit:** The docs frame GenLayer as adjudication for the agentic economy, and task receipts need semantic review, not just deterministic computation.
- **GenLayer features used:** Natural-language interpretation, web/log fetching, validator consensus, appeals/finality.
- **Main intelligent contract logic:** Store a task request, fetch the agent's completion proof, verify the proof against the task, and record payable/not-payable status.
- **Simple MVP scope:** One task, one proof URL, binary verification.
- **Frontend pages needed:** Task creation, proof submission, verification result.
- **Difficulty:** Medium.
- **Hackathon/demo appeal:** It aligns tightly with the agentic-commerce story in the GenLayer docs.
"""


def learned_markdown(generated: str) -> str:
    return f"""# What I Learned About GenLayer

Generated: {generated}

## What GenLayer is

GenLayer is an AI-native blockchain designed for trustless adjudication. Instead of only reaching consensus on deterministic code execution, it lets validators use LLMs and live web data to agree on subjective or non-deterministic outcomes.

## What Intelligent Contracts are

Intelligent Contracts are Python contracts that run in GenVM and can combine normal contract state with non-deterministic operations such as LLM prompts, web requests, web rendering, screenshots, and image analysis. The important design rule is that side effects like storage writes and messages happen after a consensus-agreed result is produced.

## What Studio and Studionet are used for

GenLayer Studio is a browser-based development environment for writing, loading, deploying, executing, and debugging Intelligent Contracts. Studionet is the hosted development network exposed through `https://studio.genlayer.com/api`, with chain ID `61999`, a built-in faucet, real LLM execution, and the Studio explorer flow. It is the best zero-setup place to start before moving to localnet or the Bradbury testnet.

## What kinds of apps make sense

Good GenLayer apps need judgment: dispute resolution, escrow release, evidence review, bounty completion, content compliance, prediction-market resolution, receipt/invoice checks, SLA verification, grant milestone review, and agent task verification. The strongest apps use live web evidence, natural-language criteria, structured LLM output, image or screenshot analysis, validator consensus, and finality/appeals where the decision has value.

## What kinds of apps do not make sense

GenLayer is not the best fit for apps that are purely deterministic, such as a simple ERC-20 transfer, static NFT mint, basic counter, or high-frequency computation where no web data or judgment is needed. It is also a poor fit when the app requires secret/private data inside the contract, depends on unstable or rate-limited websites without stable fields, requires instant finality for every action, or expects exact equality from inherently variable LLM outputs.

## Best first app to build

The best first app is **Proof-of-Completion Bounty Judge**. It is small enough for an MVP, uses the most important GenLayer features, and is easy to demo: a sponsor writes natural-language acceptance criteria, a builder submits a URL, and an Intelligent Contract fetches the evidence and adjudicates whether the reward should be released.
"""


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    HTML_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    llms = fetch(session, LLMS_URL).text
    robots = fetch(session, ROBOTS_URL).text
    bulk = fetch(session, BULK_URL, timeout=90).text
    sitemap_xml = fetch(session, SITEMAP_URL).text
    (CACHE_DIR / "llms.txt").write_text(llms, encoding="utf-8")
    (CACHE_DIR / "robots.txt").write_text(robots, encoding="utf-8")
    (CACHE_DIR / "full-documentation.txt").write_text(bulk, encoding="utf-8")
    (CACHE_DIR / "sitemap.xml").write_text(sitemap_xml, encoding="utf-8")

    bulk_sections = split_bulk_docs(bulk)
    bulk_by_url: dict[str, tuple[str, str]] = {}
    full_order_urls: list[str] = []
    for source_path, content in bulk_sections:
        url = normalize_url(path_to_url(source_path)) or path_to_url(source_path)
        bulk_by_url[url] = (source_path, content)
        full_order_urls.append(url)

    sitemap_urls = parse_sitemap(sitemap_xml)
    seed_urls = [BASE_URL, *full_order_urls, *sitemap_urls]
    crawl_results, crawl_order = crawl(session, seed_urls)

    ordered_urls: list[str] = []
    seen: set[str] = set()
    for url in [*full_order_urls, *sitemap_urls, *crawl_order]:
        normalized = normalize_url(url)
        if normalized and normalized not in seen:
            seen.add(normalized)
            ordered_urls.append(normalized)

    pages: list[Page] = []
    for url in ordered_urls:
        crawl_info = crawl_results.get(url, {})
        status = crawl_info.get("status_code")
        if url in bulk_by_url:
            source_path, raw_mdx = bulk_by_url[url]
            markdown = clean_mdx(raw_mdx)
            markdown, title = ensure_source(markdown, url, source_path)
            pages.append(Page(url=url, source_path=source_path, title=title, markdown=markdown, status_code=status, source_kind="bulk-mdx"))
            continue

        html_path = HTML_CACHE_DIR / f"{slug_for_url(url)}.html"
        if html_path.exists():
            markdown = html_article_to_markdown(html_path.read_text(encoding="utf-8"), url)
            if markdown.strip():
                markdown, title = ensure_source(markdown, url, slug_for_url(url))
                pages.append(Page(url=url, source_path=None, title=title, markdown=markdown, status_code=status, source_kind="html-article"))

    for existing in RAW_DIR.glob("*.md"):
        existing.unlink()
    pages, skipped_duplicates = dedupe_pages(pages)

    for idx, page in enumerate(pages, start=1):
        path = RAW_DIR / f"{idx:03d}_{slug_for_url(page.url)}.md"
        path.write_text(page.markdown, encoding="utf-8")

    metadata = {
        "generated": generated,
        "base_url": BASE_URL,
        "llms_url": LLMS_URL,
        "bulk_url": BULK_URL,
        "sitemap_url": SITEMAP_URL,
        "bulk_sections": len(bulk_sections),
        "sitemap_urls": len(sitemap_urls),
        "crawled_urls": len(crawl_results),
        "compiled_pages": len(pages),
        "skipped_duplicate_pages": skipped_duplicates,
        "pages": [
            {
                "url": page.url,
                "title": page.title,
                "source_path": page.source_path,
                "status_code": page.status_code,
                "source_kind": page.source_kind,
            }
            for page in pages
        ],
        "crawl_results": crawl_results,
    }
    (ROOT / "crawl_manifest.json").write_text(json.dumps(metadata, indent=2, sort_keys=True), encoding="utf-8")

    compiled = build_markdown_document(pages, metadata)
    md_path = ROOT / "GENLAYER_FULL_DOCUMENTATION.md"
    md_path.write_text(compiled, encoding="utf-8")

    ideas_path = ROOT / "GENLAYER_APP_IDEAS.md"
    ideas_path.write_text(app_ideas_markdown(generated), encoding="utf-8")

    learned_path = ROOT / "WHAT_I_LEARNED_ABOUT_GENLAYER.md"
    learned_path.write_text(learned_markdown(generated), encoding="utf-8")

    pdf_path = ROOT / "GENLAYER_FULL_DOCUMENTATION.pdf"
    write_pdf(compiled, pages, metadata, pdf_path)

    print(json.dumps({
        "raw_pages": str(RAW_DIR),
        "compiled_markdown": str(md_path),
        "compiled_pdf": str(pdf_path),
        "ideas": str(ideas_path),
        "summary": str(learned_path),
        "manifest": str(ROOT / "crawl_manifest.json"),
        "compiled_pages": len(pages),
        "skipped_duplicates": len(skipped_duplicates),
        "crawled_urls": len(crawl_results),
        "bulk_sections": len(bulk_sections),
        "sitemap_urls": len(sitemap_urls),
    }, indent=2))


if __name__ == "__main__":
    main()
