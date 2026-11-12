// Categorias dos lançamentos: as do app de finanças que o Bruno usa (nomes em inglês), com ícone, cor, grupo e uma
// descrição curta quando o nome não diz tudo (ex.: YEP = o apartamento da família).
//
// `aliases` são os nomes que o agente usa hoje no JSON (var-itau.categorias em português, `categoria` das despesas em
// minúsculo): lançar em "Supermarket" soma em "Mercado" enquanto o agente não passar a usar os nomes em inglês.
// `conta`: categoria que o agente usa nas despesas fora do cartão (Pix/débito), quando há uma.
//
// A lista é editável no app (v6.3: renomear, ícone, emoji, cor, grupo, excluir, criar). A editada fica no próprio
// painel, em `categoriasApp.lista` (o Rafael vê os mesmos ícones e o agente vê os nomes); sem ela, vale CATEGORIAS.
// As funções recebem a lista no último parâmetro; sem ele, usam a lista ativa (definirCategorias).

export const ICONES = {
  banco: '<path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3l9 5H3z"/>',
  beleza: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 10h.01M15 10h.01"/>',
  roupa: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  bola: '<circle cx="12" cy="12" r="9"/><path d="m12 8 3.2 2.3-1.2 3.7h-4l-1.2-3.7zM12 8V3.5M15.2 10.3l4.3-1.4M14 14l2.6 3.6M10 14l-2.6 3.6M8.8 10.3 4.5 8.9"/>',
  bebe: '<path d="M4 9h11a6 6 0 0 1-6 6H8a4 4 0 0 1-4-4zM15 9V4a6 6 0 0 1 5 5"/><circle cx="7" cy="19" r="1.5"/><circle cx="14" cy="19" r="1.5"/>',
  fogao: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 9h14M9 6h.01M12 6h.01M15 6h.01"/><rect x="8" y="12" width="8" height="6" rx="1"/>',
  livro: '<path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5c-3-.5-6 0-8 1.5zM12 6v14.5"/>',
  tela: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  delivery: '<path d="M6 3v8M4 3v4a2 2 0 0 0 4 0V3M6 11v10M14 9h6l-1 12h-4zM15.5 9V6.5a1.5 1.5 0 0 1 3 0V9"/>',
  controle: '<path d="M6 9h12a4 4 0 0 1 3.9 4.9l-.6 2.6a2.5 2.5 0 0 1-4.5.8L15.5 15h-7l-1.3 2.3a2.5 2.5 0 0 1-4.5-.8l-.6-2.6A4 4 0 0 1 6 9zM8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01"/>',
  presente: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8C10.5 4 7 3.5 7 6s3 2 5 2zm0 0c1.5-4 5-4.5 5-2s-3 2-5 2z"/>',
  haltere: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',
  saude: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M12 10.5v6M9 13.5h6"/>',
  casa: '<path d="m3 11 9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6"/>',
  predio: '<path d="M4 21V5l8-2v18M12 8l8 3v10M3 21h18M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2"/>',
  chama: '<path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5.3 2 1.5 3 2.5 3 0-3 0-5.5 1.5-8.5z"/>',
  wifi: '<path d="M2 8.5a14.5 14.5 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"/>',
  lampada: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l2 2M15 8l2 2"/>',
  gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  alta: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>',
  sol: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v7a2 2 0 0 0 4 0"/>',
  pata: '<path d="M12 13c-3 0-5 3-5 5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2c0-2-2-5-5-5z"/><circle cx="6" cy="10" r="1.6"/><circle cx="18" cy="10" r="1.6"/><circle cx="9.5" cy="6" r="1.6"/><circle cx="14.5" cy="6" r="1.6"/>',
  pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 6"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4"/>',
  pontos: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
  pix: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/><path d="m8.5 12 3.5-3.5 3.5 3.5-3.5 3.5z"/>',
  arvores: '<path d="M7 3l4 7H3zM7 10v4M17 3l4 7h-8zM17 10v4M3 20c3-2.5 6-2.5 9 0s6 2.5 9 0"/>',
  xicara: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>',
  prancheta: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  camera: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  carrinho: '<path d="M3 4h2l2.5 11h11L21 7H6.5"/><circle cx="10" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  pilula: '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7"/>',
  carro: '<path d="m4 12 2-5h12l2 5M4 12h16v5H4zM6 17v2M18 17v2M7.5 14.5h.01M16.5 14.5h.01"/>',
  aviao: '<path d="m10 21 2-1 2 1v-2l-1.5-1.5V13l8 3v-2l-8-5V4.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-3v4.5L8 19z"/>',
  aquecedor: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9v6M12 9v6M16 9v6"/>',
  etiqueta: '<path d="M3 12V4h8l10 10-8 8zM7.5 7.5h.01"/>',
  // galeria extra (para categorias novas)
  coracao: '<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-3 4.5 4.5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>',
  estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  musica: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  ingresso: '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3zM14 6v12"/>',
  pizza: '<path d="M12 3 3 20c6 2 12 2 18 0zM12 3l9 17M8.5 12h.01M14 15h.01M11 17h.01"/>',
  taca: '<path d="M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M8.5 20h7"/>',
  bolo: '<path d="M4 21h16v-8H4zM4 16c2 1 4 1 6 0s4-1 6 0 4 1 4 0M8 13V9M12 13V9M16 13V9M8 6v.01M12 6v.01M16 6v.01"/>',
  bike: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 9h6l3.5 7.5M9 9 12 16.5h-6.5M14 6h2.5"/>',
  onibus: '<rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16M8 18v2M16 18v2M8 15h.01M16 15h.01M4 7h16"/>',
  combustivel: '<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M4 10h11M15 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  ferramenta: '<path d="M14.5 6.5a4 4 0 0 1 5 5l-9 9-3-3 9-9a4 4 0 0 1-2-2zM4 20l2-2"/>',
  celular: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  notebook: '<rect x="5" y="4" width="14" height="10" rx="1.5"/><path d="M2.5 18h19l-1.5-4H4z"/>',
  sacola: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  tesoura: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5 20 18M8.5 15.5 20 6"/>',
  dente: '<path d="M7 3c-2 0-4 2-4 5 0 4 2 5 2.5 9 .3 2 1 4 2.5 4s1.5-3 2-5c.5-2 1.5-2 2 0 .5 2 .5 5 2 5s2.2-2 2.5-4C17 13 19 12 19 8c0-3-2-5-4-5-1.5 0-2.5 1-3 1s-1.5-1-5-1z"/>',
  planta: '<path d="M12 21v-9M12 12c0-5 4-8 8-8 0 5-3 8-8 8zM12 15c0-4-3-6-7-6 0 4 3 6 7 6zM8 21h8"/>',
  montanha: '<path d="m3 20 6-11 4 6 2-3 6 8z"/>',
  mala: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18"/>',
  cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  porquinho: '<path d="M5 11a7 6 0 0 1 12-2h2l1 3-2 1v3a3 3 0 0 1-3 3v2h-2v-2h-3v2H8v-2.5A6 6 0 0 1 5 11zM15 11h.01M10 7h4"/>',
  moeda: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M14.5 9c-.4-.9-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 1.9 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2.1-.6-2.5-1.5"/>',
  fone: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  crianca: '<circle cx="12" cy="5.5" r="2.5"/><path d="M8 21l1-7-3-3 2-2 4 2 4-2 2 2-3 3 1 7M10 14h4"/>',
};

export const GRUPOS = ['Alimentação', 'Casa', 'Saúde e corpo', 'Família', 'Lazer', 'Compras', 'Transporte', 'Dinheiro', 'Outros'];

// Cores (círculo atrás do ícone branco, contraste ≥ 3:1): uma família por grupo, para achar de olho
export const CORES = ['#dc2626', '#b91c1c', '#c2410c', '#d97706', '#a16207', '#4d7c0f', '#15803d', '#16a34a', '#0f766e', '#0d9488',
  '#0891b2', '#0284c7', '#2563eb', '#1e40af', '#6d28d9', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#be185d', '#e11d48', '#92400e', '#57534e', '#475569', '#18181b'];

// sugerida: não está na lista do Bruno, criada para cobrir o que o agente já usa.
// Família: Bruno, Rafael (esposa), Theo (filho) e Mia (pet) — Rafael, Theo e Mia ficam dentro de Family.
export const CATEGORIAS = [
  { nome: 'Supermarket', grupo: 'Alimentação', icone: 'carrinho', cor: '#dc2626', aliases: ['mercado', 'supermercado', 'feira'] },
  { nome: 'Food Delivery', grupo: 'Alimentação', icone: 'delivery', cor: '#b91c1c', aliases: ['delivery', 'ifood'] },
  { nome: 'Restaurant', grupo: 'Alimentação', icone: 'xicara', cor: '#c2410c', aliases: ['restaurante', 'restaurantes', 'bar', 'lanche'] },
  { nome: 'Home', grupo: 'Casa', icone: 'casa', cor: '#2563eb', aliases: ['casa', 'moradia'], conta: 'moradia', descricao: 'Contas e gastos da casa atual' },
  { nome: 'Rent', pai: 'Home', grupo: 'Casa', icone: 'chave', cor: '#2563eb', aliases: ['aluguel', 'condomínio', 'condominio'], conta: 'moradia' },
  { nome: 'Lights', pai: 'Home', grupo: 'Casa', icone: 'lampada', cor: '#2563eb', aliases: ['energia', 'luz'], conta: 'contas' },
  { nome: 'Gas', pai: 'Home', grupo: 'Casa', icone: 'chama', cor: '#2563eb', aliases: ['gás'], conta: 'contas' },
  { nome: 'Water', pai: 'Home', grupo: 'Casa', icone: 'gota', cor: '#2563eb', aliases: ['água', 'agua'], conta: 'contas' },
  { nome: 'Internet/Mobile', pai: 'Home', grupo: 'Casa', icone: 'wifi', cor: '#2563eb', aliases: ['internet', 'celular', 'telefone'], conta: 'contas' },
  { nome: 'Domestic Utilities', grupo: 'Casa', icone: 'fogao', cor: '#0284c7', aliases: ['utilidades domésticas', 'utilidades'], descricao: 'Utensílios e itens para casa' },
  { nome: 'YEP', grupo: 'Casa', icone: 'predio', cor: '#1e40af', aliases: ['aquecedor (yep)', 'aquecedor', 'apartamento', 'apê'], descricao: 'Nosso apê — o futuro apartamento' },
  { nome: 'Health', grupo: 'Saúde e corpo', icone: 'saude', cor: '#16a34a', aliases: ['saúde', 'saude', 'farmácia', 'farmacia', 'médico'] },
  { nome: 'Gym', grupo: 'Saúde e corpo', icone: 'haltere', cor: '#15803d', aliases: ['academia'] },
  { nome: 'Supplements', grupo: 'Saúde e corpo', icone: 'pilula', cor: '#4d7c0f', aliases: ['suplementos', 'suplemento'] },
  { nome: 'Beauty', grupo: 'Saúde e corpo', icone: 'beleza', cor: '#c026d3', aliases: ['beleza', 'cabelo'] },
  { nome: 'Family', grupo: 'Família', icone: 'pessoas', cor: '#be185d', aliases: ['familia', 'família'], conta: 'familia', descricao: 'Bruno, Rafael, Theo e Mia — gastos da família', sugerida: true },
  { nome: 'Rafael', pai: 'Family', grupo: 'Família', icone: 'coracao', cor: '#be185d', aliases: ['rafael', 'mesada rafael', 'mesada rafael', 'pix rafael'], conta: 'familia', descricao: 'Mesada e Pix para o Rafael' },
  { nome: 'Theo', pai: 'Family', grupo: 'Família', icone: 'bebe', cor: '#be185d', aliases: ['mesada theo'], conta: 'familia', descricao: 'Nosso filho' },
  { nome: 'Mia', pai: 'Family', grupo: 'Família', icone: 'pata', cor: '#be185d', aliases: ['mia (pet)', 'pet', 'pet shop', 'petshop'], descricao: 'Nossa pet: ração, veterinário, banho' },
  { nome: 'Gift', grupo: 'Família', icone: 'presente', cor: '#e11d48', aliases: ['presente', 'presentes'] },
  { nome: 'Education', grupo: 'Família', icone: 'livro', cor: '#9333ea', aliases: ['educação', 'escola', 'cursos'] },
  { nome: 'Leisure', grupo: 'Lazer', icone: 'sol', cor: '#d97706', aliases: ['lazer'] },
  { nome: 'Streaming', grupo: 'Lazer', icone: 'camera', cor: '#7c3aed', aliases: ['assinaturas'] },
  { nome: 'Games', grupo: 'Lazer', icone: 'controle', cor: '#6d28d9', aliases: ['jogos'] },
  { nome: 'Clube', grupo: 'Lazer', icone: 'bola', cor: '#18181b', aliases: [] },
  { nome: 'Travel', grupo: 'Lazer', icone: 'aviao', cor: '#0891b2', aliases: ['viagem', 'viagens'] },
  { nome: 'Resort', grupo: 'Lazer', icone: 'arvores', cor: '#0f766e', aliases: ['sítio', 'sitio', 'chácara'] },
  { nome: 'Clothing', grupo: 'Compras', icone: 'roupa', cor: '#0e7490', aliases: ['roupas', 'roupa', 'vestuário'] },
  { nome: 'Electronics', grupo: 'Compras', icone: 'tela', cor: '#a16207', aliases: ['eletrônicos', 'eletronicos'] },
  { nome: 'Transportation', grupo: 'Transporte', icone: 'carro', cor: '#0369a1', aliases: ['transporte', 'uber', 'metrô', 'metro'], conta: 'transporte' },
  { nome: 'Bank Taxes', grupo: 'Dinheiro', icone: 'banco', cor: '#475569', aliases: ['financeiro', 'tarifas', 'juros', 'iof', 'tarifa bancária'], conta: 'financeiro', descricao: 'Tarifas, juros e IOF' },
  { nome: 'Taxes', grupo: 'Dinheiro', icone: 'recibo', cor: '#57534e', aliases: ['impostos', 'imposto', 'ir'], conta: 'impostos', descricao: 'IR e outros impostos', sugerida: true },
  { nome: 'Investments', grupo: 'Dinheiro', icone: 'alta', cor: '#0f766e', aliases: ['investimentos', 'investimento', 'aporte'] },
  { nome: 'PIX', grupo: 'Dinheiro', icone: 'pix', cor: '#0d9488', aliases: [], descricao: 'Pix pago no cartão de crédito' },
  { nome: 'Services', grupo: 'Outros', icone: 'prancheta', cor: '#3f6212', aliases: ['serviços', 'servicos'], descricao: 'Serviços, consertos, assinaturas de apps' },
  { nome: 'Others', grupo: 'Outros', icone: 'pontos', cor: '#6b7280', aliases: ['outros', 'outras'] },
];

export const norm = s => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------- lista ativa (a do painel, se o Bruno editou; senão a padrão) ----------
let ativa = CATEGORIAS;
export const definirCategorias = lista => { ativa = Array.isArray(lista) && lista.length ? lista : CATEGORIAS; };
export const categoriasAtivas = () => ativa;
export const listaDoPainel = dados => (Array.isArray(dados?.categoriasApp?.lista) && dados.categoriasApp.lista.length ? dados.categoriasApp.lista : null);

const indices = new WeakMap();
function indice(lista) {
  let m = indices.get(lista);
  if (!m) {
    m = new Map();
    for (const c of lista) for (const n of [c.nome, ...(c.aliases || [])]) if (!m.has(norm(n))) m.set(norm(n), c);
    indices.set(lista, m);
  }
  return m;
}

// Categoria pelo nome ou por um nome que o agente usa
export const acharCategoria = (nome, lista = ativa) => indice(lista).get(norm(nome)) || null;

// "Supermarket" e "Mercado" são a mesma categoria
export function mesmaCategoria(a, b, lista = ativa) {
  if (norm(a) === norm(b)) return true;
  const ca = acharCategoria(a, lista);
  return !!ca && ca === acharCategoria(b, lista);
}

// Ícone redondo colorido (como no app de finanças). Ícone próprio: um emoji no lugar do desenho.
export function iconeCategoria(nome, classe = '', lista = ativa) {
  const c = typeof nome === 'object' && nome ? nome : acharCategoria(nome, lista);
  return iconeDe(c, classe);
}
export function iconeDe(c, classe = '') {
  const cor = c?.cor || '#7a7470';
  if (c?.emoji) return `<span class="cat-ic emoji ${classe}" style="--cat:${cor}" aria-hidden="true">${esc(c.emoji)}</span>`;
  return `<span class="cat-ic ${classe}" style="--cat:${cor}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[c?.icone] || ICONES.etiqueta}</svg></span>`;
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// Nome para mostrar: o da lista quando a categoria é conhecida (ex.: "transporte" → "Transportation")
export const nomeCategoria = (nome, lista = ativa) => acharCategoria(nome, lista)?.nome || nome;

// Categoria de uma conta do agente (v7): o slug ("contas") diz pouco; a descrição ("Gás") acha a subcategoria
// certa quando ela é do mesmo tipo. Devolve o nome do catálogo ou o slug com maiúscula.
export function categoriaDoItem(it, lista = ativa) {
  const desc = String(it?.descricao || '').replace(/\s*\([^)]*\)/g, '').split(/\s+—\s+/)[0].trim();
  const porNome = acharCategoria(desc, lista);
  if (porNome && (!it.categoria || porNome.conta === it.categoria)) return porNome.nome;
  const c = acharCategoria(it?.categoria || '', lista);
  if (c) return c.nome;
  const t = String(it?.categoria || '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

// Valor a gravar numa despesa de conta (Pix/débito): a categoria que o agente usa, se houver
export const categoriaDeConta = (nome, lista = ativa) => acharCategoria(nome, lista)?.conta || nome;

// Palpite de categoria para uma assinatura ou parcela que veio do agente sem categoria (nome do serviço ou da loja)
const SERVICOS = [
  [/netflix|hbo|max\b|disney|prime video|amazon prime|globoplay|paramount|youtube|spotify|deezer|apple tv|crunchyroll|star\+/i, 'Streaming'],
  [/petlove|petz|cobasi|ra[cç][aã]o|veterin/i, 'Mia'],
  [/anticoncep|farm[aá]cia|drogasil|droga ?raia|unimed|amil|bradesco sa[uú]de|consulta/i, 'Health'],
  [/meli\+|mercado livre|mercado pago|ifood clube/i, 'Services'],
  [/claude|chatgpt|openai|google one|icloud|dropbox|microsoft|office|adobe|canva|notion/i, 'Services'],
  [/smart ?fit|academia|gympass|wellhub|total ?pass/i, 'Gym'],
  [/clube|fiel torcedor/i, 'Clube'],
  [/leiturinha|escola|curso|duolingo|alura/i, 'Education'],
  [/xbox|playstation|psn|steam|nintendo/i, 'Games'],
  [/ifood|rappi|99 ?food/i, 'Food Delivery'],
  [/uber|\b99\b|metr[oô]|sem parar|veloe/i, 'Transportation'],
  [/samsung|apple|kabum|fast ?shop|dell\b|lenovo|xiaomi/i, 'Electronics'],
  [/new ?balance|nike|adidas|renner|riachuelo|\bc&a\b|zara|netshoes|centauro|hering|osklen/i, 'Clothing'],
];
export function adivinharCategoria(nome, lista = ativa) {
  const direto = acharCategoria(nome, lista);
  if (direto) return direto.nome;
  for (const palavra of String(nome || '').split(/[\s—–-]+/)) {
    const c = acharCategoria(palavra, lista);
    if (c) return c.nome;
  }
  for (const [re, cat] of SERVICOS) if (re.test(nome || '')) return acharCategoria(cat, lista)?.nome || cat;
  return null;
}
