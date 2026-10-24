const {GoogleGenAI, Behavior} = require('@google/genai')
const {z} = require('zod')
const {zodToJsonSchema} = require('zod-to-json-schema')
require("dotenv").config()
const ai = new GoogleGenAI({
    apiKey:process.env.GEMINI_GENAI_API_KEY,

})

async function invokeGemeniAi(){
    const response = await ai.models.generateContent({
        model:"gemini-2.5-flash-lite",
        contents:"Hello gemini ! explain what is interview"
    })
    console.log(response.text)
}




const interviewReportSchema = z.object({
    matchScore : z.number().min(0).max(100).describe("The match score between the resume and the job description that indicates how well the candidate's profile matches the job description"),
    technicalQuestions: z.array(z.object({
        question :z.string().describe("The technical question can be asked in the interview "),
        intention:z.string().describe("The intention of the interviewer behind asking this question "),
        answer:z.string().describe("How to answer this question , what points to cover , what approach to take etc")
    })).describe("The technical questions that can be asked in the interview and how to answer"),
    behavioralQuestions: z.array(z.object({
        question:z.string().describe("The behavioral question that can be asked in the interview "),
        intention:z.string().describe("The intention of the interviewer behind asking this question "),
        answer:z.string().describe("How to answer this question , what points to cover , what approach to take etc")
    })).describe("The behavioral questions that can be asked in the interview and how to answer"),
    skillGaps:z.array(z.object({
        skill:z.string().describe("The skill in which candidate is lacking "),
        severity:z.enum(["low" , "medium" , "high"]).describe("The severity of the skill gap "),
        
    })).describe("list of  skill gaps that needs to be improved by the candidate along with severnity"),
    preparationPlan:z.array(z.object({
        day:z.number().describe("The day of the preparation plan "),
        focus:z.string().describe("The focus of the preparation plan "),
        tasks:z.array(z.string().describe("The tasks for the day ")).describe("The tasks for the day "),
        
    })).describe("The preparation plan for the candidate in order for the candidate to prepare for interview"),
    
})

async function generateInterviewReport({resume,selfDescription,jobDescription}){
    const prompt = `
    You are a senior interviewer with 15 years of experience in technical and behavioral interviewing. Your goal is to evaluate a candidate based on their resume, self-description, and the job description, and provide a structured interview report.

    The output MUST be a valid JSON object following this exact schema.
    
    Here is the input data:
    
    Job Description:
    ${jobDescription}
    
    Resume:
    ${resume}
    
    Self-Description:
    ${selfDescription}
    
    Please generate an interview report based on the above information.
    `
    const response = await ai.models.generateContent({
        model:"gemini-2.5-flash-lite",
        contents:"",
        config:{
            responseMimeType:"application/json",
            responseSchema:zodToJsonSchema(interviewReportSchema),  

        }
    
            
        
    })
    
return JSON.parse(response.text)
  

}
module.exports = {generateInterviewReport}