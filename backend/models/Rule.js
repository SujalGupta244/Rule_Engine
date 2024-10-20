const mongoose = require("mongoose");

const NodeSchema = new mongoose.Schema({
    node_type: String, // "operator" or "operand"
    value: String, // e.g., "age > 30"
    left: { type: mongoose.Schema.Types.Mixed, default: null }, // left subtree
    right: { type: mongoose.Schema.Types.Mixed, default: null }, // right subtree
});

const RuleSchema = new mongoose.Schema({
    rule_ast: NodeSchema, // Root of AST for the rule
    metadata: {
        name: String,
        created_at: { type: Date, default: Date.now },
    }
});

module.exports = mongoose.model("Rule", RuleSchema);
