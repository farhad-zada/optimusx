import { withdrawals } from "./recources/withdrawals";

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithdraw() {
    let allocations = withdrawals();
    let url = "http://127.0.0.1:3456/send/EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";
    let method = "POST";

    let i = 0;
    while (i < allocations.length) {
        let allocation = allocations.at(i);
        let body = JSON.stringify(allocation);
        let res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body,
        });
        let resData = await res.json();
        resData.address = allocation?.address;
        resData.index = i;
        console.log(resData);
        if (resData.message == "Something went wrong!") {
            continue;
        }
        await delay(50000);
        i++;
    }
}

sendWithdraw()
    .then()
    .catch((e) => console.log(e));
