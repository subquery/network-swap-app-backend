// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import testnetAddresses from "@subql/contract-sdk/publish/testnet.json";
import { EthereumLog } from "@subql/types-ethereum";

export const EXCHANGE_DIST_ADDRESS =
  testnetAddresses.PermissionedExchange.address;
export const KSQT_ADDRESS = testnetAddresses.SQToken.address;

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

export function biToDate(bi: bigint): Date {
  return new Date(Number(bi) * 1000);
}