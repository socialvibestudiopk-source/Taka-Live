const CommissionConfig = require("./commissionConfig.model");
const CommissionTransaction = require("./commissionTransaction.model");
const Wallet = require("../wallet/wallet.model");
const User = require("../user/user.model");

/**
 * Enterprise Commission Calculation Engine
 * Handles recursive chain commissions (Host -> Agency -> BD -> BD Leader)
 */
exports.generateCommission = async ({ userId, role, grossAmount, sourceType, sourceId }) => {
  try {
    // 1. Get the active config for this role from the new unified Commission model
    const Commission = require("./commission.model");
    const config = await Commission.findOne({ role: role.toUpperCase(), is_active: true });

    if (!config) {
        console.warn(`No active commission config found for role: ${role}`);
        return null;
    }

    // 2. Calculate amount
    let commissionAmount = 0;
    if (config.type === "percentage") {
        commissionAmount = (grossAmount * config.value) / 100;
    } else {
        commissionAmount = config.value;
    }

    if (commissionAmount <= 0) return null;

    // 3. Create Record
    const transaction = new CommissionTransaction({
        userId,
        role: role.toUpperCase(),
        sourceType,
        sourceId,
        grossAmount,
        commissionRate: config.value,
        commissionAmount,
        status: "ELIGIBLE"
    });

    await transaction.save();

    // 4. Update User's Wallet (R-Coins or Diamonds depending on type)
    const user = await User.findById(userId);
    if (user) {
        user.withdrawalRcoin += commissionAmount; // Distribute as withdrawable currency
        await user.save();

        // Record in Wallet history
        const income = new Wallet();
        income.userId = userId;
        income.rCoin = commissionAmount;
        income.type = 7; // Commission type
        income.isIncome = true;
        income.date = new Date().toLocaleString();
        await income.save();
    }

    return transaction;

  } catch (error) {
    console.error("Commission Engine Error:", error.message);
    return null;
  }
};
