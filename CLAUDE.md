# Diário Escolar CMMSF — instruções para trabalhar neste repositório

Este repositório mantém **duas cópias do mesmo aplicativo** que precisam ficar sempre idênticas:

- **Raiz** (`index.html`, `css/`, `js/`, `sw.js`, `manifest.webmanifest`, `assets/`): é a versão essencial publicada no **GitHub Pages**. É o que os usuários realmente acessam em produção.
- **`diario_escolar_v3/`**: projeto completo, com sua própria cópia de `index.html`, `css/`, `js/`, `sw.js`, `manifest.webmanifest` e `assets/` (que deve ser byte-a-byte igual à raiz), além do build (`build/build.mjs`), da suíte de testes (`test/*.test.js`), do pacote distribuível (`dist/pwa/` e `dist/diario-escolar-offline.html`) e da API opcional (`worker/`).

## Regra permanente: espelhar sempre os dois lados

**Qualquer alteração em `index.html`, `css/*.css`, `js/*.js`, `sw.js` ou `manifest.webmanifest` deve ser aplicada igualmente na raiz e em `diario_escolar_v3/`.** Nunca edite só um dos dois — implemente e teste onde for mais conveniente, mas antes de finalizar a tarefa copie o resultado para o outro lado (os arquivos devem ficar idênticos; confira com `diff`).

Depois de editar os dois lados:

1. Rode `cd diario_escolar_v3 && npm test` — cobre cálculo de notas (`calculos.js`), banco/importação (`banco.js`), diário oficial (`official.js`) e regras de PWA (versão do cache do service worker, isolamento do print por aba, exportador autônomo do diário oficial).
2. Rode `npm run build` (dentro de `diario_escolar_v3/`) para reconstruir `dist/pwa/` e `dist/diario-escolar-offline.html` a partir do código atualizado. Nunca edite `dist/` manualmente — ele é gerado.
3. Se o comportamento do app mudar de forma visível para o usuário (nova aba, novo botão, nova regra de cálculo, novo texto de ajuda), atualize `README.md` (raiz) e `diario_escolar_v3/README.md` juntos, mantendo os dois com o mesmo conteúdo.
4. Ao alterar `sw.js`, avance a constante `CACHE` (ex.: `diario-cmmsf-v3-6` → `diario-cmmsf-v3-7`) nos dois `sw.js`, para o navegador trocar a versão em cache no próximo acesso — sem exigir que o usuário limpe dados manualmente.
5. Rode uma verificação funcional real antes de considerar a tarefa concluída (Playwright ou equivalente): abrir a página, exercitar o fluxo alterado e checar o console por erros. Não confie só no `npm test`.

`diario_escolar_v3/data/config.json` guarda os mesmos dados iniciais de turmas/alunos que `js/initial-data.js`, em formato mais legível; não é necessário mantê-lo sincronizado automaticamente a cada alteração, só quando os dados iniciais da escola mudarem de fato.

## Coisas que não podem quebrar

- **Compatibilidade de dados**: a chave do `localStorage` (`cmmsf_diario_v3`) e o formato dos backups JSON exportados não podem mudar de forma incompatível. Migrações precisam continuar funcionando com dados antigos já salvos no navegador dos professores.
- **Diário oficial**: três categorias e quatro colunas por unidade (`1ª`, `2ª`, `3ª`, `M`), sem coluna de "Recuperação paralela" no modelo oficial (a recuperação paralela continua existindo no sistema completo, só não aparece como coluna separada ali). `M` é editável diretamente. A exportação do HTML oficial nunca deve ser bloqueada por avisos matemáticos — apenas avisar.
- **Impressão por aba**: as regras de impressão específicas do Diário Oficial (`css/official.css`, bloco `@media print`) ficam restritas ao marcador `body.print-official` (alternado em `setTab()`, em `js/app.js`). Não volte a torná-las incondicionais — isso quebra a impressão de qualquer outra aba (Relatórios, Diário etc.).
- **PWA instalável e offline**: manter `manifest.webmanifest` com `start_url`/`scope` relativos (`./`) para funcionar em GitHub Pages, e o service worker cacheando todos os arquivos necessários para uso 100% offline após o primeiro carregamento.
