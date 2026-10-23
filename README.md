# Meridiano

Jornal pessoal de economia, mercados e geopolítica. Interface editorial responsiva, busca, editorias, favoritos locais e modo escuro. Sem frameworks, APIs pagas ou chaves de acesso.

## Executar

Python 3.12+ e acesso à internet:

```sh
python scripts/update_news.py
python -m http.server 8000 --directory dist
```

Abra http://localhost:8000. O coletor usa apenas a biblioteca padrão.

## Notícias e atualização

Feeds públicos: Agência Brasil (economia), BBC (business e world) e CNBC (mercados). Manchetes internacionais mantêm o idioma original; o site não inventa resumos ou análises. Cada item abre a matéria na fonte. Disponibilidade de conteúdo e paywalls dependem do editor.

A rotina GitHub Actions coleta diariamente às 07h17, 13h17 e 19h17 de Brasília (10h17, 16h17 e 22h17 UTC), salva news.json e publica dist no GitHub Pages. O GitHub pode atrasar agendamentos e desativar rotinas de repositórios públicos após períodos de inatividade. Execução manual: Actions → Atualizar edição e publicar → Run workflow.

Em Settings → Pages, selecione GitHub Actions como origem. Publicar no Pages torna o conteúdo acessível publicamente. Favoritos permanecem apenas no navegador; não são enviados ao servidor. O Google Fonts recebe solicitações de fontes; fontes locais de sistema funcionam como alternativa.

Falha parcial preserva as notícias anteriores daquela categoria e sinaliza fontes indisponíveis. Falha de todos os feeds interrompe a rotina para preservar a edição anterior. O site avisa quando a última coleta supera 36 horas.

## Continuidade — 23/10/2026

Projeto iniciado no repositório AFortuna5/finance. Nome editorial escolhido: Meridiano. Conteúdo educativo estático, sem recomendações de investimento, cotações fictícias ou dependência de IA. Arquivos servidos em dist; coletor em scripts/update_news.py. GitHub Pages é a hospedagem com atualização automática pelo mesmo repositório. Uma publicação adicional no Sites é um retrato da edição; não acompanha automaticamente os commits do GitHub.
