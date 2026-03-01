const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    valueEncrypted: { type: String, required: true },
  },
  { timestamps: true }
);

apiKeySchema.index({ user: 1 });

module.exports = mongoose.model("ApiKey", apiKeySchema);
