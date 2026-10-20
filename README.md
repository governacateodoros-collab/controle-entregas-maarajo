# Grupo Marajó · Gestão de entregas

Aplicação React, Vite, Tailwind CSS, Lucide React e Recharts. Requer Node.js 22 ou superior.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173
```

Para produção: `npm run build`; para conferir o build: `npm run preview -- --port 4173`.

## Operação

- Indicadores, gráficos e listagem compartilham os filtros de período, loja, cliente e motorista.
- Entregas têm cadastro, detalhes, edição, exclusão com confirmação, CSV compatível com Excel e impressão.
- Clientes e fazendas: 45 vínculos extraídos de NOVA ENTREGA.xlsx. As 5 lojas vêm da aba APOIO_LOJAS; cidades das filiais são ilustrativas e editáveis.
- As 24 entregas iniciais são demonstrativas, de outubro de 2026. A planilha original não contém uma base completa de entregas reais.
- Persistência em localStorage, sem backend, login, compartilhamento entre dispositivos ou sincronização. Exportar CSV é recomendado para preservar os registros.
- Dados locais possuem chaves `marajo-entregas-v1`, `marajo-clientes-v1` e `marajo-lojas-v1`. Não limpe o armazenamento sem exportar.

Componentes: Sidebar, Header, DashboardStats, Charts, TabelaEntregas, ModalNovaEntrega e EntityForm. Campos e exemplos ficam em `src/data.js`; base importada em `src/clientes.json`.
