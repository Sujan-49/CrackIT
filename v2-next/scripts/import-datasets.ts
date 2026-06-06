import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "..");
const datasetDir = join(root, "data", "datasets");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(datasetDir, file), "utf8")) as T;
}

async function upsertQuestions() {
  const files = ["dsa_easy.json", "dsa_medium.json", "dsa_hard.json"];
  const rows = files.flatMap((file) => readJson<any[]>(file)).map((item) => ({
    id: item.id,
    title: item.question,
    difficulty: item.difficulty,
    topic: item.topicTags?.[0] || "DSA",
    companies: item.companyTags || [],
    problem: item.sourceLine || item.question,
    explanation: item.referenceNote || "",
    solution: item.sourceLine || "",
    tags: item.topicTags || []
  }));
  const { error } = await supabase.from("questions").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return rows.length;
}

async function upsertMcqs() {
  const files = ["dsa_mcq.json", "os_mcq.json", "dbms_mcq.json", "linux_mcq.json", "cloud_mcq.json", "networking_mcq.json", "ai_ml_mcq.json", "devops_mcq.json", "cybersecurity_mcq.json", "system_design_mcq.json"];
  const rows = files.flatMap((file) => readJson<any[]>(file)).map((item) => ({
    id: item.id,
    title: item.title || item.question,
    domain: item.domain,
    topic: item.topic,
    difficulty: item.difficulty,
    question: item.question,
    options: item.options,
    correct_answer: Array.isArray(item.correctAnswer) ? item.correctAnswer[0] : item.correctAnswer,
    explanation: item.explanation,
    tags: item.tags || item.topicTags || [],
    companies: item.companyTags || []
  }));
  const { error } = await supabase.from("mcqs").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return rows.length;
}

async function upsertCompanies() {
  const source = readJson<Record<string, any>>("company_questions.json");
  const rows = Object.values(source).map((entry: any) => ({
    id: String(entry.company).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: entry.company,
    eligibility: "See official company careers page for role-specific eligibility.",
    hiring_process: entry.mappingReason || "Company preparation content imported from CrackIT dataset.",
    interview_stages: [],
    preparation_strategy: entry.referenceNote || ""
  }));
  const { error } = await supabase.from("companies").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return rows.length;
}

async function main() {
  const counts = {
    questions: await upsertQuestions(),
    mcqs: await upsertMcqs(),
    companies: await upsertCompanies()
  };
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
