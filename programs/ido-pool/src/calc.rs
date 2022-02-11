pub fn huskyverse_token_due(
    redeem_amount: u128,
    pool_huskyverse: u128,
    redeemable_supply: u128,
) -> Option<u128> {
    // redeem_amount * pool_huskyverse / redeemable_supply
    redeem_amount // 6 decimals
        .checked_mul(pool_huskyverse)? // 8 decimals
        .checked_div(redeemable_supply) // 6 decimals
}

pub fn decayed_max_redeemable(
    max_redeemable: u128,
    end_deposits: i64,
    end_ido: i64,
    now: i64,
) -> Option<u128> {
    // (end_ido - now) * max_redeemable / (end_ido - end_deposits)
    let withdraw_only_period = end_ido.checked_sub(end_deposits).unwrap() as u128;

    (end_ido as u128)
        .checked_sub(now as u128)
        .unwrap()
        .checked_mul(max_redeemable)
        .unwrap()
        .checked_div(withdraw_only_period)
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    #[test]
    fn test_token_due_calc() {
        // normal case
        assert_eq!(huskyverse_token_due(10, 10, 10), Some(10));
        assert_eq!(
            huskyverse_token_due(2000000_000000, 300000000_00000000, 3000000_000000),
            Some(200000000_00000000)
        );

        // loss precision
        // always slightly less than real result, which is ok since accumulation does not result in redemption error
        assert_eq!(huskyverse_token_due(23, 1, 3), Some(7));

        // u128 edges
        assert_eq!(huskyverse_token_due(u128::MAX, 1, 1), Some(u128::MAX));
        assert_eq!(huskyverse_token_due(1, u128::MAX, 1), Some(u128::MAX));
        assert_eq!(huskyverse_token_due(u128::MAX / 2 + 1, 2, 1), None);

        // u128 edges
        assert_eq!(huskyverse_token_due(u128::MAX, 1, 1), Some(u128::MAX));
        assert_eq!(huskyverse_token_due(1, u128::MAX, 1), Some(u128::MAX));

        // div 0
        assert_eq!(huskyverse_token_due(10, 10, 0), None);
    }

    #[test]
    fn test_decayed_max_redeemable() {
        // max redeemable decrease linearly
        let max_redeemable = 100_000000;
        let end_deposits = 1644540000;
        let end_ido = 1644550000;

        // start
        let now = end_deposits;
        assert_eq!(
            decayed_max_redeemable(max_redeemable, end_deposits, end_ido, now),
            Some(max_redeemable)
        );

        // end
        let now = end_ido;
        assert_eq!(
            decayed_max_redeemable(max_redeemable, end_deposits, end_ido, now),
            Some(0)
        );

        // half way
        let now = end_deposits + ((end_ido - end_deposits) / 2);
        assert_eq!(
            decayed_max_redeemable(max_redeemable, end_deposits, end_ido, now),
            Some(50_000000)
        );

        // quater past start
        let now = end_deposits + ((end_ido - end_deposits) / 4);
        assert_eq!(
            decayed_max_redeemable(max_redeemable, end_deposits, end_ido, now),
            Some(75_000000)
        );

        // quater to end
        let now = end_deposits + 3 * ((end_ido - end_deposits) / 4);
        assert_eq!(
            decayed_max_redeemable(max_redeemable, end_deposits, end_ido, now),
            Some(25_000000)
        );
    }
}
