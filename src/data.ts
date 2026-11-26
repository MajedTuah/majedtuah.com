/* All site content lives here. Text wrapped in **double asterisks** renders bold. */

/** Your public email address, used for the mailto link and shown as text */
export const EMAIL = 'majedtuah19@gmail.com'

export const LINKS = {
  github: 'https://github.com/MajedTuah',
  repos: 'https://github.com/MajedTuah?tab=repositories',
  linkedin: 'https://www.linkedin.com/in/muhamad-majed-tuah-mohd-hafizuddin',
  email: `mailto:${EMAIL}`,
  cv: '/MajedTuah_Resume.pdf',
}

interface Project {
  title: string
  label: string
  year: string
  /** Arabic word printed on the book cover */
  ar: string
  lang: string
  /** Cover title, one line per \n */
  cover: string
  topics: string
  href: string
  chapter: string
  tags: string[]
  text: string
  colors: { cover: string; type: string; spine: string }
  /** Link text, e.g. "View on GitHub" (the default) */
  cta?: string
  /** Draws a small glowing orb on the book cover in this colour */
  orb?: string
}

/** Shown as books in the hero carousel and as linked rows on the Projects page. */
export const PROJECTS: Project[] = [
  {
    title: 'Nexa',
    label: 'Live on AG ONE',
    year: 'Now',
    ar: 'دليل',
    lang: 'Agentic AI',
    cover: 'Nexa',
    topics: 'Agentic AI · Live',
    href: 'https://ag-one.aventragroup.com/',
    chapter: 'In production',
    tags: ['Agentic AI', 'Site navigation', 'AG ONE'],
    text: 'The little blue ball in the corner of the AG ONE site. Ask it where something is and it takes you there: an agent that helps visitors find their way around.',
    colors: { cover: '#0e0e10', type: '#e7e6e2', spine: '#2c2c2f' },
    cta: 'Meet Nexa on AG ONE',
    orb: '#3b82f6',
  },
  {
    title: 'BrainDump.ai',
    label: 'Latest build',
    year: '2026',
    ar: 'فكر',
    lang: 'Python',
    cover: 'Brain\ndump\n.ai',
    topics: 'Edge AI · Distillation',
    href: 'https://github.com/MajedTuah/braindump.ai',
    chapter: 'README',
    tags: ['PyTorch', 'FastAPI', 'BERT', 'SLM'],
    text: 'An edge AI pipeline with knowledge distillation: a three-tier local ensemble (SVM, quantised SLM, BERT) that distils, prunes and dynamically quantises a heavy BERT teacher into a sub-millisecond local model.',
    colors: { cover: '#d9d8d3', type: '#0b0b0c', spine: '#8e8d89' },
  },
  {
    title: 'Advance ML · FAMA',
    label: 'Course',
    year: '2026',
    ar: 'تعلّم',
    lang: 'Jupyter',
    cover: 'Advance\nML\nFAMA',
    topics: 'Teaching · MLOps',
    href: 'https://github.com/MajedTuah/advance-ml-fama',
    chapter: 'Day one',
    tags: ['Notebooks', 'Docker', 'Teaching'],
    text: 'Notebooks, data and slides for a two-day Advanced Machine Learning in Production course, from the AI, ML and LLM landscape to models running in production.',
    colors: { cover: '#0e0e10', type: '#d4d3ce', spine: '#2c2c2f' },
  },
  {
    title: '4-Hour Session',
    label: 'Workshop',
    year: '2026',
    ar: 'إنتاج',
    lang: 'Python',
    cover: 'Four\nhour\nsession',
    topics: 'MLOps · Workshop',
    href: 'https://github.com/MajedTuah/4Hour_Session',
    chapter: 'Module one',
    tags: ['MLflow', 'SHAP', 'FastAPI', 'Azure ML'],
    text: 'One loan-default model through the whole production lifecycle: leakage-free pipeline, Optuna and MLflow, SHAP explanations, drift checks, and FastAPI in Docker.',
    colors: { cover: '#2c2c2f', type: '#e7e6e2', spine: '#1a1a1c' },
  },
  {
    title: 'WeddingHub · Makcik.ai',
    label: 'AI hub & RAG',
    year: '2026',
    ar: 'فرح',
    lang: '.NET',
    cover: 'Wedding\nHub',
    topics: 'RAG · .NET',
    href: 'https://github.com/MajedTuah/WeddingCentral',
    chapter: 'Solution',
    tags: ['.NET', 'SQLite', 'Groq', 'Ollama'],
    text: 'A hybrid AI hub and RAG engine: a full-stack .NET and SQLite system with an in-memory vector store that injects context into Llama 3 via Groq/Ollama, powering the "Makcik" persona chatbot.',
    colors: { cover: '#1a1a1c', type: '#e7e6e2', spine: '#3a3a3e' },
  },
]

/* ------------------------------------------------------------------ */
/* What I do                                                           */
/* ------------------------------------------------------------------ */

export const CAPABILITIES = [
  {
    ar: 'معرفة',
    title: 'RAG over company documents',
    text: 'Ask a question, get an answer from your own PDFs, with the passage it came from.',
    tags: ['Azure AI Search', 'Azure OpenAI', 'Doc Intelligence'],
  },
  {
    ar: 'وكيل',
    title: 'Bots that do the task',
    text: 'A chatbot that carries out the request instead of describing it, using layered prompts and tools it can call.',
    tags: ['Prompt layers', 'JS SDKs', 'Tool calling'],
  },
  {
    ar: 'توجيه',
    title: 'Request routing',
    text: 'A classifier reads each request and sends it to the right workflow, so nobody has to pick from a menu.',
    tags: ['Intent classification', 'Workflows', 'NLP'],
  },
  {
    ar: 'حوكمة',
    title: 'Guardrails and shipping',
    text: 'Prompt safety checks, shared .NET and JavaScript APIs, and CI/CD, so every AI feature goes out the same way.',
    tags: ['Guardrails', 'CI/CD', '.NET / JS APIs'],
  },
  {
    ar: 'استخراج',
    title: 'Documents to data',
    text: 'Scanned PDFs and forms turned into clean, structured JSON, so nobody has to copy figures out by hand.',
    tags: ['Doc Intelligence', 'Python', 'JSON'],
  },
  {
    ar: 'تقطير',
    title: 'Small models that run anywhere',
    text: 'A heavy model distilled, pruned and quantised into a small one that answers in under a millisecond on a laptop.',
    tags: ['Distillation', 'Quantisation', 'PyTorch'],
  },
  {
    ar: 'رؤية',
    title: 'Computer vision',
    text: 'Detection and tracking with YOLOv8, OpenCV and MediaPipe, and the hands-on lessons I use to teach it.',
    tags: ['YOLOv8', 'OpenCV', 'MediaPipe'],
  },
]

/* ------------------------------------------------------------------ */
/* Teaching                                                            */
/* ------------------------------------------------------------------ */

export const TEACHING = [
  {
    kind: 'Course',
    title: 'Advanced Machine Learning in Production',
    host: 'FAMA',
    when: 'Aug 2026 · Two days',
    audience: 'Practitioners moving ML from notebooks to production',
    modules: [
      'The AI, ML, DL and LLM landscape',
      'Hands-on notebooks with real datasets',
      'Reproducible environments with Docker',
      'Taking models into production',
    ],
    href: 'https://github.com/MajedTuah/advance-ml-fama',
  },
  {
    kind: 'Workshop',
    title: 'Production ML in Four Hours',
    host: 'Hands-on session',
    when: '2026 · Four hours',
    audience: 'Engineers who want the whole lifecycle in one sitting',
    modules: [
      'Choosing an approach and a leakage-free pipeline',
      'Modular training with Optuna and MLflow',
      'SHAP explanations and drift checks (PSI / KS)',
      'FastAPI in Docker, dashboards and Azure ML',
    ],
    href: 'https://github.com/MajedTuah/4Hour_Session',
  },
  {
    kind: 'Instructor',
    title: 'AI & Coding Instructor',
    host: 'Timedoor Academy (remote)',
    when: 'Aug 2021 — Jul 2025 · Four years',
    audience: 'Students learning to code, from first programs to AI projects',
    modules: [
      'Python and machine learning',
      'Computer vision, hands-on',
      'Web and game development',
      'Coding workshops and hackathons',
    ],
    note: 'As Teacher Leader I also trained and mentored new instructors.',
  },
]

/** Smaller résumé projects without a public link. Listed under the main projects. */
export const MORE_PROJECTS: { title: string; year: string; where: string; text: string; tags: string[] }[] = [
  {
    title: 'PDFs to structured JSON',
    year: '2023',
    where: 'Petronas Digital',
    text: 'Python scripts and Azure Document Intelligence that turn PDF documents into structured JSON.',
    tags: ['Python', 'Doc Intelligence'],
  },
  {
    title: 'Stakeholder dashboard',
    year: '2023',
    where: 'Petronas Digital',
    text: 'A Power BI dashboard that pulls several data sources into one view for executives.',
    tags: ['Power BI', 'SQL'],
  },
  {
    title: 'Discord support chatbot',
    year: '2022',
    where: 'Freelance',
    text: 'A Discord bot in Python on the OpenRouter API that answers questions and reads the mood of the conversation.',
    tags: ['Python', 'OpenRouter', 'NLP'],
  },
  {
    title: 'Sales forecasting model',
    year: '2021',
    where: 'Personal project',
    text: 'Time-series forecasting with Scikit-Learn and Pandas to predict future sales.',
    tags: ['Scikit-Learn', 'Pandas', 'Time series'],
  },
]

/* ------------------------------------------------------------------ */
/* Proof: fill these in. Each section stays hidden while its list is empty. */
/* ------------------------------------------------------------------ */

/** e.g. { value: 70, suffix: '%', label: 'Less manual document processing' } */
export const IMPACT: { value: number; suffix?: string; label: string }[] = []

/** e.g. { title: 'Best AI Initiative', org: 'AventraGroup', date: '2025', detail: '...', image: '/awards/x.jpg' } */
export const AWARDS: { title: string; org: string; date: string; detail?: string; image?: string }[] = []

/** Quotes from LinkedIn recommendations. e.g. { quote: '...', name: 'Jane Doe', role: 'Head of Data, X', relation: 'Managed Majed' } */
export const RECOMMENDATIONS: { quote: string; name: string; role: string; relation?: string }[] = []

export const RESUME = {
  fullName: 'Muhamad Majed Tuah Bin Mohd Hafizuddin',
  role: 'AI Engineer & Team Lead',
  location: 'Kuala Lumpur, Malaysia',
  summary:
    'I’m an AI engineer and team lead in Kuala Lumpur with over three years of experience. I build RAG systems, Azure AI services and document extraction pipelines, and I take them all the way to production: the model, the API around it and the deployment.',
  experience: [
    {
      role: 'Lead AI — COE · AI/ML & Full-stack',
      company: 'AventraGroup Digital',
      place: 'Kuala Lumpur, Malaysia',
      period: 'Jul 2025 — Present',
      points: [
        'Lead the team building **AG ONE AI Hub**, an **agentic bot** with layered prompts, custom JavaScript SDKs and steps that run on their own',
        'Built **Nexa**, the little blue ball on the AG ONE site: an agent that helps visitors find their way around',
        'Built a **financial RAG pipeline** on **Azure AI Search**, **Azure OpenAI** and Document Intelligence that reads financial summaries and answers questions about them',
        'Built **intent routing**: classification models that send each query to the right automated workflow',
        'Set the **prompt safety guardrails** and shared JavaScript/.NET APIs that other systems use to plug into the AI',
        'Built LLM workflows that **extract data, generate forms** and carry out tasks without a person in the loop',
      ],
    },
    {
      role: 'Assistant System Engineer · Storage Support',
      company: 'TCS — CelcomDigi',
      place: 'Kuala Lumpur, Malaysia',
      period: 'Jul 2024 — Jul 2025',
      points: [
        'Looked after **enterprise SAN/NAS storage**: provisioning, performance monitoring and maintenance',
        'Tracked down and fixed storage issues to keep the systems running',
        'Wrote up the team’s technical processes so the next engineer didn’t have to rediscover them',
      ],
    },
    {
      role: 'Assistant System Engineer · AI & Data Analytics',
      company: 'TCS — Petronas Digital',
      place: 'Kuala Lumpur, Malaysia',
      period: 'Mar 2023 — Oct 2023',
      points: [
        'Fine-tuned models with **Azure Document Intelligence** to pull data out of documents that people used to copy by hand',
        'Wrote **ETL pipelines** in Python and SQL that turned large raw datasets into clean tables for analysts',
        'Built **Power BI dashboards** and automated reports for the teams making decisions from that data',
      ],
    },
    {
      role: 'Teacher Leader · AI & Coding Instructor',
      company: 'Timedoor Academy',
      place: 'Remote',
      period: 'Aug 2021 — Jul 2025',
      points: [
        'Taught **Python, machine learning and computer vision**, plus web and game development',
        'Trained and mentored new instructors and led their training sessions',
        'Wrote hands-on course material and guided students through their own AI projects',
      ],
    },
  ],
  skills: [
    { group: 'Languages', items: ['Python', 'JavaScript', 'SQL'] },
    { group: 'AI / ML', items: ['LLMs', 'RAG', 'MLOps', 'NLP', 'Computer Vision', 'PyTorch', 'TensorFlow', 'Keras', 'Scikit-Learn', 'OpenCV', 'MediaPipe', 'NLTK'] },
    { group: 'Platforms & Frameworks', items: ['Azure OpenAI', 'Azure AI Search', 'Azure AI Foundry', 'HF Transformers', 'FastAPI', '.NET'] },
    { group: 'Cloud & DevOps', items: ['Microsoft Azure', 'Azure DevOps', 'CI/CD', 'Docker', 'Git', 'Microsoft SQL'] },
    { group: 'Data & Libraries', items: ['Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'FAISS', 'Sentence Transformers', 'YOLOv8', 'Power BI', 'Excel'] },
    { group: 'Storage & Infra', items: ['SAN', 'NAS', 'OpenRouter API', 'Discord bots'] },
  ],
  education: {
    school: 'Universiti Teknologi MARA (UiTM)',
    place: 'Shah Alam, Malaysia',
    degree: 'BSc (Hons.) Information System — Intelligent System Engineering',
    gpa: '3.48',
    date: 'Nov 2022',
  },
  certification: { name: 'Microsoft Azure DP-900', detail: 'Data Fundamentals', date: 'Feb 2023' },
}
