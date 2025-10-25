#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"
PYTHON_SCRIPT="$SCRIPT_DIR/generate.py"

function usage() {
    cat <<EOF
Usage: $(basename "$0") <roadmap-id> [options]

Generate embeddings for a roadmap using OpenAI's text-embedding-3-small model.

Arguments:
    roadmap-id              The roadmap ID (e.g., electrician-bc)

Options:
    --model MODEL           OpenAI embedding model (default: text-embedding-3-small)
    --setup                 Set up Python virtual environment and install dependencies
    -h, --help              Show this help message

Examples:
    # First time setup
    $(basename "$0") --setup

    # Generate embeddings for electrician-bc roadmap
    $(basename "$0") electrician-bc

    # Use a different OpenAI model
    $(basename "$0") electrician-bc --model text-embedding-3-large

Requirements:
    - Python 3.8+
    - OPENAI_API_KEY in .env file at project root
    - Source files in src/data/embeddings/<roadmap-id>/ (*.md, *.pdf)

Output:
    Generated index saved to: src/data/embeddings/<roadmap-id>/index/

EOF
    exit 0
}

function setup_venv() {
    echo "Setting up Python virtual environment..."
    
    if [ ! -d "$VENV_DIR" ]; then
        echo "Creating virtual environment at $VENV_DIR..."
        python3 -m venv "$VENV_DIR"
    fi
    
    echo "Activating virtual environment..."
    source "$VENV_DIR/bin/activate"
    
    echo "Installing dependencies from requirements.txt..."
    pip install --upgrade pip --quiet
    pip install -r "$SCRIPT_DIR/requirements.txt" --quiet
    
    echo "✓ Setup complete!"
    echo ""
    echo "Virtual environment created at: $VENV_DIR"
    echo "To activate manually: source $VENV_DIR/bin/activate"
    exit 0
}

function check_venv() {
    if [ ! -d "$VENV_DIR" ]; then
        echo "Error: Virtual environment not found at $VENV_DIR"
        echo ""
        echo "Run setup first:"
        echo "  $(basename "$0") --setup"
        echo ""
        echo "Or manually:"
        echo "  cd $SCRIPT_DIR"
        echo "  python3 -m venv venv"
        echo "  source venv/bin/activate"
        echo "  pip install -r requirements.txt"
        exit 1
    fi
}

# Parse arguments
if [ $# -eq 0 ]; then
    usage
fi

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    usage
fi

if [ "$1" == "--setup" ]; then
    setup_venv
fi

ROADMAP_ID="$1"
shift

# Check virtual environment exists
check_venv

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Run Python script with all remaining arguments
echo "Generating embeddings for roadmap: $ROADMAP_ID"
python "$PYTHON_SCRIPT" --roadmap "$ROADMAP_ID" "$@"
