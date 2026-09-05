# Vortex

Uma sala de voz + compartilhamento de tela bem leve, tipo TeamSpeak/Discord, para você e um grupo fixo de amigos. Sem canais, sem chat de texto, sem cadastro — só nome + senha da sala e todo mundo já está na call.

## Como funciona

- **LiveKit** (open source, self-hosted): é o servidor que carrega o áudio/vídeo/tela de verdade (WebRTC). Roda num container Docker.
- **app** (Node/Express): serve a página e gera o "ingresso" (token) de cada pessoa para entrar na sala do LiveKit. Não guarda mensagens nem histórico — é só a porta de entrada.
- **Caddy**: coloca HTTPS automático (Let's Encrypt) na frente de tudo, usando seu domínio.

Tudo sobe junto com `docker compose`.

## O que você precisa antes de começar

1. Um **domínio** (ou subdomínio) que aponte para o IP do seu servidor. Pode ser algo como `voz.seudominio.com` — não precisa ser o domínio raiz.
2. Um **servidor Linux com IP público** (VPS) com Docker instalado. Qualquer VPS pequena resolve — para 10-11 pessoas em voz + tela, 1 vCPU / 1-2 GB RAM já é confortável.
3. Portas liberadas no firewall do servidor:
   - `80/tcp` e `443/tcp` (Caddy / HTTPS)
   - `7881/tcp` (fallback do LiveKit)
   - `50000-50100/udp` (mídia — voz/vídeo/tela)

## Passo a passo

### 1. Aponte o DNS

No painel do seu domínio, crie dois registros tipo A apontando para o IP do servidor:

```
voz.seudominio.com     A     <IP do servidor>
lk.voz.seudominio.com  A     <IP do servidor>
```

(Troque `voz.seudominio.com` pelo domínio que você quiser usar — só precisa manter o prefixo `lk.` no segundo registro, é o que o `setup.sh` espera.)

### 2. Coloque o projeto no servidor

Envie esta pasta inteira pro servidor (via `scp`, `rsync`, git, o que preferir) e entre nela por SSH.

### 3. Gere a configuração

```bash
./setup.sh voz.seudominio.com
```

Isso cria o `.env`, o `livekit-config/livekit.yaml` e o `caddy/Caddyfile` com uma chave de API e uma senha de sala geradas aleatoriamente. No final ele imprime a **senha da sala** — guarde ela, é o que você vai mandar pros seus amigos.

### 4. Suba tudo

```bash
docker compose up -d --build
```

Na primeira vez o Caddy vai emitir os certificados HTTPS automaticamente (leva alguns segundos). Acompanhe com:

```bash
docker compose logs -f
```

### 5. Teste

Acesse `https://voz.seudominio.com`, digite seu nome e a senha da sala. Peça pra um amigo (ou abra numa aba anônima/outro celular) entrar também — vocês devem se ouvir e conseguir compartilhar tela.

### 6. Mande pros amigos

Só precisam de: o link (`https://voz.seudominio.com`) e a senha da sala. Cada um digita o próprio nome.

## App desktop (instalável, tipo Discord)

Além de acessar pelo navegador, tem um app Windows instalável (`desktop/`) que reaproveita a mesma tela, só que empacotada com Electron — ganha ícone na área de trabalho, atalho no menu iniciar e fica na bandeja do sistema quando minimizado.

**Importante: o app desktop não substitui os passos acima.** Ele ainda precisa de um servidor rodando (o `app/` + LiveKit, seguindo o passo a passo deste README, ou uma alternativa como LiveKit Cloud) — a única diferença é que, em vez de abrir o navegador numa URL, a pessoa abre um `.exe` instalado e informa o endereço do servidor uma vez (fica salvo).

### Instalar

Rode o instalador `Vortex Setup 1.0.0.exe` que te mandei junto. Na primeira vez que abrir, ele pede o endereço do servidor (ex: `https://voz.seudominio.com`) — depois disso só abre direto na tela de entrar na sala. Pra trocar o servidor depois, tem uma engrenagem (⚙️) no canto da tela de entrar.

### Rebuildar o instalador (se você mudar o código)

Se mexer em algo dentro de `desktop/renderer/` (a mesma tela do site) ou `desktop/main.js`, o jeito mais simples de gerar um novo instalador é rodar isso **direto no Windows** (lá não precisa de Wine nem das gambiarras que eu tive que fazer aqui pra compilar um .exe a partir de Linux):

```
cd desktop
npm install
npm run dist:win
```

O instalador novo aparece em `desktop/dist/Vortex Setup 1.0.0.exe`.

### Nota sobre como isso foi validado

Testei o app desktop de ponta a ponta neste ambiente (sem tela de verdade, usando um display virtual): confirmei que ele abre, mostra a tela de configurar servidor, salva e persiste o endereço, avança pra tela de entrar, busca a configuração e o token no servidor (isso exigiu adicionar CORS no `app/src/server.js`, já incluído), e tenta conectar no LiveKit — só não completei uma chamada de voz/tela de verdade porque isso exige um LiveKit real rodando (o `test.local` que usei pra testar é falso de propósito). O instalador `.exe` foi gerado de verdade e é um executável Windows válido, mas eu não tenho como abrir Windows aqui pra confirmar visualmente ícone/atalhos/bandeja — isso fica pro seu teste manual mesmo.

## Perguntas comuns

**Alguém não conseguiu conectar / a tela fica preta.** Na grande maioria dos casos é firewall: confira se a faixa `50000-50100/udp` e a `7881/tcp` estão realmente abertas no servidor (e no provedor de nuvem, se ele tiver um firewall separado do sistema operacional, tipo "Security Group"). Isso resolve praticamente todos os casos com redes domésticas normais.

**Um amigo está numa rede muito restritiva (corporativa, faculdade) e mesmo assim não conecta.** Nesse caso o LiveKit precisaria de um servidor TURN (retransmissão) — o self-host já vem preparado pra isso, mas por padrão está desligado pra manter a configuração simples. Se precisar, me avise que a gente liga.

**Quero trocar a senha da sala.** Edite `ROOM_PASSWORD` no `.env` e rode `docker compose up -d --build app` de novo (só precisa reiniciar o `app`, não o LiveKit).

**Quero mudar quantas pessoas cabem ou outros detalhes.** A sala não tem limite fixo de participantes no código — o limite real é a banda/CPU do servidor. Para 10-11 pessoas com câmera+tela ligadas ao mesmo tempo, prefira uma VPS com pelo menos 2 vCPUs se notar travamento.

**Onde ficam os logs?** `docker compose logs -f livekit` (servidor de mídia), `docker compose logs -f app` (backend), `docker compose logs -f caddy` (HTTPS).

## Estrutura do projeto

```
vortex/
├── docker-compose.yml
├── setup.sh                        # gera as configs (rode uma vez)
├── livekit-config/
│   └── livekit.yaml.template       # config do LiveKit (gerado -> livekit.yaml)
├── caddy/
│   └── Caddyfile.template          # config do Caddy (gerado -> Caddyfile)
├── app/
│   ├── Dockerfile
│   ├── src/server.js               # gera o token de acesso (/api/token)
│   └── public/                     # frontend web (index.html, app.js, style.css)
└── desktop/                        # app instalável (Electron) — opcional
    ├── main.js
    ├── preload.js
    └── renderer/                   # mesma tela do site + tela de configurar servidor
```

## Nota sobre este teste local

Este projeto foi desenvolvido e testado neste ambiente da seguinte forma: o backend (`app/src/server.js`) foi rodado localmente e todos os endpoints (`/api/config`, `/api/token` com senha certa/errada, arquivos estáticos) responderam corretamente, e o `livekit-config/livekit.yaml` gerado pelo `setup.sh` foi validado como YAML e confere com a estrutura oficial do LiveKit. O ambiente de teste não teve acesso ao Docker Hub para baixar as imagens do LiveKit/Caddy, então o `docker compose up` completo (com os três serviços rodando juntos, certificado HTTPS de verdade, e a chamada de voz/tela ponta a ponta) ainda não foi validado na prática — isso só é possível no seu servidor real, com domínio e rede de verdade. Siga o passo a passo acima; se algo der erro no `docker compose up`, me manda o log que a gente resolve.
