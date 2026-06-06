import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { professionalMcqBank } from "./mcq-bank-data.mjs";

const root = process.cwd();
const datasetDir = join(root, "data", "datasets");
const storePath = join(root, "data", "store.json");

const datasetTargets = {
  "dsa_mcq.json": ["DSA"],
  "os_mcq.json": ["Operating Systems"],
  "dbms_mcq.json": ["DBMS"],
  "linux_mcq.json": ["Linux"],
  "system_design_mcq.json": ["System Design"],
  "cloud_mcq.json": ["Cloud Computing"],
  "networking_mcq.json": ["Computer Networks"],
  "ai_ml_mcq.json": ["AI & ML"],
  "devops_mcq.json": ["DevOps"],
  "cybersecurity_mcq.json": ["Cyber Security"],
};
const contentDatasetFiles = [
  "dsa_easy.json",
  "dsa_medium.json",
  "dsa_hard.json",
  "coding_challenges.json",
  ...Object.keys(datasetTargets),
  "hr_questions.json",
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/#\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function signature(mcq) {
  return [
    normalizeText(mcq.question),
    ...(mcq.options || []).map(normalizeText),
    ...(mcq.correctAnswer || []).map(normalizeText),
  ].join("|");
}

function isPlaceholder(item) {
  const text = `${item.question || ""} ${item.title || ""}`;
  return /#\d+|question\s*#\d+|cloud deployment model #|hyperparameter optimization technique #|key characteristic of .*#\d+/i.test(text);
}

function dedupe(items) {
  const seenQuestions = new Set();
  const seenSignatures = new Set();
  const result = [];
  for (const item of items) {
    if (isPlaceholder(item)) continue;
    const questionKey = normalizeText(item.question);
    const fullSignature = signature(item);
    if (seenQuestions.has(questionKey) || seenSignatures.has(fullSignature)) continue;
    seenQuestions.add(questionKey);
    seenSignatures.add(fullSignature);
    result.push(item);
  }
  return result;
}

function readDataset(fileName) {
  const filePath = join(datasetDir, fileName);
  if (!existsSync(filePath)) return [];
  const rows = JSON.parse(readFileSync(filePath, "utf8"));
  return Array.isArray(rows) ? rows : [];
}

function cleanContentItems(items) {
  const seenMcqQuestions = new Set();
  const seenMcqSignatures = new Set();
  const result = [];
  for (const item of items) {
    if (item.type !== "MCQ") {
      result.push(item);
      continue;
    }
    if (isPlaceholder(item)) continue;
    const questionKey = normalizeText(item.question);
    const fullSignature = signature(item);
    if (seenMcqQuestions.has(questionKey) || seenMcqSignatures.has(fullSignature)) continue;
    seenMcqQuestions.add(questionKey);
    seenMcqSignatures.add(fullSignature);
    result.push(item);
  }
  return result;
}

const cleanBank = dedupe(professionalMcqBank);

for (const [fileName, domains] of Object.entries(datasetTargets)) {
  const rows = cleanBank.filter((item) => domains.includes(item.domain));
  writeFileSync(join(datasetDir, fileName), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

const db = JSON.parse(readFileSync(storePath, "utf8"));
db.contentItems = cleanContentItems(contentDatasetFiles.flatMap(readDataset));
db.mcqs = [];
db.mcqResults = (db.mcqResults || [])
  .filter((result) => !(result.checked || []).some(isPlaceholder))
  .map((result) => ({
    ...result,
    attempts: (result.attempts || (result.checked || []).map((attempt) => ({
      user_id: result.userId || null,
      question_id: attempt.id,
      selected_answer: attempt.selected,
      correct_answer: attempt.correctAnswer,
      score: attempt.correct ? 1 : 0,
      time_taken: result.timeTaken || null,
      attempt_date: result.createdAt,
      domain: attempt.domain,
      topic: attempt.topic,
      difficulty: attempt.difficulty,
    }))).filter((attempt) => !isPlaceholder({
      id: attempt.question_id,
      question: String(attempt.question || attempt.question_id || ""),
      title: String(attempt.question_id || ""),
    })),
  }));
db.seedVersion = Math.max(Number(db.seedVersion || 1), 4);
writeFileSync(storePath, `${JSON.stringify(db, null, 2)}\n`, "utf8");

const badRemaining = db.contentItems.filter((item) => item.type === "MCQ" && isPlaceholder(item)).length;
console.log(JSON.stringify({
  professionalMcqs: cleanBank.length,
  datasetFiles: Object.fromEntries(Object.entries(datasetTargets).map(([fileName, domains]) => [fileName, cleanBank.filter((item) => domains.includes(item.domain)).length])),
  contentItems: db.contentItems.length,
  placeholderMcqsRemaining: badRemaining,
}, null, 2));
