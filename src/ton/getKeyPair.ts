import { KeyPair, mnemonicToPrivateKey } from "@ton/crypto";

export async function getKeyPair(mnemonic: string[]): Promise<KeyPair> {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    return keyPair;
}
