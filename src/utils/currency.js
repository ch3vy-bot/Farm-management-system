// One place for how money is shown across the whole system.
// The system uses the Zambian kwacha (ZMW), written as K1,250.00.
export const CURRENCY_SYMBOL = 'K';
export const CURRENCY_CODE = 'ZMW';

export const money = (n) =>
    `${CURRENCY_SYMBOL}${Number(n || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
