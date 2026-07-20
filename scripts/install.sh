#!/bin/sh
# Aether CLI installer
# Usage: curl -fsSL https://raw.githubusercontent.com/aether-one/aether/main/scripts/install.sh | sh
set -e

REPO="aether-one/aether"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="aether"

# Colors (only if terminal supports it)
if [ -t 1 ]; then
  BOLD='\033[1m'
  DIM='\033[2m'
  CYAN='\033[36m'
  GREEN='\033[32m'
  RED='\033[31m'
  YELLOW='\033[33m'
  RESET='\033[0m'
else
  BOLD='' DIM='' CYAN='' GREEN='' RED='' YELLOW='' RESET=''
fi

info() { printf "${CYAN}>${RESET} %s\n" "$1"; }
success() { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }
error() { printf "${RED}✗${RESET} %s\n" "$1" >&2; exit 1; }

# Detect OS
detect_os() {
  case "$(uname -s)" in
    Linux*)  echo "linux" ;;
    Darwin*) echo "macos" ;;
    *)       error "Unsupported operating system: $(uname -s)" ;;
  esac
}

# Detect Architecture
detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)  echo "x64" ;;
    arm64|aarch64) echo "arm64" ;;
    *)             error "Unsupported architecture: $(uname -m)" ;;
  esac
}

# Get latest version
get_latest_version() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/'
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/'
  else
    error "Neither curl nor wget found. Please install one of them."
  fi
}

# Download file
download() {
  url="$1"
  output="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$output" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$output" "$url"
  else
    return 1
  fi
}

# Main
main() {
  printf "\n${BOLD}  Aether CLI Installer${RESET}\n\n"

  OS=$(detect_os)
  ARCH=$(detect_arch)
  info "Detected platform: ${OS}-${ARCH}"

  # Get version
  VERSION=$(get_latest_version)
  if [ -z "$VERSION" ]; then
    error "Could not determine latest version. Check your internet connection."
  fi
  info "Latest version: ${VERSION}"

  # Build download URL
  ASSET_NAME="aether-${OS}-${ARCH}"
  DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET_NAME}"
  info "Downloading ${ASSET_NAME}..."

  # Download to temp
  TMP_DIR=$(mktemp -d)
  TMP_FILE="${TMP_DIR}/${BINARY_NAME}"
  download "$DOWNLOAD_URL" "$TMP_FILE" || error "Download failed. Asset may not exist for your platform: ${OS}-${ARCH}"

  # Make executable
  chmod +x "$TMP_FILE"

  # Verify it runs
  if ! "$TMP_FILE" --version >/dev/null 2>&1; then
    rm -rf "$TMP_DIR"
    error "Downloaded binary failed to execute. It may be incompatible with your system."
  fi

  # Install
  if [ -w "$INSTALL_DIR" ]; then
    mv "$TMP_FILE" "${INSTALL_DIR}/${BINARY_NAME}"
  else
    info "Installing to ${INSTALL_DIR} (requires sudo)..."
    sudo mv "$TMP_FILE" "${INSTALL_DIR}/${BINARY_NAME}"
  fi

  # Cleanup
  rm -rf "$TMP_DIR"

  # Verify installation
  INSTALLED_VERSION=$("${INSTALL_DIR}/${BINARY_NAME}" --version 2>/dev/null || echo "unknown")
  
  printf "\n${GREEN}${BOLD}  ✓ Aether CLI installed successfully!${RESET}\n\n"
  printf "  ${DIM}Version:  ${RESET}%s\n" "$INSTALLED_VERSION"
  printf "  ${DIM}Location: ${RESET}%s\n" "${INSTALL_DIR}/${BINARY_NAME}"
  printf "\n  Run ${CYAN}aether${RESET} to get started.\n\n"
}

main
