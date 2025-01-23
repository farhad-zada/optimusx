import express, { Request, Response } from "express";
import { JettonMinter } from "../contracts/JettonMinter";
import { Address, TonClient, WalletContractV4, internal } from "@ton/ton";
import { KeyPair } from "@ton/crypto";
import { getCleint } from "./ton/getClient";
import { openWallet } from "./ton/openWallet";
import { mnemonics } from "../recources/mnemonics";
import { beginCell, fromNano, OpenedContract, toNano } from "@ton/core";
import { getKeyPair } from "./ton/getKeyPair";
import { JettonWallet } from "../contracts/JettonWallet";
import { Telegraf } from "telegraf";
import { config } from "dotenv";
config();

const app = express();
const PORT = 3456;
let client: TonClient;
let wallet: OpenedContract<WalletContractV4>;
let jettonMasterAddress: string;
let jettonMaster: OpenedContract<JettonMinter>;
let jettonWalletContract: OpenedContract<JettonWallet>;
let keyPair: KeyPair;
let telegramBot: Telegraf;
let telegramChatId = 5108883321;
let allowedIps: string[] = process.env.ALLOWED_IPS?.split(",") ?? "".split(",");

const getAddress = (a: any): Address | undefined => {
    try {
        return Address.parse(a);
    } catch (error) {
        console.log(error);
        return;
    }
};

const getAmount = (amount: any): Number | undefined => {
    try {
        return Number.parseInt(`${amount}`);
    } catch (e) {
        console.log(e);
        return;
    }
};

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
})();

app.use(express.json());

app.use("/", (req, res, next) => {
    if (!req.ip || !allowedIps.includes(req.ip)) {
        res.status(403).json({ message: "Thanks!" });
        return;
    }
    next();
});

app.get("/balance/:token/:address", async (req: Request, res: Response) => {
    try {
        if (req.params.token !== jettonMasterAddress) {
            res.status(403).json({ message: `Unallowed token ${req.params.token}` });
            return;
        }
        const address = getAddress(req.params.address);
        if (!address) {
            res.status(403).json({
                message: "Query paramether `a` (address) should be a valid TON address!",
            });
            return;
        }
        const jettonWalletAddress = await jettonMaster.getWalletAddress(address);
        const jettonWalletContract = client.open(JettonWallet.createFromAddress(jettonWalletAddress));
        const balance = await jettonWalletContract.getJettonBalance();
        res.status(200).json({ message: "success", balance: fromNano(balance) });
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong!" });
    }
});

app.post("/send/:token", async (req: Request, res: Response): Promise<any> => {
    try {
        if (req.params.token !== jettonMasterAddress) {
            res.status(403).json({ message: `Unallowed token ${req.params.token}` });
            return;
        }
        let recipient = getAddress(req.body.address);
        if (!recipient) {
            res.status(403).json({
                message: "Query paramether `a` (address) should be a valid TON address!",
            });
            return;
        }
        let amount = getAmount(req.body.amount);
        if (!amount) {
            res.status(403).json({ message: "Amount should be a valid integer!", amount: req.body.amount });
            return;
        }

        const masterBalance: bigint = await jettonWalletContract.getJettonBalance();
        if (masterBalance < toNano(amount.toString())) {
            telegramBot.telegram.sendMessage(telegramChatId, "Bot do not have left enough balance!");
            telegramBot.telegram.sendMessage(telegramChatId, `${wallet.address}`);
            res.status(400).json({ message: "Master wallet do not have enough balance!" });
            return;
        }
        await jettonWalletContract.sendTransfer(
            wallet.sender(keyPair.secretKey),
            toNano("0"),
            toNano(`${amount}`),
            recipient,
            recipient,
            beginCell().endCell(),
            toNano("0"),
            beginCell().endCell()
        );

        console.log(`Transferred ${amount.toString()} USDTs to ${recipient}`);
        telegramBot.telegram.sendMessage(
            telegramChatId,
            `Transferred ${toNano(amount.toString())} USDTs to ${recipient}`
        );
        res.status(200).json({
            message: "success!",
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong!" });
    }
});

app.listen(PORT, () => {
    console.log("Started server!");
});
