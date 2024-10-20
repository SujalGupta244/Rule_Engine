import React, { useState } from "react";
import axios from "axios";

function RuleEngine() {
    const [rule, setRule] = useState("");
    const [userData, setUserData] = useState({});
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    const validateRuleString = (rule) => {
        const operators = ["AND", "OR", ">", "<", "=", "!=", ">=", "<="];
        let parenthesesBalance = 0;
        let tokens = rule.split(" ").filter(Boolean); 

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token === "(") parenthesesBalance++;
            else if (token === ")") parenthesesBalance--;

            if (operators.includes(token)) {
                if (i === 0 || i === tokens.length - 1 || operators.includes(tokens[i + 1])) {
                    return "Invalid rule: Operators are misplaced.";
                }
            }

            if (parenthesesBalance < 0) return "Unmatched parentheses in the rule.";
        }

        if (parenthesesBalance !== 0) return "Unmatched parentheses in the rule.";

        const containsOperator = tokens.some(token => operators.includes(token));
        if (!containsOperator) return "Invalid rule: No operator found.";

        return null; 
    };

    const validateUserData = (data) => {
        if (!data.age || isNaN(data.age) || data.age < 0) return "Invalid age.";
        if (data.salary && (isNaN(data.salary) || data.salary < 0)) return "Invalid salary.";
        if (!data.department) return "Department is required.";
        return null;
    };

    const handleRuleSubmit = async () => {
        const ruleError = validateRuleString(rule);
        if (ruleError) {
            setErrorMessage(ruleError);
            return;
        }

        try {
            await axios.post("http://localhost:5000/api/rules/create", { rule });
            alert("Rule created successfully");
            setErrorMessage(""); 
            setRule(""); 
        } catch (error) {
            setErrorMessage("Error creating rule");
        }
    };


    const handleEvaluate = async () => {
        const userDataError = validateUserData(userData);
        if (userDataError) {
            setErrorMessage(userDataError);
            return;
        }

        try {
            const result = await axios.post("http://localhost:5000/api/rules/evaluate", { userData });
            setEvaluationResult(result.data);
            setErrorMessage("");  
        } catch (error) {
            setErrorMessage("Error evaluating rule");
        }
    };

    return (
        <div className="w-[800px]">
            <h1 className="mb-4">Rule Engine</h1>
            <div className="flex flex-col mb-8">
                <textarea
                    className="p-5 h-[200px] rounded-md text-1xl mb-3"
                    value={rule}
                    onChange={(e) => setRule(e.target.value)}
                    placeholder="Enter rule string here"
                />
                <button onClick={handleRuleSubmit}>Create Rule</button>
                {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
            </div>

            <h2 className="mb-3 text-2xl">Evaluate User</h2>
            <div className="flex flex-col">
                <input
                    className="p-3 rounded-md text-1xl mb-2"
                    type="number"
                    placeholder="Age"
                    onChange={(e) => setUserData({ ...userData, age: e.target.value })}
                />
                <input
                    className="p-3 rounded-md text-1xl mb-2"
                    type="text"
                    placeholder="Department"
                    onChange={(e) => setUserData({ ...userData, department: e.target.value })}
                />
                <input
                    className="p-3 rounded-md text-1xl mb-2"
                    type="number"
                    placeholder="Experience"
                    onChange={(e) => setUserData({ ...userData, experience: e.target.value })}
                />
                <input
                    className="p-3 rounded-md text-1xl mb-2"
                    type="text"
                    placeholder="Salary"
                    onChange={(e) => setUserData({ ...userData, salary: e.target.value })}
                />
                <button onClick={handleEvaluate}>Evaluate</button>
            </div>

            {evaluationResult !== null && (
                <div>
                    <h3>Evaluation Result: {evaluationResult ? "Eligible" : "Not Eligible"}</h3>
                </div>
            )}
        </div>
    );
}

export default RuleEngine;
