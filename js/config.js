// =============================================
//  CONFIGURAÇÃO GERAL — edite só este arquivo
// =============================================

// Supabase: Project Settings > API (ou "Connect") no painel do Supabase
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "COLE-AQUI-A-CHAVE-ANON-PUBLICA";

// WhatsApp da empresa: 55 + DDD + número, só dígitos
const WHATSAPP_NUMERO = "5514996668168";

// Nome exibido nas mensagens
const NOME_EMPRESA = "Pai e Filho Roçadas";

// ---------------------------------------------
// Não precisa mexer daqui pra baixo
// ---------------------------------------------
const db = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function linkWhatsApp(mensagem) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Evita que texto digitado vire HTML na tela
function esc(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Liga todos os botões com data-whatsapp="mensagem"
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.href = linkWhatsApp(el.dataset.whatsapp || `Olá! Vim pelo site da ${NOME_EMPRESA} e quero saber mais.`);
    el.target = "_blank";
    el.rel = "noopener";
  });
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
});
