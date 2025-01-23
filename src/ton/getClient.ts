import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "@ton/ton";

export async function getCleint(): Promise<TonClient> {
    const endpoint = await getHttpEndpoint();
    return new TonClient({
        endpoint,
    });
}
