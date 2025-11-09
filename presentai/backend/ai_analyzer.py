import os
import base64
from pathlib import Path
from typing import Dict, Optional
import json

from google import genai
from google.genai import types
from PyPDF2 import PdfReader
from docx import Document

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
        # Note: In google-genai 1.49.0+, use 'file=' instead of 'path='
        try:
            video_file = self.client.files.upload(file=video_path)
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
        # Use try/except for each to allow partial results
        speech_analysis = None
        gesture_analysis = None
        inflection_analysis = None
        content_analysis = None
        
        print("Starting speech analysis...")
        try:
            speech_analysis = await self._speech_agent(video_file, metadata)
            transcript = speech_analysis.get("transcript", "")
            print(f"Speech analysis complete. Transcript length: {len(transcript) if transcript else 0} characters")
            if not transcript:
                print(f"[WARNING] Speech analysis returned empty transcript! This will prevent follow-up question generation.")
                print(f"[WARNING] Speech analysis keys: {list(speech_analysis.keys())}")
        except Exception as e:
            print(f"Speech analysis failed: {str(e)} - continuing with other analyses")
            print(f"[ERROR] This will prevent follow-up question generation since transcript is required.")
            import traceback
            traceback.print_exc()
            speech_analysis = {"markers": [], "transcript": "", "wpm": 0, "filler_words": [], "pauses": []}
        
        try:
            gesture_analysis = await self._gesture_agent(video_file, metadata)
            print("Gesture analysis complete")
        except Exception as e:
            print(f"Gesture analysis failed: {str(e)} - continuing with other analyses")
            gesture_analysis = {"markers": []}
        
        try:
            inflection_analysis = await self._inflection_agent(video_file, metadata)
            print("Inflection analysis complete")
        except Exception as e:
            print(f"Inflection analysis failed: {str(e)} - continuing with other analyses")
            inflection_analysis = {"markers": []}
        
        try:
            content_analysis = await self._content_agent(
                video_file, 
                supporting_text, 
                metadata
            )
            print("Content analysis complete")
        except Exception as e:
            print(f"Content analysis failed: {str(e)} - continuing with other analyses")
            content_analysis = {"markers": []}
        
        # Aggregate results (use empty dicts if analysis failed)
        result = self._aggregate_results(
            speech_analysis or {"markers": [], "transcript": "", "wpm": 0, "filler_words": [], "pauses": []},
            gesture_analysis or {"markers": []},
            inflection_analysis or {"markers": []},
            content_analysis or {"markers": []},
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
                            types.Part.from_text(text=prompt)
                        ]
                    )
                ]
            )
            
            # Parse JSON from response
            parsed = self._parse_json_response(response.text)
            # Log transcript extraction for debugging
            transcript = parsed.get("transcript", "")
            print(f"[Speech Agent] Extracted transcript length: {len(transcript) if transcript else 0} characters")
            if not transcript:
                print(f"[Speech Agent] WARNING: No transcript found in response. Response keys: {list(parsed.keys())}")
                print(f"[Speech Agent] Response preview: {str(parsed)[:200]}")
            return parsed
        except Exception as e:
            print(f"Error in _speech_agent: {str(e)}")
            import traceback
            traceback.print_exc()
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
                            types.Part.from_text(text=prompt)
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
                            types.Part.from_text(text=prompt)
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
        """Analyze content structure, topic alignment, and verify content against document"""
        
        if supporting_text:
            # Use full document text for verification
            supporting_context = f"""

VERIFICATION DOCUMENT (Use this to verify the video content):
{supporting_text}

Your task is to VERIFY that the video presentation accurately reflects the content in the document above. Compare what is said/shown in the video against the document content."""
            
            verification_instructions = """3. CONTENT VERIFICATION AGAINST DOCUMENT (CRITICAL):
   - Verify that key points from the document are covered in the video
   - Check if facts, statistics, or data mentioned in the document match what's presented
   - Identify any missing important information from the document that should be in the video
   - Flag any contradictions between the document and what's presented
   - Verify that the video structure aligns with the document's structure
   - Check if all main topics from the document are addressed
   
   FACT ACCURACY VERIFICATION (REQUIRED):
   - If the user says something that does NOT loosely match the facts in the document, you MUST create a marker for it
   - Fact mismatches will result in points being deducted from the content score
   - Use higher severity (3-5) for significant fact errors or contradictions
   - Use moderate severity (2-3) for minor fact inaccuracies or loose mismatches
   - Examples of fact mismatches: incorrect numbers/statistics, wrong dates, misstated names or concepts, contradictory statements
   - Be thorough: compare ALL factual claims in the video against the document
   
4. Key points are well explained
5. Transitions between topics
6. Visual aids usage (if any)

IMPORTANT: Since a verification document was provided, pay special attention to content accuracy and completeness. Flag any discrepancies or missing information. FACT MISMATCHES WITH THE DOCUMENT MUST BE FLAGGED WITH MARKERS - these will reduce the content score."""
        else:
            supporting_context = ""
            verification_instructions = """3. Key points are well explained
4. Transitions between topics
5. Visual aids usage (if any)"""
        
        prompt = f"""You are a content structure coach analyzing a presentation video.

Video duration: {metadata['duration']:.1f} seconds
{supporting_context}

Watch and listen to the entire video to analyze content quality:
1. Clear introduction and conclusion
2. Logical flow and structure
{verification_instructions}

For each issue found, provide:
- Timestamp range (start and end in seconds)
- Specific issue label (be specific about verification issues if document was provided)
- Severity (1-5, where higher severity = more points deducted):
  * Severity 1-2: Minor issues (e.g., small fact inaccuracies, minor omissions)
  * Severity 3: Moderate issues (e.g., significant fact mismatches, missing key points)
  * Severity 4-5: Major issues (e.g., major contradictions, critical fact errors)
- Brief, encouraging coaching tip

{"IMPORTANT: For fact mismatches with the document, use severity 3-5. Each fact mismatch marker will deduct points from the content score." if supporting_text else ""}

Output as JSON:
{{
  "markers": [
    {{
      "start": 0.0,
      "end": 15.0,
      "label": "Weak introduction",
      "severity": 2,
      "feedback": "Start with a clear hook or thesis statement to engage your audience."
    }}{f""",
    {{
      "start": 45.0,
      "end": 50.0,
      "label": "Fact mismatch: Document states 2024, but video says 2023",
      "severity": 4,
      "feedback": "Verify all facts against your source document to ensure accuracy."
    }}""" if supporting_text else ""}
  ]
}}
"""
        
        # Retry logic for 503 errors (service overloaded)
        max_retries = 3
        retry_delay = 5  # seconds
        
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=[
                        types.Content(
                            role="user",
                            parts=[
                                types.Part.from_uri(file_uri=video_file.uri, mime_type=video_file.mime_type),
                                types.Part.from_text(text=prompt)
                            ]
                        )
                    ]
                )
                
                return self._parse_json_response(response.text)
            except Exception as e:
                error_str = str(e)
                # Check if it's a 503 error (service overloaded) and we have retries left
                if "503" in error_str or "UNAVAILABLE" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (attempt + 1)  # Exponential backoff
                        print(f"Error in _content_agent (attempt {attempt + 1}/{max_retries}): {error_str}")
                        print(f"Retrying in {wait_time} seconds...")
                        import time
                        time.sleep(wait_time)
                        continue
                    else:
                        print(f"Error in _content_agent after {max_retries} attempts: {error_str}")
                        raise ValueError(f"Content analysis failed after {max_retries} retries: The API service is temporarily overloaded. Please try again in a few moments.")
                else:
                    # For other errors, raise immediately
                    print(f"Error in _content_agent: {error_str}")
                    raise ValueError(f"Content analysis failed: {error_str}")
        
        # Should not reach here, but just in case
        raise ValueError("Content analysis failed: Unknown error")
    
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
            parsed = json.loads(text.strip())
            # Ensure transcript is preserved if present
            if "transcript" in parsed:
                return parsed
            # If parsing succeeded but no transcript field, check if it's just markers
            if "markers" in parsed:
                return parsed
            # If it's just a transcript string, wrap it
            if isinstance(parsed, str):
                return {"transcript": parsed, "markers": []}
            return parsed
        except json.JSONDecodeError as e:
            # Fallback: return empty markers but log the error
            print(f"[AIAnalyzer] JSON decode error: {str(e)}")
            print(f"[AIAnalyzer] Failed to parse text (first 500 chars): {text[:500]}")
            # Fallback: return empty markers
            return {"markers": [], "transcript": ""}
    
    
    def _extract_document_text(self, file_path: str) -> str:
        """Extract text from PDF, DOCX, or TXT"""
        path = Path(file_path)
        
        if path.suffix == '.txt':
            return path.read_text(encoding='utf-8')
        
        elif path.suffix == '.pdf':
            reader = PdfReader(file_path)
            return "\n".join(page.extract_text() for page in reader.pages)
        
        elif path.suffix == '.docx':
            doc = Document(file_path)
            return "\n".join(para.text for para in doc.paragraphs)
        
        return ""
    
    async def generate_follow_up_questions(self, transcript: str) -> list:
        """Generate follow-up questions based on the presentation transcript"""
        
        print(f"[AIAnalyzer] generate_follow_up_questions called with transcript length: {len(transcript) if transcript else 0}")
        
        if not transcript or len(transcript.strip()) == 0:
            print("[AIAnalyzer] Empty transcript, returning empty list")
            return []
        
        # Truncate transcript if too long (Gemini has token limits)
        max_transcript_length = 50000  # Safe limit for Gemini
        if len(transcript) > max_transcript_length:
            print(f"[AIAnalyzer] Transcript too long ({len(transcript)} chars), truncating to {max_transcript_length}")
            transcript = transcript[:max_transcript_length] + "..."
        
        prompt = f"""Based on the following presentation transcript, generate 5-8 thoughtful follow-up questions that an audience member might ask. These questions should:
1. Show engagement with the content
2. Seek clarification on key points
3. Explore deeper aspects of the topic
4. Be relevant and meaningful
5. Vary in complexity (some simple, some more in-depth)

Presentation Transcript:
{transcript}

Generate the questions as a JSON array of strings. Return ONLY the JSON array, no additional text.

Example format:
[
  "What was the main factor that led to this outcome?",
  "How would you apply this approach in a different context?",
  "Can you elaborate on the methodology you mentioned?"
]"""

        try:
            print(f"[AIAnalyzer] Calling Gemini API for question generation...")
            import time
            start_time = time.time()
            
            response = self.client.models.generate_content(
                model=self.model,
                contents=[prompt]
            )
            
            elapsed_time = time.time() - start_time
            print(f"[AIAnalyzer] Gemini API call completed in {elapsed_time:.2f} seconds")
            
            # Parse JSON from response
            text = response.text.strip()
            print(f"[AIAnalyzer] Raw response length: {len(text)} characters")
            
            # Remove markdown code blocks if present
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            questions = json.loads(text.strip())
            print(f"[AIAnalyzer] Parsed {len(questions) if isinstance(questions, list) else 0} questions")
            
            # Ensure it's a list
            if isinstance(questions, list):
                return questions
            else:
                print("[AIAnalyzer] Response is not a list, returning empty list")
                return []
                
        except Exception as e:
            print(f"[AIAnalyzer] Error generating follow-up questions: {str(e)}")
            import traceback
            traceback.print_exc()
            # Return some generic questions as fallback
            return [
                "Can you provide more details on this topic?",
                "What are the key takeaways from this presentation?",
                "How would you apply this in practice?",
            ]
