
# Wan Video Setup Guide for Medieval Fight Bot Video

## What You Need
- A computer with a **NVIDIA GPU with at least 24GB VRAM** (for good quality; 48GB+ recommended)
- Git installed
- Python 3.10+ installed
- Hugging Face account (to download model weights)

---

## Step 1: Clone the Wan Video Repo
First, let's clone the latest Wan Video repo (Wan 2.1 is the best version as of July 2026)!

```bash
git clone https://github.com/Wan-Video/Wan2.1.git
cd Wan2.1
```

## Step 2: Install Dependencies
It's recommended to use a virtual environment!

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install PyTorch (with CUDA support - critical for GPU acceleration!)
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

# Install other dependencies
pip install -r requirements.txt
```

## Step 3: Download Model Weights
Go to the Wan Video Hugging Face page and download the model weights! The main model is here:
https://huggingface.co/Wan-Video/Wan2.1-T2V-14B

You can use `huggingface_hub` to download it easily:
```bash
pip install huggingface_hub
huggingface-cli download Wan-Video/Wan2.1-T2V-14B --local-dir ./checkpoints/Wan2.1-T2V-14B --local-dir-use-symlinks False
```

## Step 4: Generate Video Clips Using Our Script!
Use the visual prompts from `VIDEO_SCRIPT.md` to generate each clip! Here's an example command:

```bash
# Generate the opening dragon shot!
python inference.py \
  --prompt "Epic cinematic shot of a massive fire-breathing dragon flying over a medieval castle at sunset, dark fantasy style, 4K, ultra-detailed, cinematic lighting" \
  --model_path ./checkpoints/Wan2.1-T2V-14B \
  --output_dir ./output_clips \
  --num_frames 121 \
  --fps 24
```

## Step 5: Edit the Video Together
Once you have all your clips:
1. Use a free editor like CapCut or DaVinci Resolve
2. Add the AI voiceover (use ElevenLabs or similar)
3. Add hard-coded subtitles
4. Add royalty-free epic fantasy music
5. Export in 9:16 aspect ratio for TikTok/Reels/YouTube Shorts

---

## Quick Tips
- If you don't have a powerful GPU, you can use a cloud GPU service like:
  - Lambda Labs
  - RunPod
  - Vast.ai
- Start with shorter clips first to test!
- Experiment with different prompts to get the exact visuals you want!

Good luck - can't wait to see your viral video! 🚀
