const pdfParse = require("pdf-parse")
const generateInterviewReport = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

const generateInterviewReportController = async (req , res)=>{

const resumeFile  = req.file 
const resumeContent = pdfParse(req.file.buffer)
const {selfDescription , jobDescription} = req.body

const interviewReportByAI = await generateInterviewReport({
    resume: resumeContent,
    selfDescription,
    jobDescription
})


const interviewReport = await interviewReportModel.create({
    user:req.user.id
})

} 
    




module.exports = {}