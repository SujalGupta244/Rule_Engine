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
        .replace(/\(/g, " ( ")  // Add spaces around parentheses
        .replace(/\)/g, " ) ")
        .split(" ")             // Split by spaces
        .filter(Boolean);       // Remove empty tokens
    return tokens;
};

const createOperandNode = (token) => {
    return new Node("operand", token);
};

// const parseTokensToAST = (tokens) => {
//     let index = 0;
//     let currentOperator = null;

//     // Recursively parse tokens into AST
//     const parseExpression = () => {
//         let leftNode = null;

//         while (index < tokens.length) {
//             let token = tokens[index];

//             if (token === "(") {
//                 // Begin nested expression, parse it recursively
//                 index++;  // Skip "("
//                 let nestedNode = parseExpression();
//                 if (!leftNode) {
//                     leftNode = nestedNode;
//                 } else {
//                     leftNode = new Node("operator", currentOperator, leftNode, nestedNode);
//                 }
//             } else if (token === ")") {
//                 // End of nested expression
//                 index++;  // Skip ")"
//                 return leftNode;
//             } else if (token === "AND" || token === "OR") {
//                 // Handle operators
//                 currentOperator = token;
//                 index++;  // Skip operator
//             } else {
//                 // Handle operands (conditions like "age > 30")
//                 let operandNode = createOperandNode(token);
//                 if (!leftNode) {
//                     leftNode = operandNode;
//                 } else {
//                     leftNode = new Node("operator", currentOperator, leftNode, operandNode);
//                 }
//                 index++;  // Move to next token
//             }
//         }

//         return leftNode;
//     };

//     return parseExpression();
// };

const parseTokensToAST = (tokens) => {
    let index = 0;

    const parseExpression = (precedenceLevel = 0) => {
        let leftNode = null;

        while (index < tokens.length) {
            let token = tokens[index];

            if (token === "(") {
                // Begin nested expression, parse it recursively
                index++;  // Skip "("
                let nestedNode = parseExpression();
                if (!leftNode) {
                    leftNode = nestedNode;
                } else {
                    leftNode = applyOperatorPrecedence(leftNode, nestedNode, precedenceLevel);
                }
            } else if (token === ")") {
                // End of nested expression
                index++;  // Skip ")"
                return leftNode;
            } else if (token === "AND" || token === "OR") {
                // Handle operators with precedence
                let operatorPrecedence = getPrecedenceLevel(token);

                if (operatorPrecedence > precedenceLevel) {
                    index++;  // Move to the next token
                    let rightNode = parseExpression(operatorPrecedence);
                    leftNode = new Node("operator", token, leftNode, rightNode);
                } else {
                    return leftNode;
                }
            } else {
                // Handle operands (conditions like "age > 30")
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
    // Determine the precedence between the current nodes
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
        res.status(500).json({ message: "Error creating rule", error });
    }

});


// const evaluateAST = (node, data) => {
//     if (node.node_type === "operand") {
//         const [field, operator, value] = node.value.split(" ");
//         if (operator === ">") return data[field] > parseInt(value);
//         if (operator === "<") return data[field] < parseInt(value);
//         if (operator === "=") return data[field] === value.replace(/'/g, "");
//     } else if (node.node_type === "operator") {
//         if (node.value === "AND") return evaluateAST(node.left, data) && evaluateAST(node.right, data);
//         if (node.value === "OR") return evaluateAST(node.left, data) || evaluateAST(node.right, data);
//     }
// };

const evaluateAST = (node, data) => {
    if (!node) return false;

    if (node.node_type === "operand") {
        // Evaluate operand node
        return evaluateCondition(node, data);
    } else if (node.node_type === "operator") {
        // Handle AND/OR operators
        if (node.value === "AND") {
            return evaluateAST(node.left, data) && evaluateAST(node.right, data);
        }
        if (node.value === "OR") {
            return evaluateAST(node.left, data) || evaluateAST(node.right, data);
        }
    }
    return false;
};

// Helper function to evaluate conditions when operator and operands are separate
const evaluateCondition = (node, data) => {
    // Check if the node is part of a comparison, like 'age', '>', '30'
    if (!node.left || !node.right) {
        // Return false for malformed nodes
        return false;
    }

    const fieldNode = node.left;      // e.g., "age"
    const operatorNode = node;        // e.g., ">"
    const valueNode = node.right;     // e.g., "30" or "'Sales'"

    const field = fieldNode.value;    // "age"
    const operator = operatorNode.value;  // ">", "<", "="
    let value = valueNode.value;      // "30", "Sales"

    // Clean up value (remove quotes if it's a string)
    value = value.replace(/'/g, "");

    // Fetch the field's value from the data object (e.g., age, department)
    let fieldValue = data[field];

    // Perform comparisons based on the operator
    if (operator === ">") return parseFloat(fieldValue) > parseFloat(value);
    if (operator === "<") return parseFloat(fieldValue) < parseFloat(value);
    if (operator === "=") return fieldValue === value;

    return false;  // Return false if no valid comparison
};

// Evaluate rule
router.post("/evaluate", async (req, res) => {
    try {
        const { userData } = req.body;
        const rule = await Rule.findOne(); 
        const result = evaluateAST(rule.rule_ast, userData);
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error evaluating rule", error });
    }

});

module.exports = router;

