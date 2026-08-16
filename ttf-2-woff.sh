#!/bin/zsh

# Script to convert .otf and .ttf to .woff2 for your Astro blog
# Requires: google-woff2 (sudo dnf install google-woff2)

FONT_DIR="./public/fonts"

if [[ ! -d "$FONT_DIR" ]]; then
    echo "Error: Directory $FONT_DIR does not exist."
    exit 1
fi

echo "Starting font conversion in $FONT_DIR..."

# Loop through otf and ttf files
for font in "$FONT_DIR"/*.(otf|ttf); do
    # Check if files exist to avoid errors in empty dirs
    [[ -e "$font" ]] || continue

    echo "Converting $font to woff2..."
    woff2_compress "$font"
done

echo "Done! You can now update your global.css to use format('woff2')."
