const Permissions = {
    routeAccess: {
        ADMIN: ['dashboard', 'charges', 'ledger', 'eod', 'discharge', 'receipts'],
        SUPER_USER: ['dashboard', 'charges', 'ledger', 'eod', 'discharge', 'receipts']
    },

    getActor() {
        return window.RoleAccess?.getCurrentActor() || sessionStorage.getItem('userRole') || 'FA';
    },

    getAccessRole() {
        return window.RoleAccess?.getAccessRole() || sessionStorage.getItem('accessRole') || 'ADMIN';
    },

    canAccess(route) {
        const page = route.replace('#/', '') || 'dashboard';
        const allowedRoutes = this.routeAccess[this.getAccessRole()] || [];
        return allowedRoutes.includes(page) && (window.RoleAccess?.hasModuleAccess('FA', this.getActor()) ?? true);
    },

    getDefaultRoute() {
        const allowedRoutes = this.routeAccess[this.getAccessRole()] || ['dashboard'];
        return '#/' + (allowedRoutes[0] || 'dashboard');
    },

    enforceRoute(route) {
        if (this.canAccess(route)) return true;

        const fallback = this.getDefaultRoute();
        if (location.hash !== fallback) location.hash = fallback;
        return false;
    },

    updateUI() {
        const indicator = document.getElementById('role-indicator');
        const currentActor = this.getActor();
        const accessRole = this.getAccessRole();
        const moduleSwitchLink = document.getElementById('module-switch-link');

        if (indicator) {
            indicator.innerText = currentActor === 'HOM'
                ? 'superUser · Finance Control'
                : 'admin · Finance Operations';
        }

        if (moduleSwitchLink) {
            moduleSwitchLink.hidden = accessRole !== 'SUPER_USER';
        }

        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            const match = link.getAttribute('onclick')?.match(/'([^']+)'/);
            const route = match ? match[1] : '#/dashboard';
            link.style.display = this.canAccess(route) ? 'inline-block' : 'none';
        });
    }
};

