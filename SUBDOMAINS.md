# Bora Zé! — Configuração de Subdomínios (4 PWAs)

O projeto é **um único repositório Lovable** que se comporta como **quatro apps instaláveis diferentes**, dependendo do subdomínio pelo qual o usuário chega:

| Subdomínio                    | App                                              | Manifest                              | Rotas permitidas          |
| ----------------------------- | ------------------------------------------------ | ------------------------------------- | ------------------------- |
| `boraze.app` (raiz)           | Landing pública do cliente                       | `/manifest.webmanifest`               | Todas                     |
| `parceiros.boraze.app`        | Bora Zé! Parceiros (donos de restaurante/loja)   | `/manifest-parceiros.webmanifest`     | `/parceiros/*`            |
| `mototaxista.boraze.app`      | Bora Zé! Mototaxista/Entregador                  | `/manifest-mototaxista.webmanifest`   | `/mototaxista/*`          |
| `admin.boraze.app`            | Bora Zé! Admin                                   | `/manifest-admin.webmanifest`         | `/admin`, `/adm/*`, `/auth` |

> As áreas antigas `/empresa/*`, `/food/*` e `/estabelecimento/painel` ainda existem como rotas, mas fazem redirect para `/parceiros/*`. Os manifests antigos (`manifest-food.webmanifest`, `manifest-entregas.webmanifest`) ficam em `public/` por compatibilidade histórica, mas não são mais referenciados por nenhuma landing ativa.

O guard fica em `src/hooks/use-subdomain-guard.ts` e detecção em `src/lib/subdomain.ts`.

## Como configurar o DNS (depois do deploy)

1. **Compre ou conecte `boraze.app`** em `Project Settings → Domains → Buy new domain` (ou "Connect Domain" se já tem em outro registrar).
2. **Adicione cada subdomínio** como entrada separada em Domains:
   - `parceiros.boraze.app`
   - `mototaxista.boraze.app`
   - `admin.boraze.app`
3. Lovable te mostrará os registros DNS a criar. Tipicamente para subdomínios: **CNAME** apontando para `185.158.133.1` (ou o valor exibido). Para raiz: **A** em `@` para `185.158.133.1` + **A** em `www`.
4. Aguarde propagação (até 72h) e SSL automático.

## Como testar localmente antes do DNS

Enquanto o domínio não está configurado, tudo funciona normalmente no domínio raiz. Para simular um subdomínio localmente adicione ao seu `/etc/hosts`:

```
127.0.0.1 parceiros.localhost
127.0.0.1 mototaxista.localhost
127.0.0.1 admin.localhost
```

E acesse `http://parceiros.localhost:8080`, etc.
