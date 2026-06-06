import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { professionalMcqBank } from "./mcq-bank-data.mjs";

const workspace = process.cwd();
const outDir = join(workspace, "data", "datasets");
const primarySource = String.raw`C:\Users\sujan\.codex\attachments\115aeeb4-8c2f-450a-8dbd-6533c2544c7a\pasted-text.txt`;
const fallbackSources = [
  String.raw`C:\Users\sujan\.codex\attachments\4dba8f3b-f731-4288-96c5-ece47c0e704e\pasted-text.txt`,
  String.raw`C:\Users\sujan\.codex\attachments\86ef93b0-077c-43d3-94c5-0fca448a1b75\pasted-text.txt`,
  String.raw`C:\Users\sujan\.codex\attachments\11d4680d-e438-41a0-9937-8faf0346bf4b\pasted-text.txt`,
];
const sourceName = "Ultimate Tech Interview Master Guide";
const contentReferenceNote = "This content is extracted from the uploaded Ultimate Tech Interview Master Guide. Company tags are preparation signals and can vary by year, role, campus, team, and interviewer.";

const knownCompanies = ["TCS", "Infosys", "Wipro", "Cognizant", "Accenture", "Capgemini", "IBM", "HCL", "Zoho", "Amazon", "Microsoft", "Google", "Meta", "Facebook", "NVIDIA", "Nvidia", "LinkedIn", "Apple", "Airbnb", "Bloomberg", "Uber", "Twitter", "Pinterest", "Dropbox", "Oracle", "Salesforce", "Adobe", "MAANG"];
const requiredCompanies = ["TCS", "Infosys", "Accenture", "Cognizant", "Wipro", "Capgemini", "Amazon", "Microsoft", "Google", "NVIDIA"];
const serviceCompanies = new Set(["TCS", "Infosys", "Wipro", "Cognizant", "Accenture", "Capgemini", "IBM", "HCL", "Zoho"]);
const productCompanies = new Set(["Amazon", "Microsoft", "Google", "Meta", "NVIDIA", "LinkedIn", "Apple", "Airbnb", "Bloomberg", "Uber", "Twitter", "Pinterest", "Dropbox", "Oracle", "Salesforce", "Adobe"]);

const topicHints = {
  Arrays: ["array", "subarray", "matrix", "zero", "interval", "sum", "duplicate", "majority", "stock", "kadane"],
  Strings: ["string", "substring", "palindrome", "anagram", "prefix", "word", "character", "parentheses"],
  "Linked Lists": ["linked list", "node", "list"],
  Stacks: ["stack", "parentheses", "histogram"],
  Queues: ["queue", "bfs"],
  Trees: ["tree", "bst", "binary", "traversal", "ancestor", "path sum"],
  Heap: ["heap", "kth", "top k", "median", "scheduler"],
  Graphs: ["graph", "island", "course", "network", "route", "path", "ladder"],
  Greedy: ["greedy", "jump", "gas station", "merge intervals"],
  Backtracking: ["permutation", "subset", "combination", "n-queens", "sudoku"],
  "Dynamic Programming": ["dp", "coin", "robber", "decode", "distance", "balloons", "egg", "partition", "lis", "climbing"],
  "Bit Manipulation": ["bit", "xor", "power of two", "single number"],
  "Sliding Window": ["window", "substring", "anagram"],
  Recursion: ["recursion", "recursive"],
  Cloud: ["cloud", "iaas", "paas", "saas", "deployment", "aws", "azure", "gcp", "lambda", "s3", "ec2", "kubernetes", "container"],
  Networking: ["tcp", "udp", "dns", "http", "https", "osi", "routing", "packet", "subnet"],
  "AI/ML": ["ai", "machine learning", "model", "llm", "rag", "neural", "transformer", "classification"],
  DevOps: ["devops", "docker", "ci/cd", "terraform", "pipeline", "deployment", "monitoring"],
  Cybersecurity: ["security", "xss", "sql injection", "encryption", "hashing", "owasp", "firewall"],
};

function cleanText(text) {
  return text
    .replaceAll("ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â", "-")
    .replaceAll("Ã¢â‚¬â€", "-")
    .replaceAll("â€”", "-")
    .replaceAll("ÃƒÂ¯Ã¢â‚¬Å¡Ã‚Â·", "")
    .replaceAll("Ã¯â€šÂ·", "")
    .replaceAll("ï‚·", "")
    .replaceAll("", "")
    .replaceAll("`", "'")
    .replace(/\r/g, "");
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function normalizeCompany(company) {
  const clean = company.trim().replace(/[.)]+$/g, "");
  if (/^facebook$/i.test(clean)) return "Meta";
  if (/^nvidia$/i.test(clean)) return "NVIDIA";
  const exact = knownCompanies.find((item) => item.toLowerCase() === clean.toLowerCase());
  return exact ? (exact === "Facebook" ? "Meta" : exact === "Nvidia" ? "NVIDIA" : exact) : clean;
}

function parseCompanies(text) {
  const explicit = text.match(/Asked in:\s*([^)]+)/i)?.[1] || text.match(/\(([^)]*(?:Amazon|Google|Meta|Facebook|TCS|Infosys|Accenture|Nvidia|NVIDIA|Microsoft|Apple|LinkedIn|Airbnb|Bloomberg|Uber|Twitter|Pinterest|Dropbox)[^)]*)\)/i)?.[1] || "";
  const candidates = explicit
    ? explicit.split(/,|\/| and /i).map((item) => item.trim())
    : knownCompanies.filter((company) => text.toLowerCase().includes(company.toLowerCase()));
  return [...new Set(candidates.map(normalizeCompany).filter(Boolean))];
}

function inferTopic(question, fallback) {
  const lower = question.toLowerCase();
  const found = Object.entries(topicHints).find(([, hints]) => hints.some((hint) => lower.includes(hint)));
  return found?.[0] || fallback;
}

function readSource() {
  const sourcePath = [primarySource, ...fallbackSources].find((filePath) => existsSync(filePath));
  if (!sourcePath) throw new Error("No uploaded master guide file was found.");
  return { sourcePath, lines: cleanText(readFileSync(sourcePath, "utf8")).split("\n").map((line) => line.trim()).filter(Boolean) };
}

function section(lines, start, end) {
  const startIndex = lines.findIndex((line) => line.toLowerCase().startsWith(start.toLowerCase()));
  const endIndex = end ? lines.findIndex((line, index) => index > startIndex && line.toLowerCase().startsWith(end.toLowerCase())) : lines.length;
  if (startIndex === -1) return [];
  return lines.slice(startIndex + 1, endIndex === -1 ? lines.length : endIndex);
}

function cleanTitle(line) {
  return line
    .replace(/^\d+\.\d+\.\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/^Challenge\s+\d+:\s*/i, "")
    .replace(/^HR\s*Q\d+:\s*/i, "")
    .replace(/^\[(Easy|Medium|Hard)\]\s*/i, "")
    .trim();
}

function item({ idPrefix, question, category, type, difficulty, topicFallback, companyTags = [], sourceLine, extra = {} }, index) {
  const cleanQuestion = question.replace(/\s+/g, " ").replace(/[.]+$/, "").trim();
  const topics = [topicFallback, inferTopic(cleanQuestion, topicFallback)].filter(Boolean);
  return {
    id: `${idPrefix}-${slug(cleanQuestion)}-${index + 1}`,
    question: cleanQuestion,
    category,
    type,
    difficulty,
    companyTags: [...new Set(companyTags.map(normalizeCompany))],
    topicTags: [...new Set(topics)],
    source: sourceName,
    sourceLine,
    referenceNote: contentReferenceNote,
    ...extra,
  };
}

function parseDsa(lines, difficulty, prefix) {
  return lines
    .filter((line) => line.startsWith(`[${difficulty}]`))
    .map((line, index) => {
      const withoutLevel = cleanTitle(line);
      const title = withoutLevel
        .replace(/\s*\(Asked in:[^)]+\)\s*/i, "")
        .replace(/\s+-\s+.*$/, "")
        .trim();
      return item({
        idPrefix: prefix,
        question: title,
        category: "Engineering Fundamentals",
        type: "DSA",
        difficulty,
        topicFallback: "DSA",
        companyTags: parseCompanies(line),
        sourceLine: line,
      }, index);
    });
}

function parseChallenges(lines) {
  return lines
    .filter((line) => /^Challenge\s+\d+:/i.test(line))
    .map((line, index) => {
      const match = line.match(/^Challenge\s+\d+:\s*\[([^\]]+)\]\s*-\s*(.+)$/i);
      const topic = match?.[1] || "Coding";
      const question = match?.[2] || cleanTitle(line);
      return item({
        idPrefix: "coding-challenge",
        question,
        category: "Career Preparation",
        type: "Coding Challenge",
        difficulty: "Mixed",
        topicFallback: topic,
        companyTags: parseCompanies(line),
        sourceLine: line,
      }, index);
    });
}

function parseMcqBlocks(lines, config) {
  const records = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^\d+\.\d+\.\s+/.test(line)) continue;
    const question = cleanTitle(line);
    const optionLines = [];
    let answerLine = "";
    for (let cursor = index + 1; cursor < Math.min(index + 6, lines.length); cursor += 1) {
      if (/^[A-D]\)\s+/.test(lines[cursor])) optionLines.push(lines[cursor]);
      if (/^Answer:\s*/i.test(lines[cursor])) {
        answerLine = lines[cursor];
        break;
      }
    }
    const options = optionLines.map((option) => option.replace(/^[A-D]\)\s+/, "").trim());
    const answerText = answerLine.replace(/^Answer:\s*/i, "").replace(/^[A-D]\)\s*/, "").trim();
    records.push(item({
      ...config,
      question,
      sourceLine: [line, ...optionLines, answerLine].filter(Boolean).join(" "),
      extra: {
        options,
        correctAnswer: answerText ? [answerText] : [],
        explanation: answerText ? `Correct answer: ${answerText}` : "",
      },
    }, records.length));
  }
  return records;
}

function parseHr(lines) {
  return lines
    .filter((line) => /^HR\s*Q\d+:/i.test(line))
    .map((line, index) => item({
      idPrefix: "hr-question",
      question: cleanTitle(line),
      category: "Career Preparation",
      type: "HR Question",
      difficulty: "HR",
      topicFallback: "HR",
      companyTags: parseCompanies(line),
      sourceLine: line,
    }, index));
}

function buildCompanyQuestions(items) {
  const directItemsFor = (company) => items.filter((entry) => {
    const tags = entry.companyTags || [];
    if (tags.some((tag) => tag.toLowerCase() === company.toLowerCase())) return true;
    if (company === "NVIDIA") return tags.includes("NVIDIA");
    return false;
  });
  const servicePool = items.filter((entry) => (entry.companyTags || []).some((tag) => serviceCompanies.has(tag)) || entry.type === "Coding Challenge" || entry.type === "HR Question");
  const productPool = items.filter((entry) => (entry.companyTags || []).some((tag) => productCompanies.has(tag)) || entry.type === "Coding Challenge");

  return Object.fromEntries(requiredCompanies.map((company) => {
    let questions = directItemsFor(company);
    let mappingReason = "Direct company tags from uploaded Ultimate Tech Interview Master Guide";
    if (!questions.length) {
      questions = (serviceCompanies.has(company) ? servicePool : productPool).slice(0, 80);
      mappingReason = serviceCompanies.has(company)
        ? "Service-company preparation items from uploaded Ultimate Tech Interview Master Guide"
        : "Product-company preparation items from uploaded Ultimate Tech Interview Master Guide";
    }
    return [company, {
      company,
      mappingReason,
      source: sourceName,
      referenceNote: contentReferenceNote,
      questions: questions.map((entry) => ({
        id: entry.id,
        question: entry.question,
        type: entry.type,
        difficulty: entry.difficulty,
        category: entry.category,
        topicTags: entry.topicTags,
        companyTags: entry.companyTags,
      })),
    }];
  }));
}

function writeJson(fileName, value) {
  writeFileSync(join(outDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const { sourcePath, lines } = readSource();
const dsaEasy = parseDsa(section(lines, "50 Easy DSA Questions", "75 Medium DSA Questions"), "Easy", "dsa-easy");
const dsaMedium = parseDsa(section(lines, "75 Medium DSA Questions", "100 Hard DSA Questions"), "Medium", "dsa-medium");
const dsaHard = parseDsa(section(lines, "100 Hard DSA Questions", "2. 100 Coding Challenges"), "Hard", "dsa-hard");
const codingChallenges = parseChallenges(section(lines, "2. 100 Coding Challenges", "3. 100 Cloud Computing MCQs"));
const dsaMcq = professionalMcqBank.filter((item) => item.domain === "DSA");
const osMcq = professionalMcqBank.filter((item) => item.domain === "Operating Systems");
const dbmsMcq = professionalMcqBank.filter((item) => item.domain === "DBMS");
const linuxMcq = professionalMcqBank.filter((item) => item.domain === "Linux");
const systemDesignMcq = professionalMcqBank.filter((item) => item.domain === "System Design");
const cloudMcq = professionalMcqBank.filter((item) => item.domain === "Cloud Computing");
const networkingMcq = professionalMcqBank.filter((item) => item.domain === "Computer Networks");
const aiMlMcq = professionalMcqBank.filter((item) => item.domain === "AI & ML");
const devopsMcq = professionalMcqBank.filter((item) => item.domain === "DevOps");
const cybersecurityMcq = professionalMcqBank.filter((item) => item.domain === "Cyber Security");
const hrQuestions = parseHr(section(lines, "8. Top HR & Behavioral Questions"));

const datasets = {
  "dsa_easy.json": dsaEasy,
  "dsa_medium.json": dsaMedium,
  "dsa_hard.json": dsaHard,
  "coding_challenges.json": codingChallenges,
  "dsa_mcq.json": dsaMcq,
  "os_mcq.json": osMcq,
  "dbms_mcq.json": dbmsMcq,
  "linux_mcq.json": linuxMcq,
  "system_design_mcq.json": systemDesignMcq,
  "cloud_mcq.json": cloudMcq,
  "networking_mcq.json": networkingMcq,
  "ai_ml_mcq.json": aiMlMcq,
  "devops_mcq.json": devopsMcq,
  "cybersecurity_mcq.json": cybersecurityMcq,
  "hr_questions.json": hrQuestions,
};

mkdirSync(outDir, { recursive: true });
for (const [fileName, value] of Object.entries(datasets)) {
  if (!value.length) throw new Error(`${fileName} would be empty. Import stopped.`);
  writeJson(fileName, value);
}

const allItems = Object.values(datasets).flat();
const companyQuestions = buildCompanyQuestions(allItems);
if (Object.values(companyQuestions).some((entry) => !entry.questions.length)) throw new Error("company_questions.json would contain an empty company entry. Import stopped.");
writeJson("company_questions.json", companyQuestions);

const counts = Object.fromEntries(Object.entries(datasets).map(([fileName, value]) => [fileName, value.length]));
counts["company_questions.json"] = Object.fromEntries(Object.entries(companyQuestions).map(([company, entry]) => [company, entry.questions.length]));
console.log(JSON.stringify({ source: sourcePath, outDir, counts }, null, 2));
