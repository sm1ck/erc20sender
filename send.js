import ethers from 'ethers';
import * as main from './main.js';

export async function newAccount(acc, to_acc) {
    new Promise(async () => {
        // Кошелек
        let ethWallet = main.web3.eth.accounts.privateKeyToAccount(acc);
        let address = ethWallet.address;
        let bal_eth = await main.web3.eth.getBalance(address);
        if (!main.isEth) {
            // Считаем кол-во токенов
            let numberOfTokens = main.amount == 0 ? numberOfTokens = await main.contract.methods.balanceOf(address).call() : ethers.utils.parseUnits(main.amount, main.decimals);
            // Проверка газа
            let gas = await main.contract.methods.transfer(to_acc, numberOfTokens.toString()).estimateGas({from: address});
            let gasPrice = await main.web3.eth.getGasPrice();
            let minETHNeed = gas * gasPrice;
            if (bal_eth > minETHNeed) {
                console.log('Отправка '+ethers.utils.formatUnits(numberOfTokens.toString(), main.decimals)+' '+main.symbol+' с '+address+' на '+to_acc+'..');
                // Создаем транзакцию
                let tx = main.isEIP1559 ? {
                    from: address,
                    to: main.token,
                    gas: gas,
                    maxPriorityFeePerGas: main.maxPriorityFeePerGas,
                    data: await main.contract.methods.transfer(to_acc, numberOfTokens.toString()).encodeABI()
                } : {
                    from: address,
                    to: main.token,
                    gas: gas,
                    gasPrice: gasPrice,
                    data: await main.contract.methods.transfer(to_acc, numberOfTokens.toString()).encodeABI()
                };
                // Подписываем и отправляем
                let signedTx = await main.web3.eth.accounts.signTransaction(tx, acc);
                main.web3.eth.sendSignedTransaction(signedTx.rawTransaction).on('transactionHash', (hash) => {
                    console.log(address+' => '+hash);
                });
            } else {
                console.log(address+' => '+'недостаточный баланс кошелька');
            }
        } else {
            // Считаем кол-во токенов
            let numberOfTokens = main.amount == 0 ? numberOfTokens = await main.web3.eth.getBalance(address) : numberOfTokens = main.web3.utils.toWei(main.amount.toString(), 'ether');
            let gas = 21000;
            let gasPrice = await main.web3.eth.getGasPrice();
            let minETHNeed = gas * gasPrice;
            if (bal_eth > minETHNeed) {
                console.log('Отправка '+ethers.utils.formatUnits(numberOfTokens, 18)+' с '+address+' на '+to_acc+'..');
                // Создаем транзакцию
                let tx = main.isEIP1559 ? {
                    from: address,
                    to: to_acc,
                    gas: gas,
                    maxPriorityFeePerGas: main.maxPriorityFeePerGas,
                    value: numberOfTokens
                } : {
                    from: address,
                    to: to_acc,
                    gas: gas,
                    gasPrice: gasPrice,
                    value: numberOfTokens
                };
                // Подписываем и отправляем
                let signedTx = await main.web3.eth.accounts.signTransaction(tx, acc);
                main.web3.eth.sendSignedTransaction(signedTx.rawTransaction).on('transactionHash', (hash) => {
                    console.log(address+' => '+hash);
                });
            } else {
                console.log(address+' => '+'недостаточный баланс кошелька');
            }
        }
    }).catch((err) => {
        console.warn('Ошибка при отправке транзакции:')
        console.dir(err);
    });
}