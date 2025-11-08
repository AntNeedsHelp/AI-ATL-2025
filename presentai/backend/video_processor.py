import subprocess
import json
from pathlib import Path
from typing import Dict

class VideoProcessor:
    def __init__(self, video_path: str, output_dir: Path):
        self.video_path = video_path
        self.output_dir = output_dir
        self.audio_path = output_dir / "audio.wav"
        self.frames_dir = output_dir / "frames"
        
    def preprocess(self) -> Dict:
        """Extract audio, frames, and metadata from video"""
        
        # Get video metadata
        metadata = self._get_metadata()
        
        # Extract audio
        self._extract_audio()
        
        # Extract frames
        self._extract_frames()
        
        return metadata
    
    def _get_metadata(self) -> Dict:
        """Get video duration, fps, and resolution using ffprobe"""
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            self.video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        probe_data = json.loads(result.stdout)
        
        # Find video stream
        video_stream = next(
            (s for s in probe_data['streams'] if s['codec_type'] == 'video'),
            None
        )
        
        if not video_stream:
            raise ValueError("No video stream found")
        
        duration = float(probe_data['format'].get('duration', 0))
        fps = eval(video_stream.get('r_frame_rate', '30/1'))
        width = video_stream.get('width', 0)
        height = video_stream.get('height', 0)
        
        return {
            "duration": duration,
            "fps": fps,
            "resolution": f"{width}x{height}",
            "width": width,
            "height": height
        }
    
    def _extract_audio(self):
        """Extract audio as mono 16kHz WAV"""
        cmd = [
            'ffmpeg',
            '-i', self.video_path,
            '-ac', '1',  # Mono
            '-ar', '16000',  # 16kHz
            '-vn',  # No video
            '-y',  # Overwrite
            str(self.audio_path)
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
    
    def _extract_frames(self):
        """Extract frames at 15 fps"""
        self.frames_dir.mkdir(exist_ok=True)
        
        cmd = [
            'ffmpeg',
            '-i', self.video_path,
            '-vf', 'fps=15',
            '-y',
            str(self.frames_dir / 'frame_%06d.jpg')
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
