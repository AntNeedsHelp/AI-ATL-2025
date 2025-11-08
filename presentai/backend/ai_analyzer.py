import os
import base64
from pathlib import Path
from typing import Dict, List, Optional
import json

from google import genai
from google.genai import types

class AIAnalyzer:
    def __init__(self):
        # Initialize Gemini client
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.0-flash-exp"
    
    async def analyze(
        self,
        audio_path: str,
        frames_dir: str,
        supporting_doc_path: Optional[str],
        metadata: Dict
    ) -> Dict:
        """Main analysis pipeline orchestrated by Manager Agent"""
        
        # Load supporting document if provided
        supporting_text = None
        if supporting_doc_path:
            supporting_text = self._extract_document_text(supporting_doc_path)
        
        # Upload audio file
        audio_file = self.client.files.upload(path=audio_path)
        
        # Sample frames (max 60 frames for 3 min video at 15 fps = 2700 frames, sample every 45th)
        frame_files = sorted(Path(frames_dir).glob("*.jpg"))
        sampled_frames = frame_files[::45][:60]  # Max 60 frames
        
        # Upload sampled frames
        uploaded_frames = []
        for frame_path in sampled_frames:
            frame_file = self.client.files.upload(path=str(frame_path))
            uploaded_frames.append({
                "file": frame_file,
                "timestamp": self._frame_to_timestamp(frame_path.name, metadata["fps"])
            })
        
        # Run specialized agents in parallel
        speech_analysis = await self._speech_agent(audio_file, metadata)
        gesture_analysis = await self._gesture_agent(uploaded_frames, metadata)
        inflection_analysis = await self._inflection_agent(audio_file, metadata)
        content_analysis = await self._content_agent(
            audio_file, 
            supporting_text, 
            metadata
        )
        
        # Aggregate results
        result = self._aggregate_results(
            speech_analysis,
            gesture_analysis,
            inflection_analysis,
            content_analysis,
            metadata,
            supporting_doc_path
        )
        
        return result
    
    async def _speech_agent(self, audio_file, metadata: Dict) -> Dict:
        """Analyze speech clarity: transcription, WPM, filler words, pauses"""
        
        prompt = f"""You are a speech clarity coach analyzing a presentation recording.

Audio duration: {metadata['duration']:.1f} seconds

Analyze the speech and provide:
1. Full transcription
2. Words per minute (WPM)
3. Filler words ("um", "uh", "like", etc.) with timestamps
4. Awkward pauses (>2 seconds) with timestamps
5. Speaking pace issues (too fast: >180 WPM, too slow: <120 WPM)

For each issue found, provide:
- Timestamp (start and end in seconds)
- Specific issue label
- Severity (1-5, where 5 is most severe)
- Brief, encouraging coaching tip

Output as JSON:
{{
  "transcript": "full text...",
  "wpm": 150,
  "markers": [
    {{
      "start": 12.5,
      "end": 13.0,
      "label": "Filler word: 'um'",
      "severity": 2,
      "feedback": "Take a breath instead of using filler words."
    }}
  ]
}}
"""
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(file_uri=audio_file.uri, mime_type=audio_file.mime_type),
                        types.Part.from_text(prompt)
                    ]
                )
            ]
        )
        
        # Parse JSON from response
        return self._parse_json_response(response.text)
    
    async def _gesture_agent(self, uploaded_frames: List[Dict], metadata: Dict) -> Dict:
        """Analyze body language and gestures from video frames"""
        
        prompt = """You are a body language coach analyzing presentation video frames.

Analyze the presenter's:
1. Posture (slouching, fidgeting, standing straight)
2. Hand gestures (natural, stiff, repetitive, appropriate emphasis)
3. Eye contact and gaze direction
4. Facial expressions (engaged, monotone, appropriate emotion)

For each issue found, provide:
- Timestamp range (start and end in seconds)
- Specific issue label
- Severity (1-5)
- Brief, encouraging coaching tip

Output as JSON:
{
  "markers": [
    {
      "start": 45.0,
      "end": 52.0,
      "label": "Crossed arms (closed posture)",
      "severity": 3,
      "feedback": "Keep arms relaxed at your sides or use open gestures to engage the audience."
    }
  ]
}
"""
        
        # Build content with frames
        parts = []
        for frame_data in uploaded_frames:
            parts.append(
                types.Part.from_uri(
                    file_uri=frame_data["file"].uri,
                    mime_type=frame_data["file"].mime_type
                )
            )
            parts.append(types.Part.from_text(f"[Frame at {frame_data['timestamp']:.1f}s]"))
        
        parts.append(types.Part.from_text(prompt))
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=[types.Content(role="user", parts=parts)]
        )
        
        return self._parse_json_response(response.text)
    
    async def _inflection_agent(self, audio_file, metadata: Dict) -> Dict:
        """Analyze vocal inflection, pitch variation, and tone"""
        
        prompt = f"""You are a vocal delivery coach analyzing a presentation recording.

Audio duration: {metadata['duration']:.1f} seconds

Analyze vocal delivery:
1. Pitch variation (monotone sections vs. dynamic delivery)
2. Volume consistency (too quiet, too loud, inconsistent)
3. Emphasis on key points
4. Energy and enthusiasm in voice

For each issue found, provide:
- Timestamp range (start and end in seconds)
- Specific issue label
- Severity (1-5)
- Brief, encouraging coaching tip

Output as JSON:
{{
  "markers": [
    {{
      "start": 28.0,
      "end": 35.0,
      "label": "Monotone delivery",
      "severity": 3,
      "feedback": "Vary your pitch to emphasize key ideas and maintain audience interest."
    }}
  ]
}}
"""
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(file_uri=audio_file.uri, mime_type=audio_file.mime_type),
                        types.Part.from_text(prompt)
                    ]
                )
            ]
        )
        
        return self._parse_json_response(response.text)
    
    async def _content_agent(
        self,
        audio_file,
        supporting_text: Optional[str],
        metadata: Dict
    ) -> Dict:
        """Analyze content structure, topic alignment, and clarity"""
        
        supporting_context = ""
        if supporting_text:
            supporting_context = f"\n\nSupporting document provided:\n{supporting_text[:2000]}"
        
        prompt = f"""You are a content structure coach analyzing a presentation.

Audio duration: {metadata['duration']:.1f} seconds
{supporting_context}

Analyze content quality:
1. Clear introduction and conclusion
2. Logical flow and structure
3. Topic alignment (if supporting document provided)
4. Key points are well explained
5. Transitions between topics

For each issue found, provide:
- Timestamp range (start and end in seconds)
- Specific issue label
- Severity (1-5)
- Brief, encouraging coaching tip

Output as JSON:
{{
  "markers": [
    {{
      "start": 0.0,
      "end": 15.0,
      "label": "Weak introduction",
      "severity": 2,
      "feedback": "Start with a clear hook or thesis statement to engage your audience."
    }}
  ]
}}
"""
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(file_uri=audio_file.uri, mime_type=audio_file.mime_type),
                        types.Part.from_text(prompt)
                    ]
                )
            ]
        )
        
        return self._parse_json_response(response.text)
    
    def _aggregate_results(
        self,
        speech: Dict,
        gesture: Dict,
        inflection: Dict,
        content: Dict,
        metadata: Dict,
        supporting_file: Optional[str]
    ) -> Dict:
        """Combine agent outputs and calculate scores"""
        
        # Collect all markers with category tags
        all_markers = []
        
        for marker in speech.get("markers", []):
            marker["category"] = "clarity"
            all_markers.append(marker)
        
        for marker in gesture.get("markers", []):
            marker["category"] = "gestures"
            all_markers.append(marker)
        
        for marker in inflection.get("markers", []):
            marker["category"] = "inflection"
            all_markers.append(marker)
        
        for marker in content.get("markers", []):
            marker["category"] = "content"
            all_markers.append(marker)
        
        # Calculate scores (start at 25, deduct based on severity)
        scores = {
            "clarity": 25,
            "gestures": 25,
            "inflection": 25,
            "content": 25
        }
        
        for marker in all_markers:
            category = marker["category"]
            severity = marker.get("severity", 1)
            # Deduct points: severity 1-2: -1pt, severity 3: -2pts, severity 4-5: -3pts
            deduction = 1 if severity <= 2 else (2 if severity == 3 else 3)
            scores[category] = max(0, scores[category] - deduction)
        
        total_score = sum(scores.values())
        
        # Sort markers by timestamp
        all_markers.sort(key=lambda x: x["start"])
        
        return {
            "scores": {
                "gestures": scores["gestures"],
                "inflection": scores["inflection"],
                "clarity": scores["clarity"],
                "content": scores["content"],
                "total": total_score
            },
            "markers": all_markers,
            "transcript": speech.get("transcript", ""),
            "metadata": {
                "duration": metadata["duration"],
                "video_file": "input.mp4",
                "supporting_file": Path(supporting_file).name if supporting_file else None,
                "language": "English",
                "analyzed_by": "Google Gemini 2.5 Pro"
            }
        }
    
    def _parse_json_response(self, text: str) -> Dict:
        """Extract JSON from markdown-wrapped response"""
        # Remove markdown code blocks if present
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            # Fallback: return empty markers
            return {"markers": []}
    
    def _frame_to_timestamp(self, frame_name: str, fps: float) -> float:
        """Convert frame filename to timestamp"""
        # frame_000001.jpg -> frame number 1
        frame_num = int(frame_name.split('_')[1].split('.')[0])
        return (frame_num - 1) / fps
    
    def _extract_document_text(self, file_path: str) -> str:
        """Extract text from PDF, DOCX, or TXT"""
        path = Path(file_path)
        
        if path.suffix == '.txt':
            return path.read_text(encoding='utf-8')
        
        elif path.suffix == '.pdf':
            from PyPDF2 import PdfReader
            reader = PdfReader(file_path)
            return "\n".join(page.extract_text() for page in reader.pages)
        
        elif path.suffix == '.docx':
            from docx import Document
            doc = Document(file_path)
            return "\n".join(para.text for para in doc.paragraphs)
        
        return ""
