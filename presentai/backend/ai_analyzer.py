import os
import base64
from pathlib import Path
from typing import Dict, Optional
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
        self.model = "gemini-2.5-pro"
    
    async def analyze(
        self,
        video_path: str,
        supporting_doc_path: Optional[str],
        metadata: Dict
    ) -> Dict:
        """Main analysis pipeline orchestrated by Manager Agent - processes video directly"""
        
        # Load supporting document if provided
        supporting_text = None
        if supporting_doc_path:
            supporting_text = self._extract_document_text(supporting_doc_path)
        
        # Upload video file directly to Google Gemini
        try:
            video_file = self.client.files.upload(path=video_path)
        except Exception as e:
            raise ValueError(f"Failed to upload video file: {str(e)}")
        
        # Wait for file to be processed (required before using in API calls)
        import time
        max_wait = 300  # 5 minutes max wait
        wait_time = 0
        
        # Check file state - handle both string and enum types
        def get_file_state(file_obj):
            """Get file state as string"""
            if hasattr(file_obj, 'state'):
                state = file_obj.state
                if hasattr(state, 'name'):
                    return state.name
                elif isinstance(state, str):
                    return state
            return "UNKNOWN"
        
        file_state = get_file_state(video_file)
        while file_state == "PROCESSING":
            if wait_time >= max_wait:
                raise ValueError("Video file processing timed out")
            time.sleep(2)
            wait_time += 2
            try:
                video_file = self.client.files.get(name=video_file.name)
                file_state = get_file_state(video_file)
                print(f"File processing... state: {file_state}, waited: {wait_time}s")
            except Exception as e:
                raise ValueError(f"Failed to check file status: {str(e)}")
        
        file_state = get_file_state(video_file)
        if file_state == "FAILED":
            raise ValueError(f"Video file upload failed: {file_state}")
        
        print(f"File ready! State: {file_state}, URI: {video_file.uri}")
        
        # Run specialized agents - all work with the video file
        print("Starting speech analysis...")
        speech_analysis = await self._speech_agent(video_file, metadata)
        print("Speech analysis complete")
        gesture_analysis = await self._gesture_agent(video_file, metadata)
        inflection_analysis = await self._inflection_agent(video_file, metadata)
        content_analysis = await self._content_agent(
            video_file, 
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
    
    async def _speech_agent(self, video_file, metadata: Dict) -> Dict:
        """Analyze speech clarity: transcription, WPM, filler words, pauses"""
        
        prompt = f"""You are a speech clarity coach analyzing a presentation video.

Video duration: {metadata['duration']:.1f} seconds

Analyze the speech from the video and provide:
1. Full transcription of all spoken words
2. Words per minute (WPM) - calculate based on total words and duration
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
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_uri(file_uri=video_file.uri, mime_type=video_file.mime_type),
                            types.Part.from_text(prompt)
                        ]
                    )
                ]
            )
            
            # Parse JSON from response
            return self._parse_json_response(response.text)
        except Exception as e:
            print(f"Error in _speech_agent: {str(e)}")
            raise ValueError(f"Speech analysis failed: {str(e)}")
    
    async def _gesture_agent(self, video_file, metadata: Dict) -> Dict:
        """Analyze body language and gestures from video"""
        
        prompt = f"""You are a body language coach analyzing a presentation video.

Video duration: {metadata['duration']:.1f} seconds

Watch the entire video and analyze the presenter's:
1. Posture (slouching, fidgeting, standing straight)
2. Hand gestures (natural, stiff, repetitive, appropriate emphasis)
3. Eye contact and gaze direction
4. Facial expressions (engaged, monotone, appropriate emotion)
5. Movement and positioning

For each issue found, provide:
- Timestamp range (start and end in seconds)
- Specific issue label
- Severity (1-5)
- Brief, encouraging coaching tip

Output as JSON:
{{
  "markers": [
    {{
      "start": 45.0,
      "end": 52.0,
      "label": "Crossed arms (closed posture)",
      "severity": 3,
      "feedback": "Keep arms relaxed at your sides or use open gestures to engage the audience."
    }}
  ]
}}
"""
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_uri(file_uri=video_file.uri, mime_type=video_file.mime_type),
                            types.Part.from_text(prompt)
                        ]
                    )
                ]
            )
            
            return self._parse_json_response(response.text)
        except Exception as e:
            print(f"Error in _gesture_agent: {str(e)}")
            raise ValueError(f"Gesture analysis failed: {str(e)}")
    
    async def _inflection_agent(self, video_file, metadata: Dict) -> Dict:
        """Analyze vocal inflection, pitch variation, and tone"""
        
        prompt = f"""You are a vocal delivery coach analyzing a presentation video.

Video duration: {metadata['duration']:.1f} seconds

Listen to the audio in the video and analyze vocal delivery:
1. Pitch variation (monotone sections vs. dynamic delivery)
2. Volume consistency (too quiet, too loud, inconsistent)
3. Emphasis on key points
4. Energy and enthusiasm in voice
5. Tone and expression

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
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_uri(file_uri=video_file.uri, mime_type=video_file.mime_type),
                            types.Part.from_text(prompt)
                        ]
                    )
                ]
            )
            
            return self._parse_json_response(response.text)
        except Exception as e:
            print(f"Error in _inflection_agent: {str(e)}")
            raise ValueError(f"Inflection analysis failed: {str(e)}")
    
    async def _content_agent(
        self,
        video_file,
        supporting_text: Optional[str],
        metadata: Dict
    ) -> Dict:
        """Analyze content structure, topic alignment, and clarity"""
        
        supporting_context = ""
        if supporting_text:
            supporting_context = f"\n\nSupporting document provided:\n{supporting_text[:2000]}"
        
        prompt = f"""You are a content structure coach analyzing a presentation video.

Video duration: {metadata['duration']:.1f} seconds
{supporting_context}

Watch and listen to the entire video to analyze content quality:
1. Clear introduction and conclusion
2. Logical flow and structure
3. Topic alignment (if supporting document provided)
4. Key points are well explained
5. Transitions between topics
6. Visual aids usage (if any)

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
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_uri(file_uri=video_file.uri, mime_type=video_file.mime_type),
                            types.Part.from_text(prompt)
                        ]
                    )
                ]
            )
            
            return self._parse_json_response(response.text)
        except Exception as e:
            print(f"Error in _content_agent: {str(e)}")
            raise ValueError(f"Content analysis failed: {str(e)}")
    
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
