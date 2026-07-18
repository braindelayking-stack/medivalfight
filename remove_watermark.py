
import subprocess
import os

# Define input and output paths
INPUT_VIDEO = "/Users/ali_sadik/the actual bot/medieval_fight_bot_trailer.mp4"
OUTPUT_VIDEO = "/Users/ali_sadik/the actual bot/medieval_fight_bot_trailer_no_watermark.mp4"

# Common watermark positions and crop options:
# If the watermark is in the bottom right corner (common), we can zoom in slightly to crop it out!
# This command scales the video to 110% and crops to the center 90%, removing edge watermarks
ffmpeg_cmd = [
    "ffmpeg",
    "-i", INPUT_VIDEO,
    "-vf", "scale=iw*1.1:ih*1.1,crop=iw*0.9:ih*0.9",  # Zoom 10% and crop center
    "-c:a", "copy",  # Keep audio the same
    OUTPUT_VIDEO
]

print("Removing watermark with FFmpeg...")
try:
    subprocess.run(ffmpeg_cmd, check=True)
    print(f"✅ Watermark removed! Saved to {OUTPUT_VIDEO}")
except FileNotFoundError:
    print("❌ FFmpeg not found! Install FFmpeg first:")
    print("   macOS: brew install ffmpeg")
    print("   Windows: Download from https://ffmpeg.org/")
except subprocess.CalledProcessError as e:
    print(f"❌ Error: {e}")

