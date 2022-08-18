// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AcalaEvmEvent } from '@subql/acala-evm-processor';
import { ClaimRewardsEvent } from '@subql/contract-sdk/typechain/RewardsDistributer';
import assert from 'assert';
import { Trader } from '../types';
import { getUpsertAt } from './utils';

export async function handleRewardsClaimed(event: AcalaEvmEvent<ClaimRewardsEvent['args']>): Promise<void> {
  logger.info('handleRewardsClaimed');
  assert(event.args, 'No event args');

  const { delegator, rewards } = event.args;
  const rewardsBigInt = rewards.toBigInt();
  const handlerInfo = getUpsertAt('handleRewardsClaimed', event);

  let trader = await Trader.get(delegator);

  if (!trader) {
    trader = Trader.create({
      id: delegator,
      totalTradeAmount: BigInt(0),
      totalAwardAmount: rewardsBigInt,
      maxTradeAmount: rewardsBigInt,
      createAt: handlerInfo,
    });
  } else {
    trader.totalAwardAmount += rewardsBigInt;
    trader.maxTradeAmount = trader.totalAwardAmount - trader.totalTradeAmount;
    trader.updateAt = handlerInfo;
  }

  await trader.save();
}
