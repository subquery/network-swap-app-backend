// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import keplerDeploymentFile from '@subql/contract-sdk/publish/kepler.json';
import testnetDeploymentFile from '@subql/contract-sdk/publish/kepler.json';
import { EthereumLog } from "@subql/types-ethereum";


export enum Contracts {
  EXCHANGE_DIST_ADDRESS = 'PermissionedExchange',
  KSQT_ADDRESS = 'SQToken',
}

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
  return address === Contracts.KSQT_ADDRESS;
};


export function biToDate(bi: bigint): Date {
  return new Date(Number(bi) * 1000);
}

export function getContractAddress(
  networkId: number,
  contract: Contracts
): string {
  const deploymentFile =
    networkId === 80001 ? testnetDeploymentFile : keplerDeploymentFile;
  // logger.info(
  //   `${networkId}: ${contract} ${
  //     deploymentFile[contract as keyof typeof deploymentFile].address
  //   }`
  // );
  return deploymentFile[contract as keyof typeof deploymentFile].address;
}