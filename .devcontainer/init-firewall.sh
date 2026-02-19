#!/bin/bash
# Firewall initialization for sandboxed agentic Claude Code environment.
# Whitelist-only outbound network: allows package registries, GitHub, Anthropic API.
# Adapted from https://github.com/anthropics/claude-code/tree/main/.devcontainer

set -euo pipefail

# --- Allowed domains ---
ALLOWED_DOMAINS=(
  # GitHub
  "github.com"
  "api.github.com"
  "raw.githubusercontent.com"
  "objects.githubusercontent.com"

  # npm / pnpm registry
  "registry.npmjs.org"
  "registry.npmmirror.com"

  # crates.io (Rust)
  "crates.io"
  "index.crates.io"
  "static.crates.io"

  # Anthropic API
  "api.anthropic.com"
  "statsig.anthropic.com"
  "sentry.io"

  # Docker DNS
  "dns.google"
)

echo "=== Initializing firewall (whitelist-only) ==="

# Create ipset for allowed IPs
ipset create allowed_ips hash:ip -exist
ipset flush allowed_ips

# Resolve and add allowed domains
for domain in "${ALLOWED_DOMAINS[@]}"; do
  ips=$(dig +short "$domain" 2>/dev/null | grep -E '^[0-9]+\.' || true)
  for ip in $ips; do
    ipset add allowed_ips "$ip" -exist
    echo "  Allowed: $domain -> $ip"
  done
done

# Flush existing rules
iptables -F OUTPUT

# Allow loopback
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS (needed to resolve domains)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Allow whitelisted IPs
iptables -A OUTPUT -m set --match-set allowed_ips dst -j ACCEPT

# Default: DROP everything else
iptables -P OUTPUT DROP

echo "=== Firewall active ==="

# Verification
echo "=== Verifying firewall ==="
if curl -sf --max-time 5 https://api.anthropic.com > /dev/null 2>&1; then
  echo "  [PASS] api.anthropic.com reachable"
else
  echo "  [WARN] api.anthropic.com not reachable (may need DNS refresh)"
fi

if curl -sf --max-time 5 https://example.com > /dev/null 2>&1; then
  echo "  [FAIL] example.com should be blocked but is reachable!"
  exit 1
else
  echo "  [PASS] example.com correctly blocked"
fi

echo "=== Firewall verification complete ==="
