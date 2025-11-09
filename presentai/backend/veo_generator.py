import os
import time
import json
import subprocess
from pathlib import Path
from typing import Dict, Optional
from google import genai
from google.genai import types

class VeoGenerator:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Veo 3.1 generator with API key"""
        if not api_key:
            api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        
        self.client = genai.Client(api_key=api_key)
    
    def get_video_duration(self, video_path: str) -> float:
        """Get video duration in seconds using ffprobe"""
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            video_path
        ]
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        probe_data = json.loads(result.stdout)
        duration = float(probe_data['format'].get('duration', 0))
        return duration
    
    def extract_frame(self, video_path: str, timestamp: float, output_path: str, video_duration: float = None):
        """Extract a single frame from video at specific timestamp as PNG"""
        # Get video duration if not provided
        if video_duration is None:
            video_duration = self.get_video_duration(video_path)
        
        # Clamp timestamp to be within video bounds
        # Use a small offset (0.1s) before the end to avoid edge cases
        max_timestamp = max(0.0, video_duration - 0.1)
        clamped_timestamp = max(0.0, min(timestamp, max_timestamp))
        
        if timestamp != clamped_timestamp:
            print(f"[Veo] Clamped timestamp from {timestamp}s to {clamped_timestamp}s (video duration: {video_duration}s)")
        
        # Ensure output is PNG format
        output_path_str = str(output_path)
        if not output_path_str.lower().endswith('.png'):
            output_path_str = output_path_str.rsplit('.', 1)[0] + '.png'
        
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-ss', str(clamped_timestamp),
            '-vframes', '1',
            '-f', 'image2',  # Force image format
            '-pix_fmt', 'rgb24',  # Ensure RGB format
            '-y',  # Overwrite
            output_path_str
        ]
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        
        # Verify the file was created
        if not Path(output_path_str).exists():
            raise Exception(f"Failed to extract frame to {output_path_str}")
        
        return output_path_str
    
    def generate_gesture_video(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        feedback: str,
        output_path: str,
        job_id: str,
        marker_index: int
    ) -> bool:
        """Generate improvement video using Veo 3.1"""
        try:
            # Get video duration first to ensure we don't exceed it
            video_duration = self.get_video_duration(video_path)
            print(f"[Veo] Video duration: {video_duration}s")
            
            # Clamp start_time to be within video bounds
            start_time = max(0.0, min(start_time, video_duration - 0.1))
            
            # Calculate end time (max 5 seconds from start, but not exceeding video duration)
            duration = end_time - start_time
            if duration > 5.0:
                end_time = start_time + 5.0
            
            # Clamp end_time to be within video bounds (with small buffer to avoid edge cases)
            max_end_time = max(start_time + 0.5, video_duration - 0.1)  # At least 0.5s duration, or video end - 0.1s
            end_time = min(end_time, max_end_time)
            
            # Ensure we have a valid duration (at least 0.5 seconds)
            if end_time - start_time < 0.5:
                print(f"[Veo] Warning: Marker {marker_index} duration too short ({end_time - start_time}s). Adjusting end_time.")
                end_time = min(start_time + 0.5, video_duration - 0.1)
            
            print(f"[Veo] Using time range for marker {marker_index}: {start_time}s to {end_time}s (duration: {end_time - start_time}s)")
            
            # Create output directory
            output_dir = Path(output_path).parent
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Extract frames as PNG (pass video_duration to avoid re-probing)
            first_frame_path = output_dir / f"frame_start_{marker_index}.png"
            last_frame_path = output_dir / f"frame_end_{marker_index}.png"
            
            print(f"[Veo] Extracting frames for marker {marker_index}: {start_time}s to {end_time}s")
            first_frame_path = Path(self.extract_frame(video_path, start_time, str(first_frame_path), video_duration))
            last_frame_path = Path(self.extract_frame(video_path, end_time, str(last_frame_path), video_duration))
            
            # Create prompt based on feedback - focus on demonstrating correct behavior
            prompt = (
                "Demonstrate the CORRECT way to present with improved body language. "
                "Show a presenter who is confident, engaging, and knowledgeable. "
                f"Specifically address this issue: {feedback} "
                "The video should visually demonstrate the proper technique - show open, relaxed gestures, "
                "confident posture, and engaging movements. This is a demonstration video that viewers "
                "can watch and emulate. Show the corrected behavior clearly and professionally, not "
                "conversational but instructional - what to do instead of the problem."
            )
            
            # Read PNG files as binary data (exact pattern from user's working code)
            with open(str(first_frame_path), "rb") as f:
                first_image = f.read()
            
            with open(str(last_frame_path), "rb") as f:
                last_image = f.read()
            
            # Create Part objects from PNG bytes and use as_image() method
            first_image = types.Part.from_bytes(data=first_image, mime_type="image/png").as_image()
            last_image = types.Part.from_bytes(data=last_image, mime_type="image/png").as_image()
            
            print(f"[Veo] Generating video for marker {marker_index}...")
            print(f"[Veo] Created Part objects: first={type(first_image)}, last={type(last_image)}")
            
            # Generate video using Part objects with as_image() method
            try:
                operation = self.client.models.generate_videos(
                    model="veo-3.1-generate-preview",
                    prompt=prompt,
                    image=first_image,
                    config=types.GenerateVideosConfig(
                        last_frame=last_image
                    ),
                )
            except Exception as api_error:
                error_str = str(api_error)
                # Check for quota/resource exhausted errors
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                    print(f"[Veo] ⚠️ API quota exhausted for marker {marker_index}. Skipping remaining videos.")
                    raise Exception("QUOTA_EXHAUSTED")  # Special exception to signal quota issue
                # Re-raise other errors
                raise
            
            # Poll until complete
            max_poll_time = 600  # 10 minutes max
            poll_start = time.time()
            while not operation.done:
                elapsed = time.time() - poll_start
                if elapsed > max_poll_time:
                    raise TimeoutError(f"Video generation timed out after {max_poll_time} seconds")
                print(f"[Veo] Waiting for video generation to complete for marker {marker_index}... (elapsed: {elapsed:.0f}s)")
                time.sleep(10)
                try:
                    operation = self.client.operations.get(operation)
                except Exception as poll_error:
                    error_str = str(poll_error)
                    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                        print(f"[Veo] ⚠️ API quota exhausted during polling for marker {marker_index}.")
                        raise Exception("QUOTA_EXHAUSTED")
                    raise
            
            # Check if operation was successful
            if hasattr(operation, 'error') and operation.error:
                error_str = str(operation.error)
                # Check for quota errors in operation response
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
                    print(f"[Veo] ⚠️ API quota exhausted in operation response for marker {marker_index}.")
                    raise Exception("QUOTA_EXHAUSTED")
                raise Exception(f"Video generation failed: {operation.error}")
            
            # Download and save video
            if not hasattr(operation, 'response') or not operation.response:
                raise Exception("No response from video generation operation")
            
            if not hasattr(operation.response, 'generated_videos') or not operation.response.generated_videos:
                raise Exception("No generated videos in response")
            
            video = operation.response.generated_videos[0]
            
            if not hasattr(video, 'video') or not video.video:
                raise Exception("No video file in generated video response")
            
            print(f"[Veo] Downloading video file for marker {marker_index}...")
            print(f"[Veo] Video file object: {type(video.video)}, attributes: {dir(video.video)}")
            
            # Follow the exact pattern from user's working code
            # Step 1: Download the file (this prepares it)
            try:
                self.client.files.download(file=video.video)
                print(f"[Veo] Download call completed")
            except Exception as download_err:
                print(f"[Veo] Warning: download() call failed: {str(download_err)}")
                # Continue anyway - save might still work
            
            # Step 2: Save to output path
            print(f"[Veo] Saving video to {output_path}...")
            try:
                # Check if save method exists
                if hasattr(video.video, 'save'):
                    video.video.save(output_path)
                    print(f"[Veo] Save method called successfully")
                else:
                    raise Exception("video.video object has no 'save' method")
            except Exception as save_err:
                print(f"[Veo] Error saving video: {str(save_err)}")
                print(f"[Veo] Video object type: {type(video.video)}")
                print(f"[Veo] Video object attributes: {[attr for attr in dir(video.video) if not attr.startswith('_')]}")
                raise Exception(f"Failed to save video file: {str(save_err)}")
            
            # Verify file was created
            output_file = Path(output_path)
            if not output_file.exists():
                raise Exception(f"Video file was not created at {output_path}")
            
            file_size = output_file.stat().st_size
            if file_size == 0:
                raise Exception(f"Video file was created but is empty (0 bytes)")
            
            print(f"[Veo] ✓ Generated video saved to {output_path} ({file_size} bytes)")
            
            # Clean up frame files
            first_frame_path.unlink(missing_ok=True)
            last_frame_path.unlink(missing_ok=True)
            
            return True
            
        except Exception as e:
            print(f"[Veo] Error generating video for marker {marker_index}: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def generate_gesture_videos(
        self,
        video_path: str,
        all_markers: list,
        job_dir: Path
    ) -> Dict:
        """Generate videos for all gesture markers and update markers with video URLs"""
        videos_dir = job_dir / "gesture_videos"
        videos_dir.mkdir(exist_ok=True)
        
        results = {}
        gesture_count = 0
        
        # Find all gesture markers and generate videos
        # Use enumerate to track original index for URL mapping
        for marker_idx, marker in enumerate(all_markers):
            if marker.get("category") != "gestures":
                continue
            
            start_time = marker.get("start", 0)
            end_time = marker.get("end", start_time + 5)
            feedback = marker.get("feedback", "Improve body language and gestures.")
            
            video_filename = f"gesture_{gesture_count}.mp4"
            video_path_output = videos_dir / video_filename
            
            success = self.generate_gesture_video(
                video_path=video_path,
                start_time=start_time,
                end_time=end_time,
                feedback=feedback,
                output_path=str(video_path_output),
                job_id=job_dir.name,
                marker_index=gesture_count
            )
            
            if success:
                # Verify file exists before setting URL
                if video_path_output.exists():
                    # Store video URL in marker using gesture_count as the video index
                    marker["video_url"] = f"/api/gesture-video/{job_dir.name}/{gesture_count}"
                    results[gesture_count] = {
                        "success": True,
                        "path": str(video_path_output),
                        "url": marker["video_url"],
                        "marker_index": marker_idx
                    }
                    print(f"[Veo] Successfully set video_url for marker at {start_time}s: {marker['video_url']}")
                else:
                    print(f"[Veo] WARNING: Video file not found after generation: {video_path_output}")
                    # Don't set video_url if file doesn't exist
                    if "video_url" in marker:
                        del marker["video_url"]
                    results[gesture_count] = {
                        "success": False,
                        "error": "Video file not found after generation",
                        "marker_index": marker_idx
                    }
            else:
                # Ensure no video_url is set if generation failed
                if "video_url" in marker:
                    del marker["video_url"]
                results[gesture_count] = {
                    "success": False,
                    "error": "Failed to generate video",
                    "marker_index": marker_idx
                }
            
            gesture_count += 1
        
        return results

