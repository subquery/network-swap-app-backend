// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import keplerContrats from "@subql/contract-sdk/publish/kepler.json";
import { EthereumLog } from "@subql/types-ethereum";

export const EXCHANGE_DIST_ADDRESS = keplerContrats.PermissionedExchange.address;
export const KSQT_ADDRESS = keplerContrats.SQToken.address;

/**
 *
 * @param handler
 * @param event
 * @returns `${topicHandler:block:Txhash}`
 */
export const getUpsertAt = (
  handler: string,
  event: EthereumLog<any>
): string => {
  return `${handler}:${event.blockNumber}:${event.transactionHash}`;
};

export const isKSQT = (address: string): boolean => {
  return address === KSQT_ADDRESS;
};
