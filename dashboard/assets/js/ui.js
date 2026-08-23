(() => {
    const body = document.body;
    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');
    const navItems = [...document.querySelectorAll('.nav-item')];

    function criarMenuMobile() {
        if (!topbar || !sidebar || document.querySelector('.mobile-menu-button')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mobile-menu-button';
        button.setAttribute('aria-label', 'Abrir menu de navegação');
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = '☰';

        button.addEventListener('click', () => {
            const aberto = body.classList.toggle('sidebar-open');
            button.setAttribute('aria-expanded', String(aberto));
            button.setAttribute('aria-label', aberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
            button.innerHTML = aberto ? '×' : '☰';
        });

        topbar.prepend(button);

        navItems.forEach((item) => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 760) {
                    body.classList.remove('sidebar-open');
                    button.setAttribute('aria-expanded', 'false');
                    button.setAttribute('aria-label', 'Abrir menu de navegação');
                    button.innerHTML = '☰';
                }
            });
        });

        document.addEventListener('click', (event) => {
            if (window.innerWidth > 760 || !body.classList.contains('sidebar-open')) return;
            if (sidebar.contains(event.target) || button.contains(event.target)) return;
            body.classList.remove('sidebar-open');
            button.setAttribute('aria-expanded', 'false');
            button.innerHTML = '☰';
        });
    }

    function ativarNavegacaoPorSecao() {
        const secoes = navItems
            .map((item) => {
                const seletor = item.getAttribute('href');
                if (!seletor || !seletor.startsWith('#')) return null;
                const section = document.querySelector(seletor);
                return section ? { item, section } : null;
            })
            .filter(Boolean);

        if (!secoes.length || !('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            const visiveis = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

            if (!visiveis.length) return;
            const id = `#${visiveis[0].target.id}`;

            navItems.forEach((item) => {
                item.classList.toggle('active', item.getAttribute('href') === id);
            });
        }, {
            rootMargin: '-18% 0px -62% 0px',
            threshold: [0.02, 0.1, 0.25],
        });

        secoes.forEach(({ section }) => observer.observe(section));
    }

    function melhorarAcessibilidade() {
        navItems.forEach((item) => {
            const texto = item.querySelector('span:last-child')?.textContent?.trim();
            if (texto && !item.getAttribute('title')) item.setAttribute('title', texto);
        });

        const status = document.getElementById('status-text');
        if (status) {
            status.setAttribute('aria-live', 'polite');
            status.setAttribute('aria-atomic', 'true');
        }

        const alerts = document.getElementById('alerts-list');
        if (alerts) alerts.setAttribute('aria-live', 'polite');

        const telemetryBody = document.getElementById('telemetry-body');
        if (telemetryBody) telemetryBody.setAttribute('aria-live', 'polite');
    }

    function criarProgressoDeRolagem() {
        if (document.querySelector('.ui-scroll-progress')) return;
        const progress = document.createElement('div');
        progress.className = 'ui-scroll-progress';
        progress.setAttribute('aria-hidden', 'true');
        document.body.appendChild(progress);

        const atualizar = () => {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            const valor = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
            document.documentElement.style.setProperty('--scroll-progress', `${valor}%`);
        };

        atualizar();
        window.addEventListener('scroll', atualizar, { passive: true });
        window.addEventListener('resize', atualizar);
    }

    function fecharMenuAoRedimensionar() {
        window.addEventListener('resize', () => {
            if (window.innerWidth > 760) body.classList.remove('sidebar-open');
        });
    }

    criarMenuMobile();
    ativarNavegacaoPorSecao();
    melhorarAcessibilidade();
    criarProgressoDeRolagem();
    fecharMenuAoRedimensionar();
})();
