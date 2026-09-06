# INTERGO

Crie um app de mototaxi chamado "MotoZap" para cidades pequenas do interior do Brasil.

Stack:

- React + Tailwind

- Supabase (já tenho projeto criado, vou conectar depois)

- React Router para navegação

Paleta de cores obrigatória:

- Primária (fundo, header, cards): #7B00D4 (roxo)

- Accent (botões CTA, ícones ativos, destaques): #00FF00 (verde neon)

- Texto principal: #FFFFFF

- Texto sobre verde: #3D0080

- Fundo neutro de página: #1A0035 (roxo escuro)

- Bordas e separadores: rgba(0,255,0,0.2)

Estilo visual:

- Botões CTA: fundo #00FF00, texto #3D0080, bold, bordas arredondadas

- Cards: fundo #7B00D4, borda sutil verde neon, sombra roxa

- Toggle/status ativo: verde neon

- Fontes grandes e legíveis (usuários menos tech-savvy)

Estrutura de páginas:

1. /splash — tela de abertura com logo e botões "Sou Passageiro" e "Sou Mototaxista"

2. /auth/passageiro — login/cadastro do passageiro

3. /auth/mototaxista — login/cadastro do mototaxista

4. /passageiro/home — tela principal do passageiro

5. /mototaxista/home — tela principal do mototaxista

6. /admin — painel administrativo

Por enquanto só crie a estrutura de rotas e telas em branco com navegação funcionando.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://motozap-conectando-voce.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5390d660-87fd-42ec-8bd0-6064821b364d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
