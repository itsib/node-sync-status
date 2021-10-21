const Web3 = require('web3');
const chalk = require('chalk');

const provider = new Web3.providers.WebsocketProvider('ws://159.223.23.205:8546', {
  clientConfig: {
    keepalive: true,
    keepaliveInterval: 60000,
  },
  reconnect: {
    auto: true,
    delay: 2500,
    onTimeout: true,
  }
})
const web3 = new Web3(provider);

let syncing;
const interval = setInterval(() => web3.eth.isSyncing().then(s => syncing = s), 3000);

const refreshInterval = 3; // In seconds
let prevBlockNumber;
let prevBlockTime;
let blocksPerSecond = 0;
let completedDate;

const subscription = web3.eth
  .subscribe('newBlockHeaders')
  .on('connected', () => {
    console.log(chalk.green('Connected'));
  })
  .on('data', (block) => {
    if (syncing === false) {
      console.log('Syncing complete');
      return process.exit();
    }

    if (syncing) {
      const currentTime = Date.now();
      if (!prevBlockNumber || prevBlockTime < currentTime - refreshInterval * 1000) {
        blocksPerSecond = prevBlockNumber ? Math.round((block.number - prevBlockNumber) / refreshInterval) : 0;
        prevBlockNumber = block.number;
        prevBlockTime = currentTime;
        completedDate = blocksPerSecond ? new Date(currentTime + (Math.round(syncing.highestBlock / blocksPerSecond * 1000))) : undefined
      }

      const head = syncing.highestBlock.toLocaleString('en', { useGrouping: true });
      const current = block.number.toLocaleString('en', { useGrouping: true });
      const percent = (block.number / (syncing.highestBlock / 100)).toLocaleString('en', { maximumFractionDigits: 2 });


      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${current}/${head} | ${percent}% | ${blocksPerSecond ? `${blocksPerSecond}bps` : 'N/A'} | ${completedDate ? completedDate.toUTCString() : 'N/A'}`);
    }
  })
  .on('error', (error) => {
    console.error(error);
  });

process.on('SIGINT', () => {
  clearInterval(interval);
  subscription.unsubscribe(() => {
    console.log(' ');
    process.exit();
  });
});
