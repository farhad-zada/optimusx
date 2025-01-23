import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, beginCell, OpenedContract, Sender, toNano, TonClient } from "@ton/ton";
import { openWallet } from "./src/ton/openWallet";
import { mnemonics } from "./recources/mnemonics";
import { JettonMinter } from "./contracts/JettonMinter";
import { KeyPair } from "@ton/crypto";
import { getKeyPair } from "./src/ton/getKeyPair";
import { JettonWallet } from "./contracts/JettonWallet";
import { randomUUID } from "crypto";

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
        JettonMinter.createFromAddress(Address.parse("EQCBPTfghL-_KsmnASLFSAMVKTY8lepp2qb5ra4l4XsBwYKM"))
    );
    let keyPair: KeyPair = await getKeyPair(mnemonics()[0].words);
    const ownerAddress = wallet.address;
    const jettonWalletAddress = await jettonMaster.getWalletAddress(ownerAddress);
    const jettonWalletContract = client.open(JettonWallet.createFromAddress(jettonWalletAddress));
    const to = Address.parse("UQDL_sbXPAzQRh7yNkT5_-Ut8XgyhHTXIuc-SJYWJKcWAgkD");

    const tx = await jettonWalletContract.sendTransfer(
        wallet.sender(keyPair.secretKey),
        toNano("0.02"),
        toNano("2000"),
        to,
        to,
        beginCell().endCell(),
        toNano("0"),
        beginCell().endCell()
    );
    console.log(`Transferred ${2000} XOPTs to ${to}!`);
}

main().then().catch();
