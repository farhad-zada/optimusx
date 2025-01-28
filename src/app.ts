import express, { Request, Response } from "express";
import { JettonMinter } from "../contracts/JettonMinter";
import { Address, TonClient, WalletContractV4 } from "@ton/ton";
import { KeyPair } from "@ton/crypto";
import { getCleint } from "./ton/getClient";
import { openWallet } from "./ton/openWallet";
import { mnemonics } from "../recources/mnemonics";
import { beginCell, OpenedContract, toNano } from "@ton/core";
import { getKeyPair } from "./ton/getKeyPair";
import { JettonWallet } from "../contracts/JettonWallet";
import { Telegraf } from "telegraf";
import { config } from "dotenv";
config();

const app = express();
const PORT = 3456;
let isProcessing = false;
let client: TonClient;
let wallet: OpenedContract<WalletContractV4>;
let jettonMasterAddress: string;
let jettonMaster: OpenedContract<JettonMinter>;
let jettonWalletContract: OpenedContract<JettonWallet>;
let keyPair: KeyPair;
let telegramBot: Telegraf;
let telegramChatIds = [5108883321];
let allowedIps: string[] = process.env.ALLOWED_IPS?.split(",") ?? "".split(",");

const getAddress = (a: any): Address | undefined => {
    try {
        return Address.parse(a);
    } catch (error) {
        console.log(error);
        return;
    }
};

const getAmount = (amount: any, divBy: bigint): bigint | undefined => {
    try {
        let nanoAmount = toNano(`${amount}`);
        return nanoAmount / divBy;
    } catch (e) {
        console.log(e);
        return;
    }
};

async function sendTelegramMessage(messages: string[]) {
    try {
        for (let chatId of telegramChatIds) {
            messages.forEach((message) => {
                telegramBot.telegram.sendMessage(chatId, message);
            });
        }
    } catch (error) {
        console.log(error);
    }
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    client = await getCleint();
    wallet = await openWallet(client, mnemonics()[0].words);
    keyPair = await getKeyPair(mnemonics()[0].words);
    if (!process.env.MASTER_TOKEN && !getAddress(process.env.MASTER_TOKEN)) {
        throw new Error("MASTER_TOKEN not found in environment!");
    }
    jettonMasterAddress = process.env.MASTER_TOKEN ?? "";
    jettonMaster = client.open(JettonMinter.createFromAddress(Address.parse(jettonMasterAddress)));
    const jettonWalletAddress = await jettonMaster.getWalletAddress(wallet.address);
    jettonWalletContract = client.open(JettonWallet.createFromAddress(jettonWalletAddress));
    if (!process.env.TELEGRAM_OPTIMUSX_NOTIFICATIONS_BOT_TOKEN) {
        console.log("Environment variable TELEGRAM_BOT_TOKEN not found!");
        process.exit(12);
    }
    telegramBot = new Telegraf(process.env.TELEGRAM_OPTIMUSX_NOTIFICATIONS_BOT_TOKEN);
    console.log(wallet.address);
    console.log(jettonMasterAddress);
    console.log(jettonWalletAddress);
    sendTelegramMessage([
        `Wallet: ${wallet.address}\nJetton Master: ${jettonMasterAddress}\nJetton Wallet: ${jettonWalletAddress}`,
    ]);
})();

app.use(express.json());

app.use("/", (req, res, next) => {
    if (!req.ip || !allowedIps.includes(req.ip)) {
        sendTelegramMessage(["Unknown IP: " + req.ip?.toString()]);
        res.status(403).json({ message: "Thanks!" });
        return;
    }
    next();
});

app.get("/balance/xopt/:address", async (req: Request, res: Response) => {
    try {
        let xoptMinterAddress = Address.parse("EQCBPTfghL-_KsmnASLFSAMVKTY8lepp2qb5ra4l4XsBwYKM");
        let xoptMinterContract = client.open(JettonMinter.createFromAddress(xoptMinterAddress));
        const address = getAddress(req.params.address);
        if (!address) {
            res.status(403).json({
                message: "Query paramether `a` (address) should be a valid TON address!",
            });
            return;
        }
        const xoptWalletAddress = await xoptMinterContract.getWalletAddress(address);
        const xoptWalletContract = client.open(JettonWallet.createFromAddress(xoptWalletAddress));
        const balance = await xoptWalletContract.getJettonBalance();
        res.status(200).json({ message: "success", balance: balance.toString(), decimals: 9 });
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong!" });
    }
});

app.post("/send/:token", async (req: Request, res: Response): Promise<any> => {
    try {
        if (isProcessing) {
            res.status(429).json({ message: "Processing another request! Request in a minute!" });
            return;
        }
        isProcessing = true;
        if (req.params.token !== jettonMasterAddress) {
            res.status(403).json({ message: `Unallowed token ${req.params.token}` });
            isProcessing = false;
            return;
        }
        let recipient = getAddress(req.body.address);
        if (!recipient) {
            res.status(422).json({
                message: "Query paramether `a` (address) should be a valid TON address!",
            });
            isProcessing = false;

            return;
        }
        let amount = getAmount(req.body.amount, BigInt(1000));
        if (!amount) {
            res.status(400).json({ message: "Amount should be a valid integer!", amount: req.body.amount });
            isProcessing = false;

            return;
        }

        const jettonBalance: bigint = await jettonWalletContract.getJettonBalance();
        if (jettonBalance < amount) {
            let messages = [
                `Bot do not have left enough jetton balance!\nRequired: ${amount}\nBalance: ${jettonBalance}`,
            ];

            sendTelegramMessage(messages);

            res.status(400).json({ message: "Master wallet do not have enough jetton balance!" });
            isProcessing = false;

            return;
        }

        const tonBalance = await wallet.getBalance();

        if (tonBalance < toNano("0.005")) {
            let messages = [
                `Bot address do not have left enough TON balance!\nRequired: > 0.5\nBalance: ${tonBalance}`,
            ];
            sendTelegramMessage(messages);
            res.status(400).json({ message: "Master wallet do not have enough TON balance!" });
            isProcessing = false;
            return;
        }
        await jettonWalletContract.sendTransfer(
            wallet.sender(keyPair.secretKey),
            toNano("0.05"),
            amount,
            recipient,
            wallet.address, //Address.parse("UQDL_sbXPAzQRh7yNkT5_-Ut8XgyhHTXIuc-SJYWJKcWAgkD"),
            beginCell().endCell(),
            toNano("0.01"),
            beginCell().endCell()
        );

        console.log(`Transferred ${amount.toString()} USDTs to ${recipient}`);
        res.status(200).json({
            message: "success!",
        });
        await delay(45000);
        isProcessing = false;
    } catch (error) {
        console.log(error);
        isProcessing = false;
        res.status(500).json({ message: "Something went wrong!" });
    }
});

app.listen(PORT, () => {
    console.log("Started server!");
});
