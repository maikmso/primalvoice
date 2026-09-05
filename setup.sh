#!/usr/bin/env bash
# Gera as configurações (livekit.yaml, Caddyfile, .env) a partir dos templates.
# Uso: ./setup.sh seudominio.com
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Uso: ./setup.sh seudominio.com"
  echo "Exemplo: ./setup.sh vortex.meudominio.com.br"
  exit 1
fi

DOMAIN="$1"
LK_DOMAIN="lk.${DOMAIN}"

API_KEY="API$(openssl rand -hex 6)"
API_SECRET="$(openssl rand -hex 32)"
ROOM_PASSWORD="$(openssl rand -hex 4)"

cat > .env <<EOF
DOMAIN=${DOMAIN}
LK_DOMAIN=${LK_DOMAIN}
LIVEKIT_URL=wss://${LK_DOMAIN}
LIVEKIT_API_KEY=${API_KEY}
LIVEKIT_API_SECRET=${API_SECRET}
ROOM_NAME=galera
ROOM_PASSWORD=${ROOM_PASSWORD}
PORT=3000
EOF

sed -e "s/__LIVEKIT_API_KEY__/${API_KEY}/" \
    -e "s/__LIVEKIT_API_SECRET__/${API_SECRET}/" \
    livekit-config/livekit.yaml.template > livekit-config/livekit.yaml

sed -e "s/__DOMAIN__/${DOMAIN}/" \
    -e "s/__LK_DOMAIN__/${LK_DOMAIN}/" \
    caddy/Caddyfile.template > caddy/Caddyfile

echo ""
echo "Configuração gerada com sucesso!"
echo "App:               https://${DOMAIN}"
echo "LiveKit (interno): wss://${LK_DOMAIN}"
echo "Senha da sala:     ${ROOM_PASSWORD}"
echo ""
echo "Guarde essa senha para compartilhar com seus amigos (também está salva no .env)."
echo "Próximo passo: docker compose up -d --build"
