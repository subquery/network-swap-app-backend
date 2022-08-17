import { AcalaEvmEvent } from "@subql/acala-evm-processor";
import { ExchangeOrderSentEvent, OrderSettledEvent, TradeEvent } from "@subql/contract-sdk/typechain/PermissionedExchange";
import assert from "assert";
import { OrderStatus } from "../types";

import { PermissionedExchange__factory } from '@subql/contract-sdk';
import FrontierEthProvider from './ethProvider';
import { EXCHANGE_DIST_ADDRESS, getUpsertAt, isKSQT } from "./utils";
import { Order, Trade, Trader } from "../types";
import { BigNumber } from 'ethers';

const { ACTIVE, INACTIVE } = OrderStatus;

function calculateTradeAmount(
    totalTradeAmount: bigint,
    event: AcalaEvmEvent<TradeEvent['args']>
): bigint {
    const {tokenGet, amountGet} = event.args;
    const getIsKSQT = isKSQT(tokenGet); 
    const tradeAmountBN = BigNumber.from(totalTradeAmount);

    if(getIsKSQT) return tradeAmountBN.add(amountGet).toBigInt();

    return totalTradeAmount;
}

async function createTrade(
    orderId: BigNumber,
    sender: string,
    event: AcalaEvmEvent<TradeEvent['args']>
): Promise<void> {
    const { tokenGive, tokenGet, amountGive, amountGet } = event.args;

    const trade = Trade.create({
        id: `${orderId.toString()}:${event.transactionHash}`,
        tokenGive: tokenGet,
        tokenGet: tokenGive,
        amountGive:  amountGet.toBigInt(),
        amountGet: amountGive.toBigInt(),
        senderId: sender
    });

    await trade.save();   
}

export async function handleExchangeOrderSent(
    event: AcalaEvmEvent<ExchangeOrderSentEvent['args']>
  ): Promise<void> {
    logger.info('handleRewardsClaimed');
    assert(event.args, 'No event args');

    const { orderId, sender, tokenGive, tokenGet, amountGive, amountGet, expireDate } = event.args;

    const order = Order.create({
        id: orderId.toString(),
        sender,
        tokenGive,
        tokenGet,
        amountGive: amountGive.toBigInt(),
        amountGet: amountGet.toBigInt(),
        expireDate: new Date(expireDate.toNumber()),
        amountGiveLeft: amountGive.toBigInt(),
        status: ACTIVE
    });

    await order.save();
}

export async function handleTrade(
    event: AcalaEvmEvent<TradeEvent['args']>
){
    logger.info('handleTrade');
    assert(event.args, 'No event args');

    const sender = event.from;
    const { orderId } = event.args;
    
    const handlerInfo = getUpsertAt('handleOrderSettled', event);

    const permissionedExchange = PermissionedExchange__factory.connect(
        EXCHANGE_DIST_ADDRESS,
        new FrontierEthProvider()
    );
    
    const { amountGiveLeft } = await permissionedExchange.orders(orderId);    
    await createTrade(orderId, sender, event);

    //-- Order Entity handling 

    const order = await Order.get(orderId.toString());
    assert(order, `Expect order with id ${orderId.toString()} to exist`);

    order.amountGiveLeft = amountGiveLeft.toBigInt();
    await order.save();

    //-- Trader Entity handling 

    let trader = await Trader.get(sender);
    const totalTradeAmount = calculateTradeAmount(trader?.totalTradeAmount ?? BigInt(0), event);

    if(!trader) {
        trader = Trader.create({
            id: sender,
            totalTradeAmount,
            totalAwardAmount: BigInt(0),
            maxTradeAmount: BigInt(0),
            createAt: handlerInfo
        });
    } else {
        const { totalAwardAmount, totalTradeAmount } = trader;
        trader.totalTradeAmount = totalTradeAmount;
        trader.updateAt = handlerInfo;
        trader.maxTradeAmount = totalAwardAmount - totalTradeAmount;
    }
    await trader.save();
}

export async function handleOrderSettled(
    event: AcalaEvmEvent<OrderSettledEvent['args']>
){
    logger.info('handleOrderSettled');
    assert(event.args, 'No event args');

    const { orderId, amountGive, amountGet } = event.args;
    const order = await Order.get(orderId.toString());
    assert(order, `No order found for ${orderId}`)

    order.status = INACTIVE;
    order.amountGive = amountGive.toBigInt();
    order.amountGet = amountGet.toBigInt();
    order.updateAt = getUpsertAt('handleOrderSettled', event);
    await order.save();
}