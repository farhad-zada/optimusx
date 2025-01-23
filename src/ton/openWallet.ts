import { Address, TonClient, WalletContractV4 } from "@ton/ton";
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";

export async function openWallet(client: TonClient, mnemonic: string[]) {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const workchain = 0;
    const wallet = WalletContractV4.create({workchain, publicKey: keyPair.publicKey});
    const walletContract = client.open(wallet);   
    return walletContract;
}
