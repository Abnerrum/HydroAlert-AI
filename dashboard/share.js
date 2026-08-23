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

    function definirEstado({ ativo = false, url = null, mensagem = null } = {}) {
        link.hidden = !url;
        copiar.hidden = !url;
        parar.hidden = !ativo;
        if (url) {
            link.href = url;
            link.textContent = url;
        }
        texto.textContent = mensagem || (ativo
            ? "Link publico ativo. Voce pode copiar e enviar para outra pessoa."
            : "O compartilhamento online esta desligado.");
        btn.classList.toggle("online", ativo);
        btn.innerHTML = ativo ? "● Link online" : "↗ Compartilhar online";
    }

    async function status() {
        try {
            const resposta = await fetch("/api/compartilhamento/status");
            if (!resposta.ok) return;
            const dados = await resposta.json();
            definirEstado({ ativo: dados.ativo, url: dados.url });
        } catch (_) {
            // Mantem o dashboard funcional mesmo sem o recurso de tunnel.
        }
    }

    async function iniciar() {
        mostrarPainel();
        btn.disabled = true;
        definirEstado({ mensagem: "Criando link publico seguro... Aguarde alguns segundos." });
        try {
            const resposta = await fetch("/api/compartilhamento/iniciar", { method: "POST" });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados.detail || "Nao foi possivel criar o link.");
            definirEstado({ ativo: dados.ativo, url: dados.url });
        } catch (erro) {
            definirEstado({ mensagem: erro.message || "Falha ao criar o link publico." });
        } finally {
            btn.disabled = false;
        }
    }

    async function pararCompartilhamento() {
        parar.disabled = true;
        try {
            const resposta = await fetch("/api/compartilhamento/parar", { method: "POST" });
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
        if (!link.href) return;
        try {
            await navigator.clipboard.writeText(link.href);
            const original = copiar.textContent;
            copiar.textContent = "Copiado!";
            setTimeout(() => { copiar.textContent = original; }, 1400);
        } catch (_) {
            window.prompt("Copie o link:", link.href);
        }
    }

    btn.addEventListener("click", async () => {
        mostrarPainel();
        try {
            const resposta = await fetch("/api/compartilhamento/status");
            const dados = resposta.ok ? await resposta.json() : { ativo: false };
            if (dados.ativo && dados.url) {
                definirEstado({ ativo: true, url: dados.url });
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
