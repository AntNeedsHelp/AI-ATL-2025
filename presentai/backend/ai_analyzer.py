import os
import asyncio
import logging
from pathlib import Path
from typing import Dict, Optional
import json
import time

from google import adk, genai
from google.genai import types
from google.adk.agents.llm_agent import LlmAgent
from google.adk import Runner
from google.adk.sessions import InMemorySessionService

# Setup logger
logger = logging.getLogger(__name__)

class AIAnalyzer:
    def __init__(self):
        # Initialize Gemini client for file uploads
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-2.5-pro"
        
        # Create ADK model (uses GOOGLE_API_KEY from environment)
        self.model = adk.models.Gemini(model=self.model_name)
        
        # Session service will be created per analysis to avoid conflicts
        # Initialize specialized agents
        self._initialize_agents()
    
    def _initialize_agents(self):
        """Initialize ADK agents for different analysis types"""
        
        # Speech Analysis Agent
        self.speech_agent = LlmAgent(
            name="speech_analyst",
            description="Analyzes speech clarity, transcription, WPM, filler words, and pauses",
            model=self.model,
            instruction="""You are a speech clarity coach analyzing a presentation video.

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

Output as JSON with this structure:
{
  "transcript": "full text...",
  "wpm": 150,
  "markers": [
    {
      "start": 12.5,
      "end": 13.0,
      "label": "Filler word: 'um'",
      "severity": 2,
      "feedback": "Take a breath instead of using filler words."
    }
  ]
}"""
        )
        
        # Gesture Analysis Agent
        self.gesture_agent = LlmAgent(
            name="gesture_analyst",
            description="Analyzes body language, gestures, posture, and eye contact",
            model=self.model,
            instruction="""You are a body language coach analyzing a presentation video.

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
}"""
        )
        
        # Inflection Analysis Agent
        self.inflection_agent = LlmAgent(
            name="inflection_analyst",
            description="Analyzes vocal inflection, pitch variation, tone, and energy",
            model=self.model,
            instruction="""You are a vocal delivery coach analyzing a presentation video.

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
{
  "markers": [
    {
      "start": 28.0,
      "end": 35.0,
      "label": "Monotone delivery",
      "severity": 3,
      "feedback": "Vary your pitch to emphasize key ideas and maintain audience interest."
    }
  ]
}"""
        )
        
        # Content Analysis Agent
        self.content_agent = LlmAgent(
            name="content_analyst",
            description="Analyzes content structure, topic alignment, and clarity",
            model=self.model,
            instruction="""You are a content structure coach analyzing a presentation video.

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
{
  "markers": [
    {
      "start": 0.0,
      "end": 15.0,
      "label": "Weak introduction",
      "severity": 2,
      "feedback": "Start with a clear hook or thesis statement to engage your audience."
    }
  ]
}"""
        )
        
        # Runners will be created per-analysis with specific agents
    
    async def analyze(
        self,
        video_path: str,
        supporting_doc_path: Optional[str],
        metadata: Dict
    ) -> Dict:
        """Main analysis pipeline using ADK agents"""
        
        # Load supporting document if provided
        supporting_text = None
        if supporting_doc_path:
            supporting_text = self._extract_document_text(supporting_doc_path)
        
        # Upload video file directly to Google Gemini
        try:
            video_file = self.client.files.upload(file=video_path)
        except Exception as e:
            raise ValueError(f"Failed to upload video file: {str(e)}")
        
        # Wait for file to be processed
        video_file = await self._wait_for_file_processing(video_file)
        print(f"File ready! URI: {video_file.uri}")
        
        # Prepare video content for agents
        video_content = types.Part.from_uri(file_uri=video_file.uri, mime_type=video_file.mime_type)
        
        # Build context with metadata
        context_parts = [
            video_content,
            types.Part(text=f"Video duration: {metadata['duration']:.1f} seconds")
        ]
        
        if supporting_text:
            context_parts.append(types.Part(text=f"\nSupporting document:\n{supporting_text[:2000]}"))
        
        # Create a new session service for this analysis to avoid conflicts
        session_service = InMemorySessionService()
        user_id = "presentai_user"
        
        # Create message content from parts
        message_content = types.Content(role="user", parts=context_parts)
        
        # Run specialized agents using ADK Runner
        # Note: Not specifying session_id - Runner will auto-create sessions
        print("Starting speech analysis with ADK agent...")
        try:
            speech_runner = Runner(app_name="presentai_speech", agent=self.speech_agent, session_service=session_service)
            speech_events = []
            async for event in speech_runner.run_async(
                user_id=user_id,
                new_message=message_content
            ):
                speech_events.append(event)
                print(f"Speech event received: {type(event).__name__}, final: {getattr(event, 'is_final_response', lambda: False)()}")
            speech_analysis = self._parse_agent_response_from_events(speech_events)
            print(f"Speech analysis complete: {len(speech_events)} events, text length: {len(str(speech_analysis))}")
        except Exception as e:
            error_msg = f"Error in speech analysis: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise ValueError(f"Speech analysis failed: {str(e)}")
        
        print("Starting gesture analysis with ADK agent...")
        try:
            gesture_runner = Runner(app_name="presentai_gesture", agent=self.gesture_agent, session_service=session_service)
            gesture_events = []
            async for event in gesture_runner.run_async(
                user_id=user_id,
                new_message=message_content
            ):
                gesture_events.append(event)
            gesture_analysis = self._parse_agent_response_from_events(gesture_events)
        except Exception as e:
            error_msg = f"Error in gesture analysis: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise ValueError(f"Gesture analysis failed: {str(e)}")
        
        print("Starting inflection analysis with ADK agent...")
        try:
            inflection_runner = Runner(app_name="presentai_inflection", agent=self.inflection_agent, session_service=session_service)
            inflection_events = []
            async for event in inflection_runner.run_async(
                user_id=user_id,
                new_message=message_content
            ):
                inflection_events.append(event)
            inflection_analysis = self._parse_agent_response_from_events(inflection_events)
        except Exception as e:
            error_msg = f"Error in inflection analysis: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise ValueError(f"Inflection analysis failed: {str(e)}")
        
        print("Starting content analysis with ADK agent...")
        try:
            content_context = context_parts.copy()
            if supporting_text:
                content_context.append(types.Part(text=f"\nSupporting document context:\n{supporting_text[:2000]}"))
            content_message = types.Content(role="user", parts=content_context)
            
            content_runner = Runner(app_name="presentai_content", agent=self.content_agent, session_service=session_service)
            content_events = []
            async for event in content_runner.run_async(
                user_id=user_id,
                new_message=content_message
            ):
                content_events.append(event)
            content_analysis = self._parse_agent_response_from_events(content_events)
        except Exception as e:
            error_msg = f"Error in content analysis: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise ValueError(f"Content analysis failed: {str(e)}")
        
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
    
    async def _wait_for_file_processing(self, video_file, max_wait: int = 300) -> types.File:
        """Wait for video file to be processed by Google Gemini"""
        wait_time = 0
        
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
            await asyncio.sleep(2)
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
        
        return video_file
    
    def _parse_agent_response_from_events(self, events) -> Dict:
        """Parse response from ADK agent events"""
        # Extract text from events - ADK events have content attribute
        text = ""
        
        # Look for final response events first
        for event in events:
            if hasattr(event, 'is_final_response') and event.is_final_response():
                if hasattr(event, 'content') and event.content:
                    # Extract text from Content object
                    if hasattr(event.content, 'parts'):
                        for part in event.content.parts:
                            if hasattr(part, 'text'):
                                text += part.text
        
        # If no final response, get text from all events
        if not text:
            for event in events:
                if hasattr(event, 'content') and event.content:
                    if hasattr(event.content, 'parts'):
                        for part in event.content.parts:
                            if hasattr(part, 'text'):
                                text += part.text
                    elif hasattr(event.content, 'text'):
                        text += event.content.text
        
        # Fallback: try direct text attribute
        if not text:
            for event in events:
                if hasattr(event, 'text') and event.text:
                    text += event.text
        
        # Last resort: convert event to string
        if not text and events:
            text = str(events[-1])
            print(f"Warning: Using fallback text extraction: {text[:200]}")
        
        if not text:
            print("Error: No text found in events")
            return {"markers": []}
        
        return self._parse_json_response(text)
    
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
        all_markers.sort(key=lambda x: x.get("start", 0))
        
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
                "analyzed_by": "Google ADK with Gemini 2.5 Pro"
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
            print(f"Failed to parse JSON from response: {text[:200]}")
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
