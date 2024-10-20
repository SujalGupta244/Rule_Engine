const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ruleRoutes = require("./routes/rules");
const dotenv = require("dotenv")
const cors = require("cors")
dotenv.config()

const app = express();
app.use(cors())
app.use(express.json());
app.use(bodyParser.json());
app.use("/api/rules", ruleRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
