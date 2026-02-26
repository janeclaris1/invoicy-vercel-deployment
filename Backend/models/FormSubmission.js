const mongoose = require("mongoose");

const formSubmissionSchema = new mongoose.Schema(
  {
    form: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    /** Submitted field values: { fieldId: value } */
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    submittedAt: { type: Date, default: Date.now },
    source: { type: String, default: "" },
  },
  { timestamps: true }
);

formSubmissionSchema.index({ form: 1, submittedAt: -1 });
formSubmissionSchema.index({ user: 1, submittedAt: -1 });

module.exports = mongoose.model("FormSubmission", formSubmissionSchema);
