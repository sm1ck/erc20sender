/**
 * Скрипт для пересылки токенов, их ончейн мониторинга на балансе
 * @Author Jancrypto (telegram)
 * Donate: 0x9D278054C3e73294215b63ceF34c385Abe52768B
 * node main.js <адрес_токена> <кол-во> [erc20|eth]
 * Адрес токена - это смарт-контракт токена
 * Количество - это количество токенов для пересылки, 0 - это отправить все токены на адресе
 * erc20 - использование стандартного abi, eth - отправка нативных монет L1 блокчейна
 */
import Web3 from 'web3';
import ethers from 'ethers';
import * as accs from './accs.js';
import * as a from './send.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exit } from 'process';

const version = '1.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * --> Укажите rpc адрес вашего блокчейна <--
 * Список rpc нод (https://github.com/arddluma/awesome-list-rpc-nodes-providers можно искать тут)
 * Часть нод не поддерживает подписки на события, нужно искать нужную
 * wss://mainnet.infura.io/ws/v3/ВАШ_ID - эфир
 * wss://arb-mainnet.g.alchemy.com/v2/ВАШ_ID - арбитрум оне
 * wss://opt-mainnet.g.alchemy.com/v2/ВАШ_ID - оптимизм
 * wss://polygon-mainnet.g.alchemy.com/v2/ВАШ_ID - полигон
 * wss://goerli.infura.io/ws/v3/ВАШ_ID - гоерли
 */

const rpc = "wss://mainnet.infura.io/ws/v3/ВАШ_ID";

// Базовые переменные

export let isEth = false; // если мы просто отправляем монеты L1 блокчейна
const mode = 0; // 0 => отправка, 1 => слушатель баланса токенов, если > N, то отправка всех
const cutoff = 0; // кол-во токенов, при превышении которого идет отправка в mode == 1
const isSleep = false; // задержка перед отправкой, нужна ли? изменить на true, если нужна
const sleep_from = 30; // от 30 секунд
const sleep_to = 120; // до 120 секунд
export const isEIP1559 = true; // используем ли EIP-1559
export const maxPriorityFeePerGas = 1500000000; // 1.5 gwei, можно поменять tip для майнеров
const ERC20_ABI = JSON.parse(fs.readFileSync(path.join(__dirname, '/ERC20.json'), 'utf8'));

/**
 * Абстрактная задержка
 * @param {Integer} millis 
 * @returns 
 */

 const sleep = async (millis) => {
    return new Promise(resolve => setTimeout(resolve, millis));
};

/**
 * Случайное min/max целое значение
 * @param {Integer} min 
 * @param {Integer} max 
 * @returns Случайное число
 */

const randomIntInRange = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Авторство

console.log(`-=- erc20sender v${version} -=-`);
console.log('License: ISC\nAuthor: @Jancrypto\nDonate: 0x9D278054C3e73294215b63ceF34c385Abe52768B');

// Парсинг параметров

export let token, amount;
process.argv.forEach(function (val, index, array) {
    switch (index) {
        case 2:
            token = val;
        case 3:
            amount = val;
        case 4:
            isEth = val == 'eth' ? 1 : 0;
    }
});

// Запуск rpc

export const web3 = new Web3(rpc);

// Чтение аккаунтов

const adata = accs.importAccs();
let accs_arr = [];
let pubaccs_map = new Map();
for (const [key, value] of adata) {
    let acc = web3.eth.accounts.privateKeyToAccount(key);
    accs_arr.push(acc.address);
    pubaccs_map.set(acc.address, key);
}

// Контракт

export const contract = new web3.eth.Contract(ERC20_ABI, token);
export const decimals = await contract.methods.decimals().call();
export const symbol = await contract.methods.symbol().call();

let options = {
    filter: {
        to: accs_arr
    },
    fromBlock: 'latest'
};

// Основной цикл

switch (mode) {
    case 1:
        if (isEth) {
            console.warn('На текущий момент доступна только отправка нативных монет в mode == 0');
            exit();
        }
        contract.events.Transfer(options).on("connected", () => {
            console.log('Ожидание изменения балансов токена..')
        }).on("data", (event) => {
            new Promise(async () => {
                let val = event.returnValues['2'];
                let balance = ethers.utils.formatUnits(val, decimals);
                if (balance > cutoff) {
                    let privkey = pubaccs_map.get(event.returnValues['1']);
                    if (isSleep) {
                        let sle = randomIntInRange(sleep_from, sleep_to);
                        console.log(event.returnValues['1']+': задержка '+sle+'с..');
                        sleep(sle * 1000).then(() => {
                            a.send(privkey, adata.get(privkey));
                        });
                    } else {
                        a.send(privkey, adata.get(privkey));
                    }
                }
            }).catch ((err) => {
                console.warn('Ошибка при обработке потока транзакций:')
                console.dir(err);
            });
        }).on('changed', (event) => {
            // remove event from local database
        })
        .on('error', (error, receipt) => {
            console.warn('Ошибка:')
            console.dir(error);
        });
        break;
    default:
        let i = 0;
        for (const [key, value] of adata) {
            let prom = a.send(key, value);
            ++i;
            if (isSleep) {
                let sle = randomIntInRange(sleep_from, sleep_to);
                prom.then(() => i < adata.size ? console.log('Задержка '+sle+'с..') : null);
                if (i < adata.size) {
                    await sleep(sle * 1000);
                }  
            }
            if (i >= adata.size) {
                await sleep(3000);
                console.log('Завершение работы..')
                exit();
            }
        }
        break;
}