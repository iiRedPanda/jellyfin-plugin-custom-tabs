/* Custom Tabs for Jellyfin 12.1.
 *
 * KefinTweaks uses this plugin to host its Watchlist as a normal home-page
 * tab. Keep this deliberately small: it works with the existing header-tabs
 * component and never replaces Jellyfin navigation.
 */
(() => {
    'use strict';

    if (window.customTabsPlugin) {
        return;
    }

    const LOG = (...args) => console.debug('[Custom Tabs]', ...args);
    const isHomeRoute = () => /^#\/home(?:\.html)?(?:\?|$)/.test(window.location.hash || '#/home');
    const authHeaders = () => {
        const token = window.ApiClient?.accessToken?.();
        const header = window.apiHelper?.getAuthHeader?.();
        if (header) {
            return { Authorization: header, Accept: 'application/json' };
        }
        return token ? { 'X-Emby-Token': token, Accept: 'application/json' } : { Accept: 'application/json' };
    };

    let scheduled = false;
    let requestInFlight = false;

    async function getTabs() {
        const server = window.ApiClient?._serverAddress || window.ApiClient?.serverAddress?.();
        if (!server) {
            return [];
        }

        const response = await fetch(`${server}/CustomTabs/Config`, { headers: authHeaders() });
        if (!response.ok) {
            throw new Error(`Config request failed (${response.status})`);
        }

        const tabs = await response.json();
        return Array.isArray(tabs) ? tabs : [];
    }

    function getActiveLibraryPage() {
        return document.querySelector('.libraryPage:not(.hide)') || document.querySelector('.libraryPage');
    }

    function createContent(tab, index, libraryPage) {
        const contentId = `customTab_${index}`;
        let content = libraryPage.querySelector(`#${CSS.escape(contentId)}`);
        if (content) {
            return;
        }

        content = document.createElement('div');
        content.id = contentId;
        content.className = 'tabContent pageTabContent';
        content.dataset.index = String(index + 2);
        // This is administrator-configured HTML. KefinTweaks uses the fixed,
        // local value <div class="sections watchlist"></div> for its Watchlist.
        content.innerHTML = tab.ContentHtml || '';
        libraryPage.appendChild(content);
    }

    function createButton(tab, index) {
        const slider = document.querySelector('.headerTabs .emby-tabs-slider');
        if (!slider || slider.querySelector(`#customTabButton_${index}`)) {
            return;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.id = `customTabButton_${index}`;
        button.className = 'emby-tab-button emby-button';
        button.dataset.index = String(index + 2);
        button.setAttribute('is', 'empty-button');

        const label = document.createElement('div');
        label.className = 'emby-button-foreground';
        label.textContent = tab.Title || `Tab ${index + 1}`;
        button.appendChild(label);
        slider.appendChild(button);
    }

    async function ensureTabs() {
        if (!isHomeRoute() || requestInFlight || !window.ApiClient) {
            return;
        }

        const libraryPage = getActiveLibraryPage();
        if (!libraryPage) {
            return;
        }

        requestInFlight = true;
        try {
            const tabs = await getTabs();
            tabs.forEach((tab, index) => {
                createContent(tab, index, libraryPage);
                createButton(tab, index);
            });
            LOG(`ensured ${tabs.length} custom tab(s)`);
        } catch (error) {
            console.warn('[Custom Tabs] Could not load tabs:', error);
        } finally {
            requestInFlight = false;
        }
    }

    function scheduleEnsure() {
        if (scheduled) {
            return;
        }
        scheduled = true;
        window.setTimeout(() => {
            scheduled = false;
            void ensureTabs();
        }, 150);
    }

    window.customTabsPlugin = { ensureTabs, scheduleEnsure };
    window.addEventListener('hashchange', scheduleEnsure);
    window.addEventListener('pageshow', scheduleEnsure);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            scheduleEnsure();
        }
    });

    new MutationObserver(scheduleEnsure).observe(document.documentElement, { childList: true, subtree: true });
    scheduleEnsure();
})();
