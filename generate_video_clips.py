
import os
import subprocess

# Define our clips from the VIDEO_SCRIPT.md!
clips = [
    {
        "name": "opening_dragon",
        "prompt": "Epic cinematic shot of a massive fire-breathing dragon flying over a medieval castle at sunset, dark fantasy style, 4K, ultra-detailed, cinematic lighting",
        "num_frames": 121,
        "fps": 24
    },
    {
        "name": "boss_montage",
        "prompt": "Quick cuts of different fantasy bosses: a stone golem smashing the ground, a skeleton warrior swinging a sword, a dark wizard casting a fire spell, 4K, high detail, cinematic",
        "num_frames": 181,
        "fps": 24
    },
    {
        "name": "gameplay_montage",
        "prompt": "Split screen: left side shows Discord users chatting, right side shows a fantasy character getting stronger, glowing with energy, 4K, stylized, engaging",
        "num_frames": 241,
        "fps": 24
    },
    {
        "name": "features_showcase",
        "prompt": "Montage of features: player using fireball and healing abilities, buying items from a medieval shop, checking leaderboards, turn-based boss fight, 4K, cinematic",
        "num_frames": 241,
        "fps": 24
    },
    {
        "name": "call_to_action",
        "prompt": "Epic fantasy background with bold, clear text overlay: 'INVITE NOW' and bot invite link, 4K, high contrast",
        "num_frames": 121,
        "fps": 24
    }
]

# Configuration for Wan2.1
WAN_DIR = "/Users/ali_sadik/Wan2.1"
CKPT_DIR = "./checkpoints/Wan2.1-T2V-14B"  # Update this path once you download the weights!
OUTPUT_DIR = "/Users/ali_sadik/the actual bot/video_clips"

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Run each clip generation!
for clip in clips:
    print(f"\nGenerating clip: {clip['name']}")
    print(f"Prompt: {clip['prompt']}")
    
    # Build the command
    cmd = [
        "python", "generate.py",
        "--task", "t2v-14B",
        "--size", "720x1280",  # 9:16 aspect ratio for TikTok/Reels!
        "--ckpt_dir", CKPT_DIR,
        "--prompt", clip["prompt"],
        "--num_frames", str(clip["num_frames"]),
        "--fps", str(clip["fps"]),
        "--output_dir", os.path.join(OUTPUT_DIR, clip["name"])
    ]
    
    # Run the command in the Wan2.1 directory
    try:
        subprocess.run(cmd, cwd=WAN_DIR, check=True)
        print(f"✅ Successfully generated {clip['name']}!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error generating {clip['name']}: {e}")

print("\nAll clips generated! Now edit them together!")

