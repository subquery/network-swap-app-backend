import { AcalaEvmEvent } from "@subql/acala-evm-processor";
import { ClaimRewardsEvent } from "@subql/contract-sdk/typechain/RewardsDistributer";
import assert from "assert";
import { Trader } from "../types";

export async function handleRewardsClaimed(
    event: AcalaEvmEvent<ClaimRewardsEvent['args']>
  ): Promise<void> {
    logger.info('handleRewardsClaimed');
    assert(event.args, 'No event args');

    const { delegator } = event.args;

    let trader = await Trader.get(delegator);

    if (!trader) {
      trader = Trader.create({
        id: delegator,
        totalTradeAmount: BigInt(0), 
        totalAwardAmount: BigInt(0), //FIXME: calculate
        maxTradeAmount: BigInt(0) //FIXME: calculate
      });

      await trader.save();
    }

    return
}
