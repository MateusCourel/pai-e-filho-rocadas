// =============================================
//  PAINEL ADMINISTRATIVO — Pai e Filho Roçadas
// =============================================

const STATUS = {
  pendente:     { texto: "Pendente",     cor: "secondary" },
  agendado:     { texto: "Agendado",     cor: "primary" },
  em_andamento: { texto: "Em andamento", cor: "warning" },
  concluido:    { texto: "Concluído",    cor: "success" },
  cancelado:    { texto: "Cancelado",    cor: "danger" },
};

let planos = [];
let pedidos = [];

const $ = (sel) => document.querySelector(sel);
const modalPedido = new bootstrap.Modal("#modalPedido");
const modalPlano = new bootstrap.Modal("#modalPlano");
const toast = new bootstrap.Toast("#toast", { delay: 2500 });

function aviso(msg) { $("#toastMsg").textContent = msg; toast.show(); }
function hojeISO() { return new Date().toLocaleDateString("sv-SE"); } // AAAA-MM-DD no fuso local
function dataBR(iso) { return iso ? iso.split("-").reverse().join("/") : "—"; }
function badge(status) {
  const s = STATUS[status] || { texto: status, cor: "light" };
  return `<span class="badge text-bg-${s.cor} status-badge">${s.texto}</span>`;
}

// ---------- Endereço e mapas ----------
function enderecoTexto(p) {
  const rua = [p.logradouro, p.numero].filter(Boolean).join(", ");
  return [rua, p.bairro, p.cidade && p.uf ? `${p.cidade} - ${p.uf}` : p.cidade, p.cep]
    .filter(Boolean).join(", ");
}
function linksMapa(endereco) {
  const q = encodeURIComponent(endereco);
  return {
    embed:  `https://www.google.com/maps?q=${q}&output=embed`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    apple:  `https://maps.apple.com/?daddr=${q}`,   // no iPhone abre o app Mapas
    waze:   `https://waze.com/ul?q=${q}&navigate=yes`,
  };
}
function whatsCliente(telefone) {
  let n = String(telefone || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.length <= 11) n = "55" + n;
  return `https://wa.me/${n}`;
}

// ---------- Login obrigatório ----------
async function iniciar() {
  const { data } = await db.auth.getSession();
  if (!data.session) { location.href = "login.html"; return; }
  $("#usuario").textContent = data.session.user.email;
  await carregarPlanos();
  await carregarPedidos();
}
$("#btnSair").onclick = async () => { await db.auth.signOut(); location.href = "login.html"; };

// =============================================
//  PLANOS
// =============================================
async function carregarPlanos() {
  const { data, error } = await db.from("planos").select("*").order("ordem");
  if (error) return aviso("Erro ao carregar planos: " + error.message);
  planos = data;

  $("#tabelaPlanos").innerHTML = planos.map((p) => `
    <tr>
      <td>${p.ordem}</td>
      <td><strong>${esc(p.nome)}</strong>${p.destaque ? ' <i class="bi bi-star-fill text-warning"></i>' : ""}</td>
      <td>${p.tipo_cobranca === "mensal" ? "Mensal" : "Avulso"}</td>
      <td>${formatarMoeda(p.preco)}</td>
      <td>${p.area_max_m2 ? p.area_max_m2 + " m²" : "—"}</td>
      <td>${p.ativo ? '<span class="badge text-bg-success">Sim</span>' : '<span class="badge text-bg-secondary">Não</span>'}</td>
      <td class="text-end"><button class="btn btn-sm btn-outline-secondary" onclick="abrirPlano(${p.id})"><i class="bi bi-pencil"></i></button></td>
    </tr>`).join("");

  const select = document.querySelector('#formPedido [name="plano_id"]');
  select.innerHTML = '<option value="">— selecione —</option>' +
    planos.map((p) => `<option value="${p.id}">${esc(p.nome)}${p.ativo ? "" : " (inativo)"}</option>`).join("");
}

function abrirPlano(id) {
  const f = $("#formPlano");
  f.reset();
  const p = planos.find((x) => x.id === id);
  f.elements.id.value = p?.id || "";
  if (p) {
    ["nome", "descricao", "preco", "tipo_cobranca", "area_max_m2", "ordem", "inclui"]
      .forEach((c) => (f[c].value = p[c] ?? ""));
    f.destaque.checked = p.destaque;
    f.ativo.checked = p.ativo;
  }
  modalPlano.show();
}
$("#btnNovoPlano").onclick = () => abrirPlano(null);

$("#formPlano").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  const dados = {
    nome: f.nome.value.trim(),
    descricao: f.descricao.value.trim() || null,
    preco: f.preco.value || null,
    tipo_cobranca: f.tipo_cobranca.value,
    area_max_m2: f.area_max_m2.value || null,
    ordem: f.ordem.value || 0,
    inclui: f.inclui.value.trim() || null,
    destaque: f.destaque.checked,
    ativo: f.ativo.checked,
  };
  const q = f.elements.id.value
    ? db.from("planos").update(dados).eq("id", f.elements.id.value)
    : db.from("planos").insert(dados);
  const { error } = await q;
  if (error) return aviso("Erro: " + error.message);
  modalPlano.hide();
  aviso("Plano salvo!");
  carregarPlanos();
};

// =============================================
//  PEDIDOS
// =============================================
async function carregarPedidos() {
  const { data, error } = await db.from("pedidos")
    .select("*, planos(nome)")
    .order("data_agendada", { ascending: true, nullsFirst: false })
    .order("criado_em", { ascending: false });
  if (error) return aviso("Erro ao carregar pedidos: " + error.message);
  pedidos = data;
  atualizarResumo();
  renderPedidos();
}

function atualizarResumo() {
  const hoje = hojeISO();
  const mes = hoje.slice(0, 7);
  $("#resHoje").textContent = pedidos.filter((p) => p.data_agendada === hoje && p.status !== "cancelado").length;
  $("#resAbertos").textContent = pedidos.filter((p) => ["pendente", "agendado"].includes(p.status)).length;
  $("#resMes").textContent = pedidos.filter((p) => p.status === "concluido" && (p.data_conclusao || "").startsWith(mes)).length;
  const aReceber = pedidos
    .filter((p) => p.status === "concluido" && !p.pago)
    .reduce((s, p) => s + Number(p.valor_combinado || 0), 0);
  $("#resReceber").textContent = formatarMoeda(aReceber);
}

function filtrados() {
  const termo = $("#busca").value.trim().toLowerCase();
  const st = $("#filtroStatus").value;
  return pedidos.filter((p) => {
    if (st === "abertos" && !["pendente", "agendado", "em_andamento"].includes(p.status)) return false;
    if (st && st !== "abertos" && p.status !== st) return false;
    if (!termo) return true;
    return [p.cliente_nome, p.cliente_telefone, p.logradouro, p.bairro, p.cidade, p.cep]
      .some((v) => (v || "").toLowerCase().includes(termo));
  });
}

function renderPedidos() {
  const lista = filtrados();
  const hoje = hojeISO();
  $("#semPedidos").classList.toggle("d-none", lista.length > 0);

  // Tabela (computador)
  $("#tabelaPedidos").innerHTML = lista.map((p) => {
    const atrasado = p.data_agendada && p.data_agendada < hoje && ["pendente", "agendado"].includes(p.status);
    const mapa = linksMapa(enderecoTexto(p));
    return `
      <tr class="${atrasado ? "table-danger" : ""}">
        <td>${dataBR(p.data_agendada)}${p.data_agendada === hoje ? ' <span class="badge text-bg-warning">Hoje</span>' : ""}</td>
        <td><strong>${esc(p.cliente_nome)}</strong><br><small class="text-muted">${esc(p.cliente_telefone || "")}</small></td>
        <td class="small">${esc([p.logradouro, p.numero].filter(Boolean).join(", "))}<br><span class="text-muted">${esc(p.bairro || "")}</span></td>
        <td>${esc(p.planos?.nome || "—")}</td>
        <td>${formatarMoeda(p.valor_combinado)}${p.pago ? ' <i class="bi bi-check-circle-fill text-success" title="Pago"></i>' : ""}</td>
        <td>${badge(p.status)}</td>
        <td class="text-end text-nowrap">
          <a class="btn btn-sm btn-outline-primary" href="${mapa.google}" target="_blank" title="Rota"><i class="bi bi-geo-alt"></i></a>
          ${whatsCliente(p.cliente_telefone) ? `<a class="btn btn-sm btn-outline-success" href="${whatsCliente(p.cliente_telefone)}" target="_blank" title="WhatsApp"><i class="bi bi-whatsapp"></i></a>` : ""}
          <button class="btn btn-sm btn-outline-secondary" onclick="abrirPedido(${p.id})" title="Editar"><i class="bi bi-pencil"></i></button>
        </td>
      </tr>`;
  }).join("");

  // Cards (celular)
  $("#cardsPedidos").innerHTML = lista.map((p) => {
    const atrasado = p.data_agendada && p.data_agendada < hoje && ["pendente", "agendado"].includes(p.status);
    const mapa = linksMapa(enderecoTexto(p));
    const wpp = whatsCliente(p.cliente_telefone);
    return `
      <div class="card card-pedido shadow-sm mb-2 ${atrasado ? "border-danger" : ""}">
        <div class="card-body py-2">
          <div class="d-flex justify-content-between align-items-start">
            <h6 class="card-title mb-1 fw-bold">${esc(p.cliente_nome)}</h6>${badge(p.status)}
          </div>
          <div class="small text-muted mb-1"><i class="bi bi-calendar"></i> ${dataBR(p.data_agendada)}
            ${p.data_agendada === hoje ? '<span class="badge text-bg-warning">Hoje</span>' : ""}
            ${atrasado ? '<span class="badge text-bg-danger">Atrasado</span>' : ""}
            · ${esc(p.planos?.nome || "sem plano")} · ${formatarMoeda(p.valor_combinado)}</div>
          <div class="small mb-2"><i class="bi bi-geo-alt"></i> ${esc(enderecoTexto(p) || "Sem endereço")}</div>
          <div class="d-flex gap-2">
            <a class="btn btn-sm btn-primary flex-fill" href="${mapa.google}" target="_blank"><i class="bi bi-google"></i> Maps</a>
            <a class="btn btn-sm btn-dark flex-fill" href="${mapa.apple}" target="_blank"><i class="bi bi-apple"></i> iPhone</a>
            ${wpp ? `<a class="btn btn-sm btn-success" href="${wpp}" target="_blank"><i class="bi bi-whatsapp"></i></a>` : ""}
            <button class="btn btn-sm btn-outline-secondary" onclick="abrirPedido(${p.id})"><i class="bi bi-pencil"></i></button>
          </div>
        </div>
      </div>`;
  }).join("");
}

$("#busca").oninput = renderPedidos;
$("#filtroStatus").onchange = renderPedidos;

// ---------- Formulário de pedido ----------
const CAMPOS = ["cliente_nome", "cliente_telefone", "cep", "logradouro", "numero", "complemento",
  "bairro", "cidade", "uf", "ponto_referencia", "plano_id", "area_m2", "valor_combinado",
  "data_coleta", "data_agendada", "data_conclusao", "status", "forma_pagamento", "origem", "observacoes"];

function abrirPedido(id) {
  const f = $("#formPedido");
  f.reset();
  const p = pedidos.find((x) => x.id === id);
  f.elements.id.value = p?.id || "";
  $("#tituloPedido").textContent = p ? `Pedido #${p.id}` : "Novo pedido";
  $("#btnExcluirPedido").classList.toggle("d-none", !p);
  $("#cepMsg").textContent = "Preenche o endereço sozinho.";

  if (p) {
    CAMPOS.forEach((c) => (f[c].value = p[c] ?? ""));
    f.recolher_residuos.checked = p.recolher_residuos;
    f.pago.checked = p.pago;
  } else {
    f.data_coleta.value = hojeISO();
    f.status.value = "pendente";
  }
  atualizarMapa();
  modalPedido.show();
}
$("#btnNovoPedido").onclick = () => abrirPedido(null);

// Plano escolhido → sugere o preço do plano
document.querySelector('#formPedido [name="plano_id"]').addEventListener("change", (e) => {
  const f = $("#formPedido");
  const plano = planos.find((p) => p.id == e.target.value);
  if (plano && !f.valor_combinado.value) f.valor_combinado.value = plano.preco ?? "";
});

// Concluído → preenche a data de conclusão
document.querySelector('#formPedido [name="status"]').addEventListener("change", (e) => {
  const f = $("#formPedido");
  if (e.target.value === "concluido" && !f.data_conclusao.value) f.data_conclusao.value = hojeISO();
});
document.querySelector('#formPedido [name="data_agendada"]').addEventListener("change", (e) => {
  const f = $("#formPedido");
  if (e.target.value && f.status.value === "pendente") f.status.value = "agendado";
});

$("#formPedido").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  const dados = {};
  CAMPOS.forEach((c) => (dados[c] = f[c].value.trim() === "" ? null : f[c].value.trim()));
  dados.recolher_residuos = f.recolher_residuos.checked;
  dados.pago = f.pago.checked;
  if (dados.uf) dados.uf = dados.uf.toUpperCase();

  const q = f.elements.id.value
    ? db.from("pedidos").update(dados).eq("id", f.elements.id.value)
    : db.from("pedidos").insert(dados);
  const { error } = await q;
  if (error) return aviso("Erro: " + error.message);
  modalPedido.hide();
  aviso("Pedido salvo!");
  carregarPedidos();
};

$("#btnExcluirPedido").onclick = async () => {
  const id = $("#formPedido").elements.id.value;
  if (!id || !confirm("Excluir este pedido? Prefira marcar como 'Cancelado' para manter o histórico.")) return;
  const { error } = await db.from("pedidos").delete().eq("id", id);
  if (error) return aviso("Erro: " + error.message);
  modalPedido.hide();
  aviso("Pedido excluído.");
  carregarPedidos();
};

// ---------- CEP automático (ViaCEP, gratuito) ----------
const campoCep = document.querySelector('#formPedido [name="cep"]');
campoCep.addEventListener("input", () => {
  let v = campoCep.value.replace(/\D/g, "").slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
  campoCep.value = v;
  if (v.length === 9) buscarCep(v.replace("-", ""));
});

async function buscarCep(cep) {
  const f = $("#formPedido");
  $("#cepCarregando").classList.remove("d-none");
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await r.json();
    if (d.erro) { $("#cepMsg").textContent = "CEP não encontrado."; return; }
    f.logradouro.value = d.logradouro || f.logradouro.value;
    f.bairro.value = d.bairro || f.bairro.value;
    f.cidade.value = d.localidade || "";
    f.uf.value = d.uf || "";
    $("#cepMsg").textContent = "Endereço preenchido ✔";
    f.numero.focus();
    atualizarMapa();
  } catch {
    $("#cepMsg").textContent = "Não foi possível buscar o CEP.";
  } finally {
    $("#cepCarregando").classList.add("d-none");
  }
}

// ---------- Mapa dentro do formulário ----------
let timerMapa;
function atualizarMapa() {
  clearTimeout(timerMapa);
  timerMapa = setTimeout(() => {
    const f = $("#formPedido");
    const end = enderecoTexto({
      logradouro: f.logradouro.value, numero: f.numero.value, bairro: f.bairro.value,
      cidade: f.cidade.value, uf: f.uf.value, cep: f.cep.value,
    });
    const temEndereco = f.cidade.value && (f.logradouro.value || f.cep.value);
    $("#mapaVazio").classList.toggle("d-none", !!temEndereco);
    $("#mapaPreview").classList.toggle("d-none", !temEndereco);
    $("#botoesRota").classList.toggle("d-none", !temEndereco);
    if (!temEndereco) return;
    const l = linksMapa(end);
    if ($("#mapaPreview").src !== l.embed) $("#mapaPreview").src = l.embed;
    $("#rotaGoogle").href = l.google;
    $("#rotaApple").href = l.apple;
    $("#rotaWaze").href = l.waze;
  }, 600);
}
["logradouro", "numero", "bairro", "cidade", "uf"].forEach((c) =>
  document.querySelector(`#formPedido [name="${c}"]`).addEventListener("input", atualizarMapa));

iniciar();
