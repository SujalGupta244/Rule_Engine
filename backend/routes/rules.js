const express = require("express");
const router = express.Router();
const Rule = require("../models/Rule");

class Node {
    constructor(node_type, value = null, left = null, right = null) {
        this.node_type = node_type;  // "operator" or "operand"
        this.value = value;          // String representation of condition or operator
        this.left = left;            // Left subtree
        this.right = right;          // Right subtree
    }
}

const tokenizeRuleString = (ruleString) => {
    const tokens = ruleString
        .replace(/\(/g, " ( ")  
        .replace(/\)/g, " ) ")
        .split(" ")            
        .filter(Boolean);
    return tokens;
};

const createOperandNode = (token) => {
    return new Node("operand", token);
};

const parseTokensToAST = (tokens) => {
    let index = 0;

    const parseExpression = (precedenceLevel = 0) => {
        let leftNode = null;

        while (index < tokens.length) {
            let token = tokens[index];

            if (token === "(") {
                index++;  // Skip "("
                let nestedNode = parseExpression();
                if (!leftNode) {
                    leftNode = nestedNode;
                } else {
                    leftNode = applyOperatorPrecedence(leftNode, nestedNode, precedenceLevel);
                }
            } else if (token === ")") {
                index++;  // Skip ")"
                return leftNode;
            } else if (token === "AND" || token === "OR") {
                let operatorPrecedence = getPrecedenceLevel(token);

                if (operatorPrecedence > precedenceLevel) {
                    index++;  // Move to the next token
                    let rightNode = parseExpression(operatorPrecedence);
                    leftNode = new Node("operator", token, leftNode, rightNode);
                } else {
                    return leftNode;
                }
            } else {
                let operandNode = createOperandNode(token);
                if (!leftNode) {
                    leftNode = operandNode;
                } else {
                    leftNode = applyOperatorPrecedence(leftNode, operandNode, precedenceLevel);
                }
                index++;  // Move to next token
            }
        }

        return leftNode;
    };

    return parseExpression();
};

const getPrecedenceLevel = (operator) => {
    if (operator === "AND") {
        return 2;  // Higher precedence for AND
    } else if (operator === "OR") {
        return 1;  // Lower precedence for OR
    }
    return 0;
};

const applyOperatorPrecedence = (leftNode, rightNode, precedenceLevel) => {
    if (precedenceLevel === 2) {
        return new Node("operator", "AND", leftNode, rightNode);
    } else if (precedenceLevel === 1) {
        return new Node("operator", "OR", leftNode, rightNode);
    }
    return leftNode;
};

const parseRuleToAST = (ruleString) => {
    const tokens = tokenizeRuleString(ruleString);
    const ast = parseTokensToAST(tokens);
    return ast;
};

router.get("/get", async (req, res) => {
    try {
        const rules = await Rule.find();
        return res.json(rules);
    } catch (error) {
        
    }
})

router.post("/create", async (req, res) => {
    try {
        const { rule } = req.body;
        const ast = parseRuleToAST(rule);
        const newRule = new Rule({ rule_ast: ast, metadata: { name: "Custom Rule" } });
        await newRule.save();
        res.status(200).json({ message: "Rule created successfully" });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error creating rule", error: error.message });
    }

});

const evaluateAST = (node, data) => {
    if (!node) return false;

    if (node.node_type === "operand") {
        return evaluateCondition(node, data);
    } else if (node.node_type === "operator") {
        if (node.value === "AND") {
            return evaluateAST(node.left, data) && evaluateAST(node.right, data);
        }
        if (node.value === "OR") {
            return evaluateAST(node.left, data) || evaluateAST(node.right, data);
        }
    }
    return false;
};

const evaluateCondition = (node, data) => {
    if (!node.left && !node.right) {
        return false;
    }

    const fieldNode = node.left;      // e.g., "age"
    const operatorNode = node;        // e.g., ">"
    const valueNode = node.right;     // e.g., "30" or "'Sales'"

    const field = fieldNode.value;    // "age"
    const operator = operatorNode.value;  // ">", "<", "="
    let value = valueNode.value;      // "30", "Sales"

    value = value.replace(/'/g, "");

    let fieldValue = data[field];

    if (operator === ">") return parseFloat(fieldValue) > parseFloat(value);
    if (operator === "<") return parseFloat(fieldValue) < parseFloat(value);
    if (operator === "=") return fieldValue === value;

    return false;
};

router.post("/evaluate", async (req, res) => {
    try {
        const { userData } = req.body;
        const rule = await Rule.findOne(); 
        const result = evaluateAST(rule.rule_ast, userData);
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error evaluating rule", error: error.message });
    }

});

module.exports = router;

