const mongoose = require("mongoose")

const projectSchema = new mongoose.Schema({
    theme:String,
    reason: String,
    type: String,
    decision: String,
    category: String,
    priority: String,
    department: String,
    startDate: Date,
    endDate: Date,
    location: String,
    status: String,
});

module.exports =  mongoose.model('Project', projectSchema);
