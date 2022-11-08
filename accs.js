import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const importAccs = () => {
    let accs = new Map();
    let data = JSON.parse(fs.readFileSync(path.join(__dirname, '/keys.json'), { encoding: 'utf8', flag: 'r' }));
    data.forEach(i => accs.set(i.privatekey, i.toAcc));
    return accs;
};