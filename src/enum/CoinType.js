export const CoinType = {
    SUI: "0x2::sui::SUI",
    USDC: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    USDT: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN"
};
export function getTokenNameByAddress(address) {
    for (const [name, addr] of Object.entries(CoinType)) {
        if (addr === address) {
            return name;
        }
    }
    return null; // 返回 null 表示未找到
}