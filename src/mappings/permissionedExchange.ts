// Copyright 2020-2022 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  ExchangeOrderSentEvent,
  OrderSettledEvent,
  TradeEvent,
  QuotaAddedEvent,
  PermissionedExchange,
  ExchangeOrderChangedEvent,
} from "@subql/contract-sdk/typechain/PermissionedExchange";
import assert from "assert";
import { OrderStatus } from "../types";

import { PermissionedExchange__factory } from "@subql/contract-sdk";
import { EXCHANGE_DIST_ADDRESS, getUpsertAt, isKSQT } from "./utils";
import { Order, Trade, Trader } from "../types";
import { BigNumber } from "ethers";
import { EthereumLog } from "@subql/types-ethereum";

const { ACTIVE, INACTIVE } = OrderStatus;

function calculateTradeAmount(
  totalTradeAmount: bigint,
  event: EthereumLog<TradeEvent["args"]>
): bigint {
  if (event.args) {
    const { tokenGet, amountGet } = event.args;
    const getIsKSQT = isKSQT(tokenGet);
    const tradeAmountBN = BigNumber.from(totalTradeAmount);

    if (getIsKSQT) return tradeAmountBN.add(amountGet).toBigInt();

    return totalTradeAmount;
  }
  return BigNumber.from(0).toBigInt();
}

async function createTrade(
  orderId: BigNumber,
  sender: string,
  event: EthereumLog<TradeEvent["args"]>
): Promise<void> {
  if (event.args) {
    const { tokenGive, tokenGet, amountGive, amountGet } = event.args;

    const trade = Trade.create({
      id: `${orderId.toString()}:${event.transactionHash}`,
      tokenGive: tokenGet,
      tokenGet: tokenGive,
      amountGive: amountGet.toBigInt(),
      amountGet: amountGive.toBigInt(),
      senderId: sender,
      blockHeight: event.blockNumber,
      created: event.block.timestamp,
      createAt: getUpsertAt("createTrade", event),
    });

    await trade.save();
  }
}

async function createOrUpdateTrader(
  sender: string,
  handlerInfo: string,
  event: EthereumLog<TradeEvent["args"]>
) {
  let trader = await Trader.get(sender);
  const totalTradeAmount = calculateTradeAmount(
    trader?.totalTradeAmount ?? BigInt(0),
    event
  );

  if (!trader) {
    trader = Trader.create({
      id: sender,
      totalTradeAmount,
      totalAwardAmount: BigInt(0),
      maxTradeAmount: BigInt(0),
      createAt: handlerInfo,
    });
  } else {
    const { totalAwardAmount, totalTradeAmount } = trader;
    trader.totalTradeAmount = totalTradeAmount;
    trader.updateAt = handlerInfo;
    trader.maxTradeAmount = totalAwardAmount - totalTradeAmount;
  }
  await trader.save();
}

// MAPPING HANDLERS

export async function handleExchangeOrderSent(
  event: EthereumLog<ExchangeOrderSentEvent["args"]>
): Promise<void> {
  logger.info("handleExchangeOrderSent");
  assert(event.args, "No event args");

  const {
    orderId,
    sender,
    tokenGive,
    tokenGet,
    amountGive,
    amountGet,
    expireDate,
  } = event.args;
  const permissionedExchange = PermissionedExchange__factory.connect(
    EXCHANGE_DIST_ADDRESS,
    api
  );

  const { pairOrderId, tokenGiveBalance } = await permissionedExchange.orders(
    orderId
  );

  const order = Order.create({
    id: orderId.toString(),
    sender,
    tokenGive,
    tokenGet,
    pairOrderId: pairOrderId.toBigInt(),
    amountGive: amountGive.toBigInt(),
    amountGet: amountGet.toBigInt(),
    expireDate: new Date(expireDate.toNumber() * 1000), // seconds from contract
    tokenGiveBalance: tokenGiveBalance.toBigInt(),
    status: ACTIVE,
    blockHeight: event.blockNumber,
    created: event.block.timestamp,
    createAt: getUpsertAt("handleExchangeOrderSent", event),
  });

  await order.save();
}

async function updateOrder(
  orderId: BigInt,
  permissionedExchange: PermissionedExchange,
  handlerInfo: string
) {
  // orderId start from `1`
  if (orderId === BigInt(0)) return;

  const { tokenGiveBalance } = await permissionedExchange.orders(
    orderId.toString()
  );
  const order = await Order.get(orderId.toString());
  assert(order, `Expect order with id ${orderId.toString()} to exist`);

  order.tokenGiveBalance = tokenGiveBalance.toBigInt();
  order.updateAt = handlerInfo;
  await order.save();
}

export async function handleTrade(
  event: EthereumLog<TradeEvent["args"]>
): Promise<void> {
  logger.info("handleTrade");
  assert(event.args, "No event args");

  const { orderId } = event.args;
  const handlerInfo = getUpsertAt("handleTrade", event);

  //-- Trade Entitiy handling
  const permissionedExchange = PermissionedExchange__factory.connect(
    EXCHANGE_DIST_ADDRESS,
    api
  );

  //-- Trader and Trade Entitiy handling
  const { sender, pairOrderId } = await permissionedExchange.orders(orderId);
  await createOrUpdateTrader(sender, handlerInfo, event);
  await createTrade(orderId, sender, event);

  //-- Order Entity handling
  await updateOrder(orderId.toBigInt(), permissionedExchange, handlerInfo);
  await updateOrder(pairOrderId.toBigInt(), permissionedExchange, handlerInfo);
}

export async function handleOrderSettled(
  event: EthereumLog<OrderSettledEvent["args"]>
): Promise<void> {
  logger.info("handleOrderSettled");
  assert(event.args, "No event args");

  const { orderId } = event.args;
  const order = await Order.get(orderId.toString());
  assert(order, `No order found for ${orderId}`);

  order.status = INACTIVE;
  order.updateAt = getUpsertAt("handleOrderSettled", event);
  await order.save();
}

export async function handleQuotaAdded(
  event: EthereumLog<QuotaAddedEvent["args"]>
): Promise<void> {
  logger.info("handleQuotaAdded");
  assert(event.args, "No event args");
  const { account, amount } = event.args;

  const amountBigInt = amount.toBigInt();
  const handlerInfo = getUpsertAt("handleQuotaAdded", event);

  let trader = await Trader.get(account);

  if (!trader) {
    trader = Trader.create({
      id: account,
      totalTradeAmount: BigInt(0),
      totalAwardAmount: amountBigInt,
      maxTradeAmount: amountBigInt,
      createAt: handlerInfo,
    });
  } else {
    const totalAwardAmount = trader.totalAwardAmount + amountBigInt;
    trader.totalAwardAmount = totalAwardAmount;
    trader.maxTradeAmount = totalAwardAmount - trader.totalTradeAmount;
  }

  await trader.save();
}


export async function handleOrderChanged(
  event: EthereumLog<ExchangeOrderChangedEvent["args"]>
): Promise<void> {
  logger.info("handleQuotaAdded");
  assert(event.args, "No event args");
  const { orderId, tokenGiveBalance } = event.args;

  const order = await Order.get(orderId.toString());
  assert(order, `Expect order with id ${orderId.toString()} to exist`);

  order.tokenGiveBalance = tokenGiveBalance.toBigInt();
  await order.save();
}
