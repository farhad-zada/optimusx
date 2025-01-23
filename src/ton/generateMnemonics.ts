import { mnemonicNew } from "@ton/crypto";

async function generateMnemonic() {
    console.log((await mnemonicNew()).join(" "));
}

generateMnemonic().then().catch()