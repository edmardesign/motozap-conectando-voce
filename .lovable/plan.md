# Estrutura: 3 PWAs no mesmo projeto

**Um repositório, três experiências instaláveis** — cada subdomínio se comporta como um app independente, com seu próprio ícone, nome, tela inicial e rotas visíveis, mas todos compartilham o mesmo backend (Cloud/Supabase).

## Domínios finais

- `boraze.app` (raiz) — mantém splash atual com escolha de perfil (fallback / marketing)
- `passageiro.boraze.app` — PWA do Passageiro
- `mototaxista.boraze.app` — PWA do Mototaxista
- `admin.boraze.app` — Painel Administrativo

> Você precisa **comprar/conectar o domínio boraze.app** em Project Settings → Domains e adicionar cada subdomínio como CNAME apontando para o Lovable. Sem isso, todos os subdomínios só existem em código — a configuração DNS é passo separado que você faz depois do deploy.

## O que muda no código

### 1. Três manifests separados (`public/`)
- `manifest-passageiro.webmanifest` — nome "Bora Zé! Passageiro", `start_url: /passageiro/home`, ícone verde
- `manifest-mototaxista.webmanifest` — nome "Bora Zé! Mototaxista", `start_url: /mototaxista/home`, ícone verde
- `manifest-admin.webmanifest` — nome "Bora Zé! Admin", `start_url: /admin`, ícone escuro
- Cada um com `scope` limitado ao seu prefixo → o SO trata como app separado

### 2. Detecção de subdomínio em `__root.tsx`
- Ler `window.location.hostname` no cliente
- Injetar dinamicamente a tag `<link rel="manifest">` correta
- Ajustar `<title>` e theme-color por perfil

### 3. Guard de rota por subdomínio (novo hook `useSubdomainGuard`)
- Em `passageiro.boraze.app` → rotas `/mototaxista/*` e `/admin` redirecionam para `/passageiro/home` (ou splash)
- Em `mototaxista.boraze.app` → só permite `/mototaxista/*`
- Em `admin.boraze.app` → só permite `/admin` e `/auth`
- Em `boraze.app` (raiz) → tudo liberado (splash escolhe)

### 4. Splash inteligente
- Se estiver no subdomínio do passageiro, splash pula direto para `/auth/passageiro`
- Idem para mototaxista e admin
- Só o domínio raiz mostra as 3 opções

### 5. Logo Bora Zé! (já aplicado nesta rodada)
- `src/assets/boraze-logo.png` (logo completa)
- `src/assets/boraze-icon.png` (ícone quadrado para PWA/favicon)

## O que NÃO muda

- Backend, tabelas, RLS, RPCs, MCP, fluxos de auth, pagamento Pix, comissão, delivery — tudo continua igual
- Não vou separar em dois projetos Lovable diferentes (você teria dois backends para manter em sincronia)
- Não vou gerar builds nativos (Capacitor) — isso é outro projeto se quiser lojas

## Passos técnicos (ordem)

1. Criar 3 manifests em `public/`
2. Criar `src/lib/subdomain.ts` (detecta perfil pelo hostname)
3. Atualizar `__root.tsx` para injetar manifest/title dinâmicos
4. Criar `src/hooks/use-subdomain-guard.ts` e aplicar no `_root` component
5. Ajustar `splash.tsx` para pular etapa quando já em subdomínio dedicado
6. Documentar em README como configurar os DNS

Confirma que sigo com essa arquitetura? Depois disso é seu trabalho conectar o domínio boraze.app no Project Settings e criar os CNAMEs — te passo o passo-a-passo quando terminar o código.