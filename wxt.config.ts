import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  outDir: 'dist',
  manifest: {
    name: 'ItchScratcher - Web Productivity & Khata Academy Enhancer',
    description: 'Track lesson completion progress on Khata Academy and control volume per site.',
    version: '1.2.0',
    permissions: [
      'storage',
      'tabs',
      'tabCapture',
      'offscreen'
    ],
    host_permissions: [
      '*://*.khataacademy.com/*',
      '*://khataacademy.com/*',
      '<all_urls>'
    ],
    action: {
      default_title: 'ItchScratcher Settings',
      default_icon: {
        '16': 'icon-16.png',
        '32': 'icon-32.png',
        '48': 'icon-48.png',
        '128': 'icon-128.png'
      }
    },
    icons: {
      '16': 'icon-16.png',
      '32': 'icon-32.png',
      '48': 'icon-48.png',
      '128': 'icon-128.png'
    }
  }
});
