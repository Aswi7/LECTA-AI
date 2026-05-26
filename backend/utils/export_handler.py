import os
import logging
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListItem, ListFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from docx import Document
from config import CONFIG

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExportHandler:
    def __init__(self):
        self.exports_dir = CONFIG.EXPORTS_FOLDER
        os.makedirs(self.exports_dir, exist_ok=True)

    def get_export_path(self, session_id: str, fmt: str) -> str:
        """Returns the absolute path for an export file."""
        return os.path.join(self.exports_dir, f"{session_id}.{fmt}")

    def generate_export(self, session_data: dict, fmt: str) -> str:
        """Generates an export file in the specified format (pdf, docx, txt)."""
        output_path = self.get_export_path(session_data["session_id"], fmt)
        
        # If file already exists, return it
        if os.path.exists(output_path):
            return output_path

        try:
            if fmt == "pdf":
                return self._generate_pdf(session_data, output_path)
            elif fmt == "docx":
                return self._generate_docx(session_data, output_path)
            elif fmt == "txt":
                return self._generate_txt(session_data, output_path)
            else:
                raise ValueError(f"Unsupported export format: {fmt}")
        except Exception as e:
            logger.error(f"Failed to generate {fmt} export: {e}")
            raise

    def _generate_pdf(self, data, path):
        doc = SimpleDocTemplate(path, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # Title
        story.append(Paragraph(f"Lecture Summary - {data['session_id']}", styles['Title']))
        story.append(Spacer(1, 12))

        # Summary
        story.append(Paragraph("Summary", styles['Heading2']))
        story.append(Paragraph(data.get('summary', 'No summary available.'), styles['Normal']))
        story.append(Spacer(1, 12))

        # Keywords
        story.append(Paragraph("Keywords", styles['Heading2']))
        keywords = data.get('concepts', {}).get('keywords', [])
        kw_text = ", ".join([k['keyword'] for k in keywords]) if keywords else "None"
        story.append(Paragraph(kw_text, styles['Normal']))
        story.append(Spacer(1, 12))

        # Questions
        story.append(Paragraph("Review Questions", styles['Heading2']))
        questions = data.get('questions', [])
        if questions:
            for q in questions:
                story.append(Paragraph(f"Q: {q['question']}", styles['Normal']))
                story.append(Paragraph(f"A: {q['answer']}", styles['Italic']))
                story.append(Spacer(1, 6))
        else:
            story.append(Paragraph("No questions generated.", styles['Normal']))

        doc.build(story)
        return path

    def _generate_docx(self, data, path):
        doc = Document()
        doc.add_heading(f"Lecture Summary - {data['session_id']}", 0)

        doc.add_heading("Summary", level=1)
        doc.add_paragraph(data.get('summary', 'No summary available.'))

        doc.add_heading("Keywords", level=1)
        keywords = data.get('concepts', {}).get('keywords', [])
        kw_text = ", ".join([k['keyword'] for k in keywords]) if keywords else "None"
        doc.add_paragraph(kw_text)

        doc.add_heading("Review Questions", level=1)
        questions = data.get('questions', [])
        for q in questions:
            doc.add_paragraph(f"Q: {q['question']}", style='List Bullet')
            doc.add_paragraph(f"A: {q['answer']}")

        doc.save(path)
        return path

    def _generate_txt(self, data, path):
        with open(path, 'w', encoding='utf-8') as f:
            f.write(f"Lecture Summary - {data['session_id']}\n")
            f.write("="*30 + "\n\n")
            f.write("SUMMARY:\n")
            f.write(data.get('summary', 'No summary available.') + "\n\n")
            f.write("KEYWORDS:\n")
            keywords = data.get('concepts', {}).get('keywords', [])
            kw_text = ", ".join([k['keyword'] for k in keywords]) if keywords else "None"
            f.write(kw_text + "\n\n")
            f.write("REVIEW QUESTIONS:\n")
            for q in questions := data.get('questions', []):
                f.write(f"Q: {q['question']}\n")
                f.write(f"A: {q['answer']}\n\n")
        return path

    def delete_exports(self, session_id: str):
        """Deletes all export files for a session."""
        for fmt in ["pdf", "docx", "txt"]:
            path = self.get_export_path(session_id, fmt)
            if os.path.exists(path):
                try:
                    os.remove(path)
                    logger.info(f"Deleted export: {path}")
                except Exception as e:
                    logger.warning(f"Failed to delete export {path}: {e}")

# Singleton instance
export_handler = ExportHandler()
