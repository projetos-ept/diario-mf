# Instalação e publicação

## Opção A — HTML único no tablet

Use `dist/diario-escolar-offline.html`. Esta opção não precisa de servidor nem de instalação. Ela funciona offline e é a mais simples para copiar por cabo, Bluetooth ou cartão de memória.

## Opção B — PWA instalável

Publique a pasta `dist/pwa/` em HTTPS. Na primeira abertura, permita a instalação. Após o carregamento inicial, o aplicativo funciona offline.

## API Cloudflare opcional

Se o Worker atual já possui a rota `/diario`, GET/PUT, Bearer token e CORS, ele pode ser usado. Para criar um novo:

```bash
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create DIARIO_DADOS
```

Copie o ID obtido para `worker/wrangler.jsonc`. Depois configure o secret e publique:

```bash
npx wrangler secret put TABLET_TOKEN
npm run deploy
```

O Worker permite:

- `GET /diario` com `Authorization: Bearer TOKEN`;
- `PUT /diario` com o mesmo cabeçalho;
- CORS para PWA e HTML local;
- cópia anterior no KV por 90 dias.

No aplicativo, abra **Cadastros → Backup e nuvem**, informe o endereço terminado em `/diario` e o token.

## Atualização segura

Antes de substituir o HTML ou atualizar a PWA:

1. exporte o JSON completo;
2. guarde o arquivo em outro dispositivo;
3. instale a nova versão;
4. importe o backup se o navegador não encontrar os dados antigos.
