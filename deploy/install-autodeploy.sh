#!/usr/bin/env bash
# One-time server setup for GitHub Actions auto-deploy. Run ON the server as root:
#   ssh hetzner 'bash -s' -- "<public key line>" < deploy/install-autodeploy.sh
# Installs the deploy command, turns /opt/mission-architect into a git checkout (keeps data/),
# and authorizes the Actions key so that it can ONLY run that deploy command.
set -euo pipefail
PUB="${1:?usage: install-autodeploy.sh '<ssh public key line>'}"

cat > /usr/local/bin/deploy-mission-architect <<'EOF'
#!/usr/bin/env bash
# Forced command of the GitHub Actions deploy key for mission-architect (see /root/.ssh/authorized_keys).
set -euo pipefail
exec 9>/var/lock/deploy-mission-architect.lock
flock 9
cd /opt/mission-architect
git fetch --quiet origin main
git reset --quiet --hard origin/main
mkdir -p data
docker compose up -d --build 2>&1 | tail -3
docker image prune -f >/dev/null 2>&1 || true
echo "deployed $(git rev-parse --short HEAD)"
EOF
chmod 755 /usr/local/bin/deploy-mission-architect

cd /opt/mission-architect
chown -R root:root .          # files copied by rsync from a Mac keep the Mac uid; git refuses such repos
[ -d .git ] || git init -q -b main
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/kosmofranek-maker/mission-architect.git
git fetch -q origin main
git reset -q --hard origin/main

if ! grep -qF "$PUB" /root/.ssh/authorized_keys; then
  echo "command=\"/usr/local/bin/deploy-mission-architect\",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty $PUB" >> /root/.ssh/authorized_keys
fi
echo "auto-deploy installed at $(git rev-parse --short HEAD); data: $(ls data 2>/dev/null | tr '\n' ' ')"
