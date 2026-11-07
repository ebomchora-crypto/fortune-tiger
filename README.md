# Fortune Tiger — Demo (portfólio)

Clone visual e de mecânica do slot **Fortune Tiger**, construído como peça de portfólio/estudo.

> ⚠️ **Isto é uma demo educacional.** Usa apenas saldo fictício (sem valor real), não processa
> pagamentos, não faz depósitos/saques e não se conecta a nenhum provedor de jogos de azar.
> Não é um produto de apostas real e não deve ser operado como tal — oferecer apostas com
> dinheiro real exige licenciamento específico (no Brasil, autorização da SPA/Loterias),
> verificação de idade/identidade (KYC) e controles de jogo responsável, nada disso está aqui.

## Como rodar

Não há build step — é HTML/CSS/JS puro. Basta servir a pasta estaticamente:

```bash
cd fortune-tiger
python3 -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador (melhor visualizado em largura de celular,
~390px). Também funciona abrindo `index.html` diretamente no navegador.

## O que está implementado

- Grade de rolos 3×3 com coluna central mais larga, igual ao layout original.
- 4 símbolos pagantes (lingote, moeda de jade, envelope vermelho, fogos de artifício) + **Wild**
  (tigre) que expande a coluna inteira e aplica um multiplicador aleatório (x2, x3, x5, x10).
- 5 linhas de pagamento (topo, meio, base, pico, vale).
- Medidor "Cidade Tigre da Sorte": acumular Wilds ativa o bônus de **Rodadas Grátis**
  (8 rodadas com chance maior de Wild), com banner de entrada/saída.
- Popup de "Grande Vitória / Vitória Épica" com contagem animada.
- Painel de opções de aposta (níveis, valor da moeda, montante) igual ao modal original.
- Controles: aumentar/diminuir aposta, Turbo (giro mais rápido), Autoplay, som (efeitos
  sintetizados via Web Audio API, sem arquivos de áudio externos), relógio no topo.
- Todos os ícones são SVGs/CSS desenhados no próprio código — nenhum asset externo é necessário.

## Estrutura

```
index.html   # markup da tela (reels, controles, modal de aposta, banners)
style.css    # tema visual (vermelho/dourado, pagoda, animações)
app.js       # estado do jogo, geração dos rolos, avaliação de linhas, efeitos
```

## Próximos passos possíveis

- Trocar nome/arte por uma marca própria antes de qualquer publicação pública (o nome e a
  identidade visual "Fortune Tiger" pertencem à PG Soft).
- Se a intenção evoluir para dinheiro real, isso exigiria: licença de jogo de azar na
  jurisdição aplicável, backend com RNG certificado, KYC/AML, processador de pagamentos
  regulado e ferramentas de jogo responsável — nenhuma dessas camadas está implementada aqui.
