(() => {
    const btn = document.getElementById("share-online-btn");
    const painel = document.getElementById("share-online-panel");
    const texto = document.getElementById("share-online-text");
    const link = document.getElementById("share-online-link");
    const copiar = document.getElementById("share-copy-btn");
    const parar = document.getElementById("share-stop-btn");
    const fechar = document.getElementById("share-close-btn");

    if (!btn || !painel || !texto || !link || !copiar || !parar || !fechar) return;

    function mostrarPainel() {
        painel.hidden = false;
    }

    function esconderPainel() {
        painel.hidden = true;
    }

    function definirEstado({ ativo = false, pronto = false, gerando = false, url = null, mensagem = null } = {}) {
        const utilizavel = Boolean(ativo && pronto && url);
        link.hidden = !utilizavel;
        copiar.hidden = !utilizavel;
        parar.hidden = !ativo;

        if (utilizavel) {
            link.href = url;
            link.textContent = url;
        } else {
            link.removeAttribute("href");
            link.textContent = "";
        }

        if (mensagem) {
            texto.textContent = mensagem;
        } else if (utilizavel) {
            texto.textContent = "Link testado e online. Agora voce pode copiar e compartilhar.";
        } else if (gerando || ativo) {
            texto.textContent = "Preparando o link e aguardando o DNS ficar disponivel. Nao copie ainda.";
        } else {
            texto.textContent = "O compartilhamento online esta desligado.";
        }

        btn.classList.toggle("online", utilizavel);
        btn.innerHTML = utilizavel ? "● Link online" : gerando ? "… Preparando link" : "↗ Compartilhar online";
    }

    function aplicarDados(dados) {
        definirEstado({
            ativo: Boolean(dados?.ativo),
            pronto: Boolean(dados?.pronto),
            gerando: Boolean(dados?.gerando),
            url: dados?.url || null,
        });
    }

    async function status() {
        try {
            const resposta = await fetch("/api/compartilhamento/status", { cache: "no-store" });
            if (!resposta.ok) return;
            aplicarDados(await resposta.json());
        } catch (_) {
            // Mantem o dashboard funcional mesmo sem o recurso de tunnel.
        }
    }

    async function iniciar() {
        mostrarPainel();
        btn.disabled = true;
        definirEstado({ gerando: true, mensagem: "Criando e testando o link publico. Isso pode levar alguns segundos." });
        try {
            const resposta = await fetch("/api/compartilhamento/iniciar", { method: "POST", cache: "no-store" });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados.detail || "Nao foi possivel criar o link.");
            if (!dados.pronto || !dados.url) throw new Error("O link ainda nao ficou acessivel. Tente gerar novamente.");
            aplicarDados(dados);
        } catch (erro) {
            definirEstado({ mensagem: erro.message || "Falha ao criar o link publico." });
        } finally {
            btn.disabled = false;
        }
    }

    async function pararCompartilhamento() {
        parar.disabled = true;
        try {
            const resposta = await fetch("/api/compartilhamento/parar", { method: "POST", cache: "no-store" });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados.detail || "Nao foi possivel encerrar o link.");
            definirEstado({ ativo: false, mensagem: "Compartilhamento encerrado." });
        } catch (erro) {
            definirEstado({ mensagem: erro.message || "Falha ao encerrar o compartilhamento." });
        } finally {
            parar.disabled = false;
        }
    }

    async function copiarLink() {
        const url = link.getAttribute("href");
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            const original = copiar.textContent;
            copiar.textContent = "Copiado!";
            setTimeout(() => { copiar.textContent = original; }, 1400);
        } catch (_) {
            window.prompt("Copie o link:", url);
        }
    }

    btn.addEventListener("click", async () => {
        mostrarPainel();
        try {
            const resposta = await fetch("/api/compartilhamento/status", { cache: "no-store" });
            const dados = resposta.ok ? await resposta.json() : { ativo: false };
            if (dados.ativo && dados.pronto && dados.url) {
                aplicarDados(dados);
            } else {
                await iniciar();
            }
        } catch (_) {
            await iniciar();
        }
    });

    copiar.addEventListener("click", copiarLink);
    parar.addEventListener("click", pararCompartilhamento);
    fechar.addEventListener("click", esconderPainel);
    status();
})();
