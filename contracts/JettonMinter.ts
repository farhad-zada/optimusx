import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractGetMethodResult,
    ContractProvider,
    ContractState,
    internal,
    MessageRelaxed,
    Sender,
    SendMode,
    Slice,
    toNano,
    Tuple,
    TupleReader,
} from "@ton/core";
import { JettonWallet } from "./JettonWallet";

export class JettonMinter implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new JettonMinter(address);
    }

    async getTotalSupply(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.totalSupply;
    }

    async getAdminAddress(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.adminAddress;
    }

    async getContent(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.content;
    }

    async getJettonData(provider: ContractProvider) {
        let res = await provider.get("get_jetton_data", []);
        let totalSupply = res.stack.readBigNumber();
        let mintable = res.stack.readBoolean();
        let adminAddress = res.stack.readAddress();
        let content = res.stack.readCell();
        let walletCode = res.stack.readCell();
        return {
            totalSupply,
            mintable,
            adminAddress,
            content,
            walletCode,
        };
    }

    async getWalletAddress(
        provider: ContractProvider,
        owner: Address
    ): Promise<Address> {
        let slice = beginCell().storeAddress(owner).endCell();

        let res = await provider.get("get_wallet_address", [
            { type: "slice", cell: slice },
        ]);

        let walletAddress = res.stack.readAddress();
        return walletAddress;
    }

    async getWalletData(provider: ContractProvider) {
        let res = await provider.get("get_wallet_data", []);
        let balance = res.stack.readBigNumber();
        let owner = res.stack.readAddress();
        let jetton = res.stack.readAddress();
        let jettonWalletCode = res.stack.readCell();
        return {
            balance,
            owner,
            jetton,
            jettonWalletCode,
        };
    }

}
