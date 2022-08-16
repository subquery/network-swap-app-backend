import { AcalaEvmEvent } from "@subql/acala-evm-processor";
import { ExchangeOrderSentEvent, OrderSettledEvent, TradeEvent } from "@subql/contract-sdk/typechain/PermissionedExchange";
import assert from "assert";

import { PermissionedExchange__factory } from '@subql/contract-sdk';
import FrontierEthProvider from './ethProvider';
import { EXCHANGE_DIST_ADDRESS } from "./utils";
import { Order, Trade, Trader } from "../types";

export async function handleExchangeOrderSent(
    event: AcalaEvmEvent<ExchangeOrderSentEvent['args']>
  ): Promise<void> {
    logger.info('handleRewardsClaimed');
    assert(event.args, 'No event args');

    const { orderId, sender, tokenGive, tokenGet, amountGive, amountGet, expireDate } = event.args;

    const permissionedExchange = PermissionedExchange__factory.connect(
        EXCHANGE_DIST_ADDRESS,
        new FrontierEthProvider()
    );

    const { amountGiveLeft } = await permissionedExchange.orders(orderId);

    const order = Order.create({
        id: orderId.toHexString(), //FIXME: toString() or toHexString()? 
        sender,
        tokenGive,
        tokenGet,
        amountGive: amountGive.toBigInt(),
        amountGet: amountGet.toBigInt(),
        expireDate: new Date(expireDate.toNumber()),
        amountGiveLeft: amountGiveLeft.toBigInt(),
    });

    await order.save();
}

export async function handleTrade(
    event: AcalaEvmEvent<TradeEvent['args']>
){
    logger.info('handleTrade');
    assert(event.args, 'No event args');

    const { orderId, tokenGive, tokenGet, amountGive, amountGet } = event.args; 

    const permissionedExchange = PermissionedExchange__factory.connect(
        EXCHANGE_DIST_ADDRESS,
        new FrontierEthProvider()
    );
    const { sender } = await permissionedExchange.orders(orderId);

    const trade = Trade.create({
        id: orderId.toHexString(),
        tokenGive,
        tokenGet,
        amountGive: amountGet.toBigInt(),
        amountGet: amountGive.toBigInt(),
        senderId: sender
    });

    await trade.save();        

    const trader = await Trader.get(sender);
    trader.totalTradeAmount //- [ ] + or - based on calculation
    await trader.save();

}

export async function handleOrderSettled(
    event: AcalaEvmEvent<OrderSettledEvent['args']>
){
    logger.info('handleOrderSettled');
    assert(event.args, 'No event args');

    const { orderId } = event.args;
    const order = Order.get(orderId.toHexString());

    // - [ ] I need to read contract method to understand what I need to update for this.
}
