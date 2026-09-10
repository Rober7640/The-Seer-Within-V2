#!/usr/bin/env python3
"""Render one saved Marcus report payload as a polished PDF. Reads JSON from stdin."""
from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

INK = colors.HexColor('#211c16')
MUTED = colors.HexColor('#685e50')
RED = colors.HexColor('#8f2b1f')
PAPER = colors.HexColor('#f5f1e5')
SOFT = colors.HexColor('#ebe4d5')
RULE = colors.HexColor('#bcb19c')


def register_fonts() -> tuple[str, str, str]:
    regular = Path('/System/Library/Fonts/Supplemental/Georgia.ttf')
    bold = Path('/System/Library/Fonts/Supplemental/Georgia Bold.ttf')
    italic = Path('/System/Library/Fonts/Supplemental/Georgia Italic.ttf')
    if regular.exists() and bold.exists() and italic.exists():
        pdfmetrics.registerFont(TTFont('MarcusSerif', str(regular)))
        pdfmetrics.registerFont(TTFont('MarcusSerifBold', str(bold)))
        pdfmetrics.registerFont(TTFont('MarcusSerifItalic', str(italic)))
        return 'MarcusSerif', 'MarcusSerifBold', 'MarcusSerifItalic'
    return 'Times-Roman', 'Times-Bold', 'Times-Italic'


REGULAR, BOLD, ITALIC = register_fonts()


def clean(value: object) -> str:
    return html.escape(str(value or ''), quote=False).replace('\u2011', '-').replace('\n', '<br/>')


def require_payload(payload: dict) -> None:
    for key in ('readerName', 'question', 'theme', 'spread', 'positions', 'personalCard', 'sections', 'closing'):
        if key not in payload:
            raise ValueError(f'missing PDF field: {key}')
    if not payload['theme'].strip():
        raise ValueError('reading theme is required')
    paid = [position for position in payload['positions'] if position['visibility'] == 'paid']
    if len(paid) != len(payload['sections']):
        raise ValueError('paid positions and report sections must match')
    for position, section in zip(paid, payload['sections']):
        if position['id'] != section['positionId'] or position['cardId'] != section['cardId']:
            raise ValueError('report section does not match the saved paid draw')


def styles():
    base = getSampleStyleSheet()
    return {
        'eyebrow': ParagraphStyle('eyebrow', parent=base['Normal'], fontName=BOLD, fontSize=8.5,
                                  leading=11, textColor=RED, alignment=TA_CENTER, spaceAfter=8,
                                  uppercase=True),
        'title': ParagraphStyle('title', parent=base['Title'], fontName=REGULAR, fontSize=27,
                                leading=31, textColor=INK, alignment=TA_CENTER, spaceAfter=12),
        'theme': ParagraphStyle('theme', parent=base['Normal'], fontName=ITALIC, fontSize=11.5,
                                leading=17, textColor=MUTED, alignment=TA_CENTER, spaceAfter=17),
        'h1': ParagraphStyle('h1', parent=base['Heading1'], fontName=REGULAR, fontSize=20,
                             leading=24, textColor=INK, spaceBefore=8, spaceAfter=12),
        'h2': ParagraphStyle('h2', parent=base['Heading2'], fontName=BOLD, fontSize=13,
                             leading=17, textColor=INK, spaceBefore=5, spaceAfter=7),
        'body': ParagraphStyle('body', parent=base['BodyText'], fontName=REGULAR, fontSize=10.5,
                               leading=16, textColor=INK, spaceAfter=10),
        'small': ParagraphStyle('small', parent=base['BodyText'], fontName=REGULAR, fontSize=8.5,
                                leading=12, textColor=MUTED),
        'smallBold': ParagraphStyle('smallBold', parent=base['BodyText'], fontName=BOLD, fontSize=8.5,
                                    leading=12, textColor=INK),
        'tableHead': ParagraphStyle('tableHead', parent=base['BodyText'], fontName=BOLD, fontSize=8.5,
                                    leading=12, textColor=PAPER),
        'notice': ParagraphStyle('notice', parent=base['BodyText'], fontName=BOLD, fontSize=8,
                                 leading=11, textColor=RED, alignment=TA_CENTER),
    }


def draw_page(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(INK)
    canvas.setLineWidth(0.7)
    canvas.line(22 * mm, height - 19 * mm, width - 22 * mm, height - 19 * mm)
    canvas.setFont(BOLD, 8)
    canvas.setFillColor(INK)
    canvas.drawString(22 * mm, height - 15 * mm, 'MARCUS STONE')
    canvas.setFont(ITALIC, 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 22 * mm, height - 15 * mm, 'The Seer Within')
    canvas.setStrokeColor(RULE)
    canvas.line(22 * mm, 16 * mm, width - 22 * mm, 16 * mm)
    canvas.setFont(REGULAR, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(22 * mm, 11 * mm, 'Personal tarot reading')
    canvas.drawRightString(width - 22 * mm, 11 * mm, f'Page {doc.page}')
    canvas.restoreState()


def render(payload: dict, output: Path) -> dict:
    require_payload(payload)
    output.parent.mkdir(parents=True, exist_ok=True)
    style = styles()
    doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=23 * mm, leftMargin=23 * mm,
                            topMargin=28 * mm, bottomMargin=23 * mm, title=payload['question'],
                            author='Marcus Stone', subject=payload['theme'])
    story = [
        Spacer(1, 9 * mm),
        Paragraph('YOUR PERSONAL READING', style['eyebrow']),
        Paragraph(clean(payload['question']), style['title']),
        Paragraph(clean(payload['theme']), style['theme']),
    ]
    meta = [
        [Paragraph('Prepared for', style['small']), Paragraph(clean(payload['readerName']), style['smallBold'])],
        [Paragraph('Spread', style['small']), Paragraph(clean(payload['spread']['name']), style['smallBold'])],
        [Paragraph('Structure', style['small']), Paragraph(
            f"{len(payload['positions'])} cards - {sum(p['visibility']=='free' for p in payload['positions'])} already read, "
            f"{sum(p['visibility']=='paid' for p in payload['positions'])} completed here", style['smallBold'])],
        [Paragraph('Personal card', style['small']), Paragraph(clean(payload['personalCard']['name']), style['smallBold'])],
    ]
    meta_table = Table(meta, colWidths=[34 * mm, 91 * mm], hAlign='CENTER')
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SOFT), ('BOX', (0, 0), (-1, -1), 0.5, RULE),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, RULE), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.extend([meta_table, Spacer(1, 9 * mm), Paragraph(
        clean(payload.get('opening') or
              'This reading continues the cards from your daily letter and completes the positions that remained face down.'),
        style['body']), Spacer(1, 2 * mm), Paragraph('Your complete spread', style['h1'])])

    rows = [[Paragraph('Position', style['tableHead']), Paragraph('Card', style['tableHead']),
             Paragraph('Place in the reading', style['tableHead'])]]
    for position in payload['positions']:
        status = 'Already read in the daily letter' if position['visibility'] == 'free' else 'Completed in this reading'
        card = position['cardName'] + (' (reversed)' if position.get('reversed') else '')
        rows.append([
            Paragraph(str(position['number']), style['smallBold']),
            Paragraph(clean(card), style['small']),
            Paragraph(f"<b>{clean(position['label'])}</b><br/>{status}", style['small']),
        ])
    spread_table = Table(rows, colWidths=[18 * mm, 39 * mm, 78 * mm], repeatRows=1)
    spread_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), INK), ('TEXTCOLOR', (0, 0), (-1, 0), PAPER),
        ('GRID', (0, 0), (-1, -1), 0.35, RULE), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, SOFT]),
        ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.extend([spread_table, Spacer(1, 7 * mm), Paragraph('Your personal card', style['h1']),
                  Paragraph(f"<b>{clean(payload['personalCard']['name'])}</b>", style['h2']),
                  Paragraph(clean(payload['personalCard']['text']), style['body']), Spacer(1, 7 * mm),
                  Paragraph('The cards that were face down', style['h1'])])

    for index, section in enumerate(payload['sections']):
        block = [
            Paragraph(f"POSITION {section['number']} - {clean(section['title']).upper()}", style['eyebrow']),
            Paragraph(clean(section['cardName']) + (' (reversed)' if section.get('reversed') else ''), style['h1']),
            Paragraph(clean(section['text']), style['body']),
            Spacer(1, 3 * mm),
        ]
        story.append(KeepTogether(block))
        if index < len(payload['sections']) - 1:
            story.append(Table([['']], colWidths=[135 * mm], rowHeights=[0.2 * mm],
                               style=TableStyle([('BACKGROUND', (0, 0), (-1, -1), RULE)])))
            story.append(Spacer(1, 5 * mm))

    story.extend([Spacer(1, 3 * mm), Paragraph('How the cards connect', style['h1']),
                  Paragraph(clean(payload['closing']), style['body'])])
    if payload.get('notice'):
        story.extend([Spacer(1, 7 * mm), Paragraph(clean(payload['notice']), style['notice'])])
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    data = output.read_bytes()
    return {'path': str(output.resolve()), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'mediaType': 'application/pdf'}


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit('usage: render-report-pdf.py OUTPUT.pdf')
    payload = json.load(sys.stdin)
    result = render(payload, Path(sys.argv[1]))
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
