import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, beginCell, OpenedContract, Sender, toNano, TonClient } from "@ton/ton";
import { openWallet } from "./src/ton/openWallet";
import { mnemonics } from "./recources/mnemonics";
import { JettonMinter } from "./contracts/JettonMinter";
import { KeyPair } from "@ton/crypto";
import { getKeyPair } from "./src/ton/getKeyPair";
import { JettonWallet } from "./contracts/JettonWallet";

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const endpoint = await getHttpEndpoint();
    const client = new TonClient({
        endpoint,
    });
    let wallet = await openWallet(client, mnemonics()[0].words);

    let jettonMaster: OpenedContract<JettonMinter> = client.open(
        JettonMinter.createFromAddress(Address.parse("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs"))
    );
    let keyPair: KeyPair = await getKeyPair(mnemonics()[0].words);
    const ownerAddress = wallet.address;
    const jettonWalletAddress = await jettonMaster.getWalletAddress(ownerAddress);
    const jettonWalletContract = client.open(JettonWallet.createFromAddress(jettonWalletAddress));
    const to = Address.parse("UQDL_sbXPAzQRh7yNkT5_-Ut8XgyhHTXIuc-SJYWJKcWAgkD");
    const walletTonBalance = await wallet.getBalance();
    const jettonBalance = await jettonWalletContract.getJettonBalance();
    let amount = toNano("0.001") / BigInt(1000);
    console.log(amount, wallet.address);
    const tx = await jettonWalletContract.sendTransfer(
        wallet.sender(keyPair.secretKey),
        toNano("0.01"),
        amount,
        to,
        wallet.address,
        beginCell().endCell(),
        toNano("0.000000001"),
        beginCell().endCell()
    );
    let trx = await client.tryLocateResultTx(wallet.address, jettonWalletAddress, (((Date.now() - 2000)/1000).toFixed()));
    console.log(trx);
    console.log(`Transferred ${amount} USDTs to ${to}!`);
}

main().then().catch();
