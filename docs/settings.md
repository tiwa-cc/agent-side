# 基本ツール

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

# Volta

```bash
curl https://get.volta.sh | bash
source ~/.bashrc
```

# Node LTS

```bash
volta install node@lts
```

# pnpm

## activate

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## check

```bash
node -v
pnpm -v
```

# initialize

```bash
mkdir agent-side
cd agent-side

pnpm init

pnpm add zod yaml smol-toml commander consola pathe fs-extra chokidar eta html-escaper sirv mermaid sanitize-html

pnpm add -D typescript tsx vite vitest happy-dom eslint prettier @types/node
```
