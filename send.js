import ethers from 'ethers';
import * as main from './main.js';

export const send = async (acc, to_acc) => {
    await new Promise(async (resolve, reject) => {
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
            let minETHNeed = (ethers.BigNumber.from(gas).mul(ethers.BigNumber.from(gasPrice)).add(main.isEIP1559 ? main.maxPriorityFeePerGas : 0)).mul(main.isEIP1559 ? 2 : 1); // при EIP-1559 проверяем по maxFee
            if (ethers.BigNumber.from(bal_eth).gt(minETHNeed)) {
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
                    resolve();
                }).on('error', (error) => {
                    console.log(address+' => ошибка:');
                    console.dir(error);
                    resolve();
                });
            } else {
                console.log(address+' => '+'недостаточный баланс кошелька');
                resolve();
            }
        } else {
            // Считаем кол-во токенов
            let numberOfTokens = main.amount == 0 ? numberOfTokens = await main.web3.eth.getBalance(address) : numberOfTokens = main.web3.utils.toWei(main.amount.toString(), 'ether');
            let gas = 21000;
            let gasPrice = await main.web3.eth.getGasPrice();
            let minETHNeed = (ethers.BigNumber.from(gas).mul(ethers.BigNumber.from(gasPrice)).add(main.isEIP1559 ? main.maxPriorityFeePerGas : 0)).mul(main.isEIP1559 ? 2 : 1); // при EIP-1559 проверяем по maxFee
            if (ethers.BigNumber.from(bal_eth).gt(minETHNeed)) {
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
                    resolve();
                }).on('error', (error) => {
                    console.log(address+' => ошибка:');
                    console.dir(error);
                    resolve();
                });
            } else {
                console.log(address+' => '+'недостаточный баланс кошелька');
                resolve();
            }
        }
    }).catch((err) => {
        console.warn('Ошибка при отправке транзакции:');
        console.dir(err);
        resolve();
    });
}