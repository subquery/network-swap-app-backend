// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { FrontierEvmEvent } from '@subql/frontier-evm-processor';
import testnetAddresses from '@subql/contract-sdk/publish/moonbase.json';

export const EXCHANGE_DIST_ADDRESS = testnetAddresses.PermissionedExchange.address;
export const KSQT_ADDRESS = testnetAddresses.SQToken.address;

/**
 *
 * @param handler
 * @param event
 * @returns `${topicHandler:block:Txhash}`
 */
export const getUpsertAt = (handler: string, event: FrontierEvmEvent<any>): string => {
  return `${handler}:${event.blockNumber}:${event.transactionHash}`;
};

export const isKSQT = (address: string): boolean => {
  return address === KSQT_ADDRESS;
}


