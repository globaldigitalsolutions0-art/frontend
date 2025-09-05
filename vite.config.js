import {
    defineConfig
} from 'vite';
import react from '@vitejs/plugin-react';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
};

function createBox(text) {
    const lines = text.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length));

    const topBottom = '╭' + '─'.repeat(maxLength + 2) + '╮';
    const middle = lines.map(line =>
        `│ ${line}${' '.repeat(maxLength - line.length)} │`
    ).join('\n');
    const bottom = '╰' + '─'.repeat(maxLength + 2) + '╯';

    return `${topBottom}\n${middle}\n${bottom}`;
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false
            }
        },
        // Customize the dev server output
        onServerListening(server) {
            const {
                port
            } = server.config.server;
            const localUrl = `http://localhost:${port}`;
            const networkUrl = `http://${require('os').networkInterfaces()['Wi-Fi']?.find(i => i.family === 'IPv4')?.address || 'localhost'}:${port}`;

            const message = `${colors.bright}${colors.bgBlue}${colors.white}
  🚀 Vite Development Server
${colors.reset}
  ${colors.bright}${colors.blue}Local:${colors.reset}   ${colors.cyan}${localUrl}${colors.reset}
  ${colors.bright}${colors.blue}Network:${colors.reset} ${colors.cyan}${networkUrl}${colors.reset}
  
  ${colors.bright}${colors.yellow}Press ${colors.white}h${colors.reset} ${colors.yellow}for help${colors.reset}`;

            console.clear();
            console.log(createBox(message));
        }
    },
    build: {
        minify: false
    },
    esbuild: {
        drop: []
    }
});