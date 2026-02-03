
import net from 'net';

const host = '172.16.1.26';
const ports = [22, 2222, 80, 83, 3306, 3500, 5060, 8088];

console.log('Scanning ' + host + '...');

async function checkPort(port) {
    return new Promise((resolve) => {
        const s = new net.Socket();
        s.setTimeout(2000);
        s.on('connect', () => {
            console.log(port + ' OPEN');
            s.destroy();
            resolve();
        });
        s.on('timeout', () => {
            console.log(port + ' TIMEOUT');
            s.destroy();
            resolve();
        });
        s.on('error', (e) => {
            console.log(port + ' CLOSED (' + e.code + ')');
            s.destroy();
            resolve();
        });
        s.connect(port, host);
    });
}

async function scan() {
    for (const port of ports) {
        await checkPort(port);
    }
}

scan();
