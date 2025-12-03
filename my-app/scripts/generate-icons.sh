#!/bin/bash

# Script to generate favicon and icon files from BoxrawLabs.jpg
# This script uses ImageMagick to create multiple icon sizes

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo "Please install it using:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

echo "🎨 Generating favicon and icons from BoxrawLabs.jpg..."

# Create public directory if it doesn't exist
cd "$(dirname "$0")/../public" || exit

# Check if source image exists
if [ ! -f "BoxrawLabs.jpg" ]; then
    echo "❌ BoxrawLabs.jpg not found in public directory"
    exit 1
fi

# Generate favicon.ico (multi-size ICO file: 16x16, 32x32, 48x48)
echo "📦 Creating favicon.ico..."
convert BoxrawLabs.jpg -resize 256x256 \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    -delete 0 -alpha off -colors 256 favicon.ico

# Generate PNG icons
echo "📦 Creating icon-192.png..."
convert BoxrawLabs.jpg -resize 192x192 icon-192.png

echo "📦 Creating icon-512.png..."
convert BoxrawLabs.jpg -resize 512x512 icon-512.png

echo "📦 Creating apple-icon.png..."
convert BoxrawLabs.jpg -resize 180x180 apple-icon.png

echo "✅ All icons generated successfully!"
echo ""
echo "Generated files:"
echo "  - favicon.ico (16x16, 32x32, 48x48)"
echo "  - icon-192.png"
echo "  - icon-512.png"
echo "  - apple-icon.png"
echo ""
echo "Icons are ready for use in your Next.js app!"
