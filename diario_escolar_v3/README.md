# Diário Escolar CMMSF — versão 3

Aplicativo offline para chamadas, atividades qualitativas, avaliações pontuadas, recuperação paralela, três unidades e relatórios de turma.

## Arquivos para uso

- `dist/diario-escolar-offline.html`: versão mais segura para abrir diretamente no Android. É um único arquivo, sem dependências externas.
- `dist/pwa/`: versão instalável como PWA quando publicada em HTTPS.
- `index.html`, `css/` e `js/`: código-fonte modular para manutenção.
- `worker/`: API Cloudflare opcional, já preparada para GET/PUT e CORS.

## Raiz do repositório × `diario_escolar_v3/`

O repositório mantém **duas cópias idênticas** do mesmo aplicativo:

- a **raiz** (`index.html`, `css/`, `js/`, `sw.js`, `manifest.webmanifest`, `assets/`) é a versão essencial publicada no GitHub Pages;
- `diario_escolar_v3/` é o projeto completo, com a mesma cópia de `index.html`/`css/`/`js/`/`sw.js`/`manifest.webmanifest`/`assets/`, além do build (`build/build.mjs`), da suíte de testes (`test/`), do pacote distribuível (`dist/pwa/` e `dist/diario-escolar-offline.html`) e da API opcional (`worker/`).

**Qualquer alteração no código do aplicativo (HTML, CSS, JS, service worker ou manifest) precisa ser replicada nos dois lugares**, seguida de `npm test` e `npm run build` dentro de `diario_escolar_v3/` para atualizar `dist/`. Veja `../CLAUDE.md` para os detalhes desse fluxo.

## Funcionalidades

- funcionamento offline e armazenamento local;
- modo celular sem rolagem lateral na chamada, com estudantes em cartões e botão de salvar flutuante;
- cinco turmas e estudantes do JSON original;
- importação e mesclagem de turmas, alunos e disciplinas;
- várias disciplinas dentro da mesma turma;
- 1ª, 2ª e 3ª unidades independentes;
- chamadas vinculadas a turma, disciplina e unidade;
- atividades qualitativas: `+`, `+-`, `-`, `NF` e `A`;
- ao criar uma atividade qualitativa numa data que já tem chamada registrada, os ausentes da chamada entram automaticamente marcados como `A`, sem apagar nada da chamada original; o professor pode corrigir manualmente qualquer aluno depois;
- componente qualitativo com peso configurável;
- avaliações pontuadas: atividade, trabalho, teste, prova ou outro;
- notas pontuadas salvas sozinhas ao sair da célula, apertar Enter ou parar de digitar por ~800ms, com aviso de status (`Salvando...`, `✓ Salvo às HH:MM`, alertas de validação) — sem precisar clicar em “Salvar notas” a cada nota;
- limite de 10 pontos por unidade;
- nota original e recuperação paralela;
- a paralela só substitui a original quando for maior;
- diário geral em formato de grade;
- filtros de estudantes abaixo da média, pendentes e com paralela;
- relatório por unidade e resumo das três unidades;
- visão geral da turma na aba Relatórios: cartões de aulas, faltas, frequência média, atividades lançadas e aproveitamento médio, tabela com aulas/presenças/faltas/frequência por aluno, notas de cada teste e prova, e botão de impressão;
- diário oficial A4 paisagem com notas das três unidades e folhas de frequência;
- três categorias e quatro colunas por unidade (`1ª`, `2ª`, `3ª` e `M`), sem coluna de recuperação paralela no formulário oficial;
- “Atividades de Fixação” com peso e período automático entre a primeira e a última atividade qualitativa;
- cabeçalhos, pesos, datas, lançamentos e médias do modelo oficial editáveis antes da impressão;
- avisos matemáticos de pesos e notas sem bloquear a exportação do documento;
- exportação de um HTML oficial independente, editável e pronto para imprimir;
- exportação do banco completo e do relatório em JSON;
- migração automática dos registros da versão antiga;
- sincronização opcional com Cloudflare Worker + KV, automática ao abrir o app e ao voltar para a aba, com indicador de alterações pendentes e aviso ao fechar sem sincronizar.

## Uso no Android

1. Copie `dist/diario-escolar-offline.html` para o tablet.
2. Abra pelo navegador ou gerenciador de arquivos.
3. Entre em **Cadastros** e adicione as disciplinas de cada turma.
4. Escolha turma, disciplina e unidade na parte superior.
5. Faça regularmente o **Exportar JSON completo**.

Para gerar o documento da escola, abra **Diário oficial**, escolha notas, frequência ou ambos, confira os avisos e use **Exportar HTML oficial**. O arquivo exportado continua editável e contém os botões **Baixar HTML atualizado** e **Imprimir / salvar PDF**.

Não apague os dados do navegador sem antes exportar o backup.

## Cálculo da unidade

O professor distribui até 10 pontos. Exemplo:

| Componente | Máximo |
|---|---:|
| Qualitativas | 3,0 |
| Teste | 2,0 |
| Prova | 5,0 |
| Total | 10,0 |

As qualitativas usam pontos internos (`+`=3, `+-`=2, `-`=1, `NF/A`=0) e são convertidas proporcionalmente ao peso do componente. A nota considerada de uma avaliação pontuada é `máximo(original, paralela)`.

No formulário oficial, as três primeiras colunas de cada unidade são parcelas. O campo **M** apresenta o maior resultado da unidade depois de aplicar a regra da recuperação paralela, mas não exibe uma coluna separada de recuperação. **M** também pode ser preenchido manualmente, inclusive quando as notas parciais estiverem vazias; essa alteração fica isolada no modelo oficial e não modifica o diário acadêmico. **TP** soma as médias disponíveis e **MF** é calculada quando as três médias estão preenchidas. Quando existem mais de três componentes, os excedentes são agrupados automaticamente na terceira categoria; o botão **Recriar mapeamento** refaz essa distribuição.

## Importar uma turma

Use o modelo `examples/importar-turma.json`. O sistema aceita chaves em português (`turmas`, `alunos`, `disciplinas`, `nome`) ou inglês (`classes`, `students`, `subjects`, `name`). IDs iguais são mesclados.

## Compilar novamente

Requer Node.js 20 ou superior:

```bash
npm test
npm run build
```

No Windows, também é possível executar `compilar.bat`.

## PWA

Publique todo o conteúdo de `dist/pwa/` em um serviço HTTPS, como Cloudflare Pages. Abra a página no Android e use **Instalar aplicativo**. O service worker guarda os arquivos para funcionamento offline.

## Salvamento automático e sincronização

**Notas pontuadas.** Cada nota digitada na aba **Pontuadas** é salva sozinha no aparelho — não é preciso clicar em “Salvar notas” depois de cada aluno. O salvamento acontece ao sair da célula (clicar fora), ao apertar `Enter`, ou automaticamente depois de ~800ms sem digitar, o que vier primeiro; isso evita salvar `1` e depois `10,0` como duas alterações separadas enquanto o professor ainda está digitando. Um indicador ao lado da tabela mostra `Salvando...`, `✓ Salvo às HH:MM`, ou o motivo de não ter salvo (ex.: falta preencher título/data/valor máximo, ou a nota ultrapassa o peso da avaliação). O botão **Salvar notas** continua existindo como confirmação manual, mas deixou de ser obrigatório.

**Sincronização com a nuvem (quando configurada em Cadastros → Backup e nuvem).** Além do botão **Sincronizar agora**, o aplicativo sincroniza sozinho:

- ao abrir o app (a partir de 1 segundo depois do carregamento);
- ao voltar para a aba do navegador (por exemplo, ao trocar de aplicativo no celular e retornar);
- automaticamente ~1,8s depois de qualquer alteração (chamada, atividade, avaliação, notas pontuadas ou configuração da unidade).

O topo da tela mostra o estado: `Salvo neste aparelho` (sem nuvem configurada), `N alteração(ões) pendente(s)` (ainda não chegou ao servidor), `Sincronizando...`, ou `✓ Sincronizado às HH:MM`. Se houver alterações pendentes, fechar ou recarregar a aba mostra o aviso padrão do navegador para confirmar a saída.

**Limitação conhecida — sem resolução de conflito por nota.** A sincronização mescla turmas, chamadas, atividades, avaliações e configurações inteiras, usando a alteração mais recente de cada registro (por data/hora), mas não é uma sincronização em tempo real nem por célula: dois aparelhos editando exatamente a mesma nota ao mesmo tempo não geram um aviso de conflito, só a mais recente prevalece. Isso é adequado para o uso pretendido — um professor usando um aparelho por vez, em horários diferentes — mas não foi desenhado para edição simultânea em vários dispositivos. Um controle de conflito de verdade (nota por nota, com aviso de "outro aparelho alterou esta nota") exigiria trocar o Worker atual (que hoje só guarda um blob JSON completo) por uma API com banco relacional e versionamento por registro; é um projeto bem maior, fora do escopo do Worker descrito abaixo.

## Estrutura do Cloudflare Worker

O Worker é a camada opcional de sincronização entre tablet, celular e computador. O aplicativo continua funcionando offline: o Worker não serve a interface e não é necessário para fazer chamadas ou lançar notas. Sua única responsabilidade é receber e guardar uma cópia completa do banco JSON no Cloudflare KV.

### Arquivos

```text
worker/
├── src/
│   └── index.js       # API, autenticação, validação e leitura/gravação no KV
├── package.json       # Wrangler e comandos de desenvolvimento/publicação
├── wrangler.jsonc     # nome do Worker e binding da namespace KV
└── .gitignore         # arquivos locais que não devem ir para o Git
```

O projeto utiliza um **blob JSON único**, e não CRUD por aluno ou por chamada. Todo o banco da versão 3 fica na chave KV `diario:v3`. Isso simplifica o funcionamento em navegadores antigos e permite que o mesmo backup JSON seja usado localmente e na nuvem.

### Variáveis e recursos

| Nome | Tipo | Finalidade |
|---|---|---|
| `DIARIO_DADOS` | Binding de namespace KV | Armazena `diario:v3` e os backups automáticos |
| `TABLET_TOKEN` | Secret do Worker | Token exclusivo validado no cabeçalho Bearer |

`TABLET_TOKEN` é um segredo criado no próprio Worker. **Não use um API Token administrativo da conta Cloudflare.** O valor não deve ser escrito em `wrangler.jsonc`, enviado ao GitHub ou incluído no código-fonte.

### Endpoint exposto

Todas as operações usam a rota `/diario` e o cabeçalho:

```http
Authorization: Bearer SEU_TOKEN_EXCLUSIVO
```

| Método | Rota | Comportamento |
|---|---|---|
| `GET` | `/diario` | Devolve o banco JSON completo; retorna `{}` quando ainda não há dados |
| `PUT` | `/diario` | Valida e substitui o banco JSON completo |
| `OPTIONS` | `/diario` | Responde à verificação CORS do navegador |

O `PUT` aceita no máximo 1 MB e exige um JSON da versão 3 contendo `classes` e `records`. Antes de substituir `diario:v3`, o Worker guarda a versão anterior em `backup:v3:<timestamp>`, com expiração de 90 dias. Esses backups não possuem endpoint público de restauração; a recuperação é feita pelo painel do KV ou por ferramenta administrativa.

Respostas importantes:

| Código | Significado |
|---:|---|
| `200` | Leitura ou gravação concluída |
| `204` | Verificação CORS aceita |
| `400` | JSON inválido ou incompatível com a versão 3 |
| `401` | Bearer token ausente ou incorreto |
| `404` | Rota diferente de `/diario` |
| `405` | Método não permitido |
| `413` | Corpo vazio ou maior que 1 MB |

### Fluxo de sincronização

Ao tocar em **Sincronizar agora**, o aplicativo:

1. executa `GET /diario`;
2. mescla localmente turmas, planos, chamadas, qualitativas, avaliações e configurações do diário oficial;
3. preserva registros excluídos e escolhe a versão mais recente de cada registro pelo identificador;
4. envia o resultado consolidado com `PUT /diario`;
5. salva o mesmo resultado no aparelho.

Assim, uma chamada salva e sincronizada no tablet aparece no celular depois que o celular executar sua própria sincronização. Para evitar disputa entre gravações do blob único, não sincronize dois aparelhos exatamente ao mesmo tempo: conclua a sincronização no primeiro e depois sincronize o segundo.

### Implantação

Dentro da pasta do Worker:

```bash
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create DIARIO_DADOS
```

Copie o ID da namespace para o campo `id` de `wrangler.jsonc`. Depois cadastre o secret e publique:

```bash
npx wrangler secret put TABLET_TOKEN
npm run deploy
```

Também é possível criar a namespace, o binding `DIARIO_DADOS` e o secret `TABLET_TOKEN` pelo painel **Workers & Pages** da Cloudflare. No aplicativo, abra **Cadastros → Backup e nuvem** e informe:

- a URL pública do Worker, por exemplo `https://seu-worker.workers.dev/diario`;
- o mesmo valor cadastrado no secret `TABLET_TOKEN`.

O aplicativo acrescenta `/diario` automaticamente quando a URL for informada sem essa rota. A URL e o token ficam no armazenamento local do navegador e não são incorporados ao HTML.

### Teste manual da API

```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  https://seu-worker.workers.dev/diario

curl -X PUT \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @backup-diario.json \
  https://seu-worker.workers.dev/diario
```

O arquivo enviado pelo segundo comando precisa ser um backup completo exportado pela versão 3 do aplicativo. Para instruções resumidas de publicação e atualização segura, consulte `INSTALACAO.md`.
