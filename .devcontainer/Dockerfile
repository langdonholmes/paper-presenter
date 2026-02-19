FROM node:20-bookworm

# System dependencies for firewall and development
RUN apt-get update && apt-get install -y \
    git \
    iptables \
    ipset \
    iproute2 \
    curl \
    sudo \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Rust toolchain
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Allow node user to run firewall script with sudo (no password)
RUN echo "node ALL=(ALL) NOPASSWD: /usr/local/bin/init-firewall.sh" >> /etc/sudoers.d/node-firewall

# Copy firewall init script
COPY init-firewall.sh /usr/local/bin/init-firewall.sh
RUN chmod +x /usr/local/bin/init-firewall.sh

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Switch to non-root user
USER node
WORKDIR /workspace

# Install Rust for the node user as well
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/node/.cargo/bin:${PATH}"
