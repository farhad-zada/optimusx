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
    const trxs = await client.getTransactions(wallet.address, { limit: 100 });
}

main().then().catch();
