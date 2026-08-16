let nivelChart;
let chuvaChart;
let riskChart;
let sensorChart;
let cityChart;
let mapa;
let camadaMarcadores;
let catalogo = { sensores: [] };
let painelAtual = null;
let camadaMapa = "risco";
let pontoSelecionadoId = null;

const estadoSelect = document.getElementById("estado-select");
const municipioSelect = document.getElementById("municipio-select");
const regiaoSelect = document.getElementById("regiao-select");
const bairroSelect = document.getElementById("bairro-select");
const sensorSelect = document.getElementById("sensor-select");
const refreshBtn = document.getElementById("refresh-btn");

const CORES_RISCO = {
    BAIXO: "#34d399",
    MODERADO: "#facc15",
    ALTO: "#fb923c",
    CRITICO: "#fb7185",
    SEM_DADOS: "#64748b",
    DESCONHECIDO: "#64748b",
};

const NOMES_PT = {
    Goias: "Goiás",
    Goiania: "Goiânia",
    "Aparecida de Goiania": "Aparecida de Goiânia",
    Anapolis: "Anápolis",
    Luziania: "Luziânia",
    Jundiai: "Jundiaí",
};

Chart.defaults.color = "#72899d";
Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
Chart.defaults.font.size = 10;
Chart.defaults.animation.duration = 450;

function pt(valor) {
    return NOMES_PT[valor] || valor || "--";
}

function riscoNormalizado(risco) {
    return String(risco || "SEM_DADOS").toUpperCase();
}

function badgeRisco(risco) {
    const valor = riscoNormalizado(risco);
    return `<span class="badge ${valor}">${valor.replaceAll("_", " ")}</span>`;
}

function formatarData(valor) {
    if (!valor) return "--";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString("pt-BR");
}

function formatarHora(valor) {
    if (!valor) return "--";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "--" : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function opcoesBase() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(5, 14, 25, .97)",
                titleColor: "#eef6ff",
                bodyColor: "#b8cbd9",
                borderColor: "rgba(56, 189, 248, .18)",
                borderWidth: 1,
                padding: 10,
                cornerRadius: 9,
            },
        },
        scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: "#5f778c", maxTicksLimit: 8, maxRotation: 0 } },
            y: { beginAtZero: true, grid: { color: "rgba(148, 163, 184, .07)" }, border: { display: false }, ticks: { color: "#5f778c" } },
        },
    };
}

function criarMapa() {
    if (mapa) return;
    mapa = L.map("hydro-map", { zoomControl: true }).setView([-16.4, -49.2], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapa);
    camadaMarcadores = L.layerGroup().addTo(mapa);
}

function preencherSelect(select, valores, placeholder, valorAtual = "") {
    const atual = valorAtual || select.value;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    for (const valor of [...new Set(valores)].sort((a, b) => pt(a).localeCompare(pt(b), "pt-BR"))) {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = pt(valor);
        select.appendChild(option);
    }
    if ([...select.options].some((o) => o.value === atual)) select.value = atual;
}

function sensoresCompativeis() {
    return (catalogo.sensores || []).filter((s) => {
        if (estadoSelect.value && s.estado !== estadoSelect.value) return false;
        if (municipioSelect.value && s.municipio !== municipioSelect.value) return false;
        if (regiaoSelect.value && s.regiao !== regiaoSelect.value) return false;
        if (bairroSelect.value && s.bairro !== bairroSelect.value) return false;
        return true;
    });
}

function atualizarFiltrosDependentes(origem) {
    if (origem === "estado") {
        municipioSelect.value = "";
        regiaoSelect.value = "";
        bairroSelect.value = "";
        sensorSelect.value = "";
    } else if (origem === "municipio") {
        regiaoSelect.value = "";
        bairroSelect.value = "";
        sensorSelect.value = "";
    } else if (origem === "regiao") {
        bairroSelect.value = "";
        sensorSelect.value = "";
    } else if (origem === "bairro") {
        sensorSelect.value = "";
    }

    let base = catalogo.sensores || [];
    if (estadoSelect.value) base = base.filter((s) => s.estado === estadoSelect.value);
    preencherSelect(municipioSelect, base.map((s) => s.municipio), "Todos os municípios", municipioSelect.value);

    if (municipioSelect.value) base = base.filter((s) => s.municipio === municipioSelect.value);
    preencherSelect(regiaoSelect, base.map((s) => s.regiao), "Todas as regiões", regiaoSelect.value);

    if (regiaoSelect.value) base = base.filter((s) => s.regiao === regiaoSelect.value);
    preencherSelect(bairroSelect, base.map((s) => s.bairro), "Todos os bairros", bairroSelect.value);

    if (bairroSelect.value) base = base.filter((s) => s.bairro === bairroSelect.value);
    const sensorAtual = sensorSelect.value;
    sensorSelect.innerHTML = '<option value="">Todos os sensores</option>';
    for (const sensor of base) {
        const option = document.createElement("option");
        option.value = sensor.sensor_id;
        option.textContent = `${sensor.sensor_id} — ${pt(sensor.municipio)} / ${pt(sensor.bairro)}`;
        sensorSelect.appendChild(option);
    }
    if ([...sensorSelect.options].some((o) => o.value === sensorAtual)) sensorSelect.value = sensorAtual;
}

async function carregarCatalogo() {
    const resposta = await fetch("/api/localidades");
    if (!resposta.ok) throw new Error("Falha ao carregar catálogo territorial");
    catalogo = await resposta.json();
    preencherSelect(estadoSelect, catalogo.estados || [], "Todos os estados");
    if ([...estadoSelect.options].some((o) => o.value === "Goias")) estadoSelect.value = "Goias";
    atualizarFiltrosDependentes("inicio");
    document.getElementById("sidebar-network").textContent = `${catalogo.sensores?.length || 0} pontos configurados`;
}

function parametrosPainel() {
    const params = new URLSearchParams({ limite: "500" });
    if (estadoSelect.value) params.set("estado", estadoSelect.value);
    if (municipioSelect.value) params.set("municipio", municipioSelect.value);
    if (regiaoSelect.value) params.set("regiao", regiaoSelect.value);
    if (bairroSelect.value) params.set("bairro", bairroSelect.value);
    if (sensorSelect.value) params.set("sensor_id", sensorSelect.value);
    return params;
}

function atualizarBreadcrumb() {
    const partes = ["Brasil"];
    if (estadoSelect.value) partes.push(pt(estadoSelect.value));
    if (municipioSelect.value) partes.push(pt(municipioSelect.value));
    if (regiaoSelect.value) partes.push(`Região ${pt(regiaoSelect.value)}`);
    if (bairroSelect.value) partes.push(pt(bairroSelect.value));
    if (sensorSelect.value) partes.push(sensorSelect.value);

    document.getElementById("scope-breadcrumb").innerHTML = partes.map((p, i) => {
        const tag = i === partes.length - 1 ? "strong" : "span";
        return `${i ? "<b>›</b>" : ""}<${tag}>${p}</${tag}>`;
    }).join("");
}

function tituloTerritorio() {
    if (sensorSelect.value) return sensorSelect.value;
    if (bairroSelect.value) return pt(bairroSelect.value);
    if (municipioSelect.value) return pt(municipioSelect.value);
    if (regiaoSelect.value) return `Região ${pt(regiaoSelect.value)}`;
    return "Estado de Goiás";
}

function atualizarKpis(dados) {
    const resumo = dados.resumo || {};
    const territorio = dados.territorio || {};
    document.getElementById("total-registros").textContent = resumo.total ?? 0;
    document.getElementById("chuva-media").textContent = Number(resumo.chuva_media_mm || 0).toFixed(2);
    document.getElementById("nivel-medio").textContent = Number(resumo.nivel_medio_m || 0).toFixed(3);
    document.getElementById("nivel-maximo").textContent = Number(resumo.nivel_maximo_m || 0).toFixed(3);
    document.getElementById("sensores-online").textContent = territorio.sensores_com_dados ?? 0;
    document.getElementById("sensores-total").textContent = `de ${territorio.sensores_configurados ?? 0} configurados`;
    document.getElementById("risco-atual").innerHTML = badgeRisco(resumo.risco_atual);
    document.getElementById("risco-caption").textContent = resumo.ultima_leitura?.timestamp ? formatarHora(resumo.ultima_leitura.timestamp) : "Sem leitura";
    document.getElementById("fonte-dados").textContent = `Fonte: ${dados.fonte || "--"}`;
}

function atualizarTerritorio(dados) {
    const territorio = dados.territorio || {};
    document.getElementById("territory-title").textContent = tituloTerritorio();
    document.getElementById("territory-cities").textContent = territorio.municipios?.length || 0;
    document.getElementById("territory-neighborhoods").textContent = territorio.bairros?.length || 0;
    document.getElementById("territory-points").textContent = territorio.sensores_configurados || 0;
    document.getElementById("territory-scope").textContent = tituloTerritorio();
    document.getElementById("territory-detail").textContent = municipioSelect.value ? "Análise municipal / local" : "Visão estadual simulada";
    document.getElementById("map-subtitle").textContent = `${territorio.sensores_configurados || 0} pontos • ${territorio.municipios?.length || 0} municípios no escopo`;
    atualizarBreadcrumb();
}

function corChuva(valor) {
    if (valor >= 20) return "#7c3aed";
    if (valor >= 10) return "#2563eb";
    if (valor >= 4) return "#0ea5e9";
    if (valor > 0) return "#22d3ee";
    return "#64748b";
}

function corNivel(valor, ponto) {
    const critica = Number(ponto.cota_critica_m || 3);
    const proporcao = critica ? valor / critica : 0;
    if (proporcao >= 1) return "#fb7185";
    if (proporcao >= .8) return "#fb923c";
    if (proporcao >= .6) return "#facc15";
    return "#38bdf8";
}

function estiloPonto(ponto) {
    const risco = riscoNormalizado(ponto.risco);
    if (camadaMapa === "chuva") {
        const valor = Number(ponto.chuva_mm || 0);
        return { cor: corChuva(valor), raio: Math.max(7, Math.min(19, 7 + valor / 2)) };
    }
    if (camadaMapa === "nivel") {
        const valor = Number(ponto.nivel_m || 0);
        return { cor: corNivel(valor, ponto), raio: Math.max(7, Math.min(18, 7 + valor * 4)) };
    }
    return { cor: CORES_RISCO[risco] || CORES_RISCO.SEM_DADOS, raio: risco === "CRITICO" ? 15 : risco === "ALTO" ? 13 : risco === "MODERADO" ? 11 : 9 };
}

function atualizarLegendaMapa() {
    const legenda = document.getElementById("map-legend");
    if (camadaMapa === "chuva") {
        legenda.innerHTML = [["#64748b", "Sem chuva"], ["#22d3ee", "Fraca"], ["#0ea5e9", "Moderada"], ["#2563eb", "Forte"], ["#7c3aed", "Muito forte"]].map(([c, l]) => `<span class="legend-item"><i class="legend-dot" style="background:${c}"></i>${l}</span>`).join("");
        return;
    }
    if (camadaMapa === "nivel") {
        legenda.innerHTML = [["#38bdf8", "Normal"], ["#facc15", "Atenção"], ["#fb923c", "Alerta"], ["#fb7185", "Crítico"]].map(([c, l]) => `<span class="legend-item"><i class="legend-dot" style="background:${c}"></i>${l}</span>`).join("");
        return;
    }
    legenda.innerHTML = ["BAIXO", "MODERADO", "ALTO", "CRITICO", "SEM_DADOS"].map((r) => `<span class="legend-item"><i class="legend-dot" style="background:${CORES_RISCO[r]}"></i>${r.replaceAll("_", " ")}</span>`).join("");
}

function popupPonto(ponto) {
    return `<div class="map-popup"><strong>${ponto.sensor_id}</strong><span>${pt(ponto.municipio)} • ${pt(ponto.bairro)}</span><span>Nível: ${Number(ponto.nivel_m || 0).toFixed(3)} m</span><span>Chuva: ${Number(ponto.chuva_mm || 0).toFixed(2)} mm</span><span>Tendência: ${ponto.tendencia || "--"}</span><div class="popup-risk">${badgeRisco(ponto.risco)}</div></div>`;
}

function atualizarMapa(pontos) {
    criarMapa();
    camadaMarcadores.clearLayers();
    const bounds = [];

    for (const ponto of pontos) {
        const estilo = estiloPonto(ponto);
        const marker = L.circleMarker([ponto.latitude, ponto.longitude], {
            radius: estilo.raio,
            color: estilo.cor,
            weight: 2,
            fillColor: estilo.cor,
            fillOpacity: .72,
        });
        marker.bindPopup(popupPonto(ponto));
        marker.on("click", () => selecionarPonto(ponto.sensor_id));
        marker.addTo(camadaMarcadores);
        bounds.push([ponto.latitude, ponto.longitude]);
    }

    if (bounds.length === 1) mapa.setView(bounds[0], 13);
    else if (bounds.length > 1) mapa.fitBounds(bounds, { padding: [35, 35], maxZoom: 11 });
    else mapa.setView([-16.4, -49.2], 7);
    atualizarLegendaMapa();
}

function selecionarPonto(sensorId) {
    pontoSelecionadoId = sensorId;
    const ponto = painelAtual?.pontos?.find((p) => p.sensor_id === sensorId);
    if (!ponto) return;
    document.getElementById("point-name").textContent = `${ponto.sensor_id} — ${ponto.nome}`;
    document.getElementById("point-location").textContent = `${pt(ponto.municipio)} • ${pt(ponto.regiao)} • ${pt(ponto.bairro)} • GO`;
    const chip = document.getElementById("point-risk");
    const risco = riscoNormalizado(ponto.risco);
    chip.className = `status-chip ${risco}`;
    chip.textContent = risco.replaceAll("_", " ");
    document.getElementById("point-level").textContent = ponto.ultima_leitura ? `${Number(ponto.nivel_m || 0).toFixed(3)} m` : "Sem dados";
    document.getElementById("point-rain").textContent = ponto.ultima_leitura ? `${Number(ponto.chuva_mm || 0).toFixed(2)} mm` : "Sem dados";
    document.getElementById("point-trend").textContent = ponto.tendencia || "--";
    document.getElementById("point-time").textContent = formatarData(ponto.timestamp);
    document.getElementById("point-status").textContent = ponto.status || "--";
}

function atualizarAlertas(pontos) {
    const lista = document.getElementById("alerts-list");
    const relevantes = pontos.filter((p) => p.ultima_leitura).slice(0, 7);
    if (!relevantes.length) {
        lista.innerHTML = '<div class="empty-state">Nenhum sensor possui leitura neste escopo.</div>';
        return;
    }
    lista.innerHTML = relevantes.map((p) => {
        const risco = riscoNormalizado(p.risco);
        return `<div class="alert-item" data-sensor="${p.sensor_id}"><i class="alert-color" style="background:${CORES_RISCO[risco] || CORES_RISCO.SEM_DADOS}"></i><div class="alert-copy"><strong>${p.sensor_id} • ${pt(p.municipio)}</strong><span>${pt(p.bairro)} • ${risco.replaceAll("_", " ")}</span></div><div class="alert-value"><strong>${Number(p.nivel_m || 0).toFixed(3)} m</strong><small>${Number(p.chuva_mm || 0).toFixed(1)} mm</small></div></div>`;
    }).join("");
    lista.querySelectorAll(".alert-item").forEach((el) => el.addEventListener("click", () => selecionarPonto(el.dataset.sensor)));
}

function agruparMedia(registros, chave, valorChave) {
    const grupos = new Map();
    for (const r of registros) {
        const nome = chave(r) || "--";
        if (!grupos.has(nome)) grupos.set(nome, []);
        grupos.get(nome).push(Number(valorChave(r) || 0));
    }
    return [...grupos.entries()].map(([nome, valores]) => ({ nome, valor: valores.reduce((a, b) => a + b, 0) / valores.length }));
}

function atualizarGraficos(registros) {
    const cronologico = [...registros].reverse();
    const labels = cronologico.map((r) => `${r.sensor_id} ${formatarHora(r.timestamp)}`);
    const niveis = cronologico.map((r) => Number(r.nivel_m || 0));
    const chuvas = cronologico.map((r) => Number(r.chuva_mm || 0));

    nivelChart?.destroy();
    chuvaChart?.destroy();
    sensorChart?.destroy();
    cityChart?.destroy();

    const nivelCtx = document.getElementById("nivel-chart").getContext("2d");
    const gradient = nivelCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(56, 189, 248, .34)");
    gradient.addColorStop(1, "rgba(56, 189, 248, .015)");
    nivelChart = new Chart(nivelCtx, { type: "line", data: { labels, datasets: [{ data: niveis, label: "Nível (m)", borderColor: "#38bdf8", backgroundColor: gradient, fill: true, tension: .32, pointRadius: 0, borderWidth: 2 }] }, options: opcoesBase() });

    chuvaChart = new Chart(document.getElementById("chuva-chart"), { type: "bar", data: { labels, datasets: [{ data: chuvas, label: "Chuva (mm)", backgroundColor: "rgba(34, 211, 238, .55)", borderColor: "#22d3ee", borderWidth: 1, borderRadius: 3 }] }, options: opcoesBase() });

    const medias = agruparMedia(registros, (r) => r.sensor_id, (r) => r.nivel_m);
    sensorChart = new Chart(document.getElementById("sensor-chart"), { type: "bar", data: { labels: medias.map((x) => x.nome), datasets: [{ data: medias.map((x) => x.valor), backgroundColor: "rgba(129, 140, 248, .55)", borderColor: "#818cf8", borderWidth: 1, borderRadius: 4 }] }, options: opcoesBase() });

    const porCidade = new Map();
    for (const r of registros) {
        const cidade = pt(r.localizacao?.municipio || "--");
        porCidade.set(cidade, (porCidade.get(cidade) || 0) + 1);
    }
    cityChart = new Chart(document.getElementById("city-chart"), { type: "bar", data: { labels: [...porCidade.keys()], datasets: [{ data: [...porCidade.values()], backgroundColor: "rgba(52, 211, 153, .5)", borderColor: "#34d399", borderWidth: 1, borderRadius: 4 }] }, options: opcoesBase() });
}

function atualizarRiscos(resumo) {
    const riscos = resumo.riscos || {};
    const entradas = ["BAIXO", "MODERADO", "ALTO", "CRITICO"].map((r) => [r, Number(riscos[r] || 0)]).filter(([, n]) => n > 0);
    document.getElementById("risk-total").textContent = resumo.total || 0;
    document.getElementById("risk-list").innerHTML = entradas.length ? entradas.map(([r, n]) => `<div class="risk-row"><span>${badgeRisco(r)}</span><strong>${n}</strong></div>`).join("") : '<div class="risk-row"><span>Sem dados</span><strong>0</strong></div>';
    riskChart?.destroy();
    riskChart = new Chart(document.getElementById("risk-chart"), { type: "doughnut", data: { labels: entradas.map(([r]) => r), datasets: [{ data: entradas.map(([, n]) => n), backgroundColor: entradas.map(([r]) => CORES_RISCO[r]), borderColor: "#0c1928", borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false } } } });
}

function atualizarTabela(registros) {
    const corpo = document.getElementById("telemetry-body");
    if (!registros.length) {
        corpo.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma telemetria disponível para este território.</td></tr>';
    } else {
        corpo.innerHTML = registros.slice(0, 30).map((r) => `<tr><td>${formatarData(r.timestamp)}</td><td>${pt(r.localizacao?.municipio)}</td><td>${pt(r.localizacao?.bairro)}</td><td><strong>${r.sensor_id || "--"}</strong></td><td>${Number(r.chuva_mm || 0).toFixed(2)} mm</td><td>${Number(r.nivel_m || 0).toFixed(3)} m</td><td>${String(r.tendencia || "--").replaceAll("_", " ")}</td><td>${badgeRisco(r.risco)}</td></tr>`).join("");
    }
    const agora = new Date().toLocaleTimeString("pt-BR");
    document.getElementById("updated-at").textContent = `Atualizado ${agora}`;
    document.getElementById("top-updated-at").textContent = agora;
}

async function carregarML() {
    const caixa = document.getElementById("ml-box");
    const resposta = await fetch("/api/ml/status");
    const dados = await resposta.json();
    const dot = document.getElementById("ml-dot");
    const mini = document.getElementById("ml-status-mini");
    if (!dados.treinado) {
        caixa.innerHTML = '<strong>Modelo preparado, aguardando treinamento</strong><span>Gere uma série maior de telemetria e execute <code>python -m ml.train_model</code>.</span><span>Depois, esta área passará a exibir previsão de nível e risco.</span>';
        dot.className = "system-dot";
        mini.textContent = "Pendente";
        return;
    }
    const m = dados.metricas || {};
    caixa.innerHTML = `<strong>Random Forest treinado</strong><span>Modelo disponível para inferência do próximo nível.</span><div class="ml-metrics"><div class="ml-metric"><span>Amostras</span><strong>${m.amostras ?? "--"}</strong></div><div class="ml-metric"><span>MAE</span><strong>${m.mae_m ?? "--"} m</strong></div><div class="ml-metric"><span>Fonte</span><strong>${m.fonte ?? "--"}</strong></div></div>`;
    dot.className = "system-dot online";
    mini.textContent = "Treinado";
}

async function carregarStatus() {
    const dot = document.getElementById("api-status");
    const texto = document.getElementById("status-text");
    const mongoDot = document.getElementById("mongo-dot");
    const mongoStatus = document.getElementById("mongo-status");
    try {
        const resposta = await fetch("/health");
        const dados = await resposta.json();
        dot.className = "status-dot ok";
        texto.textContent = dados.mongodb?.conectado ? "API + MongoDB online" : "API online • fallback local";
        mongoDot.className = dados.mongodb?.conectado ? "system-dot online" : "system-dot offline";
        mongoStatus.textContent = dados.mongodb?.conectado ? "Online" : "Offline";
    } catch (erro) {
        dot.className = "status-dot error";
        texto.textContent = "API indisponível";
        mongoDot.className = "system-dot offline";
        mongoStatus.textContent = "Offline";
    }
}

async function atualizarDashboard() {
    refreshBtn.classList.add("loading");
    try {
        const resposta = await fetch(`/api/painel?${parametrosPainel().toString()}`);
        if (!resposta.ok) throw new Error("Falha ao consultar painel territorial");
        painelAtual = await resposta.json();
        atualizarKpis(painelAtual);
        atualizarTerritorio(painelAtual);
        atualizarMapa(painelAtual.pontos || []);
        atualizarAlertas(painelAtual.pontos || []);
        atualizarGraficos(painelAtual.registros || []);
        atualizarRiscos(painelAtual.resumo || {});
        atualizarTabela(painelAtual.registros || []);

        const aindaExiste = painelAtual.pontos?.some((p) => p.sensor_id === pontoSelecionadoId);
        if (!aindaExiste) pontoSelecionadoId = painelAtual.pontos?.find((p) => p.ultima_leitura)?.sensor_id || painelAtual.pontos?.[0]?.sensor_id || null;
        if (pontoSelecionadoId) selecionarPonto(pontoSelecionadoId);

        await Promise.all([carregarML(), carregarStatus()]);
    } catch (erro) {
        console.error(erro);
        document.getElementById("status-text").textContent = "Falha ao atualizar sistema";
        document.getElementById("api-status").className = "status-dot error";
    } finally {
        refreshBtn.classList.remove("loading");
    }
}

estadoSelect.addEventListener("change", async () => { atualizarFiltrosDependentes("estado"); await atualizarDashboard(); });
municipioSelect.addEventListener("change", async () => { atualizarFiltrosDependentes("municipio"); await atualizarDashboard(); });
regiaoSelect.addEventListener("change", async () => { atualizarFiltrosDependentes("regiao"); await atualizarDashboard(); });
bairroSelect.addEventListener("change", async () => { atualizarFiltrosDependentes("bairro"); await atualizarDashboard(); });
sensorSelect.addEventListener("change", atualizarDashboard);
refreshBtn.addEventListener("click", atualizarDashboard);

document.querySelectorAll(".layer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".layer-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        camadaMapa = btn.dataset.layer;
        if (painelAtual) atualizarMapa(painelAtual.pontos || []);
    });
});

(async function iniciar() {
    criarMapa();
    try {
        await carregarCatalogo();
        await atualizarDashboard();
        setInterval(atualizarDashboard, 15000);
    } catch (erro) {
        console.error(erro);
        document.getElementById("status-text").textContent = "Falha ao iniciar sistema";
        document.getElementById("api-status").className = "status-dot error";
    }
})();
