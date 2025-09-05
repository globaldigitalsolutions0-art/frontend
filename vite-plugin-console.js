import chalk from 'chalk';
import boxen from 'boxen';
import { version } from 'vite';

function viteConsolePlugin() {
  return {
    name: 'vite-console',
    configResolved(config) {
      const { server } = config;
      const localUrl = `http://${server.host || 'localhost'}:${server.port}`;
      const networkUrl = `http://${require('ip').address()}:${server.port}`;
      
      const message = `
  🚀 ${chalk.bold.blue('Vite')} ${chalk.dim(`v${version}`)} ${chalk.green('is running!')}

  ${chalk.bold('Local:')}   ${chalk.cyan(localUrl)}
  ${chalk.bold('Network:')} ${chalk.cyan(networkUrl)}
  
  ${chalk.dim('Press')} ${chalk.bold('h')} ${chalk.dim('for help')}
  `;

      const boxenOptions = {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue',
        backgroundColor: '#1e1e1e'
      };

      console.clear();
      console.log(boxen(chalk.white(message), boxenOptions));
    }
  };
}

export default viteConsolePlugin;
