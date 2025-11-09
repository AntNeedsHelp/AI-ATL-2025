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
        
        prompt = f"""You are a STRICT speech clarity coach analyzing a presentation video. Be critical and thorough in your evaluation.

Video duration: {metadata['duration']:.1f} seconds

Analyze the speech from the video with MODERATELY STRICT standards and provide:
1. Full transcription of all spoken words
2. Words per minute (WPM) - calculate based on total words and duration
3. Filler words ("um", "uh", "like", "you know", "so", etc.) - flag EVERY instance with timestamps, even single occurrences
4. Awkward pauses (>1.5 seconds) with timestamps - be strict about what constitutes awkward silence
5. Speaking pace issues (too fast: >170 WPM, too slow: <130 WPM) - use tighter thresholds
6. Repetitive phrases or words - flag any repetition
7. Mumbled or unclear speech - flag any unclear words or phrases

GRADING GUIDELINES (BE STRICT):
- Mark issues with HIGHER severity (3-5) more liberally than lenient grading
- Use severity 3-4 for moderate issues that would reduce clarity
- Use severity 5 for issues that significantly impact understanding
- Don't be overly forgiving - professional presentations should be near-perfect
- Flag minor issues that, while small, detract from overall quality

For each issue found, provide:
- Timestamp (start and end in seconds)
- Specific issue label (be specific and detailed)
- Severity (1-5, where 5 is most severe) - USE HIGHER SEVERITIES MORE FREQUENTLY
- Brief, constructive coaching tip

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
        
        prompt = f"""You are a MODERATELY STRICT body language coach analyzing a presentation video. Be critical and hold the presenter to high professional standards.

Video duration: {metadata['duration']:.1f} seconds

Watch the entire video with STRICT evaluation standards and analyze the presenter's:
1. Posture (slouching, leaning, fidgeting, lack of confidence, any deviation from ideal upright stance)
2. Hand gestures (stiff, repetitive, distracting, too few gestures, inappropriate gestures, closed gestures)
3. Eye contact and gaze direction (looking away, lack of eye contact, staring at notes/screen, unfocused gaze)
4. Facial expressions (monotone, lack of emotion, inappropriate expressions, disengaged appearance)
5. Movement and positioning (excessive pacing, staying in one spot too long, awkward positioning)
6. Nervous habits (touching face, playing with objects, shifting weight excessively, closed body language)

GRADING GUIDELINES (BE STRICT):
- Mark issues with HIGHER severity (3-5) more liberally - professional presenters should excel
- Use severity 3-4 for issues that detract from professional appearance
- Use severity 5 for issues that significantly undermine credibility or engagement
- Flag subtle issues that indicate lack of confidence or preparation
- Don't overlook minor problems - they add up to reduce overall impact

For each issue found, provide:
- Timestamp range (start and end in seconds)
- Specific issue label (be detailed and specific about what's wrong)
- Severity (1-5) - USE HIGHER SEVERITIES MORE FREQUENTLY, be less forgiving
- Brief, constructive coaching tip

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
        
        prompt = f"""You are a MODERATELY STRICT vocal delivery coach analyzing a presentation video. Be critical and hold the presenter to professional vocal standards.

Video duration: {metadata['duration']:.1f} seconds

Listen to the audio in the video with STRICT evaluation and analyze vocal delivery:
1. Pitch variation (monotone sections, lack of variation, insufficient emphasis through pitch changes)
2. Volume consistency (too quiet, too loud, inconsistent volume, sudden volume changes, trailing off)
3. Emphasis on key points (lack of emphasis, missed opportunities to emphasize, weak emphasis)
4. Energy and enthusiasm in voice (low energy, lack of enthusiasm, flat delivery, disengaged tone)
5. Tone and expression (monotone, inappropriate tone, lack of expression, unprofessional tone)
6. Vocal clarity (mumbling, unclear articulation, rushed speech, swallowed words)
7. Pace variation (too consistent pace, lack of strategic pauses, rushed sections, dragging sections)

GRADING GUIDELINES (BE STRICT):
- Mark issues with HIGHER severity (3-5) more liberally - vocal delivery should be engaging
- Use severity 3-4 for issues that reduce engagement or professionalism
- Use severity 5 for issues that significantly impact audience attention or comprehension
- Flag sections where vocal delivery fails to maintain interest
- Don't be lenient - professional presentations require strong vocal presence

For each issue found, provide:
- Timestamp range (start and end in seconds)
- Specific issue label (be detailed about the vocal problem)
- Severity (1-5) - USE HIGHER SEVERITIES MORE FREQUENTLY, be critical
- Brief, constructive coaching tip

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
            
            verification_instructions = """3. CONTENT VERIFICATION AGAINST DOCUMENT (CRITICAL - BE STRICT):
   - Verify that ALL key points from the document are covered in the video - flag ANY missing points
   - Check if facts, statistics, or data mentioned in the document match what's presented EXACTLY
   - Identify ANY missing important information from the document that should be in the video
   - Flag ANY contradictions, inconsistencies, or even loose mismatches between the document and what's presented
   - Verify that the video structure aligns with the document's structure - flag deviations
   - Check if ALL main topics from the document are addressed - flag omissions
   
   FACT ACCURACY VERIFICATION (REQUIRED - BE STRICT):
   - If the user says something that does NOT EXACTLY match the facts in the document, you MUST create a marker for it
   - Be strict: even minor inaccuracies or loose interpretations should be flagged
   - Fact mismatches will result in points being deducted from the content score
   - Use severity 4-5 for ANY fact errors or contradictions (be strict)
   - Use severity 3 for minor inaccuracies or loose mismatches (don't be lenient)
   - Examples of fact mismatches: incorrect numbers/statistics, wrong dates, misstated names or concepts, contradictory statements, approximate values when exact values are in document, paraphrasing that changes meaning
   - Be THOROUGH: compare EVERY factual claim in the video against the document
   - When in doubt, flag it - accuracy is critical
   
4. Key points are well explained (flag weak explanations, unclear points, insufficient detail)
5. Transitions between topics (flag abrupt transitions, poor flow, lack of connections)
6. Visual aids usage (if any) (flag poor usage, missed opportunities, unclear visuals)

CRITICAL: Since a verification document was provided, be STRICT about content accuracy and completeness. Flag ALL discrepancies, missing information, and inaccuracies. FACT MISMATCHES WITH THE DOCUMENT MUST BE FLAGGED WITH MARKERS USING SEVERITY 3-5 - accuracy is non-negotiable and these will significantly reduce the content score."""
        else:
            supporting_context = ""
            verification_instructions = """3. Key points are well explained (flag weak explanations, unclear points, insufficient detail, lack of depth)
4. Transitions between topics (flag abrupt transitions, poor flow, lack of connections, confusing organization)
5. Visual aids usage (if any) (flag poor usage, missed opportunities, unclear visuals, lack of visual support where needed)"""
        
        prompt = f"""You are a STRICT content structure coach analyzing a presentation video. Be critical and hold the presenter to high standards for content quality and structure.

Video duration: {metadata['duration']:.1f} seconds
{supporting_context}

Watch and listen to the entire video with STRICT evaluation standards to analyze content quality:
1. Clear introduction and conclusion (weak hooks, unclear thesis, abrupt endings, missing conclusions)
2. Logical flow and structure (poor transitions, confusing organization, lack of clear structure, jumping between topics)
{verification_instructions}

GRADING GUIDELINES (BE STRICT):
- Mark issues with HIGHER severity (3-5) more liberally - content quality is critical
- Use severity 3-4 for issues that reduce clarity, engagement, or effectiveness
- Use severity 5 for issues that significantly undermine the presentation's purpose
- Flag missing elements, weak explanations, poor organization, and unclear messaging
- Don't overlook structural problems or content gaps - they significantly impact effectiveness
- Be thorough: professional presentations must have excellent content structure

For each issue found, provide:
- Timestamp range (start and end in seconds)
- Specific issue label (be detailed and specific, especially about verification issues if document was provided)
- Severity (1-5, where higher severity = more points deducted) - USE HIGHER SEVERITIES MORE FREQUENTLY:
  * Severity 1-2: Minor issues (rare - only for very minor problems)
  * Severity 3-4: Moderate to significant issues (use frequently for problems that detract from quality)
  * Severity 5: Major issues (use for critical problems that significantly impact effectiveness)
- Brief, constructive coaching tip

{"CRITICAL: For fact mismatches with the document, ALWAYS use severity 3-5. Every fact mismatch MUST be flagged with a marker. Be strict - accuracy is non-negotiable. Each fact mismatch marker will deduct points from the content score." if supporting_text else ""}

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
        
        # Calculate scores (start at 25, deduct based on severity) - STRICT GRADING
        scores = {
            "clarity": 25,
            "gestures": 25,
            "inflection": 25,
            "content": 25
        }
        
        for marker in all_markers:
            category = marker["category"]
            severity = marker.get("severity", 1)
            # STRICT DEDUCTION: severity 1: -1pt, severity 2: -2pts, severity 3: -3pts, severity 4: -4pts, severity 5: -5pts
            # This makes grading more strict - each issue has more impact
            deduction = severity
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
