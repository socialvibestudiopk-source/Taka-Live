const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["AGENCY", "BD", "BD_LEADER", "SUPER_ADMIN", "HOST", "COIN_SELLER"], required: true },
    type: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    value: { type: Number, default: 0 },
    country: { type: String, default: "GLOBAL" },
    is_active: { type: Boolean, default: true },
    effective_date: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Commission", commissionSchema);
