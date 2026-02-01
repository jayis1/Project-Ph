#!/bin/bash
set -e

# Gemini Phone CLI Installer
# Usage: curl -sSL https://raw.githubusercontent.com/jayis1/claude-phone-but-for-Gemini-and-freepbx/main/install.sh | bash

INSTALL_DIR="$HOME/.gemini-phone-cli"
REPO_URL="https://github.com/jayis1/2fast2dumb2fun.git"

echo "🎯 Gemini Phone CLI Installer"
echo ""

# Define sudo command based on user
if [ "$EUID" -eq 0 ]; then
  SUDO=""
else
  if command -v sudo &> /dev/null; then
    SUDO="sudo"
  else
    echo "✗ This script requires root privileges or sudo."
    exit 1
  fi
fi

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin*)
    echo "✓ Detected macOS"
    BIN_DIR="/usr/local/bin"
    PKG_MANAGER="brew"
    ;;
  Linux*)
    echo "✓ Detected Linux"
    BIN_DIR="$HOME/.local/bin"
    mkdir -p "$BIN_DIR"
    # Detect package manager
    if command -v apt-get &> /dev/null; then
      PKG_MANAGER="apt"
    elif command -v dnf &> /dev/null; then
      PKG_MANAGER="dnf"
    elif command -v pacman &> /dev/null; then
      PKG_MANAGER="pacman"
    else
      PKG_MANAGER="unknown"
    fi
    ;;
  *)
    echo "✗ Unsupported OS: $OS"
    exit 1
    ;;
esac

# Function to install Node.js
install_nodejs() {
  echo ""
  echo "📦 Installing Node.js..."
  case "$PKG_MANAGER" in
    apt)
      # Install Node.js 20.x LTS via NodeSource
      if [ -n "$SUDO" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
      else
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      fi
      $SUDO apt-get install -y nodejs sshpass sshfs
      ;;
    dnf)
      $SUDO dnf install -y nodejs npm sshpass fuse-sshfs
      ;;
    pacman)
      $SUDO pacman -S --noconfirm nodejs npm sshpass sshfs
      ;;
    brew)
      brew install node
      ;;
    *)
      echo "✗ Cannot auto-install Node.js on this system"
      echo "  Install manually from: https://nodejs.org/"
      exit 1
      ;;
  esac
  echo "✓ Node.js installed: $(node -v)"
}

# Function to install Docker
install_docker() {
  echo ""
  echo "📦 Installing Docker..."
  case "$PKG_MANAGER" in
    apt)
      # Install Docker via official script
      curl -fsSL https://get.docker.com | $SUDO sh
      $SUDO usermod -aG docker $USER
      echo "⚠️  You may need to log out and back in for Docker group to take effect"
      ;;
    dnf)
      $SUDO dnf install -y docker
      $SUDO systemctl start docker
      $SUDO systemctl enable docker
      $SUDO usermod -aG docker $USER
      ;;
    pacman)
      $SUDO pacman -S --noconfirm docker
      $SUDO systemctl start docker
      $SUDO systemctl enable docker
      $SUDO usermod -aG docker $USER
      ;;
    brew)
      echo "📦 Docker Desktop required on macOS"
      echo "  Install from: https://www.docker.com/products/docker-desktop"
      echo ""
      read -p "Press Enter after installing Docker Desktop..."
      ;;
    *)
      echo "✗ Cannot auto-install Docker on this system"
      echo "  Install from: https://docs.docker.com/engine/install/"
      exit 1
      ;;
  esac
}

# Function to install git
install_git() {
  echo ""
  echo "📦 Installing git..."
  case "$PKG_MANAGER" in
    apt)
      $SUDO apt-get update && $SUDO apt-get install -y git
      ;;
    dnf)
      $SUDO dnf install -y git
      ;;
    pacman)
      $SUDO pacman -S --noconfirm git
      ;;
    brew)
      brew install git
      ;;
    *)
      echo "✗ Cannot auto-install git"
      exit 1
      ;;
  esac
  echo "✓ Git installed"
}

echo ""
echo "Checking prerequisites..."
echo ""

# Check git
if ! command -v git &> /dev/null; then
  echo "✗ Git not found"
  read -p "  Install git automatically? (Y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    install_git
  else
    exit 1
  fi
else
  echo "✓ Git installed"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "✗ Node.js not found"
  read -p "  Install Node.js automatically? (Y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    install_nodejs
  else
    echo "  Install manually from: https://nodejs.org/"
    exit 1
  fi
else
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    echo "✗ Node.js 18+ required (found v$NODE_VERSION)"
    read -p "  Upgrade Node.js automatically? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
      install_nodejs
    else
      exit 1
    fi
  else
    echo "✓ Node.js $(node -v)"
  fi
fi

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "✗ Docker not found"
  read -p "  Install Docker automatically? (Y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    install_docker
  else
    echo "  Install from: https://docs.docker.com/engine/install/"
    exit 1
  fi
else
  echo "✓ Docker installed"
fi

# Check Docker permissions (Linux only)
if [ "$OS" = "Linux" ]; then
  if ! docker info &> /dev/null 2>&1; then
    echo "⚠️  Docker permission issue"
    echo "  Adding user to docker group..."
    $SUDO usermod -aG docker $USER
    echo "  ⚠️  You need to log out and back in, OR run: newgrp docker"
    echo ""
    read -p "Continue anyway? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
      exit 1
    fi
  fi
fi

# Check Gemini CLI (optional - needed for API server)
if ! command -v gemini &> /dev/null; then
  echo "⚠️  Gemini CLI not found (needed for API server only)"
  read -p "  Install Gemini CLI automatically? (Y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "📦 Installing Gemini CLI..."
    if [ -n "$SUDO" ]; then
      $SUDO npm install -g @google/gemini-cli
    else
      npm install -g @google/gemini-cli
    fi
    echo "✓ Gemini CLI installed"
  else
    echo "  Manual install: https://geminicli.com/docs/get-started/installation/"
  fi
else
  echo "✓ Gemini CLI installed"
fi

# Clone or update repository
echo ""
if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull origin main
else
  echo "Cloning Gemini Phone..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install CLI dependencies
echo ""
echo "Installing dependencies..."
cd "$INSTALL_DIR/cli"
npm install --silent --production

# Install API server dependencies
cd "$INSTALL_DIR/gemini-api-server"
npm install --silent --production
cd "$INSTALL_DIR"

# Create symlink
echo ""
if [ -L "$BIN_DIR/gemini-phone" ]; then
  rm "$BIN_DIR/gemini-phone"
fi

if [ "$OS" = "Linux" ]; then
  ln -s "$INSTALL_DIR/cli/bin/gemini-phone.js" "$BIN_DIR/gemini-phone"
  chmod +x "$INSTALL_DIR/cli/bin/gemini-phone.js"
  echo "✓ Installed to: $BIN_DIR/gemini-phone"

  # Add to PATH if not already there
  if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠️  Adding $HOME/.local/bin to PATH..."
    
    # Add to .bashrc for bash sessions
    if [ -f ~/.bashrc ]; then
      if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' ~/.bashrc; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
      fi
    fi
    
    # Add to .profile for login shells
    if [ -f ~/.profile ]; then
      if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' ~/.profile; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile
      fi
    else
      echo 'export PATH="$HOME/.local/bin:$PATH"' > ~/.profile
    fi
    
    # Activate for current session
    export PATH="$HOME/.local/bin:$PATH"
    
    echo "✓ PATH updated (active now and for future sessions)"
  fi
else
  if [ -w "$BIN_DIR" ]; then
    ln -s "$INSTALL_DIR/cli/bin/gemini-phone.js" "$BIN_DIR/gemini-phone"
  else
    $SUDO ln -s "$INSTALL_DIR/cli/bin/gemini-phone.js" "$BIN_DIR/gemini-phone"
  fi
  echo "✓ Installed to: $BIN_DIR/gemini-phone"
fi

echo ""
echo "════════════════════════════════════════════"
echo "✓ Installation complete!"
echo "════════════════════════════════════════════"
echo ""
echo "The 'gemini-phone' command is now available!"
echo ""

# Automated FreePBX Provisioning
echo "🎯 FreePBX Auto-Provisioning"
echo ""
echo "Would you like to automatically provision your FreePBX server now?"
echo "This will set up:"
echo "  • Extensions (9000-9008)"
echo "  • IVR system"
echo "  • SIP trunk configuration"
echo "  • Firewall rules"
echo ""
read -p "Auto-provision FreePBX now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Starting auto-provisioning wizard..."
  echo ""
  cd "$INSTALL_DIR/cli"
  node bin/gemini-phone.js auto-provision
  echo ""
fi

# FreePBX Provisioner Service Setup
echo "🔧 FreePBX Provisioner Service"
echo ""
echo "Install the provisioner service on this FreePBX server?"
echo "This allows bot nodes to self-provision by connecting to this server."
echo ""
read -p "Install provisioner service? (y/N) " -n 1 -r
echo
INSTALL_PROVISIONER=$REPLY

if [[ $INSTALL_PROVISIONER =~ ^[Yy]$ ]]; then
  echo ""
  echo "Installing provisioner service..."
  
  # Install dependencies
  cd "$INSTALL_DIR/freepbx-provisioner-service"
  npm install
  
  # Create systemd service
  if command -v systemctl &> /dev/null; then
    echo "Setting up systemd service..."
    $SUDO cp freepbx-provisioner.service /etc/systemd/system/
    $SUDO systemctl daemon-reload
    $SUDO systemctl enable freepbx-provisioner
    $SUDO systemctl start freepbx-provisioner
    
    echo "✓ Provisioner service installed and started"
    echo ""
    echo "Service status:"
    $SUDO systemctl status freepbx-provisioner --no-pager -l
  else
    echo "⚠️  systemd not available. You'll need to start the service manually:"
    echo "  cd $INSTALL_DIR/freepbx-provisioner-service"
    echo "  node server.js"
  fi
  echo ""
fi

echo "Next steps:"
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "  gemini-phone auto-provision  # Provision FreePBX (run this first!)"
fi
if [[ $INSTALL_PROVISIONER =~ ^[Yy]$ ]]; then
  echo "  curl http://localhost:3500/health  # Test provisioner service"
fi
echo "  gemini-phone setup    # Configure your installation"
echo "  gemini-phone start    # Launch services"
echo ""

